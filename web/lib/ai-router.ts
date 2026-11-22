/**
 * NEAS AI Workforce — server-side Universal AI Router adapter.
 * Keep credentials server-only. Discovery is not permission to connect an MCP server.
 */
export type RouterTask = "chat" | "reasoning" | "coding" | "research" | "vision" | "structured";
type Model = { id: string; name?: string; description?: string; pricing?: { prompt?: string; completion?: string }; architecture?: { input_modalities?: string[] }; supported_parameters?: string[] };
const endpoint = "https://openrouter.ai/api/v1";
function apiKey() { const k = process.env.OPENROUTER_API_KEY; if (!k) throw new Error("OPENROUTER_API_KEY is missing"); return k; }
export async function discoverRouterModels(): Promise<Model[]> {
  const r = await fetch(endpoint + "/models", { headers: { Authorization: "Bearer " + apiKey() }, signal: AbortSignal.timeout(10000), cache: "no-store" });
  if (!r.ok) throw new Error("Model catalog unavailable: " + r.status);
  const data = await r.json() as { data?: Model[] };
  return Array.isArray(data.data) ? data.data : [];
}
function matches(m: Model, task: RouterTask) {
  const label = (m.id + " " + (m.name ?? "") + " " + (m.description ?? "")).toLowerCase();
  if (task === "vision") return (m.architecture?.input_modalities ?? []).includes("image");
  if (task === "coding") return /code|coder|coding|devstral/.test(label);
  if (task === "reasoning") return /reason|thinking|r1|o[134]/.test(label);
  if (task === "structured") return (m.supported_parameters ?? []).some(p => p === "structured_outputs" || p === "response_format");
  return true;
}
export async function recommendRouterModel(task: RouterTask, maxEstimatedCost = 0.02) {
  if (!(maxEstimatedCost > 0 && Number.isFinite(maxEstimatedCost))) throw new Error("A positive cost ceiling is required");
  const allow = (process.env.AI_ROUTER_ALLOWED_MODELS ?? "").split(",").map(s => s.trim()).filter(Boolean);
  const candidates = (await discoverRouterModels()).filter(m => (!allow.length || allow.includes(m.id)) && matches(m, task))
    .filter(m => Number(m.pricing?.prompt ?? 0) + Number(m.pricing?.completion ?? 0) <= maxEstimatedCost)
    .sort((a,b) => Number(a.pricing?.prompt ?? 0) + Number(a.pricing?.completion ?? 0) - Number(b.pricing?.prompt ?? 0) - Number(b.pricing?.completion ?? 0));
  if (!candidates.length) throw new Error("No eligible model within capability and budget constraints");
  const preferred = process.env.AI_ROUTER_PREFERRED_MODEL;
  const chosen = candidates.find(m => m.id === preferred) ?? candidates[0];
  return { model: chosen.id, provider: "openrouter" as const, rationale: "Hybrid recommendation; manual override remains available", alternatives: candidates.slice(0,5).map(m => m.id) };
}
export async function runRouterChat(input: { model: string; messages: Array<{ role: "system"|"user"|"assistant"; content: string }>; maxTokens?: number }) {
  const allow = (process.env.AI_ROUTER_ALLOWED_MODELS ?? "").split(",").map(s => s.trim()).filter(Boolean);
  if (allow.length && !allow.includes(input.model)) throw new Error("Model is not allowlisted");
  const maxTokens = Math.min(Math.max(input.maxTokens ?? 1024, 1), Number(process.env.AI_ROUTER_MAX_TOKENS ?? 2048));
  const r = await fetch(endpoint + "/chat/completions", { method: "POST", headers: { Authorization: "Bearer " + apiKey(), "Content-Type": "application/json" }, body: JSON.stringify({ model: input.model, messages: input.messages, max_tokens: maxTokens }), signal: AbortSignal.timeout(30000), cache: "no-store" });
  if (!r.ok) throw new Error("AI provider request failed: " + r.status);
  return r.json();
}
export function trustedMcpServerIds() { return (process.env.MCP_TRUSTED_SERVERS ?? "").split(",").map(s => s.trim()).filter(Boolean); }
export function requireTrustedMcpServer(id: string) { if (!trustedMcpServerIds().includes(id)) throw new Error("MCP server is not trusted; administrator allowlisting required"); }
