import { describe, expect, it } from "vitest";
import bible from "./visual-bible.json";
import { composeImagePrompt, type VisualBible } from "./compose-image-prompt";

const b = bible as VisualBible;
const loc = (id: string) => b.locations[id]!;
const char = (id: string) => b.characters[id]!;

describe("composeImagePrompt", () => {
  it("leads with the action and ends with the locked style and framing", () => {
    const p = composeImagePrompt(b, { kind: "moment", action: "A table flies at the viewer.", location: "rooted-city" });
    expect(p.startsWith("A table flies at the viewer.")).toBe(true);
    expect(p).toContain(loc("rooted-city").look);
    expect(p.endsWith(b.style.framing)).toBe(true);
  });

  it("adds the empty-scene rule only to location shots", () => {
    const empty = composeImagePrompt(b, { kind: "location", action: "The cell, empty.", location: "prison-cell" });
    const moment = composeImagePrompt(b, { kind: "moment", action: "A guard looks in.", location: "prison-cell", characters: ["prison-guard"] });
    expect(empty).toContain(b.style.emptySceneRule);
    expect(moment).not.toContain(b.style.emptySceneRule);
  });

  it("describes every character from its sheet and merges the do-not-draw lists", () => {
    const p = composeImagePrompt(b, { kind: "moment", action: "x", location: "council-chamber", characters: ["mazirian", "rimwald"] });
    expect(p).toContain(char("mazirian").outfit);
    expect(p).toContain(char("rimwald").face);
    expect(p).toMatch(/Do not draw: .*torches.*red rock.*pointed hat/);
  });

  it("takes a portrait's region from its character and only reveals true forms on request", () => {
    const human = composeImagePrompt(b, { kind: "portrait", action: "x", characters: ["skin-witch"] });
    const revealed = composeImagePrompt(b, { kind: "moment", action: "x", characters: ["skin-witch"], revealTrueForm: ["skin-witch"] });
    expect(human).toContain(b.regions["north"]!.palette!);
    expect(human).not.toContain("True form");
    expect(revealed).toContain(char("skin-witch").trueForm!);
  });

  it("throws on an unknown id instead of silently drawing something else", () => {
    expect(() => composeImagePrompt(b, { kind: "portrait", action: "x", characters: ["nobody"] })).toThrow(/nobody/);
  });

  it("every character and location points at a region that exists", () => {
    for (const s of [...Object.values(b.characters), ...Object.values(b.locations)]) {
      expect(b.regions[s.region], s.name).toBeDefined();
    }
  });

  it("keeps indoor shots indoors: region palette and dress, not its landscape", () => {
    const p = composeImagePrompt(b, { kind: "moment", action: "x", location: "prison-cell", characters: ["prison-guard"], crowd: true });
    expect(p).not.toContain(b.regions["breadbasket"]!.look);
    expect(p).toContain(b.regions["breadbasket"]!.people);
  });
});
