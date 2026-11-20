export function inboxMetaKey(workspaceId: number | null, threadKey: string): string {
  return workspaceId === null ? threadKey : `ws${workspaceId}:${threadKey}`;
}
