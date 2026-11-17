// Creates tables, seeds the KH Trading catalog once, and bootstraps the first admin.
import postgres from "postgres";
import bcrypt from "bcryptjs";
import { readFileSync } from "node:fs";

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url) { console.log("[migrate] No DATABASE_URL set — skipping database setup."); process.exit(0); }
const sql = postgres(url, { ssl: /localhost|127\.0\.0\.1|host=\/tmp/.test(url) ? false : "require", max: 1 });

await sql`create table if not exists users (
  id serial primary key, email text unique not null, name text not null, phone text,
  password_hash text not null, role text not null default 'customer' check (role in ('customer','admin')),
  created_at timestamptz not null default now())`;
await sql`create table if not exists products (
  id text primary key, category text not null, code text not null default '', name text not null,
  dealer_price numeric(12,2) not null, price_override numeric(12,2), active boolean not null default true,
  sort int not null default 0)`;
await sql`create table if not exists settings (key text primary key, value text not null)`;
await sql`create table if not exists orders (
  id serial primary key, reference text unique not null, user_id int not null references users(id),
  status text not null default 'awaiting_payment' check (status in ('awaiting_payment','paid','processing','shipped','completed','cancelled')),
  total numeric(12,2) not null, delivery_name text not null, delivery_phone text not null, delivery_address text not null,
  notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now())`;
await sql`create table if not exists order_items (
  id serial primary key, order_id int not null references orders(id) on delete cascade, product_id text not null,
  name text not null, code text not null default '', unit_price numeric(12,2) not null, quantity int not null check (quantity > 0))`;
await sql`create index if not exists orders_user_idx on orders(user_id)`;
await sql`alter table users alter column password_hash drop not null`;
await sql`alter table users add column if not exists google_id text unique`;
await sql`alter table users add column if not exists facebook_id text unique`;
await sql`alter table orders add column if not exists delivery_email text`;
await sql`alter table orders add column if not exists payment_method text not null default 'bank_transfer'`;
await sql`alter table orders add column if not exists payment_slip_name text`;
await sql`alter table orders add column if not exists payment_slip_type text`;
await sql`alter table orders add column if not exists payment_slip_data text`;
await sql`alter table products add column if not exists sheet_price numeric(12,2)`;
await sql`alter table products add column if not exists image_url text`;
await sql`alter table products add column if not exists description text`;
await sql`alter table products add column if not exists features text`;
await sql`alter table products add column if not exists specs_url text`;

// Admin overrides for sheet-owned fields. The sheet keeps writing *_sheet;
// an override, when set, wins and survives every sync.
await sql`alter table products add column if not exists name_sheet text`;
await sql`alter table products add column if not exists code_sheet text`;
await sql`alter table products add column if not exists category_sheet text`;
await sql`alter table products add column if not exists name_override text`;
await sql`alter table products add column if not exists code_override text`;
await sql`alter table products add column if not exists category_override text`;
await sql`alter table products add column if not exists dealer_price_sheet numeric(12,2)`;
await sql`alter table products add column if not exists dealer_override numeric(12,2)`;
await sql`create table if not exists product_images (id text primary key, mime text not null, data bytea not null, created_at timestamptz not null default now())`;
await sql`insert into settings (key, value) values ('markup_percent', '20') on conflict (key) do nothing`;

const [{ count }] = await sql`select count(*)::int as count from products`;
if (count === 0) {
  const catalog = JSON.parse(readFileSync(new URL("./catalog.json", import.meta.url), "utf8"));
  for (const [i, p] of catalog.entries()) {
    await sql`insert into products (id, category, code, name, dealer_price, sort) values (${p.id}, ${p.cat}, ${p.code}, ${p.name}, ${p.dealer}, ${i})`;
  }
  console.log(`[migrate] Seeded ${catalog.length} products.`);
}

const [{ admins }] = await sql`select count(*)::int as admins from users where role = 'admin'`;
if (admins === 0 && process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
  const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
  await sql`insert into users (email, name, password_hash, role) values (${process.env.ADMIN_EMAIL.toLowerCase().trim()}, 'NEAS Admin', ${hash}, 'admin')
            on conflict (email) do update set role = 'admin', password_hash = excluded.password_hash`;
  console.log(`[migrate] Admin account ready for ${process.env.ADMIN_EMAIL}.`);
}
await sql`create table if not exists password_resets (
  token_hash text primary key, user_id int not null references users(id) on delete cascade,
  expires_at timestamptz not null, used_at timestamptz, created_at timestamptz not null default now())`;
// ---- Marketing Command Center (additive only) ----
await sql`alter table users add column if not exists marketing_role text`;
await sql`create table if not exists mk_posts (
  id serial primary key, title text not null default '', body text not null default '',
  platforms text[] not null default '{}', status text not null default 'draft'
    check (status in ('draft','pending','approved','scheduled','published','failed')),
  scheduled_at timestamptz, media_url text, campaign text, notes text,
  created_by int references users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now())`;
await sql`create table if not exists mk_activity (
  id serial primary key, post_id int references mk_posts(id) on delete set null,
  user_id int references users(id) on delete set null, action text not null, detail text,
  created_at timestamptz not null default now())`;
await sql`create table if not exists mk_bio_links (
  id serial primary key, label text not null, url text not null, sort int not null default 0,
  active boolean not null default true, clicks int not null default 0, created_at timestamptz not null default now())`;
await sql`create table if not exists mk_feeds (
  id serial primary key, name text not null, url text not null, created_at timestamptz not null default now())`;
await sql`create table if not exists mk_social_accounts (
  id serial primary key, platform text not null, external_id text not null, name text not null default '',
  token_enc text not null, expires_at timestamptz, status text not null default 'ok', last_error text,
  connected_by int references users(id) on delete set null, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), unique (platform, external_id))`;
await sql`create table if not exists mk_post_results (
  id serial primary key, post_id int references mk_posts(id) on delete cascade, account_id int references mk_social_accounts(id) on delete set null,
  platform text not null, ok boolean not null, remote_id text, error text, created_at timestamptz not null default now())`;
// Durable publishing leases serialize manual and scheduled attempts for each post.
await sql`create table if not exists mk_post_publish_locks (
  post_id int primary key references mk_posts(id) on delete cascade,
  lock_token uuid not null,
  locked_at timestamptz not null default now())`;
await sql`create table if not exists mk_post_recovery_queue (
  id bigserial primary key,
  post_id int not null references mk_posts(id) on delete cascade,
  account_id int not null references mk_social_accounts(id) on delete cascade,
  platform text not null,
  state text not null default 'needs_review' check (state in ('needs_review','retryable','retry_ready','resolved','closed')),
  error_class text not null default 'unknown',
  error_message text not null default '',
  attempts int not null default 1,
  resolution_note text,
  last_attempt_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (post_id, account_id)
)`;
await sql`create index if not exists mk_post_recovery_queue_state_idx on mk_post_recovery_queue (state, updated_at desc)`;
 // Preserve historical failed sends as review-only until an operator verifies their remote outcome.
await sql`insert into mk_post_recovery_queue (post_id, account_id, platform, state, error_class, error_message, attempts, last_attempt_at, created_at, updated_at)
  select distinct on (r.post_id, r.account_id)
    r.post_id, r.account_id, r.platform, 'needs_review', 'historical_failure',
    coalesce(r.error, 'Historical failed publication; verify destination before retrying'),
    count(*) over (partition by r.post_id, r.account_id)::int, r.created_at, now(), now()
  from mk_post_results r
  where r.ok = false and r.account_id is not null
    and not exists (select 1 from mk_post_results s where s.post_id = r.post_id and s.account_id = r.account_id and s.ok = true)
  order by r.post_id, r.account_id, r.created_at desc
  on conflict (post_id, account_id) do nothing`;
await sql`create table if not exists mk_media (
  id serial primary key, url text not null, title text not null default '', kind text not null default 'graphic',
  width int, height int, created_by int references users(id) on delete set null, created_at timestamptz not null default now())`;
await sql`create table if not exists mk_inbox_meta (
  thread_key text primary key, status text not null default 'open', assigned_to int references users(id) on delete set null,
  note text, updated_by int references users(id) on delete set null, updated_at timestamptz not null default now())`;
await sql`create table if not exists mk_email_log (
  id serial primary key, recipient text not null, subject text not null, kind text not null, ok boolean not null, error text, created_at timestamptz not null default now())`;
await sql`create table if not exists mk_wa_messages (
  id serial primary key, wa_id text not null, name text not null default '', msg_id text unique, text text not null default '',
  mine boolean not null default false, status text, created_at timestamptz not null default now())`;
await sql`create index if not exists mk_wa_messages_wa on mk_wa_messages (wa_id, created_at)`;
// Workspaces: ws = owning user id for self-serve members; null = the NEAS team workspace.
for (const t of ["mk_posts", "mk_activity", "mk_bio_links", "mk_feeds", "mk_social_accounts", "mk_media"]) {
  await sql.unsafe(`alter table ${t} add column if not exists ws int references users(id) on delete cascade`);
  await sql.unsafe(`create index if not exists ${t}_ws on ${t} (ws)`);
}
// Member access to the Marketing Command Center: none → requested → approved (or rejected).
await sql`alter table users add column if not exists mk_access text`;
await sql`alter table users add column if not exists mk_access_ref text`;
await sql`alter table users add column if not exists mk_access_at timestamptz`;
await sql`alter table users add column if not exists mk_access_until timestamptz`;
// ---- NEAS AI Workforce (additive, admin-only data) ----
await sql`create table if not exists aiw_leads (
  id bigserial primary key, company text not null, contact text not null default '',
  email text not null default '', phone text not null default '', service text not null,
  source text not null default 'Manual entry',
  stage text not null default 'new' check (stage in ('new','qualified','discovery','proposal','negotiation','won','lost')),
  estimated_value numeric(14,2) not null default 0 check (estimated_value >= 0),
  next_step text not null default '',
  contact_status text not null default 'unreviewed' check (contact_status in ('unreviewed','permitted','opted_out')),
  created_by int references users(id) on delete set null, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)`;
await sql`create index if not exists aiw_leads_stage_created_idx on aiw_leads(stage, created_at desc)`;
await sql`create index if not exists aiw_leads_company_idx on aiw_leads(company)`;
await sql`create table if not exists aiw_outreach_drafts (
  id bigserial primary key, lead_id bigint not null references aiw_leads(id) on delete cascade,
  channel text not null check (channel in ('email','call','linkedin')),
  subject text not null default '', body text not null,
  status text not null default 'draft' check (status in ('draft','reviewed','sent','cancelled')),
  created_by int references users(id) on delete set null, reviewed_by int references users(id) on delete set null,
  sent_at timestamptz, created_at timestamptz not null default now()
)`;
await sql`create index if not exists aiw_outreach_status_idx on aiw_outreach_drafts(status, created_at desc)`;
await sql`create table if not exists aiw_workflow_runs (
  id bigserial primary key, workflow text not null,
  status text not null default 'recorded' check (status in ('recorded','completed','failed','needs_review')),
  summary text not null default '', lead_id bigint references aiw_leads(id) on delete set null,
  actor_id int references users(id) on delete set null, created_at timestamptz not null default now()
)`;
await sql`create index if not exists aiw_workflow_runs_created_idx on aiw_workflow_runs(created_at desc)`;
// ---- NEAS AI Workforce Gmail accounts (encrypted OAuth tokens) ----
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
await sql`create table if not exists aiw_gmail_send_audit (
  id bigserial primary key, account_key text not null check (account_key in ('info','operations')),
  actor_id int references users(id) on delete set null, recipient text not null, template_key text not null,
  subject text not null, idempotency_key text not null unique,
  status text not null check (status in ('sent','blocked','failed')),
  provider_message_id text, error_code text, created_at timestamptz not null default now()
)`;
await sql`create index if not exists aiw_gmail_send_audit_daily_idx on aiw_gmail_send_audit(account_key, created_at desc)`;
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
console.log("[migrate] Database ready.");
await sql.end();

 // ---- NEAS AI Workforce specialist task ledger ----
await sql`create table if not exists aiw_specialist_tasks (
  id bigserial primary key,
  agent_id text not null,
  agent_name text not null,
  objective text not null,
  deliverable text not null,
  status text not null default 'needs_review' check (status in ('needs_review','approved','rejected','completed')),
  created_by int references users(id) on delete set null,
  reviewed_by int references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)`;
await sql`create index if not exists aiw_specialist_tasks_created_idx on aiw_specialist_tasks(created_at desc)`;
