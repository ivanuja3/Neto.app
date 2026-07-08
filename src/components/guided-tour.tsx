"use client";

import { useState, useEffect } from "react";
import { X, LayoutDashboard, ShoppingCart, TrendingUp, Megaphone, ArrowRight, Sparkles } from "lucide-react";
import { useAuth } from "./auth-provider";

const TOUR_KEY = (uid: string) => `neto_tour_v1_${uid}`;

const STEPS = [
  {
    icon: Sparkles,
    accent: "#10B981",
    title: "Bienvenido a Neto",
    desc: "Tu herramienta de gestión y rentabilidad para ecommerce. En 2 minutos te mostramos cómo funciona todo.",
    hint: null,
  },
  {
    icon: LayoutDashboard,
    accent: "#10B981",
    title: "Dashboard",
    desc: "Es tu pantalla principal. Vas a ver ingresos, margen neto (CM3), ROAS real y MER en tiempo real. También un semáforo que te dice si tu negocio está saludable.",
    hint: "Menú → Dashboard",
  },
  {
    icon: ShoppingCart,
    accent: "#3B82F6",
    title: "Operaciones",
    desc: "Acá manejás el día a día: registrás ventas, controlás el inventario, seguís a tus clientes y gestionás proveedores. Todo en un solo lugar.",
    hint: "Menú → Ventas / Inventario / Clientes / Proveedores",
  },
  {
    icon: TrendingUp,
    accent: "#F59E0B",
    title: "Análisis",
    desc: "Tu laboratorio de rentabilidad. Márgenes por producto, costos fijos, flujo de caja y proyecciones hacia adelante. Acá entendés si estás ganando o perdiendo de verdad.",
    hint: "Menú → Márgenes / Costos / Flujo / Proyecciones",
  },
  {
    icon: Megaphone,
    accent: "#8B5CF6",
    title: "Crecimiento",
    desc: "Conectá tus Meta Ads para ver el ROAS real post-comisiones. Gestioná tus impuestos AR y pedile consejo a Neto IA cuando no sepas qué hacer.",
    hint: "Menú → Meta Ads / Impuestos / Neto IA",
  },
  {
    icon: Sparkles,
    accent: "#10B981",
    title: "¡Listo para arrancar!",
    desc: "Completá los 4 pasos del checklist en el dashboard y tus métricas empiezan a aparecer solas. Cualquier duda, Neto IA te ayuda.",
    hint: null,
  },
];

export function GuidedTour() {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (!localStorage.getItem(TOUR_KEY(user.id))) {
      setVisible(true);
    }
  }, [user]);

  function close() {
    if (user) localStorage.setItem(TOUR_KEY(user.id), "1");
    setVisible(false);
  }

  function next() {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      close();
    }
  }

  if (!visible) return null;

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(6,13,25,0.85)", backdropFilter: "blur(6px)" }}>
      <div
        className="relative w-full max-w-sm rounded-2xl border border-white/[0.10] p-7 shadow-2xl"
        style={{ background: "#0C1424" }}
      >
        {/* Close */}
        <button
          onClick={close}
          className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-lg text-[#475569] hover:bg-white/[0.08] hover:text-[#F1F5F9] transition-colors"
          aria-label="Cerrar tour"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Step dots */}
        <div className="flex items-center gap-1.5 mb-6">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className="rounded-full transition-all duration-300"
              style={{
                width:  i === step ? 20 : 6,
                height: 6,
                background: i === step ? current.accent : i < step ? `${current.accent}50` : "rgba(255,255,255,0.10)",
              }}
            />
          ))}
        </div>

        {/* Icon */}
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
          style={{ background: `${current.accent}18` }}
        >
          <Icon className="w-7 h-7" style={{ color: current.accent }} />
        </div>

        {/* Content */}
        <h2 className="text-lg font-bold text-[#F1F5F9] mb-2 leading-snug">{current.title}</h2>
        <p className="text-sm text-[#94A3B8] leading-relaxed mb-1">{current.desc}</p>

        {current.hint && (
          <p className="text-[11px] text-[#475569] bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-1.5 mt-3 font-mono">
            {current.hint}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between mt-7">
          <button
            onClick={close}
            className="text-xs text-[#475569] hover:text-[#94A3B8] transition-colors"
          >
            Saltar tour
          </button>
          <button
            onClick={next}
            className="flex items-center gap-2 text-sm font-semibold px-5 py-2 rounded-xl transition-all active:scale-95"
            style={{ background: current.accent, color: "#080E1A" }}
          >
            {isLast ? "¡Empecemos!" : "Siguiente"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
