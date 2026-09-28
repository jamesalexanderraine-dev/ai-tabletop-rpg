// Claude as the Dungeon Master. Server-only: never import this from a client component.

import Anthropic from "@anthropic-ai/sdk";
import { dmModel } from "./config";
import { DM_TOOLS, SYSTEM_PROMPT } from "./prompt";
import type { DmHooks, DmToolHandler, DmTurnInput, DungeonMaster } from "./types";

type MessageParams = Anthropic.Beta.Messages.MessageCreateParamsNonStreaming;
type Message = Anthropic.Beta.Messages.BetaMessage;
type MessageParam = Anthropic.Beta.Messages.BetaMessageParam;

// The one API call the DM makes, streamed so narration reaches the player as it's
// written. Injectable so tests never reach the real API.
export type SendMessage = (params: MessageParams, onText: (delta: string) => void) => Promise<Message>;

// Enough for thinking plus a few tool calls and a short narration.
const MAX_TOKENS = 8000;
// Guards against a tool loop that never settles.
const MAX_MODEL_CALLS = 8;

// Dollars per million tokens (input, output), for the cost estimate in the logs.
const PRICES: Record<string, [number, number]> = {
  "claude-opus-5": [5, 25],
  "claude-sonnet-5": [2, 10],
  "claude-haiku-4-5": [1, 5],
};

// The server re-runs a declined turn on another model, for the models that support it.
export function supportsServerFallback(model: string): boolean {
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

export const defaultSend: SendMessage = (params, onText) => {
  // Trimmed so a stray space or newline pasted into a settings UI can't break auth.
  const stream = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY?.trim() }).beta.messages.stream(params);
  stream.on("text", (delta) => onText(delta));
  return stream.finalMessage();
};

export interface Usage {
  calls: number;
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
}

export function logUsage(model: string, u: Usage, label = "DM turn usage") {
  const [inPrice, outPrice] = PRICES[model] ?? [NaN, NaN];
  const cost = (u.input * inPrice + u.cacheWrite * inPrice * 1.25 + u.cacheRead * inPrice * 0.1 + u.output * outPrice) / 1e6;
  console.log(label, JSON.stringify({ model, ...u, estimatedUsd: Number.isNaN(cost) ? null : cost.toFixed(4) }));
}

export function createClaudeDm(options: { send?: SendMessage; model?: string } = {}): DungeonMaster {
  const model = options.model ?? dmModel();
  const send = options.send ?? defaultSend;

  return {
    async narrate(input: DmTurnInput, runTool: DmToolHandler, hooks: DmHooks = {}): Promise<string> {
      const messages = buildMessages(input);
      const earlierText: string[] = [];
      const usage: Usage = { calls: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };

      try {
        for (let call = 0; call < MAX_MODEL_CALLS; call++) {
          const response = await send(
            {
              model,
              max_tokens: MAX_TOKENS,
              // The system prompt and tools are identical every turn, so cache them.
              system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
              tools: DM_TOOLS,
              messages,
              output_config: { effort: "low" },
              // Also cache the conversation so far, which the follow-up call after a tool reuses.
              cache_control: { type: "ephemeral" },
              ...(supportsServerFallback(model)
                ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }
                : {}),
            },
            (delta) => hooks.onText?.(delta),
          );
          usage.calls++;
          usage.input += response.usage?.input_tokens ?? 0;
          usage.output += response.usage?.output_tokens ?? 0;
          usage.cacheRead += response.usage?.cache_read_input_tokens ?? 0;
          usage.cacheWrite += response.usage?.cache_creation_input_tokens ?? 0;

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

          // Text before a tool call is a preamble; the narration comes after the results.
          if (text) {
            earlierText.push(text);
            hooks.onDiscardText?.();
          }
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
      } finally {
        if (usage.calls) logUsage(model, usage);
      }
    },
  };
}
