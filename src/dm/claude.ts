// Claude as the Dungeon Master. Server-only: never import this from a client component.

import Anthropic from "@anthropic-ai/sdk";
import { dmModel } from "./config";
import { DM_TOOLS, SYSTEM_PROMPT } from "./prompt";
import type { DmToolHandler, DmTurnInput, DungeonMaster } from "./types";

type MessageParams = Anthropic.Beta.Messages.MessageCreateParamsNonStreaming;
type Message = Anthropic.Beta.Messages.BetaMessage;
type MessageParam = Anthropic.Beta.Messages.BetaMessageParam;

// The one API call the DM makes; injectable so tests never reach the real API.
export type CreateMessage = (params: MessageParams) => Promise<Message>;

// Enough for thinking plus a few tool calls and a short narration.
const MAX_TOKENS = 8000;
// Guards against a tool loop that never settles.
const MAX_MODEL_CALLS = 6;

// The server re-runs a declined turn on another model, for the models that support it.
function supportsServerFallback(model: string): boolean {
  return model.startsWith("claude-opus-5") || model.startsWith("claude-fable-5");
}

export class DmRefusalError extends Error {}

export function buildMessages(input: DmTurnInput): MessageParam[] {
  const messages: MessageParam[] = [];
  for (const turn of input.history) {
    messages.push({ role: "user", content: turn.player ?? "[The game begins.]" });
    messages.push({ role: "assistant", content: turn.narration || "(The DM waits.)" });
  }
  messages.push({
    role: "user",
    content: `<game_state>\n${input.stateSummary}\n</game_state>\n\n${input.playerInput}`,
  });
  return messages;
}

function textOf(message: Message): string {
  return message.content
    .flatMap((block) => (block.type === "text" ? [block.text] : []))
    .join("")
    .trim();
}

export function createClaudeDm(options: { create?: CreateMessage; model?: string } = {}): DungeonMaster {
  const model = options.model ?? dmModel();
  const create: CreateMessage =
    options.create ?? ((params) => new Anthropic().beta.messages.create(params));

  return {
    async narrate(input: DmTurnInput, runTool: DmToolHandler): Promise<string> {
      const messages = buildMessages(input);
      const earlierText: string[] = [];

      for (let call = 0; call < MAX_MODEL_CALLS; call++) {
        const response = await create({
          model,
          max_tokens: MAX_TOKENS,
          system: SYSTEM_PROMPT,
          tools: DM_TOOLS,
          messages,
          output_config: { effort: "low" },
          cache_control: { type: "ephemeral" },
          ...(supportsServerFallback(model)
            ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }
            : {}),
        });

        if (response.stop_reason === "refusal") {
          throw new DmRefusalError("The DM model declined this turn.");
        }

        const text = textOf(response);
        if (response.stop_reason === "pause_turn") {
          messages.push({ role: "assistant", content: response.content });
          continue;
        }
        if (response.stop_reason !== "tool_use") {
          return text || earlierText.join("\n\n");
        }

        if (text) earlierText.push(text);
        messages.push({ role: "assistant", content: response.content });
        const results = response.content.flatMap((block) => {
          if (block.type !== "tool_use") return [];
          const result = runTool(block.name, block.input);
          return [
            {
              type: "tool_result" as const,
              tool_use_id: block.id,
              content: result.content,
              is_error: result.isError,
            },
          ];
        });
        messages.push({ role: "user", content: results });
      }

      // Out of calls: use whatever narration the model managed to write.
      if (earlierText.length) return earlierText.join("\n\n");
      throw new Error("The DM got stuck in a loop of tool calls.");
    },
  };
}
