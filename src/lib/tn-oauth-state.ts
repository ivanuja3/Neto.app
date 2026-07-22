import { createHmac, timingSafeEqual } from "crypto";

// El "state" del OAuth de Tiendanube antes era solo base64url(userId), sin
// firma: cualquiera podía armar /api/auth/tiendanube/connect?uid=<otro-uuid>
// y hacer que el token de OTRA tienda quedara vinculado a esa cuenta ajena
// (o al revés, robar el token de una tienda real). Se firma con HMAC para
// que el callback solo confíe en un state generado por nuestro propio server
// después de verificar la sesión real del usuario.
function secret(): string {
  const s = process.env.TN_APP_SECRET;
  if (!s) throw new Error("TN_APP_SECRET no configurado");
  return s;
}

export function signState(userId: string): string {
  const sig = createHmac("sha256", secret()).update(userId).digest("hex");
  return Buffer.from(`${userId}.${sig}`).toString("base64url");
}

export function verifyState(state: string): string | null {
  let decoded: string;
  try {
    decoded = Buffer.from(state, "base64url").toString();
  } catch {
    return null;
  }
  const sepIdx = decoded.lastIndexOf(".");
  if (sepIdx === -1) return null;

  const userId = decoded.slice(0, sepIdx);
  const sig = decoded.slice(sepIdx + 1);
  const expected = createHmac("sha256", secret()).update(userId).digest("hex");

  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null;

  return userId;
}
