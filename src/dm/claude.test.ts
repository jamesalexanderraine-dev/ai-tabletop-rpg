import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import { buildMessages, createClaudeDm, DmRefusalError, type CreateMessage } from "./claude";
import type { DmTurnInput } from "./types";

type Message = Anthropic.Beta.Messages.BetaMessage;
type Params = Parameters<CreateMessage>[0];

// Builds just enough of a Messages API response for the loop to read.
function reply(stop_reason: Message["stop_reason"], content: unknown[]): Message {
  return { stop_reason, content } as unknown as Message;
}

// A fake API that returns the scripted responses in order and records each request.
function fakeApi(responses: Message[]) {
  const requests: Params[] = [];
  const create: CreateMessage = async (params) => {
    requests.push(structuredClone(params));
    const next = responses.shift();
    if (!next) throw new Error("No more scripted responses");
    return next;
  };
  return { create, requests };
}

const input: DmTurnInput = {
  stateSummary: "Character name: not yet known",
  history: [{ player: null, narration: "You wake in a cell." }],
  playerInput: "I try the door",
};

describe("buildMessages", () => {
  it("replays history as alternating turns and puts state with the new move", () => {
    const messages = buildMessages(input);
    expect(messages.map((m) => m.role)).toEqual(["user", "assistant", "user"]);
    expect(messages[0]?.content).toBe("[The game begins.]");
    expect(messages[2]?.content).toContain("<game_state>\nCharacter name: not yet known\n</game_state>");
    expect(messages[2]?.content).toContain("I try the door");
  });
});

describe("createClaudeDm", () => {
  it("runs tool calls through the engine and returns the final narration", async () => {
    const api = fakeApi([
      reply("tool_use", [
        { type: "tool_use", id: "t1", name: "roll_check", input: { stat: "might", difficulty: "hard", reason: "force the door" } },
      ]),
      reply("end_turn", [{ type: "text", text: "The hinges scream and give way." }]),
    ]);
    const toolCalls: Array<[string, unknown]> = [];
    const dm = createClaudeDm({ create: api.create, model: "claude-opus-5" });

    const narration = await dm.narrate(input, (name, args) => {
      toolCalls.push([name, args]);
      return { content: "Might check: success", isError: false };
    });

    expect(narration).toBe("The hinges scream and give way.");
    expect(toolCalls).toEqual([["roll_check", { stat: "might", difficulty: "hard", reason: "force the door" }]]);
    expect(api.requests).toHaveLength(2);
    expect(api.requests[1]?.messages.at(-1)).toEqual({
      role: "user",
      content: [{ type: "tool_result", tool_use_id: "t1", content: "Might check: success", is_error: false }],
    });
  });

  it("flags engine rejections as tool errors so the DM can re-narrate", async () => {
    const api = fakeApi([
      reply("tool_use", [{ type: "tool_use", id: "t1", name: "roll_check", input: { stat: "charm" } }]),
      reply("end_turn", [{ type: "text", text: "You flash a winning smile." }]),
    ]);
    const dm = createClaudeDm({ create: api.create, model: "claude-opus-5" });
    await dm.narrate(input, () => ({ content: "Unknown stat", isError: true }));
    const last = api.requests[1]?.messages.at(-1)?.content;
    expect(last).toEqual([expect.objectContaining({ is_error: true, content: "Unknown stat" })]);
  });

  it("asks for server-side fallbacks only on models that support them", async () => {
    for (const [model, expected] of [
      ["claude-opus-5", true],
      ["claude-sonnet-5", false],
    ] as const) {
      const api = fakeApi([reply("end_turn", [{ type: "text", text: "Hi." }])]);
      await createClaudeDm({ create: api.create, model }).narrate(input, () => ({ content: "", isError: false }));
      expect(api.requests[0]?.model).toBe(model);
      expect("fallbacks" in (api.requests[0] ?? {})).toBe(expected);
    }
  });

  it("raises a refusal instead of returning empty narration", async () => {
    const api = fakeApi([reply("refusal", [])]);
    const dm = createClaudeDm({ create: api.create, model: "claude-opus-5" });
    await expect(dm.narrate(input, () => ({ content: "", isError: false }))).rejects.toBeInstanceOf(DmRefusalError);
  });

  it("gives up on an endless tool loop", async () => {
    const loop = () => reply("tool_use", [{ type: "tool_use", id: "t", name: "remember", input: {} }]);
    const api = fakeApi(Array.from({ length: 10 }, loop));
    const dm = createClaudeDm({ create: api.create, model: "claude-opus-5" });
    await expect(dm.narrate(input, () => ({ content: "Saved.", isError: false }))).rejects.toThrow(/loop/);
  });
});
