-- NEAS workforce recovery helpers — run in Supabase SQL editor, one block at a time.
-- Does NOT mark agents active. Proves completion path first.

-- 1. Inspect stuck test task
select id, agent_id, status, attempt_count, max_attempts,
       worker_lease_token, worker_lease_expires_at,
       started_at, completed_at, last_error_preview => left(error_message,300),
       input->>'operation' as operation
from (select *, error_message as last_error_preview from aiw_tasks) t
where status='running'
order by worker_lease_expires_at asc limit 10;

-- 2. Check why claim loops: operation must be in safe allowlist
select id, status, input->>'operation' as operation, requires_approval, attempt_count, max_attempts
from aiw_tasks where status in ('running','queued') order by created_at desc limit 20;

-- 3. If worker_lease_expires_at < now() and status='running', next cron will auto-recover to queued.
-- To force immediate recovery for the stuck test task (replace <id>):
-- update aiw_tasks set worker_lease_expires_at = now() - interval '1 minute'
-- where id='<test-task-id>' and status='running';

-- 4. After Gemini model fix deploys, watch one cycle:
select worker_id, status, last_seen_at, last_task_id, metadata
from aiw_worker_heartbeats where worker_id='neas-apex-shared-worker-v1';

select task_id, event_type, actor_type, message
from aiw_task_events where task_id='<test-task-id>' order by created_at desc limit 10;

-- 5. Controlled execution test: enqueue ONE safe task per eligible agent (do not mass-activate)
-- insert into aiw_tasks (title, objective, agent_id, department_code, status, priority, input, idempotency_key, created_by, assigned_by, attempt_count, max_attempts, max_delegation_depth, requires_approval)
-- select 'Safe draft check', 'Prepare an internal draft summary only. Do not send, publish, spend, or approve.', agent_id, department_code, 'queued', 'low', jsonb_build_object('operation','draft_internal','objective','internal draft only'), 'safe-'+agent_id+'-001', '<admin-subject>', '<admin-subject>', 0, 3, 0, false
-- from aiw_agents where enabled=true and execution_mode in ('draft_only','execute_approved') limit 5;

-- 6. Do NOT do this until 5 completes for all 90:
-- update aiw_agents set runtime_status='active' -- WRONG. Keep runtime_status managed by worker (idle/running) only.
