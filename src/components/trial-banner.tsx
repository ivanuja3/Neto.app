"use client";

import { useState } from "react";
import Link from "next/link";
import { Clock, ArrowRight, X } from "lucide-react";
import { useCompany } from "./company-provider";

function daysRemaining(trialEndsAt: string | null): number {
  if (!trialEndsAt) return 0;
  const diff = new Date(trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function TrialBanner() {
  const { company, loading } = useCompany();
  const [dismissed, setDismissed] = useState(false);

  if (loading || dismissed || !company) return null;
  if (company.subscription_status !== "trialing") return null;

  const days = daysRemaining(company.trial_ends_at ?? null);
  if (days <= 0) return null;

  const urgent  = days <= 3;
  const warning = days <= 7;

  const color  = urgent ? "#EF4444" : warning ? "#F59E0B" : "#10B981";
  const bg     = urgent ? "rgba(239,68,68,0.08)" : warning ? "rgba(245,158,11,0.07)" : "rgba(16,185,129,0.06)";
  const border = urgent ? "rgba(239,68,68,0.18)" : warning ? "rgba(245,158,11,0.18)" : "rgba(16,185,129,0.14)";

  const label = urgent
    ? `¡Últimos ${days} día${days !== 1 ? "s" : ""} de prueba!`
    : `Prueba gratuita · ${days} día${days !== 1 ? "s" : ""} restante${days !== 1 ? "s" : ""}`;

  return (
    <div
      className="flex items-center justify-between gap-3 px-4 py-2 text-xs shrink-0"
      style={{ background: bg, borderBottom: `1px solid ${border}` }}
    >
      <div className="flex items-center gap-1.5 font-medium" style={{ color }}>
        <Clock className="w-3.5 h-3.5 shrink-0" />
        {label}
      </div>
      <div className="flex items-center gap-3">
        <Link
          href="/billing"
          className="flex items-center gap-1 font-semibold hover:opacity-75 transition-opacity"
          style={{ color }}
        >
          Activar plan <ArrowRight className="w-3 h-3" />
        </Link>
        {!urgent && (
          <button
            onClick={() => setDismissed(true)}
            className="opacity-40 hover:opacity-70 transition-opacity"
            style={{ color }}
            aria-label="Cerrar aviso"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
