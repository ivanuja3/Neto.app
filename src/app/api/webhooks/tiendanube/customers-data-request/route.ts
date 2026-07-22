import { NextRequest, NextResponse } from "next/server";
import { verifyTnWebhook } from "@/lib/tn-webhook";

export async function POST(req: NextRequest) {
  const { valid } = await verifyTnWebhook(req);
  if (!valid) return NextResponse.json({ error: "invalid signature" }, { status: 401 });

  return NextResponse.json({ ok: true });
}
