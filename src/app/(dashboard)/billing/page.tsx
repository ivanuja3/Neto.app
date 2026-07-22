"use client";

import { MessageCircle, Check, Clock, Zap, Sparkles } from "lucide-react";
import { useCompany } from "@/components/company-provider";

function daysLeft(trialEndsAt: string | null | undefined): number {
  if (!trialEndsAt) return 0;
  return Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86_400_000));
}

const PLANS = [
  {
    id: "starter",
    label: "Starter",
    price: "$19",
    period: "USD / mes",
    desc: "Para negocios en crecimiento",
    icon: Zap,
    accent: "#3B82F6",
    features: [
      "Hasta 300 órdenes / mes",
      "Dashboard + KPIs en tiempo real",
      "Ventas, inventario y clientes",
      "Costos fijos y flujo de caja",
      "Impuestos AR",
      "Soporte por WhatsApp",
    ],
  },
  {
    id: "pro",
    label: "Pro",
    price: "$29",
    period: "USD / mes",
    desc: "Para escalar sin límites",
    icon: Sparkles,
    accent: "#10B981",
    popular: true,
    features: [
      "Órdenes ilimitadas",
      "Todo lo de Starter",
      "Meta Ads integrado (ROAS real)",
      "Proyecciones y márgenes",
      "Neto IA incluido",
      "Soporte prioritario",
    ],
  },
];

function buildWaText(plan: string) {
  return encodeURIComponent(
    `Hola Iván! Quiero activar el plan ${plan === "pro" ? "Pro" : "Starter"} de Neto.app.`
  );
}

export default function BillingPage() {
  const { company } = useCompany();

  const isExpired =
    company?.subscription_status === "past_due" ||
    company?.subscription_status === "canceled";
  const isTrialing = company?.subscription_status === "trialing";
  const isActive = company?.subscription_status === "active";
  const days = daysLeft(company?.trial_ends_at);

  return (
    <div className="p-6 pb-16 max-w-2xl mx-auto">

      {/* Estado actual */}
      <div className="mb-8">
        {isActive ? (
          <div className="flex items-center gap-3 bg-[#10B981]/08 border border-[#10B981]/20 rounded-xl px-5 py-4">
            <div className="w-9 h-9 rounded-lg bg-[#10B981]/15 flex items-center justify-center shrink-0">
              <Check className="w-5 h-5 text-[#10B981]" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#F1F5F9]">Plan activo</p>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                Tu suscripción está al día. Cualquier cambio escribile a Iván.
              </p>
            </div>
          </div>
        ) : isExpired ? (
          <div className="flex items-center gap-3 bg-[#EF4444]/08 border border-[#EF4444]/20 rounded-xl px-5 py-4">
            <div className="w-9 h-9 rounded-lg bg-[#EF4444]/15 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-[#EF4444]" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#F1F5F9]">Tu período de prueba terminó</p>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                Elegí un plan para seguir usando Neto con todos tus datos.
              </p>
            </div>
          </div>
        ) : isTrialing ? (
          <div
            className="flex items-center gap-3 rounded-xl px-5 py-4"
            style={{
              background: days <= 3 ? "rgba(239,68,68,0.07)" : "rgba(245,158,11,0.07)",
              border: `1px solid ${days <= 3 ? "rgba(239,68,68,0.18)" : "rgba(245,158,11,0.18)"}`,
            }}
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: days <= 3 ? "rgba(239,68,68,0.14)" : "rgba(245,158,11,0.14)" }}
            >
              <Clock className="w-5 h-5" style={{ color: days <= 3 ? "#EF4444" : "#F59E0B" }} />
            </div>
            <div>
              <p className="text-sm font-bold text-[#F1F5F9]">
                {days <= 3
                  ? `¡Últimos ${days} día${days !== 1 ? "s" : ""} de prueba!`
                  : `Período de prueba — ${days} días restantes`}
              </p>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                Elegí tu plan antes de que venza para no perder el acceso.
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {/* Título */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#F1F5F9]">Elegí tu plan</h1>
        <p className="text-sm text-[#64748B] mt-1">
          Precios en USD · cobro manual en ARS al tipo de cambio MEP · sin tarjeta
        </p>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {PLANS.map((plan) => {
          const Icon = plan.icon;
          return (
            <div
              key={plan.id}
              className="relative rounded-2xl border p-5 flex flex-col gap-4"
              style={{
                background: plan.popular ? `${plan.accent}07` : "#0C1424",
                borderColor: plan.popular ? `${plan.accent}35` : "rgba(255,255,255,0.07)",
                boxShadow: plan.popular ? `0 0 32px ${plan.accent}12` : "none",
              }}
            >
              {plan.popular && (
                <span
                  className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full"
                  style={{ background: plan.accent, color: "#080E1A" }}
                >
                  Más popular
                </span>
              )}

              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${plan.accent}18` }}
                  >
                    <Icon className="w-4.5 h-4.5" style={{ color: plan.accent }} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#F1F5F9]">{plan.label}</p>
                    <p className="text-[11px] text-[#64748B]">{plan.desc}</p>
                  </div>
                </div>
              </div>

              {/* Precio */}
              <div className="flex items-end gap-1">
                <span className="text-3xl font-black text-[#F1F5F9] leading-none">{plan.price}</span>
                <span className="text-xs text-[#64748B] mb-0.5">{plan.period}</span>
              </div>

              {/* Features */}
              <ul className="space-y-2 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-[#94A3B8]">
                    <Check
                      className="w-3.5 h-3.5 mt-0.5 shrink-0"
                      style={{ color: plan.accent }}
                    />
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <a
                href={`https://wa.me/5493518551669?text=${buildWaText(plan.id)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
                style={
                  plan.popular
                    ? { background: plan.accent, color: "#080E1A" }
                    : { background: "rgba(255,255,255,0.06)", color: "#F1F5F9", border: "1px solid rgba(255,255,255,0.08)" }
                }
              >
                <MessageCircle className="w-4 h-4" />
                Activar {plan.label}
              </a>
            </div>
          );
        })}
      </div>

      {/* Nota al pie */}
      <p className="text-xs text-[#334155] text-center leading-relaxed">
        ¿Tenés dudas sobre qué plan elegir?{" "}
        <a
          href="https://wa.me/5493518551669"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#10B981] hover:opacity-80 transition-opacity"
        >
          Escribile a Iván
        </a>{" "}
        y te ayuda a elegir.
      </p>
    </div>
  );
}
