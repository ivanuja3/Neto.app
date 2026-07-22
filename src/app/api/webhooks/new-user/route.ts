import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const SECRET   = process.env.SUPABASE_WEBHOOK_SECRET;
const TO_EMAIL = "ujaldonivan3@gmail.com";

function getResend() {
  // Eliminar BOM (0xFEFF) que PowerShell puede insertar al guardar la env var
  const key = process.env.RESEND_API_KEY?.replace(/^﻿/, "").trim();
  return key ? new Resend(key) : null;
}

export async function POST(req: NextRequest) {
  // Validar secret
  if (SECRET) {
    const incoming = req.headers.get("x-webhook-secret");
    if (incoming !== SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const body = await req.json();

  // Solo INSERT en companies
  if (body.type !== "INSERT" || body.table !== "companies") {
    return NextResponse.json({ ok: true });
  }

  const r        = body.record ?? {};
  const nombre   = (r.name ?? "Sin nombre") as string;
  const email    = (r.email ?? "") as string;
  const telefono = (r.phone ?? "") as string;
  const rubro    = (r.industry ?? "—") as string;

  const waNum  = telefono.replace(/\D/g, "");
  const waLink = waNum
    ? `https://wa.me/${waNum.startsWith("54") ? waNum : "54" + waNum}?text=${encodeURIComponent(`Hola! Vi que te acabas de registrar en Neto.app. Soy Iván, el creador. ¿Cómo te puedo ayudar?`)}`
    : null;

  const resend = getResend();
  if (!resend) {
    console.log("[new-user webhook] RESEND_API_KEY no configurada — usuario:", nombre, email);
    return NextResponse.json({ ok: true });
  }

  try {
    await resend.emails.send({
      from:    "Neto.app <noreply@mail.guitafix.online>",
      to:      TO_EMAIL,
      subject: `Nuevo usuario en Neto.app: ${nombre}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="color:#10B981;margin-bottom:4px">Nuevo usuario registrado</h2>
          <p style="color:#64748B;margin-top:0;font-size:14px">Neto.app</p>

          <table style="width:100%;border-collapse:collapse;margin:20px 0">
            <tr>
              <td style="padding:8px 0;color:#94A3B8;font-size:13px;width:120px">Negocio</td>
              <td style="padding:8px 0;color:#F1F5F9;font-size:14px;font-weight:600">${nombre}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#94A3B8;font-size:13px">Email</td>
              <td style="padding:8px 0;color:#F1F5F9;font-size:14px">${email || "—"}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#94A3B8;font-size:13px">WhatsApp</td>
              <td style="padding:8px 0;color:#F1F5F9;font-size:14px">${telefono || "No cargó aún"}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#94A3B8;font-size:13px">Rubro</td>
              <td style="padding:8px 0;color:#F1F5F9;font-size:14px">${rubro}</td>
            </tr>
          </table>

          ${waLink ? `
          <a href="${waLink}"
             style="display:inline-block;background:#25D366;color:#fff;font-weight:700;font-size:14px;padding:12px 24px;border-radius:12px;text-decoration:none;margin-top:8px">
            Escribirle por WhatsApp →
          </a>` : `<p style="color:#64748B;font-size:13px">Todavía no cargó su WhatsApp. Podés escribirle al email.</p>`}
        </div>
      `,
    });
  } catch (err) {
    console.error("[new-user webhook] Error enviando email:", err);
  }

  return NextResponse.json({ ok: true });
}
