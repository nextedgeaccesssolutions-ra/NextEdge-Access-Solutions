-- NEAS AI Workforce: dual-approval migration
-- Project: NEAS-AI-Production (smlxekhbaefbvdbfxpew)
-- Run once in Supabase SQL Editor (postgres role). Idempotent.
-- Required by PR #194 feat(ai-workforce): dual approval for critical actions
-- (web/app/api/admin/ai-workforce/control-plane/route.ts)
--
-- What it does:
--  1. Adds quorum columns to aiw_approvals
--  2. Adds awaiting_second_approval flag to aiw_tasks
--  3. Backfills existing rows to single-approval defaults
--  4. Adds guard trigger: critical categories must require 2, approved_by_ids distinct

-- 1) aiw_approvals columns
alter table public.aiw_approvals
  add column if not exists approvals_required int not null default 1,
  add column if not exists approval_count int not null default 0,
  add column if not exists approved_by_ids text[] not null default '{}',
  add column if not exists first_approved_by text,
  add column if not exists first_approved_at timestamptz;

-- 2) aiw_tasks flag
alter table public.aiw_tasks
  add column if not exists awaiting_second_approval boolean not null default false;

-- 3) Backfill: infer required quorum from category for historical rows
-- Critical set (must match route.ts DUAL_APPROVAL_CATEGORIES):
-- contract, payment, safety_signoff, database_destructive,
-- credentials_access, production_deploy, security_policy
update public.aiw_approvals
set approvals_required = case
  when category in ('contract','payment','safety_signoff','database_destructive','credentials_access','production_deploy','security_policy') then 2
  else 1 end
where true;

-- Keep approval_count consistent where legacy rows already approved
update public.aiw_approvals
set approval_count = case when status = 'approved' then greatest(approval_count, 1) else approval_count end
where status in ('approved','rejected');

-- 4) Guard trigger: enforce 1-or-2 quorum + distinct approver ids
create or replace function public.aiw_approval_quorum_guard()
returns trigger
language plpgsql
as $$
begin
  if NEW.approvals_required not in (1, 2) then
    raise exception 'approvals_required must be 1 or 2';
  end if;

  -- critical categories can never be single-approval
  if NEW.category in ('contract','payment','safety_signoff','database_destructive','credentials_access','production_deploy','security_policy')
     and NEW.approvals_required <> 2 then
    raise exception 'critical category % requires approvals_required=2', NEW.category;
  end if;

  -- approved_by_ids must be distinct, non-empty strings
  if NEW.approved_by_ids is not null then
    select array_agg(distinct x) into NEW.approved_by_ids
    from unnest(NEW.approved_by_ids) as x
    where x is not null and x <> '';
    if NEW.approved_by_ids is null then
      NEW.approved_by_ids := '{}';
    end if;
    NEW.approval_count := coalesce(array_length(NEW.approved_by_ids, 1), 0);
    if NEW.approval_count > NEW.approvals_required then
      raise exception 'approval_count (%) exceeds approvals_required (%)', NEW.approval_count, NEW.approvals_required;
    end if;
    if NEW.approval_count > 0 and NEW.first_approved_by is null then
      NEW.first_approved_by := NEW.approved_by_ids[1];
      if NEW.first_approved_at is null then
        NEW.first_approved_at := now();
      end if;
    end if;
  end if;

  return NEW;
end;
$$;

drop trigger if exists aiw_approval_quorum_guard on public.aiw_approvals;
create trigger aiw_approval_quorum_guard
  before insert or update on public.aiw_approvals
  for each row execute function public.aiw_approval_quorum_guard();

-- Verification (run after migration):
-- select department_code, count(*) from aiw_agents group by 1 order by 1; -- expect 9 rows x10 = 90
-- select column_name, data_type from information_schema.columns
--  where table_schema='public' and table_name='aiw_approvals' order by ordinal_position;
-- select column_name from information_schema.columns
--  where table_schema='public' and table_name='aiw_tasks' and column_name='awaiting_second_approval';
