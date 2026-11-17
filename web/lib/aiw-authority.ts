export type AiwAuthority = "observe" | "draft" | "recommend" | "execute_approved";
export type AiwAgentPermission = { id: string; enabled: boolean; authority: AiwAuthority };
export type AiwWorkforceConfig = { agents?: AiwAgentPermission[]; updatedAt?: string | null } | null;

const SPECIALIST_TO_WORKFORCE_ID: Readonly<Record<string, string>> = {
  JARVIS: "orchestrator",
  SALES: "lead-qualifier",
  MARKETING: "marketing-strategy",
  CONTENT: "content",
  SKILLS: "knowledge",
  PERFORMANCE: "agent-quality",
  AUTHORITY: "integrity",
  APPROACH: "outreach",
  HUMAN: "human-interaction",
  EMPATHY: "human-interaction",
  PRO: "outreach",
  ENGINEERING: "rope-access",
  QUALIFY: "contracts",
  QUALITY: "hseq",
  INTEGRITY: "integrity",
  ADVANCED: "model-router",
  MODELS: "model-router",
  BRANCHES: "orchestrator",
  CODE: "code-engineer",
  FINANCE: "finance",
  CUSTOMER: "relationship",
  PROJECTS: "offshore-power",
  AUDIT: "agent-quality",
};

const DEFAULT_PERMISSIONS: Readonly<Record<string, AiwAgentPermission>> = {
  orchestrator: { id: "orchestrator", enabled: true, authority: "recommend" },
  "lead-research": { id: "lead-research", enabled: true, authority: "observe" },
  "lead-qualifier": { id: "lead-qualifier", enabled: true, authority: "recommend" },
  outreach: { id: "outreach", enabled: true, authority: "draft" },
  "proposal-closer": { id: "proposal-closer", enabled: true, authority: "recommend" },
  relationship: { id: "relationship", enabled: true, authority: "draft" },
  "marketing-strategy": { id: "marketing-strategy", enabled: true, authority: "recommend" },
  seo: { id: "seo", enabled: true, authority: "draft" },
  content: { id: "content", enabled: true, authority: "draft" },
  video: { id: "video", enabled: true, authority: "draft" },
  publisher: { id: "publisher", enabled: true, authority: "draft" },
  "rope-access": { id: "rope-access", enabled: true, authority: "recommend" },
  renewables: { id: "renewables", enabled: true, authority: "recommend" },
  "offshore-power": { id: "offshore-power", enabled: true, authority: "recommend" },
  estimator: { id: "estimator", enabled: true, authority: "draft" },
  contracts: { id: "contracts", enabled: true, authority: "recommend" },
  finance: { id: "finance", enabled: true, authority: "observe" },
  hseq: { id: "hseq", enabled: true, authority: "recommend" },
  integrity: { id: "integrity", enabled: true, authority: "recommend" },
  "agent-quality": { id: "agent-quality", enabled: true, authority: "observe" },
  "model-router": { id: "model-router", enabled: false, authority: "observe" },
  "code-engineer": { id: "code-engineer", enabled: true, authority: "draft" },
  knowledge: { id: "knowledge", enabled: true, authority: "draft" },
  "human-interaction": { id: "human-interaction", enabled: true, authority: "draft" },
};

export type AiwPermissionDecision =
  | { allowed: true; workforceAgentId: string; permission: AiwAgentPermission }
  | { allowed: false; workforceAgentId: string | null; reason: string };

export function resolveAiwSpecialistPermission(
  specialistId: string,
  config: AiwWorkforceConfig,
): AiwPermissionDecision {
  const workforceAgentId = SPECIALIST_TO_WORKFORCE_ID[specialistId];
  if (!workforceAgentId) {
    return { allowed: false, workforceAgentId: null, reason: "Unknown specialist permission mapping." };
  }

  const hasSavedConfig = !!config?.updatedAt;
  const saved = config?.agents?.find((agent) => agent.id === workforceAgentId);
  const permission = saved ?? (hasSavedConfig
    ? { id: workforceAgentId, enabled: false, authority: "observe" as const }
    : DEFAULT_PERMISSIONS[workforceAgentId]);

  if (!permission || !permission.enabled) {
    return { allowed: false, workforceAgentId, reason: "This specialist is disabled in the saved NEAS authority matrix." };
  }
  if (permission.authority === "observe") {
    return { allowed: false, workforceAgentId, reason: "This specialist is configured for observe-only access and cannot create work orders." };
  }

  return { allowed: true, workforceAgentId, permission };
}
