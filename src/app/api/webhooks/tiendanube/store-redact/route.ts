import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase-admin";
import { verifyTnWebhook } from "@/lib/tn-webhook";

export async function POST(req: NextRequest) {
  const { valid, body: parsed } = await verifyTnWebhook(req);
  if (!valid) return NextResponse.json({ error: "invalid signature" }, { status: 401 });

  const body = (parsed ?? {}) as { store_id?: string | number };
  const storeId = body?.store_id ? String(body.store_id) : null;

  if (storeId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = adminClient() as any;
    await supabase
      .from("integrations")
      .delete()
      .eq("channel", "tiendanube")
      .eq("store_id", storeId);
  }

  return NextResponse.json({ ok: true });
}
