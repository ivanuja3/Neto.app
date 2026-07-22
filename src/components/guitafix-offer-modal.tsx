"use client";

import { useState, useEffect } from "react";
import { X, Gift, MessageCircle } from "lucide-react";

const OFFER_KEY = "neto_landing_guitafix_offer_seen";

const WA_GUITAFIX = "https://wa.me/5493518551669?text=" + encodeURIComponent(
  "Hola Iván! Soy cliente de Guitafix y quiero activar mi cuenta de Neto gratis mientras dure la demo."
);

// Cartel de la landing pública (no dentro de la app) — se muestra una vez
// por navegador a cualquier visitante que entra a netoapp.vercel.app.
export function GuitafixOfferModal() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(OFFER_KEY)) {
      const t = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(t);
    }
  }, []);

  function close() {
    localStorage.setItem(OFFER_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(6,13,25,0.85)", backdropFilter: "blur(6px)" }}>
      <div
        className="relative w-full max-w-sm rounded-2xl border border-white/[0.10] p-7 shadow-2xl"
        style={{ background: "#0C1424" }}
      >
        <button
          onClick={close}
          className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-lg text-[#475569] hover:bg-white/[0.08] hover:text-[#F1F5F9] transition-colors"
          aria-label="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 bg-[#10B981]/[0.14]">
          <Gift className="w-7 h-7 text-[#10B981]" />
        </div>

        <h2 className="text-lg font-bold text-[#F1F5F9] mb-2 leading-snug">
          ¿Sos cliente de Guitafix?
        </h2>
        <p className="text-sm text-[#94A3B8] leading-relaxed mb-1">
          Te damos de alta la cuenta de Neto gratis mientras dure la demo. Escribile
          a Iván por WhatsApp y te la activa.
        </p>

        <a
          href={WA_GUITAFIX}
          target="_blank"
          rel="noopener noreferrer"
          onClick={close}
          className="flex items-center justify-center gap-2 mt-5 bg-[#25D366] hover:bg-[#1fb855] active:scale-95 transition-all text-white font-semibold text-sm px-5 py-2.5 rounded-xl shadow-[0_4px_16px_rgba(37,211,102,0.20)]"
        >
          <MessageCircle className="w-4 h-4" />
          Escribirle a Iván por WhatsApp
        </a>

        <button
          onClick={close}
          className="w-full text-center text-xs text-[#475569] hover:text-[#94A3B8] transition-colors mt-4"
        >
          No soy cliente de Guitafix
        </button>
      </div>
    </div>
  );
}
