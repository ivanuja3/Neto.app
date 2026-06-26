"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { getPnlMonthly, getAnalyticLines } from "@/lib/db/analytics";
import { TrendingUp, TrendingDown, ArrowDown, ArrowUp, AlertTriangle } from "lucide-react";
import { formatARS } from "@/lib/mock-data";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";

type PnlRow = {
  mes: string;
  ingresos: number;
  cogs: number;
  marketing: number;
  logistica: number;
  gastos_fijos: number;
  cm3: number;
  cm3_pct: number;
};

type AnalyticLine = {
  id: string;
  date: string;
  name: string;
  category: string;
  amount: number;
  channel: string | null;
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

const CAT_LABEL: Record<string, string> = {
  venta:     "Ventas",
  cogs:      "COGS",
  marketing: "Marketing",
  logistica: "Logística",
  fijo:      "Gastos fijos",
  impuesto:  "Impuestos",
};

function dateAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}

export default function FlujoPage() {
  const { user } = useAuth();
  const [loading,    setLoading]    = useState(true);
  const [pnl,        setPnl]        = useState<PnlRow[]>([]);
  const [movimientos, setMovimientos] = useState<AnalyticLine[]>([]);

  useEffect(() => {
    if (!user) return;
    async function load() {
      const [pnlRes, lineRes] = await Promise.all([
        getPnlMonthly(user!.id, 6),
        getAnalyticLines(user!.id, { dateFrom: dateAgo(60) }),
      ]);
      setPnl((pnlRes.data ?? []).map((r: PnlRow) => ({
        ...r,
        ingresos:     Number(r.ingresos),
        cogs:         Number(r.cogs),
        marketing:    Number(r.marketing),
        logistica:    Number(r.logistica),
        gastos_fijos: Number(r.gastos_fijos),
        cm3:          Number(r.cm3),
        cm3_pct:      Number(r.cm3_pct),
      })));
      setMovimientos(
        (lineRes.data ?? [])
          .map((l: AnalyticLine) => ({ ...l, amount: Number(l.amount) }))
          .slice(0, 12)
      );
      setLoading(false);
    }
    load();
  }, [user]);

  /* ── Mes actual ── */
  const mes = pnl[pnl.length - 1];
  const totalEntradas = mes?.ingresos ?? 0;
  const totalSalidas  = mes ? mes.cogs + mes.marketing + mes.logistica + mes.gastos_fijos : 0;
  const saldoNeto     = mes?.cm3 ?? 0;

  /* ── Chart data ── */
  const chartData = pnl.map((r) => ({
    mes:      mesLabel(r.mes),
    entradas: r.ingresos,
    salidas:  r.cogs + r.marketing + r.logistica + r.gastos_fijos,
    neto:     r.cm3,
  }));

  /* ── Alerta: algún mes con saldo negativo ── */
  const mesNegativo = pnl.find((r) => r.cm3 < 0);

  return (
    <div className="p-6 pb-12 space-y-6 max-w-[1400px]">
      <div>
        <h1 className="text-2xl font-bold text-[#F1F5F9] tracking-tight">Flujo de caja</h1>
        <p className="text-sm text-[#64748B] mt-1">Entradas, salidas y saldo acumulado del mes</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {loading ? Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-[#0C1424] border border-white/[0.06] rounded-xl p-5 animate-pulse">
            <div className="h-5 bg-white/[0.06] rounded w-32 mb-4" />
            <div className="h-8 bg-white/[0.07] rounded w-40 mb-2" />
            <div className="h-3 bg-white/[0.05] rounded w-24" />
          </div>
        )) : (
          <>
            <div className="bg-[#0C1424] border border-white/[0.06] rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-md bg-[#10B981]/10 flex items-center justify-center">
                  <ArrowUp className="w-3.5 h-3.5 text-[#10B981]" />
                </div>
                <span className="text-sm text-[#94A3B8]">Entradas del mes</span>
              </div>
              <p className="text-2xl font-bold font-mono text-[#10B981]">{formatARS(totalEntradas)}</p>
              <p className="text-xs text-[#475569] mt-1">Cobros acumulados · {mes ? mesLabel(mes.mes) : "—"}</p>
            </div>

            <div className="bg-[#0C1424] border border-white/[0.06] rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-md bg-[#EF4444]/10 flex items-center justify-center">
                  <ArrowDown className="w-3.5 h-3.5 text-[#EF4444]" />
                </div>
                <span className="text-sm text-[#94A3B8]">Salidas del mes</span>
              </div>
              <p className="text-2xl font-bold font-mono text-[#EF4444]">{formatARS(totalSalidas)}</p>
              <p className="text-xs text-[#475569] mt-1">COGS + Marketing + Logística + Fijos</p>
            </div>

            <div className="bg-[#0C1424] border border-white/[0.06] rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-6 h-6 rounded-md flex items-center justify-center ${saldoNeto >= 0 ? "bg-[#10B981]/10" : "bg-[#EF4444]/10"}`}>
                  {saldoNeto >= 0
                    ? <TrendingUp className="w-3.5 h-3.5 text-[#10B981]" />
                    : <TrendingDown className="w-3.5 h-3.5 text-[#EF4444]" />}
                </div>
                <span className="text-sm text-[#94A3B8]">Saldo neto (CM3)</span>
              </div>
              <p className={`text-2xl font-bold font-mono ${saldoNeto >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}>
                {formatARS(saldoNeto)}
              </p>
              <p className="text-xs text-[#475569] mt-1">
                {mes && mes.cm3_pct > 0 ? `${mes.cm3_pct}% de margen neto` : "Cash generado este mes"}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Alerta dinámica */}
      {!loading && mesNegativo && (
        <div className="flex items-start gap-3 bg-[#F59E0B]/10 border border-[#F59E0B]/20 rounded-xl px-5 py-4">
          <AlertTriangle className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-[#F59E0B]">
              {mesLabel(mesNegativo.mes)}: flujo negativo
            </p>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              Las salidas superaron las entradas por {formatARS(Math.abs(mesNegativo.cm3))}.
              Revisá la estructura de costos de ese mes.
            </p>
          </div>
        </div>
      )}

      {/* Area chart mensual */}
      <div className="bg-[#0C1424] border border-white/[0.06] rounded-xl p-5">
        <h2 className="text-sm font-semibold text-[#F1F5F9] mb-1">Entradas vs Salidas — últimos 6 meses</h2>
        <p className="text-xs text-[#475569] mb-5">Verde = entradas · Rojo = salidas</p>
        {loading ? (
          <div className="h-[220px] bg-white/[0.03] rounded-lg animate-pulse" />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="redGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="mes" tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`} />
              <Tooltip
                formatter={(v, name) => [
                  formatARS(Number(v)),
                  name === "entradas" ? "Entradas" : name === "salidas" ? "Salidas" : "Saldo neto",
                ]}
                contentStyle={{ background: "#0D1829", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 10, color: "#F1F5F9", fontSize: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}
              />
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.08)" />
              <Area type="monotone" dataKey="entradas" stroke="#10B981" strokeWidth={2} fill="url(#greenGrad)" name="entradas" />
              <Area type="monotone" dataKey="salidas"  stroke="#EF4444" strokeWidth={2} fill="url(#redGrad)"   name="salidas" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Desglose mensual por componente */}
      <div className="bg-[#0C1424] border border-white/[0.06] rounded-xl p-5">
        <h2 className="text-sm font-semibold text-[#F1F5F9] mb-5">Composición de salidas por mes</h2>
        {loading ? (
          <div className="h-[160px] bg-white/[0.03] rounded-lg animate-pulse" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  {["Mes", "Ingresos", "COGS", "Marketing", "Logística", "Gastos fijos", "CM3"].map((col) => (
                    <th key={col} className="text-left text-xs font-medium text-[#475569] pb-3 pr-4">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...pnl].reverse().map((r, i) => (
                  <tr key={r.mes} className={`hover:bg-white/[0.02] transition-colors ${i < pnl.length - 1 ? "border-b border-white/[0.03]" : ""}`}>
                    <td className="py-3 pr-4 text-[#94A3B8] font-medium">{mesLabel(r.mes)}</td>
                    <td className="py-3 pr-4 font-mono text-[#10B981]">{formatARS(r.ingresos)}</td>
                    <td className="py-3 pr-4 font-mono text-[#EF4444]">{formatARS(r.cogs)}</td>
                    <td className="py-3 pr-4 font-mono text-[#F59E0B]">{formatARS(r.marketing)}</td>
                    <td className="py-3 pr-4 font-mono text-[#F97316]">{formatARS(r.logistica)}</td>
                    <td className="py-3 pr-4 font-mono text-[#6366F1]">{formatARS(r.gastos_fijos)}</td>
                    <td className="py-3 pr-4">
                      <span className={`font-mono font-bold ${r.cm3 >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}>
                        {formatARS(r.cm3)}
                      </span>
                      <span className="text-[10px] text-[#475569] ml-1.5">({r.cm3_pct}%)</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Movimientos recientes */}
      <div className="bg-[#0C1424] border border-white/[0.06] rounded-xl">
        <div className="px-5 py-4 border-b border-white/[0.06]">
          <h2 className="text-sm font-semibold text-[#F1F5F9]">Líneas analíticas recientes</h2>
          <p className="text-xs text-[#475569] mt-0.5">Últimos 60 días — ingresos y egresos registrados</p>
        </div>

        {loading ? (
          <div className="divide-y divide-white/[0.04]">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3.5 animate-pulse">
                <div className="w-8 h-8 rounded-lg bg-white/[0.05] shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-white/[0.06] rounded w-40" />
                  <div className="h-2.5 bg-white/[0.04] rounded w-24" />
                </div>
                <div className="h-4 bg-white/[0.06] rounded w-24" />
              </div>
            ))}
          </div>
        ) : movimientos.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-[#475569]">Sin movimientos registrados</div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {movimientos.map((m) => {
              const isEntrada = m.amount > 0;
              return (
                <div key={m.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isEntrada ? "bg-[#10B981]/10" : "bg-[#EF4444]/10"}`}>
                    {isEntrada
                      ? <ArrowUp className="w-4 h-4 text-[#10B981]" />
                      : <ArrowDown className="w-4 h-4 text-[#EF4444]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#F1F5F9] font-medium truncate">{m.name}</p>
                    <p className="text-xs text-[#475569] mt-0.5">
                      {m.date} · {CAT_LABEL[m.category] ?? m.category}
                      {m.channel ? ` · ${m.channel}` : ""}
                    </p>
                  </div>
                  <span className={`text-sm font-mono font-semibold shrink-0 ${isEntrada ? "text-[#10B981]" : "text-[#EF4444]"}`}>
                    {isEntrada ? "+" : "−"}{formatARS(Math.abs(m.amount))}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
