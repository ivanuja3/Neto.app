"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { getPnlMonthly, getAnalyticLines } from "@/lib/db/analytics";
import { TrendingUp, TrendingDown, ArrowDown, ArrowUp, AlertTriangle, Wallet, Lock } from "lucide-react";
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

type MainTab = "transacciones" | "cierres";
type SubTab  = "todos" | "ingresos" | "egresos" | "por_cobrar" | "por_pagar";

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
  const [loading,      setLoading]      = useState(true);
  const [pnl,          setPnl]          = useState<PnlRow[]>([]);
  const [movimientos,  setMovimientos]  = useState<AnalyticLine[]>([]);
  const [mainTab,      setMainTab]      = useState<MainTab>("transacciones");
  const [subTab,       setSubTab]       = useState<SubTab>("todos");
  const [search,       setSearch]       = useState("");

  useEffect(() => {
    if (!user) return;
    async function load() {
      try {
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
            .slice(0, 200)
        );
      } catch (err) {
        console.error("FlujoPage load error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  const mes = pnl[pnl.length - 1];
  const totalEntradas = mes?.ingresos ?? 0;
  const totalSalidas  = mes ? mes.cogs + mes.marketing + mes.logistica + mes.gastos_fijos : 0;
  const saldoNeto     = mes?.cm3 ?? 0;

  const chartData = pnl.map((r) => ({
    mes:      mesLabel(r.mes),
    entradas: r.ingresos,
    salidas:  r.cogs + r.marketing + r.logistica + r.gastos_fijos,
    neto:     r.cm3,
  }));

  const mesNegativo = pnl.find((r) => r.cm3 < 0);

  /* ── Filtrado sub-tabs + search ── */
  const movsFiltrados = movimientos.filter((m) => {
    const matchSub =
      subTab === "todos"      ? true :
      subTab === "ingresos"   ? m.amount > 0 :
      subTab === "egresos"    ? m.amount < 0 :
      false;
    const matchSearch = !search || m.name.toLowerCase().includes(search.toLowerCase());
    return matchSub && matchSearch;
  });

  const totalIngresos  = movimientos.filter((m) => m.amount > 0).reduce((s, m) => s + m.amount, 0);
  const totalEgresos   = movimientos.filter((m) => m.amount < 0).reduce((s, m) => s + Math.abs(m.amount), 0);

  return (
    <div className="p-6 pb-12 space-y-6 max-w-[1400px]">
      {/* Header + main tabs */}
      <div>
        <h1 className="text-2xl font-bold text-[#F1F5F9] tracking-tight">Balance</h1>
        <p className="text-sm text-[#64748B] mt-1">Entradas, salidas y saldo del período</p>
      </div>

      {/* Main toggle tabs */}
      <div className="flex items-center gap-1 bg-[#0C1424] border border-white/[0.06] rounded-xl p-1 w-fit">
        {([
          { key: "transacciones", label: "Transacciones" },
          { key: "cierres",       label: "Cierres de caja" },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setMainTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              mainTab === t.key
                ? "bg-white/[0.08] text-[#F1F5F9]"
                : "text-[#475569] hover:text-[#94A3B8]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {mainTab === "cierres" ? (
        /* ── Cierres de caja: placeholder ── */
        <div className="bg-[#0C1424] border border-white/[0.06] rounded-xl flex flex-col items-center justify-center py-16 gap-4">
          <div className="w-12 h-12 rounded-full bg-white/[0.04] flex items-center justify-center">
            <Lock className="w-5 h-5 text-[#475569]" />
          </div>
          <p className="text-sm font-semibold text-[#F1F5F9]">Cierres de caja</p>
          <p className="text-xs text-[#475569] text-center max-w-xs">
            Esta función te permite cerrar la caja al final de cada jornada.<br />
            Disponible en la próxima actualización.
          </p>
          <span className="text-[10px] font-bold bg-[#F59E0B]/15 text-[#FCD34D] border border-[#F59E0B]/20 px-2.5 py-1 rounded-full tracking-wide">
            PRÓXIMAMENTE
          </span>
        </div>
      ) : (
        <>
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
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center ${saldoNeto >= 0 ? "bg-[#10B981]/10" : "bg-[#EF4444]/10"}`}>
                      {saldoNeto >= 0 ? <TrendingUp className="w-3.5 h-3.5 text-[#10B981]" /> : <TrendingDown className="w-3.5 h-3.5 text-[#EF4444]" />}
                    </div>
                    <span className="text-sm text-[#94A3B8]">Balance</span>
                  </div>
                  <p className={`text-2xl font-bold font-mono ${saldoNeto >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}>
                    {formatARS(saldoNeto)}
                  </p>
                  <p className="text-xs text-[#475569] mt-1">
                    {mes && mes.cm3_pct > 0 ? `${mes.cm3_pct}% de margen neto · ` : ""}{mes ? mesLabel(mes.mes) : "—"}
                  </p>
                </div>

                <div className="bg-[#0C1424] border border-white/[0.06] rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-md bg-[#10B981]/10 flex items-center justify-center">
                      <ArrowUp className="w-3.5 h-3.5 text-[#10B981]" />
                    </div>
                    <span className="text-sm text-[#94A3B8]">Ventas totales</span>
                  </div>
                  <p className="text-2xl font-bold font-mono text-[#10B981]">{formatARS(totalEntradas)}</p>
                  <p className="text-xs text-[#475569] mt-1">Cobros acumulados · {mes ? mesLabel(mes.mes) : "—"}</p>
                </div>

                <div className="bg-[#0C1424] border border-white/[0.06] rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-md bg-[#EF4444]/10 flex items-center justify-center">
                      <ArrowDown className="w-3.5 h-3.5 text-[#EF4444]" />
                    </div>
                    <span className="text-sm text-[#94A3B8]">Gastos totales</span>
                  </div>
                  <p className="text-2xl font-bold font-mono text-[#EF4444]">{formatARS(totalSalidas)}</p>
                  <p className="text-xs text-[#475569] mt-1">COGS + Marketing + Logística + Fijos</p>
                </div>
              </>
            )}
          </div>

          {/* Alerta flujo negativo */}
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

          {/* Gráfico */}
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
                      <stop offset="5%"  stopColor="#10B981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="redGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#EF4444" stopOpacity={0.3} />
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

          {/* Movimientos: 4 sub-tabs + search */}
          <div className="bg-[#0C1424] border border-white/[0.06] rounded-xl">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-white/[0.06]">
              {/* Sub-tabs */}
              <div className="flex items-center gap-1">
                {([
                  { key: "todos",      label: `Todos (${movimientos.length})` },
                  { key: "ingresos",   label: `Ingresos (${movimientos.filter((m) => m.amount > 0).length})` },
                  { key: "egresos",    label: `Egresos (${movimientos.filter((m) => m.amount < 0).length})` },
                  { key: "por_cobrar", label: "Por cobrar" },
                  { key: "por_pagar",  label: "Por pagar" },
                ] as const).map((t) => (
                  <button key={t.key} onClick={() => setSubTab(t.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                      subTab === t.key ? "bg-[#10B981]/10 text-[#10B981]" : "text-[#475569] hover:text-[#94A3B8]"
                    }`}>
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Search */}
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar movimiento..."
                className="bg-[#080E1A] border border-white/[0.08] text-[#F1F5F9] placeholder-[#334155] rounded-lg px-3 py-1.5 text-xs outline-none focus:border-[#10B981]/40 transition-colors w-48"
              />
            </div>

            {/* Placeholder para "Por cobrar" y "Por pagar" */}
            {(subTab === "por_cobrar" || subTab === "por_pagar") ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="w-10 h-10 rounded-full bg-white/[0.04] flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-[#475569]" />
                </div>
                <p className="text-sm text-[#475569]">
                  {subTab === "por_cobrar" ? "Cuentas por cobrar próximamente" : "Cuentas por pagar próximamente"}
                </p>
              </div>
            ) : loading ? (
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
            ) : movsFiltrados.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-[#475569]">Sin movimientos</div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {movsFiltrados.map((m) => {
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

            {!loading && movsFiltrados.length > 0 && subTab !== "por_cobrar" && subTab !== "por_pagar" && (
              <div className="flex items-center justify-between px-5 py-3.5 border-t border-white/[0.06] bg-white/[0.02]">
                <span className="text-sm text-[#94A3B8]">{movsFiltrados.length} movimientos</span>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-[#10B981] font-mono">+{formatARS(totalIngresos)}</span>
                  <span className="text-xs text-[#EF4444] font-mono">−{formatARS(totalEgresos)}</span>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
