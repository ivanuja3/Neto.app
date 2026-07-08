import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://neto-app-alpha.vercel.app";

  if (!code || !state) {
    return NextResponse.redirect(`${appUrl}/configuracion?error=tn_missing_params`);
  }

  let userId: string;
  try {
    userId = Buffer.from(state, "base64url").toString();
    if (!userId || userId.length < 10) throw new Error("invalid");
  } catch {
    return NextResponse.redirect(`${appUrl}/configuracion?error=tn_invalid_state`);
  }

  // Exchange authorization code for access token
  const tokenRes = await fetch("https://www.tiendanube.com/apps/authorize/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Neto/1.0 (soporte.online.home@gmail.com)",
    },
    body: JSON.stringify({
      client_id: process.env.TN_APP_ID,
      client_secret: process.env.TN_APP_SECRET,
      grant_type: "authorization_code",
      code,
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    console.error("TN token exchange failed:", err);
    return NextResponse.redirect(`${appUrl}/configuracion?error=tn_token_failed`);
  }

  const tokenData = await tokenRes.json();
  const { access_token, user_id: storeId } = tokenData;

  if (!access_token || !storeId) {
    console.error("TN token response missing fields:", JSON.stringify(tokenData));
    return NextResponse.redirect(`${appUrl}/configuracion?error=tn_token_failed`);
  }

  const supabase = adminClient();
  const { error } = await supabase.from("integrations" as never).upsert(
    {
      user_id: userId,
      channel: "tiendanube",
      access_token,
      store_id: String(storeId),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,channel" }
  );

  if (error) {
    console.error("Supabase upsert error:", error);
    return NextResponse.redirect(`${appUrl}/configuracion?error=tn_save_failed`);
  }

  return NextResponse.redirect(`${appUrl}/configuracion?connected=tiendanube`);
}
