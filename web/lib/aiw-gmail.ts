import { sql } from "@/lib/db";

let ready: Promise<void> | null = null;

/** Idempotently bootstrap the dedicated Gmail OAuth account table at first admin use. */
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
  })().catch((error) => {
    ready = null;
    throw error;
  });
  return ready;
}
