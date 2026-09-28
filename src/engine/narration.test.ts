import { describe, expect, it } from "vitest";
import { parseNarration, plainNarration } from "./narration";

describe("parseNarration", () => {
  it("lifts tagged speech out of the prose", () => {
    expect(parseNarration('Sereth draws her bow.\n\n<say who="Sereth">Prepare to die.</say>\n\nThe torch gutters.')).toEqual([
      { kind: "prose", text: "Sereth draws her bow." },
      { kind: "speech", who: "Sereth", text: "Prepare to die." },
      { kind: "prose", text: "The torch gutters." },
    ]);
  });

  it("leaves old narration alone", () => {
    expect(parseNarration("“Ah,” she says.\n\nThen silence.")).toEqual([
      { kind: "prose", text: "“Ah,” she says." },
      { kind: "prose", text: "Then silence." },
    ]);
  });

  it("copes with quotes, curly attribute quotes, and two speakers in one paragraph", () => {
    expect(parseNarration('<say who=“Old Tamsin”>"Oi!"</say> <say who="Sereth">Run.</say>')).toEqual([
      { kind: "speech", who: "Old Tamsin", text: "Oi!" },
      { kind: "speech", who: "Sereth", text: "Run." },
    ]);
  });

  it("shows speech while it's still streaming in, and hides a tag that's half arrived", () => {
    expect(parseNarration('She leans in.\n\n<say who="Sereth">Listen caref')).toEqual([
      { kind: "prose", text: "She leans in." },
      { kind: "speech", who: "Sereth", text: "Listen caref" },
    ]);
    expect(parseNarration("She leans in.\n\n<say who=\"Ser")).toEqual([{ kind: "prose", text: "She leans in." }]);
    expect(parseNarration("She leans in. <sa")).toEqual([{ kind: "prose", text: "She leans in." }]);
    expect(parseNarration('<say who="Sereth">Go.</')).toEqual([{ kind: "speech", who: "Sereth", text: "Go." }]);
  });

  it("links a described speaker to the character in the state", () => {
    expect(parseNarration('<say who="The guard" npc="Old Tamsin">Halt.</say>')).toEqual([
      { kind: "speech", who: "The guard", npc: "Old Tamsin", text: "Halt." },
    ]);
    expect(parseNarration('<say npc="Sereth">No name given.</say>')).toEqual([{ kind: "prose", text: "No name given." }]);
  });

  it("drops stray closing tags and empty speech", () => {
    expect(parseNarration('Quiet.</say>\n\n<say who="Sereth">  </say>')).toEqual([{ kind: "prose", text: "Quiet." }]);
  });
});

describe("plainNarration", () => {
  it("turns bubbles back into quoted speech", () => {
    expect(plainNarration('She smiles.\n\n<say who="Sereth">Hello.</say>')).toBe("She smiles.\n\nSereth: “Hello.”");
  });
});
