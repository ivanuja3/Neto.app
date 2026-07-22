"use client";

import { useState, useEffect } from "react";
import { X, Gift, MessageCircle } from "lucide-react";
import { useAuth } from "./auth-provider";

const TOUR_KEY = (uid: string) => `neto_tour_v1_${uid}`;
const OFFER_KEY = (uid: string) => `neto_guitafix_offer_seen_${uid}`;

function buildWaUrl(email?: string): string {
  const name = email ? email.split("@")[0].split(/[._\-+]/)[0] : "";
  const who  = name ? name.charAt(0).toUpperCase() + name.slice(1).toLowerCase() : "";
  const text = who
    ? `Hola Iván! Soy ${who}, soy cliente de Guitafix y quiero activar mi cuenta de Neto gratis mientras dure la demo.`
    : `Hola Iván! Soy cliente de Guitafix y quiero activar mi cuenta de Neto gratis mientras dure la demo.`;
  return `https://wa.me/5493518551669?text=${encodeURIComponent(text)}`;
}

// Se muestra una sola vez por usuario, después del tour guiado (para no
// competir con ese modal en el primer login). En usuarios que ya vieron
// el tour antes de que esto existiera, aparece en su próximo ingreso.
export function GuitafixOfferModal() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!user) return;
    const tourSeen  = !!localStorage.getItem(TOUR_KEY(user.id));
    const offerSeen = !!localStorage.getItem(OFFER_KEY(user.id));
    if (tourSeen && !offerSeen) setVisible(true);
  }, [user]);

  function close() {
    if (user) localStorage.setItem(OFFER_KEY(user.id), "1");
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
          href={buildWaUrl(user?.email)}
          target="_blank"
          rel="noopener noreferrer"
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
