# NEAS Workforce + Voice — Live diagnosis (2026-11-24 Asia/Manila)

Production: https://neas-apex.vercel.app — loads OK, title "NEAS AI — Workforce orb interface".

## 1. API allowlist is returning 404 for everything

Live probe via browser `fetch()` on the READY deployment behind the alias:

- `GET /api/worker/run` → `404 {"error":"Not found"}`
- `GET /api/worker` → `404 {"error":"Not found"}`
- `GET /api/health` → `404 {"error":"Not found"}`

Even a health route 404s. That means your strict allowlist middleware (or `middleware.ts` matcher) is blocking before routing, not that the worker file is missing.

**Fix in your branch:** allow explicitly, in this order:

```ts
// middleware.ts — must run before auth, must call NextResponse.next() for allowed
const PUBLIC = ['/', '/favicon.ico', '/_next/:path*'];
const WORKER_ROUTES = ['/api/worker/run', '/api/worker/claim', '/api/worker/finish'];
const HEALTH = ['/api/health'];

if (isWorkerRoute) {
  // Do NOT return 404 for missing secret here — return 401 so you can distinguish routing vs auth
  // Auth check belongs inside the route handler, not middleware
  return NextResponse.next();
}
```

Test matrix after redeploy (use deployment URL first, then alias):
- no secret → expect `401`, not `404` (proves route exists)
- with `Authorization: Bearer $WORKER_SECRET` → expect `200` + `{claimed:0|1, completed:...}`
- same via alias → must match deployment URL. If deployment=200 but alias=404, alias is still stale.

Do not treat cron `claimed:1` as success while HTTP via alias is 404 — cron may be hitting the deployment URL directly.

## 2. Worker claims twice, completes zero — completion-path failure

Your DB state is classic:

- test task `status=running`, no `output`, no `completed_at`
- heartbeat `claimed:1 completed:0`
- 89 agents `not_configured`, 1 `running` (lease holder)

Claim works. Finish/fail never runs. Almost always one of:

1. `try { execute() }` without `finally { finish() or fail() }` — any throw leaves task stuck `running` until lease expires, then re-claimed, then stuck again. That matches "claimed twice".
2. Task handler attempts an action your strict allowlist denies (external, spend, safety, prod change) and throws an uncaught `ApprovalRequired` — no catch → no `fail()` write.
3. `finish()` uses a different Supabase client/role that lacks UPDATE grant, so it silently fails.
4. Lease `expires_at` too short + no heartbeat, or too long + no recovery, so second claim is actually lease-takeover, not retry.

**Required pattern (apply to your worker route):**

```ts
const lease = await claimOneTask(supabase, workerId); // SKIP LOCKED, sets lease_id, locked_at, lease_expires_at = now()+5min
if (!lease) return json({claimed:0});

try {
  heartbeat(lease.id, 'running');
  const result = await executeWithAllowlist(lease); // MUST enforce: draft_only → internal only; execute_approved → approval-gated
  await finishTask(supabase, lease.id, lease.lease_id, {output: result, audit: {...}});
  return json({claimed:1, completed:1});
} catch (err) {
  // Distinguish approval-block (expected) from bug (retry)
  await failTask(supabase, lease.id, lease.lease_id, {error: String(err), retryable: isRetryable(err)});
  return json({claimed:1, completed:0, error: String(err)});
}
```

SQL to inspect the stuck task (run in Supabase):

```sql
select id, agent_id, status, attempts, lease_id, locked_at, lease_expires_at,
       started_at, completed_at, output, last_error, next_retry_at
from tasks where id = '<test-task-id>';
select * from execution_logs where task_id='<test-task-id>' order by created_at desc limit 20;
```

If `lease_expires_at < now()` and `status='running'`, your recovery query must allow reclaim. If `last_error` is null and no log rows, the throw happened before any write — add logging as first line of try/catch.

## 3. ElevenLabs widget is mounted but invisible

Live DOM:

```html
<elevenlabs-convai id="neas-elevenlabs-voice"
  agent-id="agent_8601m7zrgsg4f98srgkekzq7ana9"
  variant="full"
  style="position: fixed; left: -10000px; bottom: 0px; width: 1px; height: 1px; opacity: 0; overflow: hidden; pointer-events: none;">
</elevenlabs-convai>
<script src="https://unpkg.com/@elevenlabs/convai-widget-embed"></script>
```

Script loads, element exists → "keep mounted during startup" worked. But `left:-10000px; opacity:0; pointer-events:none; 1x1px` guarantees no mic click, no audio, autoplay policy will also block hidden playback. That matches "no successful live audio conversation".

**Fix:**

- Remove off-screen hiding. Use a real docked position (`right:20px; bottom:20px; width:360px; height:640px; opacity:1; pointer-events:auto`) behind a "Tap to Start" gate that calls `widget.start()` on user gesture.
- Keep it mounted (don't unmount on session state change), just toggle `display`/`visibility`, not `left:-10000px`.
- Add fallback loader: if `customElements.get('elevenlabs-convai')` undefined after 5s, inject `https://cdn.jsdelivr.net/npm/@elevenlabs/convai-widget-embed@latest` then re-create element.
- Log: `convai-ready`, mic permission `granted/denied`, `conversation-started`, first audio chunk. Acceptance requires those logs + audible response.

## 4. 90-agent model

Confirmed correct: 90 enabled profiles ≠ 90 services. One shared queue worker is right.

- 87 `draft_only` must only do internal drafting/analysis.
- 3 `execute_approved` must check approval token before any external/spend/safety/prod action.

Acceptance is NOT `count(enabled)=90`. It is: for each eligible agent, enqueue an approved-safe task → claimed → completed with output + `completed_at` + audit row. Run that as a controlled loop, not by marking `runtime_status=active` manually. Keep `not_configured` until that agent has completed once.

## Next acceptance checks (do not skip)

1. Deployment URL worker auth test: 401 without secret, 200 with secret.
2. Alias worker auth test: same as above (proves alias is current).
3. Stuck task: expire/reclaim once, then complete once with output + audit row. Heartbeat `completed:1`.
4. Loop test across all 90 profiles with safe tasks, all `completed`.
5. Voice: mic → ElevenLabs → audible reply, with console logs.
