-- NEAS pilot execution loop — run in Supabase SQL editor, in order.
-- Proves 5 agents can claim + complete before touching the other 85.
-- Replace <YOUR-ADMIN-USER-ID> once (your auth user id, used as created_by).

-- STEP 0. Preview the 5 pilot agents (no writes).
select agent_id, name, department_code, execution_mode, runtime_status
from aiw_agents
where enabled = true
  and execution_mode in ('draft_only', 'execute_approved')
order by agent_id
limit 5;

-- STEP 1. Enqueue one safe draft_internal task per pilot agent.
-- Direct insert as 'queued' with requires_approval=false so the shared worker
-- can claim it on its next 5-minute run. Also writes the submission event and
-- audit rows the admin API would normally create, so the trail stays complete.
with pilot as (
  select agent_id, department_code
  from aiw_agents
  where enabled = true
    and execution_mode in ('draft_only', 'execute_approved')
  order by agent_id
  limit 5
),
new_tasks as (
  insert into aiw_tasks (
    title, objective, agent_id, department_code, status, priority, input,
    idempotency_key, created_by, assigned_by,
    attempt_count, max_attempts, max_delegation_depth,
    requires_approval, approval_category, error_message
  )
  select
    'Pilot internal draft check',
    'Prepare an internal draft summary for your department. Do not send, publish, spend, approve, or change any record. Internal analysis only.',
    p.agent_id,
    p.department_code,
    'queued',
    'low',
    jsonb_build_object(
      'operation', 'draft_internal',
      'objective', 'Prepare an internal draft summary for your department.',
      'requested_agent', p.agent_id
    ),
    'pilot-20261124-' || p.agent_id,
    '<YOUR-ADMIN-USER-ID>', '<YOUR-ADMIN-USER-ID>',
    0, 3, 0,
    false, null, null
  from pilot p
  returning id, agent_id
)
select * from new_tasks;

-- STEP 2. Backfill the submission event + audit rows for the pilot tasks.
with pilot_tasks as (
  select id, agent_id from aiw_tasks
  where idempotency_key like 'pilot-20261124-%'
)
insert into aiw_task_events (task_id, event_type, actor_type, actor_id, message, payload)
select
  id, 'task_submission_recorded', 'human', '<YOUR-ADMIN-USER-ID>',
  'Pilot submission recorded. Worker admission on next scheduled run.',
  jsonb_build_object('operation', 'draft_internal', 'pilot', true, 'execution_started', false)
from pilot_tasks;

with pilot_tasks as (
  select id, agent_id from aiw_tasks
  where idempotency_key like 'pilot-20261124-%'
)
insert into aiw_audit_events (actor_type, actor_id, action, resource_type, resource_id, outcome, details)
select
  'human', '<YOUR-ADMIN-USER-ID>', 'workforce.task.submit', 'aiw_task', id, 'pending',
  jsonb_build_object('operation', 'draft_internal', 'agent_id', agent_id, 'pilot', true)
from pilot_tasks;

-- STEP 3. Verify queued (run now), then completed after 1-2 worker cycles (~10 min).
select id, agent_id, status, attempt_count, error_message, left(error_message, 200) as err
from aiw_tasks
where idempotency_key like 'pilot-20261124-%'
order by agent_id;

-- STEP 4. After STEP 3 shows status='completed' for all 5, confirm audit trail.
select t.agent_id, t.status, t.completed_at,
       e.event_type, e.created_at as event_at
from aiw_tasks t
left join aiw_task_events e on e.task_id = t.id and e.event_type in ('task_completed', 'task_execution_failed')
where t.idempotency_key like 'pilot-20261124-%'
order by t.agent_id, e.created_at;

-- STEP 5. Worker heartbeat must show completed >= 5 across its runs.
select worker_id, status, last_seen_at, last_task_id, metadata
from aiw_worker_heartbeats
where worker_id = 'neas-apex-shared-worker-v1';

-- EXPAND RULE: only widen the pilot (10, 25, all 90) after STEP 4 shows 5/5
-- completed with task_completed events. Change 'pilot-20261124-' to a new date
-- tag and raise the limit for each new wave. Never update runtime_status by hand.
