// Generates art proofs from the visual bible: node scripts/art-proof.mjs <scenes.json> <outDir> [takes]
// scenes.json is a list of { id, name, aspectRatio, request, references? } where request is an ImageRequest
// for composeImagePrompt and references is an optional list of { path, label } images sent alongside
// the prompt (paths relative to the scenes file) so a character keeps the same look.
// ONLY=wake-2,cell-1 reruns just those takes and merges them into the existing log.json.
// Runs at most 8 requests at once and waits out per-minute rate limits (HTTP 429). Needs GEMINI_API_KEY. Writes <id>-<take>.png and log.json (prompts included).
import fs from "node:fs";
import path from "node:path";
import { composeImagePrompt } from "../src/art/compose-image-prompt.ts";

const [scenesFile, outDir, takesArg = "1"] = process.argv.slice(2);
if (!scenesFile || !outDir) { console.error("usage: node scripts/art-proof.mjs <scenes.json> <outDir> [takes]"); process.exit(1); }
if (!process.env.GEMINI_API_KEY) { console.error("GEMINI_API_KEY is not set"); process.exit(1); }
const MODEL = process.env.IMAGE_MODEL || "gemini-3-pro-image";
const bible = JSON.parse(fs.readFileSync(new URL("../src/art/visual-bible.json", import.meta.url), "utf8"));
const scenes = JSON.parse(fs.readFileSync(scenesFile, "utf8"));
fs.mkdirSync(outDir, { recursive: true });

const MIME = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" };
const refParts = refs => (refs ?? []).map(r => {
  const file = path.resolve(path.dirname(scenesFile), r.path);
  return { inlineData: { mimeType: MIME[path.extname(file)], data: fs.readFileSync(file).toString("base64") } };
});
const refText = refs => refs?.length
  ? refs.map((r, i) => `Reference image ${i + 1} shows ${r.label}. Draw them exactly as in that image.`).join("\n") + "\n\n"
  : "";
const jobs = scenes.flatMap(s => Array.from({ length: Number(takesArg) }, (_, k) =>
  ({ ...s, out: `${s.id}-${k + 1}`, prompt: refText(s.references) + composeImagePrompt(bible, s.request) })));
const only = process.env.ONLY?.split(",");
const todo = only ? jobs.filter(j => only.includes(j.out)) : jobs;
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function generate(j) {
  for (let attempt = 1; ; attempt++) {
    const r = await request(j);
    if (r.res.status !== 429 || attempt === 4) return r;
    const wait = Number(/retry in ([\d.]+)s/.exec(r.body.error?.message ?? "")?.[1] ?? 30);
    console.log(`${j.out}: rate-limited, retrying in ${Math.ceil(wait)}s`);
    await sleep((wait + 2) * 1000);
  }
}
async function request(j) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
    body: JSON.stringify({ contents: [{ parts: [...refParts(j.references), { text: j.prompt }] }],
      generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: j.aspectRatio, imageSize: "1K" } } }),
  });
  return { res, body: await res.json() };
}
const results = [];
let next = 0;
await Promise.all(Array.from({ length: Math.min(8, todo.length) }, async () => {
  while (next < todo.length) results.push(await run(todo[next++]));
}));
async function run(j) {
  const t0 = Date.now();
  const { res, body } = await generate(j);
  const secs = Number(((Date.now() - t0) / 1000).toFixed(1));
  const part = body.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
  if (part) fs.writeFileSync(`${outDir}/${j.out}.png`, Buffer.from(part.inlineData.data, "base64"));
  const why = part ? undefined : body.candidates?.[0]?.finishReason ?? body.promptFeedback ?? body.error?.message ?? res.status;
  console.log(`${j.out}: ${part ? "ok" : "FAILED " + JSON.stringify(why)} (${secs}s)`);
  return { id: j.out, model: MODEL, ok: Boolean(part), secs, why, references: j.references?.map(r => r.path), prompt: j.prompt };
}
const logFile = `${outDir}/log.json`;
const earlier = only && fs.existsSync(logFile) ? JSON.parse(fs.readFileSync(logFile, "utf8")).filter(e => !only.includes(e.id)) : [];
fs.writeFileSync(logFile, JSON.stringify([...earlier, ...results].sort((a, b) => a.id.localeCompare(b.id)), null, 2));
