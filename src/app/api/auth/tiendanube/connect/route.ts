import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { signState } from "@/lib/tn-oauth-state";

export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://neto-app-alpha.vercel.app";

  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  }

  // Verificamos la sesión real contra Supabase — el uid que se usa para el
  // state es el del token verificado, nunca uno provisto por el cliente.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return NextResponse.json({ error: "invalid session" }, { status: 401 });
  }

  const state = signState(data.user.id);
  const authUrl = `https://www.tiendanube.com/apps/${process.env.TN_APP_ID}/authorize?state=${state}`;

  return NextResponse.json({ url: authUrl });
}
