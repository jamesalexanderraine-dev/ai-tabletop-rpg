import { afterEach, describe, expect, it, vi } from "vitest";
import { dmModel, resolveDmModel } from "./config";

describe("resolveDmModel", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("runs the player's pick when it's one we offer", () => {
    expect(resolveDmModel("claude-sonnet-5-5")).toBe("claude-sonnet-5-5");
    expect(resolveDmModel("claude-opus-5-5")).toBe("claude-opus-5-5");
  });

  it("falls back to the default for anything else", () => {
    vi.stubEnv("DM_MODEL", "");
    expect(dmModel()).toBe("claude-opus-5-5");
    for (const requested of [undefined, null, "", "claude-fable-5-1", 42]) {
      expect(resolveDmModel(requested)).toBe("claude-opus-5-5");
    }
  });

  it("lets DM_MODEL change the default", () => {
    vi.stubEnv("DM_MODEL", "claude-opus-5");
    expect(resolveDmModel(undefined)).toBe("claude-opus-5");
  });
});
