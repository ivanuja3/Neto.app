import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
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
