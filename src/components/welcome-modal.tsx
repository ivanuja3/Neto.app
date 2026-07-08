"use client";

import { useEffect, useState } from "react";
import { MessageCircle, X } from "lucide-react";

function buildWaUrl(displayName: string, businessName?: string) {
  const who = businessName && businessName !== "Mi negocio" ? businessName : displayName;
  const text = who
    ? `Hola Iván! Soy ${who}, acabo de entrar a Neto.app y quiero configurar mi cuenta.`
    : `Hola Iván! Acabo de entrar a Neto.app y quiero configurar mi cuenta.`;
  return `https://wa.me/5493518551669?text=${encodeURIComponent(text)}`;
}

function getFirstName(email: string | undefined): string {
  if (!email) return "";
  const local = email.split("@")[0];
  const name = local.split(/[._\-+]/)[0];
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

export function WelcomeModal({
  userId,
  email,
  businessName,
}: {
  userId: string;
  email?: string;
  businessName?: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const key = `neto_welcomed_${userId}`;
    if (!localStorage.getItem(key)) {
      setOpen(true);
      localStorage.setItem(key, "1");
    }
  }, [userId]);

  if (!open) return null;

  const displayName = getFirstName(email);
  const waUrl = buildWaUrl(displayName, businessName);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl">
        {/* Header verde */}
        <div className="bg-gradient-to-br from-[#10B981] to-[#059669] px-6 pt-8 pb-10 flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
            <MessageCircle className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white text-center">
            {displayName
              ? `¡Bienvenido, ${displayName}!`
              : "¡Bienvenido a Neto.app!"}
          </h2>
        </div>

        {/* Body */}
        <div className="bg-[#0C1424] border border-white/[0.08] border-t-0 rounded-b-2xl px-6 py-6 flex flex-col gap-4">
          <p className="text-sm text-[#94A3B8] text-center leading-relaxed">
            Soy Iván, contador y creador de la app. Si necesitás ayuda para configurar tu cuenta o tenés alguna duda, escribime directamente.
          </p>

          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1fb855] active:scale-95 transition-all text-white font-semibold text-sm px-5 py-3 rounded-xl shadow-[0_4px_16px_rgba(37,211,102,0.25)]"
          >
            <MessageCircle className="w-4 h-4" />
            Escribirle por WhatsApp
          </a>

          <button
            onClick={() => setOpen(false)}
            className="text-sm text-[#475569] hover:text-[#94A3B8] transition-colors text-center"
          >
            Después
          </button>
        </div>

        {/* X cerrar */}
        <button
          onClick={() => setOpen(false)}
          className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
        >
          <X className="w-3.5 h-3.5 text-white" />
        </button>
      </div>
    </div>
  );
}
