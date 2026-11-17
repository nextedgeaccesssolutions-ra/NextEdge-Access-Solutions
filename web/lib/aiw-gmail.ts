import { sql } from "@/lib/db";

let ready: Promise<void> | null = null;

/** Idempotently bootstrap Gmail accounts, a metadata-only audit trail, and the fail-closed send policy. */
export function ensureAiwGmailAccountsTable(): Promise<void> {
  ready ??= (async () => {
    await sql`create table if not exists aiw_gmail_accounts (
      id bigserial primary key,
      account_key text not null unique check (account_key in ('info','operations')),
      email text not null unique,
      token_enc text not null,
      scope text not null default '',
      expires_at timestamptz,
      status text not null default 'connected' check (status in ('connected','reauth_required','error')),
      last_error text,
      connected_by int references users(id) on delete set null,
      connected_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )`;
    await sql`create index if not exists aiw_gmail_accounts_status_idx on aiw_gmail_accounts(status)`;
    await sql`create table if not exists aiw_gmail_audit (
      id bigserial primary key,
      account_key text check (account_key in ('info','operations')),
      actor_id int references users(id) on delete set null,
      action text not null,
      outcome text not null check (outcome in ('success','blocked','failure')),
      provider_code text,
      detail text not null default '',
      created_at timestamptz not null default now()
    )`;
    await sql`create index if not exists aiw_gmail_audit_created_idx on aiw_gmail_audit(created_at desc)`;
    await sql`create table if not exists aiw_gmail_policy (
      id int primary key default 1 check (id = 1),
      automatic_send_enabled boolean not null default false,
      updated_by int references users(id) on delete set null,
      updated_at timestamptz not null default now()
    )`;
    await sql`insert into aiw_gmail_policy (id, automatic_send_enabled) values (1, false) on conflict (id) do nothing`;
  })().catch((error) => {
    ready = null;
    throw error;
  });
  return ready;
}

export async function recordAiwGmailAudit(input: {
  accountKey?: "info" | "operations" | null;
  actorId?: number | null;
  action: string;
  outcome: "success" | "blocked" | "failure";
  providerCode?: string | null;
  detail?: string;
}) {
  await ensureAiwGmailAccountsTable();
  await sql`insert into aiw_gmail_audit (account_key,actor_id,action,outcome,provider_code,detail)
    values (${input.accountKey ?? null},${input.actorId ?? null},${input.action},${input.outcome},${input.providerCode ?? null},${(input.detail ?? "").slice(0,500)})`;
}
