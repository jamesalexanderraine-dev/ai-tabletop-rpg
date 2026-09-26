#!/bin/bash
# Installs dependencies when a Claude Code on the web session starts, so
# typecheck, tests and the dev server work right away.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"
npm install --no-audit --no-fund

if [ -z "${ANTHROPIC_API_KEY:-}" ]; then
  echo "Note: ANTHROPIC_API_KEY is not set in this cloud environment. The DM can't call Claude until it is (see README, 'API key')."
fi
