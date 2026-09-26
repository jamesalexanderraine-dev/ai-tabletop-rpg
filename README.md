# AI Dungeon Master RPG

A single-player RPG where an LLM Dungeon Master improvises the story and rules on anything you try. See [`docs/DESIGN.md`](docs/DESIGN.md) for the design and build plan, and [`CLAUDE.md`](CLAUDE.md) for how agents work in this repo.

## Developing from your phone

This repo is set up for [Claude Code on the web](https://claude.ai/code), including the Claude mobile app:

1. Start a session on this repo and describe a task (for example, "Start Milestone 1: the text-only DM loop").
2. A session-start hook (`.claude/hooks/session-start.sh`) installs dependencies, so Claude can run `npm run check` and `npm run build` straight away.
3. Claude pushes a branch and opens a pull request. CI (`.github/workflows/ci.yml`) runs typecheck, tests and a build, and Vercel posts a preview link you can playtest on your phone.

## API key

The game calls Claude through the Anthropic API, so it needs an `ANTHROPIC_API_KEY`. It goes in two places, and never in the repo or in a chat message.

**1. Claude Code cloud environment** (so Claude can run the DM while building and testing)

1. Create a key at [console.anthropic.com](https://console.anthropic.com) → API Keys.
2. In Claude Code on the web, open the cloud environment menu in the session's title bar and choose **Edit**.
3. Under environment variables, add `ANTHROPIC_API_KEY=<your key>` and save.
4. Start a new session (running sessions don't pick up the change) and ask Claude to run `npm run check:api`. It should print a one-line tavern greeting.

**2. Vercel** (so the preview links can call Claude)

In the Vercel project: Settings → Environment Variables → add `ANTHROPIC_API_KEY`, ticked for Preview and Production. `/api/health` on any deploy reports `"anthropicKeyConfigured": true` once it's picked up.

Changing a variable does not update deploys that already exist. After adding or replacing the key, redeploy (Deployments → ⋯ on the latest one → Redeploy), or push a new commit to the pull request. If the game says Anthropic didn't accept the key, the deploy is usually still running with an old key.

Optional: set `DM_MODEL` in either place to change which Claude model plays the DM (default `claude-opus-5`).

## Preview deploys (one-time setup)

1. Create a free Hobby account at [vercel.com/signup](https://vercel.com/signup) with **Continue with GitHub**. Nothing creates one for you; signing in before it exists shows "Social Account is not yet connected".
2. **Add New → Project**, import `ai-tabletop-rpg`. Vercel detects Next.js; keep the defaults.
3. Add `ANTHROPIC_API_KEY` as above.

From then on, every pull request gets its own preview URL in a PR comment, and merges to `main` deploy to production.

## Local development

```bash
npm install
cp .env.example .env.local   # then fill in ANTHROPIC_API_KEY
npm run dev                  # http://localhost:3000
npm run check                # typecheck + tests
```
