import "server-only";

/**
 * V12-01: every auth BFF route call gets one of these -- included in every
 * response body (success or error) and every server-side log line for that
 * request, so a user-reported "registration failed" can actually be traced
 * to a specific request server-side, across the register -> login ->
 * workspace-provisioning chain.
 */
export function newCorrelationId(): string {
  return crypto.randomUUID();
}
