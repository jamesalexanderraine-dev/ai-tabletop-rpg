import { NextResponse } from "next/server";
import { dmModel, hasAnthropicKey } from "@/dm/config";

// Lets you confirm from a phone that a deploy is live and has its API key.
// Reports only whether the key is set, never the key itself.
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    ok: true,
    anthropicKeyConfigured: hasAnthropicKey(),
    dmModel: dmModel(),
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
  });
}
