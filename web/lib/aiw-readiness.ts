export type AiwRuntimeReadiness = {
  /** Readiness of the specialist-work-order inference path (Vercel AI Gateway OIDC). */
  specialistAiReady: boolean;
  specialistAiProvider: "vercel-ai-gateway" | null;
  /** Readiness of the separate marketing-content generation path. */
  aiReady: boolean;
  aiProvider: "anthropic" | "gemini" | null;
};

export function getAiwRuntimeReadiness(
  request: Request,
  env: Record<string, string | undefined> = process.env,
): AiwRuntimeReadiness {
  const gatewayOidc = Boolean(
    request.headers.get("x-vercel-oidc-token") || env.VERCEL_OIDC_TOKEN,
  );
  const anthropic = Boolean(env.ANTHROPIC_API_KEY);
  const gemini = Boolean(env.GEMINI_API_KEY);

  return {
    specialistAiReady: gatewayOidc,
    specialistAiProvider: gatewayOidc ? "vercel-ai-gateway" : null,
    aiReady: anthropic || gemini,
    aiProvider: anthropic ? "anthropic" : gemini ? "gemini" : null,
  };
}
