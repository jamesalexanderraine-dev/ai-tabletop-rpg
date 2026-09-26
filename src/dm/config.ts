// Server-only DM configuration. Never import this from a client component:
// the API key must stay on the server.

export const DEFAULT_DM_MODEL = "claude-opus-5";

export function dmModel(): string {
  return process.env.DM_MODEL?.trim() || DEFAULT_DM_MODEL;
}

export function hasAnthropicKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}
