import { createHmac, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

const SIGNATURE_HEADER = "x-linkedstore-hmac-sha256";

// Tiendanube firma cada webhook con HMAC-SHA256 usando el secret de la app
// como clave sobre el body crudo. Sin esto, cualquiera puede simular un
// webhook (ver Daily/2026-07-22 — store-redact borraba integraciones sin
// validar el origen).
export async function verifyTnWebhook(
  req: NextRequest
): Promise<{ valid: boolean; body: unknown }> {
  const secret = process.env.TN_APP_SECRET;
  const signature = req.headers.get(SIGNATURE_HEADER);
  const rawBody = await req.text();

  if (!secret || !signature) return { valid: false, body: null };

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  const valid = sigBuf.length === expBuf.length && timingSafeEqual(sigBuf, expBuf);

  let body: unknown = null;
  try {
    body = JSON.parse(rawBody);
  } catch {
    body = null;
  }

  return { valid, body };
}
