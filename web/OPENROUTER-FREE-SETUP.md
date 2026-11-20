# NEAS AI — OpenRouter Free Workspace Setup

NEAS uses one server-side OpenRouter API key for:

- AI Workforce text inference through the `openrouter/free` model router.
- Natural speech through Fish Audio `fish-audio/s2.1-pro-free:free`.
- The existing private `/admin/ai-workforce` interface and voice activation from the central orchestration orb.

## Create the OpenRouter workspace and key

1. Open https://openrouter.ai/workspaces and sign in or create an account.
2. Use the Free plan. Create or select a workspace named `NEAS AI Workforce`.
3. Open https://openrouter.ai/settings/keys and create an API key named `NEAS Production`.
4. Copy the key once. Do not put it in source code, GitHub, a browser bundle, or chat messages.
5. In Vercel, open the `next-edge-access-solutions` project → Settings → Environment Variables.
6. Set the existing `OPENROUTER_API_KEY` variable for both Production and Preview. Keep it encrypted/sensitive.
7. Redeploy Production and Preview after saving the key.

Vercel project: https://vercel.com/nextedgeaccesssolutions-neas/next-edge-access-solutions/settings/environment-variables

## Provider behavior

- If `NEAS_AI_PROVIDER` is explicitly set, that provider is used.
- If it is blank and `OPENROUTER_API_KEY` exists, NEAS automatically selects OpenRouter.
- If OpenRouter returns a quota/rate-limit error, NEAS tries Groq only when `GROQ_API_KEY` is also configured. It never silently switches to a paid provider.
- OpenRouter's `openrouter/free` router selects a currently available free chat model.
- Voice replies use Fish Audio S2.1 Pro Free through OpenRouter. If the voice endpoint is unavailable, NEAS keeps the text response and reports the issue; it does not use robotic browser speech.

## Free-tier limits and expectations

OpenRouter's free plan currently lists 25+ free models. Free model variants are rate limited (currently 20 requests/minute and 50 requests/day; the daily allowance rises to 1,000 after at least US$10 in lifetime credits have been purchased). Failed requests can count toward the daily limit. Fish Audio S2.1 Pro Free is intended for testing and low-volume use and has no production latency or availability guarantee.

The 90-role organization blueprint and the selectable executive/specialist personas are application-level roles, not 90 independently provisioned OpenRouter accounts or 90 always-running agents. The OpenRouter key supplies model inference to the existing NEAS orchestration and specialist workflows.

## Security

- Store `OPENROUTER_API_KEY` only in Vercel server-side environment variables.
- Never prefix it with `NEXT_PUBLIC_`.
- Never commit keys to GitHub or print them in logs.
- Keep the NEAS human-approval gates for deployments, spending, external messages, and safety-critical actions.

## Commercial voice-use note

A $0 model price does not by itself grant unrestricted commercial rights. Before enabling Fish Audio S2.1 Pro Free for the public NEAS business website, review the current Fish Audio Community License and service terms. The current Community License describes limited commercial rights below a US$500,000 annual-revenue threshold and requires a separate written license for certain hosted-service or other commercial uses. Fish Audio also describes the free API as best-effort without an SLA. If NEAS does not clearly qualify, obtain written confirmation from Fish Audio or select a commercially licensed paid TTS model before production use.
