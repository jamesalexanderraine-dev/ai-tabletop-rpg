// Smoke test: confirms ANTHROPIC_API_KEY is set and works, using one tiny request.
// Usage: npm run check:api
import Anthropic from "@anthropic-ai/sdk";

if (!process.env.ANTHROPIC_API_KEY?.trim()) {
  console.error(
    "ANTHROPIC_API_KEY is not set.\n" +
      "- Claude Code on the web: add it as an environment variable in the cloud environment's settings, then start a new session.\n" +
      "- Local: put it in .env.local (see .env.example) and export it in your shell.",
  );
  process.exit(1);
}

const model = process.env.DM_MODEL?.trim() || "claude-opus-5";
const client = new Anthropic();

try {
  const response = await client.messages.create({
    model,
    max_tokens: 1024,
    output_config: { effort: "low" },
    messages: [{ role: "user", content: "In one short sentence, greet a new adventurer at the tavern door." }],
  });
  const text = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  console.log(`OK (${model}): ${text.trim()}`);
} catch (err) {
  if (err instanceof Anthropic.AuthenticationError) {
    console.error("The API key was rejected (401). Check that it was copied correctly.");
  } else if (err instanceof Anthropic.PermissionDeniedError) {
    console.error(`The key can't use ${model} (403). Check the key's workspace or set DM_MODEL.`);
  } else if (err instanceof Anthropic.APIError) {
    console.error(`API error ${err.status}: ${err.message}`);
  } else {
    console.error("Request failed:", err);
  }
  process.exit(1);
}
