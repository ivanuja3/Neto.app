"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { getAdSummary } from "@/lib/db/campaigns";
import { getPnlMonthly } from "@/lib/db/analytics";
import { AlertTriangle, CheckCircle } from "lucide-react";
import { formatARS } from "@/lib/mock-data";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer,
} from "recharts";

const MES_LABELS: Record<string, string> = {
  "01": "Ene", "02": "Feb", "03": "Mar", "04": "Abr",
  "05": "May", "06": "Jun", "07": "Jul", "08": "Ago",
  "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dic",
};
function mesLabel(yyyymm: string) {
  return MES_LABELS[yyyymm.split("-")[1]] ?? yyyymm;
}

type AdMetric = { mes: string; gasto: number; ingresos: number; roasReal: number; cpa: number };
type Summary  = { spend: number; revenue: number; roas: number; ctr: number; cpa: number; impressions: number; clicks: number; campaigns: number } | null;
type PnlRow   = { mes: string; ingresos: number; marketing: number; cm3_pct: number };

export default function AdsPage() {
  const { user }  = useAuth();
  const [loading, setLoading]     = useState(true);
  const [summary, setSummary]     = useState<Summary>(null);
  const [adMetrics, setAdMetrics] = useState<AdMetric[]>([]);

  useEffect(() => {
    if (!user) return;
    async function load() {
      try {
        const [sumRes, pnlRes] = await Promise.all([
          getAdSummary(user!.id),
          getPnlMonthly(user!.id, 6),
        ]);
        setSummary(sumRes);

        const rows = (pnlRes.data ?? []) as PnlRow[];
        const metrics: AdMetric[] = rows.map((r) => {
          const gasto    = Number(r.marketing);
          const ingresos = Number(r.ingresos);
          const roasReal = gasto > 0 ? +(ingresos / gasto).toFixed(2) : 0;
          const cpa      = ingresos > 0 && gasto > 0
            ? +(gasto / Math.max(ingresos / 15000, 1)).toFixed(0)
            : 0;
          return { mes: mesLabel(r.mes), gasto, ingresos, roasReal, cpa };
        });
        setAdMetrics(metrics);
      } catch (err) {
        console.error("AdsPage load error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  /* ── Derived metric cards ── */
  const prevMonth  = adMetrics[adMetrics.length - 2];
  const metrics = [
    { label: "Gasto total",  value: loading ? "—" : formatARS(summary?.spend ?? 0),    sub: "campañas activas",                color: "#F1F5F9", accent: "#475569" },
    { label: "ROAS Real",    value: loading ? "—" : `${summary?.roas?.toFixed(2) ?? 0}x`,  sub: prevMonth ? `vs ${prevMonth.roasReal.toFixed(2)}x mes ant.` : "ingresos / gasto", color: "#F59E0B", accent: "#F59E0B" },
    { label: "MER",          value: loading ? "—" : (summary && summary.spend > 0 ? `${(summary.revenue / summary.spend).toFixed(2)}x` : "—"), sub: "ingresos totales / gasto ads", color: "#10B981", accent: "#10B981" },
    { label: "CPA Real",     value: loading ? "—" : formatARS(summary?.cpa ?? 0),       sub: "costo por adquisición",          color: "#94A3B8", accent: "#8B5CF6" },
  ];

  /* ── Dynamic alertas ── */
  const lastRoas = adMetrics[adMetrics.length - 1]?.roasReal ?? 0;
  const prevRoas = adMetrics[adMetrics.length - 2]?.roasReal ?? 0;
  const roasCayo = prevRoas > 0 && lastRoas < prevRoas;
  const roasPct  = prevRoas > 0 ? +(((lastRoas - prevRoas) / prevRoas) * 100).toFixed(1) : 0;

  const alertas = loading ? [] : [
    roasCayo
      ? { tipo: "warning", titulo: "ROAS Real cayó vs mes anterior", detalle: `Pasó de ${prevRoas.toFixed(2)}x a ${lastRoas.toFixed(2)}x (${roasPct}%). Revisar creativos y audiencias.` }
      : { tipo: "ok",      titulo: "ROAS Real estable o en alza",    detalle: `Mantenés un ROAS de ${lastRoas.toFixed(2)}x. Buen trabajo con las campañas.` },
    (summary?.roas ?? 0) >= 3
      ? { tipo: "ok",      titulo: "ROAS por encima del benchmark",  detalle: `Tu ROAS actual (${summary?.roas?.toFixed(2)}x) supera el objetivo de 3x. Considerá escalar presupuesto.` }
      : { tipo: "warning", titulo: "ROAS por debajo del objetivo",   detalle: `Objetivo: 3.0x. Actual: ${summary?.roas?.toFixed(2) ?? 0}x. Optimizá segmentación o creativos.` },
    (summary?.cpa ?? 0) > 0
      ? { tipo: "ok",      titulo: `CPA en ${formatARS(summary?.cpa ?? 0)}`, detalle: "Monitoreá que el CPA no supere el margen bruto unitario promedio." }
      : { tipo: "warning", titulo: "Sin datos de CPA",               detalle: "No hay órdenes atribuidas a campañas activas este mes." },
  ];

  return (
    <div className="p-6 pb-12 space-y-6 max-w-[1400px]">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#F1F5F9] tracking-tight">Meta Ads</h1>
        <p className="text-sm text-[#64748B] mt-1">ROAS real, MER y métricas de adquisición</p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <div key={m.label}
            className="bg-[#0C1424] border border-white/[0.06] rounded-xl p-5 hover:border-white/[0.10] transition-colors cursor-default">
            <p className="text-sm text-[#94A3B8]">{m.label}</p>
            {loading ? (
              <div className="mt-3 h-7 bg-white/[0.07] rounded w-28 animate-pulse" />
            ) : (
              <p className="text-[1.6rem] font-bold tabular-nums mt-3 leading-none tracking-tight" style={{ color: m.color }}>
                {m.value}
              </p>
            )}
            <p className="text-xs text-[#475569] mt-2">{m.sub}</p>
          </div>
        ))}
      </div>

      {/* ROAS trend chart */}
      <div className="bg-[#0C1424] border border-white/[0.06] rounded-xl p-5 hover:border-white/[0.10] transition-colors">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-sm font-semibold text-[#F1F5F9]">ROAS Real histórico</h2>
            <p className="text-xs text-[#475569] mt-0.5">Ingresos reales / gasto en ads</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[#475569] bg-white/[0.04] border border-white/[0.06] px-3 py-1.5 rounded-lg">
            Break-even:
            <span className="text-[#F1F5F9] font-bold tabular-nums ml-1">2.0x</span>
          </div>
        </div>
        {loading ? (
          <div className="h-[220px] bg-[#10B981]/[0.04] rounded-lg animate-pulse" />
        ) : adMetrics.length === 0 ? (
          <div className="h-[220px] flex items-center justify-center text-sm text-[#475569]">Sin datos de campañas</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={adMetrics} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.035)" vertical={false} />
              <XAxis dataKey="mes" tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `${v}x`} domain={[0, "auto"]} />
              <Tooltip formatter={(v) => [`${Number(v).toFixed(2)}x`, "ROAS Real"]}
                contentStyle={{ background: "#060D19", border: "1px solid rgba(16,185,129,0.20)", borderTop: "2px solid rgba(16,185,129,0.35)", borderRadius: 8, color: "#F1F5F9", fontSize: 12 }} />
              <ReferenceLine y={2} stroke="rgba(239,68,68,0.3)" strokeDasharray="4 3"
                label={{ value: "break-even", position: "right", fill: "#EF4444", fontSize: 10 }} />
              <Line type="monotone" dataKey="roasReal" stroke="#10B981" strokeWidth={2.5}
                dot={{ r: 4, fill: "#10B981", strokeWidth: 0 }}
                activeDot={{ r: 5.5, fill: "#10B981", stroke: "#10B981", strokeWidth: 3, strokeOpacity: 0.3 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Alertas */}
      <div className="bg-[#0C1424] border border-white/[0.06] rounded-xl hover:border-white/[0.10] transition-colors">
        <div className="px-5 py-4 border-b border-white/[0.05]">
          <h2 className="text-sm font-semibold text-[#F1F5F9]">Alertas y recomendaciones</h2>
          <p className="text-xs text-[#475569] mt-0.5">Basadas en tus datos del mes</p>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-start gap-4 px-5 py-4 animate-pulse">
                <div className="w-7 h-7 rounded-lg bg-white/[0.06]" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-white/[0.06] rounded w-48" />
                  <div className="h-2.5 bg-white/[0.04] rounded w-64" />
                </div>
              </div>
            ))
          ) : (
            alertas.map((a) => {
              const isWarning = a.tipo === "warning";
              return (
                <div key={a.titulo} className="flex items-start gap-4 px-5 py-4 hover:bg-white/[0.025] transition-colors">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: isWarning ? "rgba(245,158,11,0.10)" : "rgba(16,185,129,0.10)" }}>
                    {isWarning
                      ? <AlertTriangle className="w-3.5 h-3.5 text-[#F59E0B]" />
                      : <CheckCircle className="w-3.5 h-3.5 text-[#10B981]" />}
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-[#F1F5F9]">{a.titulo}</p>
                    <p className="text-xs text-[#94A3B8] mt-0.5 leading-relaxed">{a.detalle}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
