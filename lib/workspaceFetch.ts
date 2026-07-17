export function workspaceHeaders(workspaceId: number, headers?: HeadersInit) {
  const result = new Headers(headers);
  result.set("X-Workspace-Id", String(workspaceId));
  return result;
}
