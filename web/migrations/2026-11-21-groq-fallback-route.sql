-- NEAS AI Gateway fallback: add a Groq route to aiw_model_routes.
--
-- Why: the voice core fails with "NEAS AI Gateway rate limit reached ... no
-- alternate provider was used" because neas-vercel-ai-gateway is the only
-- enabled route. The other two rows name providers with no implementation
-- (omniroute, ollama) and can never be enabled -- mapRegistryProvider() returns
-- null for them, so setModelRoute denies them as provider_not_implemented.
--
-- Prerequisite (do this FIRST, or the health check will fail):
--   Vercel -> Project -> Settings -> Environment Variables
--   GROQ_API_KEY = <key from https://console.groq.com/keys>
--   Scope: Production AND Preview. Server-side only -- never NEXT_PUBLIC_.
--   Redeploy after adding it.
--
-- After running this, open the admin control plane and press
-- "Health check & enable" on neas-groq-fallback. That sends ONE real inference
-- request and only writes enabled = true if the provider replies as expected.
-- This script deliberately inserts the row DISABLED so nothing goes live
-- without that verified check.
--
-- priority: lower runs first. 10 keeps the Vercel AI Gateway primary; Groq is
-- selected only when the gateway route is disabled or removed.

insert into aiw_model_routes (route_name, provider, model, enabled, priority, data_classification, config)
values (
  'neas-groq-fallback',
  'groq',                   -- in REGISTRY_PROVIDERS, so it is enableable
  'openai/gpt-oss-120b',    -- GROQ_MODEL in web/lib/ai-gateway.ts
  false,                    -- enable only via the verified health check
  20,
  'internal',
  '{}'::jsonb
)
on conflict (route_name) do nothing;

-- Optional cleanup: these two can never be enabled. Leaving them is harmless
-- (the UI now disables their button and says why), but removing them tidies
-- the registry. Uncomment to drop them.
-- delete from aiw_model_routes where provider in ('omniroute', 'ollama');
