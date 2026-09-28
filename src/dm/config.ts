// Server-only DM configuration. Never import this from a client component:
// the API key must stay on the server.

import { DEFAULT_DM_MODEL, isDmModelId } from "@/shared/dmModels";

// The model for requests that don't pick one (and for designing archetypes).
export function dmModel(): string {
  return process.env.DM_MODEL?.trim() || DEFAULT_DM_MODEL;
}

// The player's pick from the sheet, if it's one we offer; otherwise the default.
export function resolveDmModel(requested: unknown): string {
  return isDmModelId(requested) ? requested : dmModel();
}

export function hasAnthropicKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}
