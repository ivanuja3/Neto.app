"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { getPnlMonthly } from "@/lib/db/analytics";
import { getTopProducts } from "@/lib/db/orders";
import { Info } from "lucide-react";
import { formatARS } from "@/lib/mock-data";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell,
} from "recharts";

type PnlRow = {
  mes: string;
  ingresos: number;
  cogs: number;
  cm1: number; cm1_pct: number;
  marketing: number;
  logistica: number;
  cm2: number; cm2_pct: number;
  gastos_fijos: number;
  cm3: number; cm3_pct: number;
};

type TopProduct = {
  product_id: string;
  product_name: string;
  qty_vendida: number;
  ingresos: number;
  costo: number;
  margen: number;
  margen_pct: number;
};

const MES_LABELS: Record<string, string> = {
  "01": "Ene", "02": "Feb", "03": "Mar", "04": "Abr",
  "05": "May", "06": "Jun", "07": "Jul", "08": "Ago",
  "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dic",
};
function mesLabel(yyyymm: string) {
  const [, mm] = yyyymm.split("-");
  return MES_LABELS[mm] ?? yyyymm;
}

function SkeletonCard() {
  return (
    <div className="bg-[#0C1424] border border-white/[0.06] rounded-xl p-5 animate-pulse">
      <div className="h-4 bg-white/[0.07] rounded w-16 mb-4" />
      <div className="h-8 bg-white/[0.07] rounded w-32 mb-2" />
      <div className="h-5 bg-white/[0.07] rounded w-16 mb-3" />
      <div className="h-3 bg-white/[0.05] rounded w-40" />
    </div>
  );
}

export default function MargenesPage() {
  const { user } = useAuth();
  const [loading,  setLoading]  = useState(true);
  const [pnl,      setPnl]      = useState<PnlRow[]>([]);
  const [products, setProducts] = useState<TopProduct[]>([]);

  useEffect(() => {
    if (!user) return;
    async function load() {
      const [pnlRes, prodRes] = await Promise.all([
        getPnlMonthly(user!.id, 6),
        getTopProducts(user!.id, 20),
      ]);
      setPnl((pnlRes.data ?? []).map((r: PnlRow) => ({
        ...r,
        ingresos:     Number(r.ingresos),
        cogs:         Number(r.cogs),
        cm1:          Number(r.cm1),      cm1_pct:      Number(r.cm1_pct),
        marketing:    Number(r.marketing),
        logistica:    Number(r.logistica),
        cm2:          Number(r.cm2),      cm2_pct:      Number(r.cm2_pct),
        gastos_fijos: Number(r.gastos_fijos),
        cm3:          Number(r.cm3),      cm3_pct:      Number(r.cm3_pct),
      })));
      setProducts((prodRes.data ?? []).map((p: TopProduct) => ({
        ...p,
        ingresos:  Number(p.ingresos),
        costo:     Number(p.costo),
        margen:    Number(p.margen),
        margen_pct: Number(p.margen_pct),
      })));
      setLoading(false);
    }
    load();
  }, [user]);

  /* ── Mes actual (último row del P&L) ── */
  const mes = pnl[pnl.length - 1];

  const CM_LEVELS = mes ? [
    {
      key: "CM1", label: "Contribución Marginal 1",
      description: "Precio de venta − COGS (costo de mercadería vendida)",
      value: mes.cm1, porcentaje: mes.cm1_pct, color: "#10B981",
    },
    {
      key: "CM2", label: "Contribución Marginal 2",
      description: "CM1 − inversión en Marketing y Logística",
      value: mes.cm2, porcentaje: mes.cm2_pct, color: "#3B82F6",
    },
    {
      key: "CM3", label: "Contribución Marginal 3",
      description: "CM2 − costos fijos del negocio (resultado operativo)",
      value: mes.cm3, porcentaje: mes.cm3_pct, color: "#8B5CF6",
    },
  ] : [];

  const waterfall = mes ? [
    { categoria: "COGS",         valor: mes.cogs,         porcentaje: mes.ingresos > 0 ? Math.round(mes.cogs / mes.ingresos * 100) : 0,         color: "#EF4444" },
    { categoria: "Marketing",    valor: mes.marketing,    porcentaje: mes.ingresos > 0 ? Math.round(mes.marketing / mes.ingresos * 100) : 0,    color: "#F59E0B" },
    { categoria: "Logística",    valor: mes.logistica,    porcentaje: mes.ingresos > 0 ? Math.round(mes.logistica / mes.ingresos * 100) : 0,    color: "#F97316" },
    { categoria: "Gastos fijos", valor: mes.gastos_fijos, porcentaje: mes.ingresos > 0 ? Math.round(mes.gastos_fijos / mes.ingresos * 100) : 0, color: "#6366F1" },
    { categoria: "CM3 (Neto)",   valor: mes.cm3,          porcentaje: mes.cm3_pct,                                                              color: "#10B981", neto: true },
  ] : [];

  const trendData = pnl.map((r) => ({
    mes:     mesLabel(r.mes),
    cm1_pct: r.cm1_pct,
    cm2_pct: r.cm2_pct,
    cm3_pct: r.cm3_pct,
  }));

  const mesActualLabel = mes ? mesLabel(mes.mes) : "";

  return (
    <div className="p-6 pb-12 space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#F1F5F9] tracking-tight">Márgenes</h1>
          <p className="text-sm text-[#64748B] mt-1">Jerarquía de contribución marginal · {mesActualLabel || "—"}</p>
        </div>
        {!loading && mes && (
          <div className="text-right">
            <p className="text-xs text-[#475569]">Ingresos del mes</p>
            <p className="text-lg font-bold font-mono text-[#F1F5F9]">{formatARS(mes.ingresos)}</p>
          </div>
        )}
      </div>

      {/* CM1 → CM2 → CM3 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
          : CM_LEVELS.map((cm) => (
            <div key={cm.key}
              className="relative bg-[#0C1424] border border-white/[0.06] rounded-xl p-5 overflow-hidden hover:border-white/[0.12] hover:shadow-[0_8px_24px_rgba(0,0,0,0.25)] transition-all duration-200 cursor-default"
            >
              <div className="absolute top-0 left-0 right-0 h-px"
                style={{ background: `linear-gradient(90deg, transparent, ${cm.color}90, transparent)` }} />
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-2/3 h-8 blur-2xl opacity-[0.14] pointer-events-none"
                style={{ background: cm.color }} />

              <div className="flex items-start justify-between mb-2 relative">
                <span className="text-xs font-bold px-2 py-0.5 rounded-md font-mono"
                  style={{ background: `${cm.color}20`, color: cm.color }}>
                  {cm.key}
                </span>
                <button className="text-[#475569] hover:text-[#94A3B8] transition-colors">
                  <Info className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-[#64748B] mb-4 relative">{cm.label}</p>
              <div className="text-[1.6rem] font-bold font-mono text-[#F1F5F9] tracking-tight relative leading-none">
                {formatARS(cm.value)}
              </div>
              <div className="mt-1 text-lg font-bold font-mono relative" style={{ color: cm.color }}>
                {cm.porcentaje}%
              </div>
              <p className="text-[11px] text-[#475569] mt-3.5 leading-relaxed relative">{cm.description}</p>
            </div>
          ))}
      </div>

      {/* Waterfall + Trend side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Waterfall */}
        <div className="bg-[#0C1424] border border-white/[0.06] rounded-xl p-5">
          <div className="mb-5">
            <h2 className="text-sm font-semibold text-[#F1F5F9]">¿A dónde va cada peso?</h2>
            <p className="text-xs text-[#475569] mt-0.5">
              {loading ? "Cargando..." : `Desglose sobre ${formatARS(mes?.ingresos ?? 0)} de ingresos`}
            </p>
          </div>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-6 bg-white/[0.04] rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {waterfall.map((item) => (
                <div key={item.categoria} className="flex items-center gap-3">
                  <span className="text-sm text-[#94A3B8] w-28 shrink-0 text-right">{item.categoria}</span>
                  <div className="flex-1 h-6 bg-white/[0.04] rounded-lg overflow-hidden">
                    <div
                      className="h-full rounded-lg flex items-center justify-end pr-2.5 transition-all"
                      style={{
                        width: `${Math.max(item.porcentaje, 2)}%`,
                        background: item.neto
                          ? "linear-gradient(90deg, #0D9268, #10B981)"
                          : `${item.color}30`,
                      }}
                    >
                      <span className={`text-[11px] font-mono font-semibold ${item.neto ? "text-[#020A10]" : "text-[#F1F5F9]"}`}>
                        {item.porcentaje}%
                      </span>
                    </div>
                  </div>
                  <span className="text-[13px] font-mono text-[#94A3B8] w-28 text-right shrink-0">
                    {formatARS(item.valor)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Evolución CM% */}
        <div className="bg-[#0C1424] border border-white/[0.06] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#F1F5F9] mb-1">Evolución de márgenes</h2>
          <p className="text-xs text-[#475569] mb-5">CM1% · CM2% · CM3% por mes</p>
          {loading ? (
            <div className="h-[200px] bg-white/[0.03] rounded-lg animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={trendData} margin={{ top: 0, right: 8, left: 0, bottom: 0 }} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="mes" tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                <Tooltip
                  formatter={(v, name) => [`${Number(v).toFixed(1)}%`, name === "cm1_pct" ? "CM1" : name === "cm2_pct" ? "CM2" : "CM3"]}
                  contentStyle={{ background: "#0D1829", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 10, color: "#F1F5F9", fontSize: 12 }} />
                <ReferenceLine y={30} stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
                <Bar dataKey="cm1_pct" name="CM1" fill="#10B981" opacity={0.5} radius={[3, 3, 0, 0]} />
                <Bar dataKey="cm2_pct" name="CM2" fill="#3B82F6" opacity={0.7} radius={[3, 3, 0, 0]} />
                <Bar dataKey="cm3_pct" name="CM3" radius={[3, 3, 0, 0]}>
                  {trendData.map((entry) => (
                    <Cell key={entry.mes}
                      fill={entry.cm3_pct >= 20 ? "#8B5CF6" : entry.cm3_pct >= 10 ? "#F59E0B" : "#EF4444"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
          {!loading && (
            <div className="flex items-center gap-4 mt-3 justify-center">
              {[{ label: "CM1", color: "#10B981" }, { label: "CM2", color: "#3B82F6" }, { label: "CM3", color: "#8B5CF6" }].map((l) => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-sm" style={{ background: l.color }} />
                  <span className="text-[10px] text-[#475569]">{l.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Margen por producto */}
      <div className="bg-[#0C1424] border border-white/[0.06] rounded-xl">
        <div className="px-5 py-4 border-b border-white/[0.05]">
          <h2 className="text-sm font-semibold text-[#F1F5F9]">Margen por producto</h2>
          <p className="text-xs text-[#475569] mt-0.5">Verde &gt;50% · Amarillo 40–50% · Rojo &lt;40%</p>
        </div>
        {loading ? (
          <div className="divide-y divide-white/[0.04]">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-white/[0.06] rounded w-36" />
                  <div className="h-2.5 bg-white/[0.04] rounded w-20" />
                </div>
                <div className="w-48 h-1.5 bg-white/[0.05] rounded-full" />
                <div className="w-14 h-5 bg-white/[0.06] rounded" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-[#475569]">Sin datos de productos</div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {products
              .sort((a, b) => b.margen_pct - a.margen_pct)
              .map((p) => {
                const color = p.margen_pct >= 50 ? "#10B981" : p.margen_pct >= 40 ? "#F59E0B" : "#EF4444";
                return (
                  <div key={p.product_id}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.025] transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-[#F1F5F9] font-medium">{p.product_name}</p>
                      <p className="text-[11px] text-[#475569] mt-0.5">
                        {Math.round(p.qty_vendida)} uds · {formatARS(p.ingresos)} en ventas
                      </p>
                    </div>
                    <div className="w-48 hidden sm:block">
                      <div className="h-1.5 rounded-full bg-white/[0.05]">
                        <div className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(p.margen_pct, 100)}%`,
                            background: `linear-gradient(90deg, ${color}80, ${color})`,
                          }} />
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[13px] font-mono font-bold px-2 py-0.5 rounded-md"
                        style={{ color, background: `${color}12` }}>
                        {p.margen_pct.toFixed(1)}%
                      </span>
                      <p className="text-[11px] text-[#475569] mt-0.5 font-mono">{formatARS(p.margen)}</p>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
