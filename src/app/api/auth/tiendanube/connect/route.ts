import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("uid");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://neto-app-alpha.vercel.app";

  if (!userId) {
    return NextResponse.redirect(`${appUrl}/configuracion?error=no_user`);
  }

  const state = Buffer.from(userId).toString("base64url");
  const authUrl = `https://www.tiendanube.com/apps/${process.env.TN_APP_ID}/authorize?state=${state}`;

  return NextResponse.redirect(authUrl);
}
