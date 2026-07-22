"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/components/auth-provider";
import { getKpisCurrentMonth, getPnlMonthly } from "@/lib/db/analytics";
import {
  TrendingUp, TrendingDown, Target, Zap, AlertCircle,
  ChevronRight, Sparkles,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import { formatARS } from "@/lib/mock-data";

/* ── Tipos ── */
type EscenarioKey = "conservador" | "base" | "optimista";
type PnlRow = { mes: string; ingresos: number; cm3_pct: number };
type ProjectedMonth = { mes: string; ingresos: number; cm3: number; ganancia: number; adsSuger: number };

/* ── Config de escenarios (estática) ── */
const ESCENARIOS_CONFIG: Record<EscenarioKey, { label: string; color: string; tasa: number; desc: string }> = {
  conservador: { label: "Conservador", color: "#F59E0B", tasa: 0.03, desc: "crecimiento moderado 3%/mes" },
  base:        { label: "Base",        color: "#3B82F6", tasa: 0.07, desc: "crecimiento sostenido 7%/mes" },
  optimista:   { label: "Optimista",   color: "#10B981", tasa: 0.12, desc: "crecimiento agresivo 12%/mes" },
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

/* ── Funciones de proyección ── */
const MONTH_ABBR = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

function calcProyeccion(ultimoIngreso: number, cm3Base: number, roasBase: number, tasa: number): ProjectedMonth[] {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
    const mes = MONTH_ABBR[d.getMonth()];
    const ingresos = Math.round(ultimoIngreso * Math.pow(1 + tasa, i + 1));
    const cm3      = parseFloat(cm3Base.toFixed(1));
    const ganancia = Math.round(ingresos * cm3 / 100);
    const adsSuger = Math.round(ingresos / Math.max(roasBase, 2));
    return { mes, ingresos, cm3, ganancia, adsSuger };
  });
}

function calcChartCombinado(pnlRows: PnlRow[], proyeccion: ProjectedMonth[]) {
  const historico = pnlRows.map((r) => ({ mes: mesLabel(r.mes), real: r.ingresos, proyectado: null as number | null }));
  const futuro    = proyeccion.map((m) => ({ mes: m.mes, real: null as number | null, proyectado: m.ingresos }));
  return [...historico, ...futuro];
}

/* ── Tooltip personalizado ── */
function ChartTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const items = payload.filter((p) => p.value !== null && p.value !== undefined);
  return (
    <div className="bg-[#0D1829] border border-white/[0.10] rounded-xl p-3.5 shadow-2xl text-xs backdrop-blur-sm">
      <p className="text-[#94A3B8] font-semibold mb-2">{label}</p>
      {items.map((p) => (
        <div key={p.name} className="flex items-center gap-2 mb-1 last:mb-0">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="text-[#64748B]">{p.name === "real" ? "Real" : "Proyectado"}:</span>
          <span className="text-[#F1F5F9] font-mono font-semibold ml-auto pl-3">{formatARS(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Botón escenario ── */
function EscenarioBtn({ id, active, onClick }: { id: EscenarioKey; active: boolean; onClick: () => void }) {
  const cfg = ESCENARIOS_CONFIG[id];
  return (
    <button onClick={onClick}
      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${active ? "text-[#080E1A] shadow-lg" : "text-[#475569] hover:text-[#94A3B8]"}`}
      style={active ? { background: cfg.color } : {}}>
      {cfg.label}
    </button>
  );
}

/* ── Page ── */
export default function ProyeccionesPage() {
  const { user } = useAuth();
  const [loading,       setLoading]       = useState(true);
  const [ultimoIngreso, setUltimoIngreso] = useState(0);
  const [cm3Actual,     setCm3Actual]     = useState(0);
  const [roasActual,    setRoasActual]    = useState(3);
  const [pnlRows,       setPnlRows]       = useState<PnlRow[]>([]);
  const [escenario,     setEscenario]     = useState<EscenarioKey>("base");
  const [tasas,         setTasas]         = useState({ conservador: 3, base: 7, optimista: 12 });
  const [metaStr,       setMetaStr]       = useState("");
  const [cuotaPrecio,   setCuotaPrecio]   = useState("50000");
  const [cuotaInflStr,  setCuotaInflStr]  = useState("3");
  const [cuotasN,       setCuotasN]       = useState("12");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    async function load() {
      try {
        const [kpiRes, pnlRes] = await Promise.all([
          getKpisCurrentMonth(user!.id),
          getPnlMonthly(user!.id, 6),
        ]);
        if (cancelled) return;
        const kpi = kpiRes.data?.[0];
        setUltimoIngreso(Number(kpi?.ingresos  ?? 0));
        setCm3Actual(    Number(kpi?.cm3_pct   ?? 0));
        setRoasActual(   Number(kpi?.roas      ?? 3));
        setPnlRows((pnlRes.data ?? []).map((r: PnlRow) => ({
          mes:      r.mes,
          ingresos: Number(r.ingresos),
          cm3_pct:  Number(r.cm3_pct),
        })));
      } catch (err) {
        console.error("ProyeccionesPage load error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [user]);

  const cfg        = { ...ESCENARIOS_CONFIG[escenario], tasa: tasas[escenario] / 100, desc: `crecimiento ${tasas[escenario]}%/mes` };
  const proyeccion = useMemo(
    () => calcProyeccion(ultimoIngreso, cm3Actual, roasActual, tasas[escenario] / 100),
    [ultimoIngreso, cm3Actual, roasActual, tasas, escenario]
  );
  const chartData = useMemo(
    () => calcChartCombinado(pnlRows, proyeccion),
    [pnlRows, proyeccion]
  );

  const totalProyectado = proyeccion.reduce((s, m) => s + m.ingresos, 0);
  const gananciaTotal   = proyeccion.reduce((s, m) => s + m.ganancia, 0);
  const cm3Prom         = parseFloat((proyeccion.reduce((s, m) => s + m.cm3, 0) / Math.max(proyeccion.length, 1)).toFixed(1));
  const dicIngreso      = proyeccion[proyeccion.length - 1]?.ingresos ?? 0;
  const crecDic         = ultimoIngreso > 0 ? (((dicIngreso / ultimoIngreso) - 1) * 100).toFixed(0) : "0";

  /* Calculadora de meta */
  const metaMonto      = parseFloat(metaStr.replace(/[^0-9]/g, "")) || 0;
  const mesesParaMeta  = metaMonto > ultimoIngreso && ultimoIngreso > 0 && cfg.tasa > 0
    ? Math.ceil(Math.log(metaMonto / ultimoIngreso) / Math.log(1 + cfg.tasa))
    : 0;
  const pctNecesario   = metaMonto > ultimoIngreso
    ? (((metaMonto / ultimoIngreso) ** (1 / 6) - 1) * 100).toFixed(1)
    : null;

  /* Impacto cuotas */
  const precioHoy   = Math.max(1, parseFloat(cuotaPrecio.replace(/\D/g, "")) || 50_000);
  const cuotas      = Math.max(1, parseInt(cuotasN) || 12);
  const inflMensual = Math.max(0, (parseFloat(cuotaInflStr) || 3) / 100);
  const cuotaFija   = precioHoy / cuotas;
  const valorRealUltimaCuota = cuotaFija / Math.pow(1 + inflMensual, cuotas);
  const perdidasInflacion    = precioHoy - Array.from({ length: cuotas }, (_, i) =>
    cuotaFija / Math.pow(1 + inflMensual, i + 1)
  ).reduce((s, v) => s + v, 0);

  if (loading) {
    return (
      <div className="p-6 pb-12 space-y-6 max-w-[1400px]">
        <div className="h-8 bg-white/[0.05] rounded w-48" />
        <div className="h-40 bg-[#10B981]/[0.04] rounded-2xl" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-[#0C1424] border border-white/[0.06] rounded-xl" />
          ))}
        </div>
        <div className="h-72 bg-[#0C1424] border border-white/[0.06] rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-6 pb-12 space-y-6 max-w-[1400px]">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#F1F5F9] tracking-tight">Proyecciones</h1>
            <span className="text-[9px] font-bold px-1.5 py-[3px] rounded-md bg-gradient-to-r from-[#10B981]/20 to-[#06B6D4]/15 text-[#34D399] border border-[#10B981]/15 tracking-wide">
              LIVE
            </span>
          </div>
          <p className="text-sm text-[#64748B] mt-1">
            Escenarios basados en tu historial real de los últimos 6 meses
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="flex items-center gap-1 bg-[#0C1424] border border-white/[0.08] rounded-xl p-1">
            {(["conservador", "base", "optimista"] as EscenarioKey[]).map((e) => (
              <EscenarioBtn key={e} id={e} active={escenario === e} onClick={() => setEscenario(e)} />
            ))}
          </div>
          <div className="flex items-center gap-3">
            {(["conservador", "base", "optimista"] as EscenarioKey[]).map((e) => {
              const c = ESCENARIOS_CONFIG[e];
              return (
                <div key={e} className="flex items-center gap-1">
                  <span className="text-[10px] font-medium" style={{ color: c.color }}>{c.label[0]}</span>
                  <div className="flex items-center bg-[#080E1A] border border-white/[0.06] rounded px-1.5 py-[3px]">
                    <input
                      type="number" min="0" max="50" step="1"
                      value={tasas[e]}
                      onChange={(ev) => setTasas((t) => ({ ...t, [e]: Math.max(0, Math.min(50, Number(ev.target.value))) }))}
                      className="w-7 bg-transparent text-[10px] text-center outline-none tabular-nums"
                      style={{ color: c.color }}
                    />
                    <span className="text-[10px] text-[#475569]">%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Big stat banner */}
      <div className="rounded-2xl p-6 sm:p-8 border relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${cfg.color}14 0%, #0C1424 60%)`, borderColor: `${cfg.color}35` }}>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-end gap-6">
          <div className="flex-1">
            <p className="text-sm text-[#94A3B8] font-medium">A este ritmo, en los próximos 6 meses vas a facturar</p>
            <p className="text-4xl sm:text-5xl font-black font-mono mt-2 tracking-tight" style={{ color: cfg.color }}>
              {formatARS(totalProyectado)}
            </p>
            <p className="text-sm text-[#64748B] mt-2">
              {cfg.desc} · En diciembre llegarías a{" "}
              <span className="text-[#94A3B8] font-semibold">{formatARS(dicIngreso)}/mes</span>
              {" "}(+{crecDic}% vs hoy)
            </p>
          </div>
          <div className="hidden sm:flex flex-col items-end text-right shrink-0 pl-8 border-l"
            style={{ borderColor: `${cfg.color}20` }}>
            <p className="text-xs text-[#475569]">Ganancia proyectada</p>
            <p className="text-2xl font-bold font-mono text-[#F1F5F9] mt-1">{formatARS(gananciaTotal)}</p>
            <p className="text-xs text-[#64748B] mt-1">Margen Neto prom. {cm3Prom}%</p>
          </div>
        </div>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-[0.06] pointer-events-none">
          <TrendingUp className="w-48 h-48" style={{ color: cfg.color }} />
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: "Facturación total Jul–Dic",    value: formatARS(totalProyectado), sub: "Suma de 6 meses proyectados",             color: cfg.color,  icon: TrendingUp },
          { label: "Margen Neto promedio proyectado", value: `${cm3Prom}%`,             sub: `Hoy: ${cm3Actual}% (+${(cm3Prom - cm3Actual).toFixed(1)}pp)`, color: "#3B82F6", icon: Target },
          { label: "Ganancia neta proyectada",      value: formatARS(gananciaTotal),  sub: `~${formatARS(Math.round(gananciaTotal / 6))}/mes en promedio`, color: "#10B981", icon: Zap },
          { label: "Ingreso mensual en Dic 2026",   value: formatARS(dicIngreso),     sub: `+${crecDic}% vs mes actual`,              color: "#8B5CF6",  icon: Sparkles },
        ].map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label}
              className="relative bg-[#0C1424] border border-white/[0.06] rounded-xl p-5 overflow-hidden hover:border-white/[0.12] transition-colors cursor-default">
              <div className="absolute top-0 left-0 right-0 h-px"
                style={{ background: `linear-gradient(90deg, transparent, ${k.color}70, transparent)` }} />
              <div className="flex items-start justify-between">
                <p className="text-xs text-[#94A3B8] leading-snug pr-2">{k.label}</p>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${k.color}1A` }}>
                  <Icon className="w-3.5 h-3.5" style={{ color: k.color }} />
                </div>
              </div>
              <p className="text-xl font-bold tabular-nums mt-3" style={{ color: k.color }}>{k.value}</p>
              <p className="text-xs text-[#475569] mt-1">{k.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Gráfico */}
      <div className="bg-[#0C1424] border border-white/[0.06] rounded-xl p-5">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-sm font-semibold text-[#F1F5F9]">Ingresos reales + proyección</h2>
            <p className="text-xs text-[#475569] mt-0.5">Sólido = datos reales · Punteado = proyectado</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-[2px] bg-[#10B981] rounded-full inline-block" />
              <span className="text-[#64748B]">Real</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-[2px] rounded-full inline-block" style={{ border: `1.5px dashed ${cfg.color}` }} />
              <span className="text-[#64748B]">Proyectado</span>
            </div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
            <XAxis dataKey="mes" tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false}
              tickFormatter={(v) => `$${(v / 1_000_000).toFixed(1)}M`} domain={["auto", "auto"]} />
            <Tooltip content={<ChartTooltip />} />
            <ReferenceLine x={mesLabel(pnlRows[pnlRows.length - 1]?.mes ?? "2026-06")}
              stroke="rgba(255,255,255,0.10)" strokeDasharray="4 4"
              label={{ value: "hoy", position: "insideTopRight", fill: "#475569", fontSize: 10 }} />
            <Line type="monotone" dataKey="real" stroke="#10B981" strokeWidth={2.5}
              dot={{ r: 3.5, fill: "#10B981", strokeWidth: 0 }}
              activeDot={{ r: 5, fill: "#10B981", stroke: "#10B981", strokeWidth: 3, strokeOpacity: 0.3 }}
              connectNulls={false} name="real" />
            <Line type="monotone" dataKey="proyectado" stroke={cfg.color} strokeWidth={2} strokeDasharray="6 3"
              dot={{ r: 3, fill: cfg.color, strokeWidth: 0 }}
              activeDot={{ r: 4.5, fill: cfg.color, stroke: cfg.color, strokeWidth: 3, strokeOpacity: 0.3 }}
              connectNulls={false} name="proyectado" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Tabla mes a mes */}
      <div className="bg-[#0C1424] border border-white/[0.06] rounded-xl">
        <div className="px-5 py-4 border-b border-white/[0.05]">
          <h2 className="text-sm font-semibold text-[#F1F5F9]">Proyección mes a mes</h2>
          <p className="text-xs text-[#475569] mt-0.5">Escenario {cfg.label} · {cfg.desc}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.04]">
                {["Mes", "Ingresos proy.", "Margen Neto", "Ganancia neta", "Ads sugeridos", "vs hoy"].map((col) => (
                  <th key={col} className="text-left text-xs font-medium text-[#475569] px-5 py-3">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {proyeccion.map((m, i) => {
                const vsHoyNum = ultimoIngreso > 0 ? ((m.ingresos / ultimoIngreso) - 1) * 100 : 0;
                const vsHoy    = vsHoyNum.toFixed(0);
                return (
                  <tr key={m.mes}
                    className={`hover:bg-white/[0.02] transition-colors ${i < proyeccion.length - 1 ? "border-b border-white/[0.04]" : ""}`}>
                    <td className="px-5 py-3.5 text-[#F1F5F9] font-semibold text-[13px]">{m.mes} 2026</td>
                    <td className="px-5 py-3.5 text-[#F1F5F9] font-mono font-semibold text-[13px]">{formatARS(m.ingresos)}</td>
                    <td className="px-5 py-3.5">
                      <span className="font-mono font-bold text-[13px] px-2 py-0.5 rounded-md"
                        style={{
                          color:      m.cm3 >= 30 ? "#10B981" : m.cm3 >= 22 ? "#F59E0B" : "#EF4444",
                          background: m.cm3 >= 30 ? "rgba(16,185,129,0.10)" : m.cm3 >= 22 ? "rgba(245,158,11,0.10)" : "rgba(239,68,68,0.10)",
                        }}>
                        {m.cm3}%
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-[#10B981] font-mono font-semibold text-[13px]">{formatARS(m.ganancia)}</td>
                    <td className="px-5 py-3.5 text-[#94A3B8] font-mono text-[13px]">{formatARS(m.adsSuger)}</td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-[3px] rounded-full"
                        style={{
                          color:      vsHoyNum > 0 ? "#10B981" : "#EF4444",
                          background: vsHoyNum > 0 ? "rgba(16,185,129,0.10)" : "rgba(239,68,68,0.10)",
                        }}>
                        {vsHoyNum > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {vsHoy}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Calculadora de meta + Impacto cuotas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Calculadora */}
        <div className="bg-[#0C1424] border border-white/[0.06] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-[#3B82F6]/10 flex items-center justify-center">
              <Target className="w-3.5 h-3.5 text-[#3B82F6]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#F1F5F9]">Calculadora de meta</h2>
              <p className="text-xs text-[#475569]">¿Cuánto querés facturar por mes?</p>
            </div>
          </div>
          <div className="relative mb-4">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#475569] text-sm font-mono">$</span>
            <input type="text" inputMode="numeric" placeholder="5.000.000" value={metaStr}
              onChange={(e) => setMetaStr(e.target.value)}
              className="w-full bg-[#080E1A] border border-white/[0.10] rounded-xl pl-7 pr-4 py-3 text-[#F1F5F9] font-mono text-sm outline-none focus:border-[#3B82F6]/50 transition-colors placeholder:text-[#2D3748]" />
          </div>
          {metaMonto > 0 && metaMonto > ultimoIngreso ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between py-3 border-b border-white/[0.05]">
                <span className="text-xs text-[#94A3B8]">Con escenario {cfg.label}</span>
                <span className="text-sm font-bold text-[#F1F5F9]">{mesesParaMeta} {mesesParaMeta === 1 ? "mes" : "meses"}</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-white/[0.05]">
                <span className="text-xs text-[#94A3B8]">Crecimiento mensual necesario</span>
                <span className="text-sm font-bold text-[#3B82F6]">{pctNecesario}%/mes</span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-xs text-[#94A3B8]">Diferencia con hoy</span>
                <span className="text-sm font-bold text-[#10B981]">+{formatARS(metaMonto - ultimoIngreso)}</span>
              </div>
              <div className="flex items-start gap-2.5 rounded-xl px-3.5 py-3 mt-2"
                style={{ background: `${cfg.color}12`, border: `1px solid ${cfg.color}25` }}>
                <ChevronRight className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: cfg.color }} />
                <p className="text-xs" style={{ color: cfg.color }}>
                  Para llegar a {formatARS(metaMonto)}/mes en {mesesParaMeta} meses con escenario {cfg.label.toLowerCase()},
                  necesitás mantener un crecimiento del {pctNecesario}% mensual.
                </p>
              </div>
            </div>
          ) : metaMonto > 0 && metaMonto <= ultimoIngreso ? (
            <div className="flex items-start gap-2 bg-[#10B981]/10 border border-[#10B981]/20 rounded-xl px-3.5 py-3">
              <Zap className="w-3.5 h-3.5 text-[#10B981] mt-0.5 shrink-0" />
              <p className="text-xs text-[#10B981]">Ya superás esa meta. Hoy facturás {formatARS(ultimoIngreso)}.</p>
            </div>
          ) : (
            <p className="text-xs text-[#475569] text-center py-4">Ingresá un monto objetivo para ver cuánto tiempo te lleva llegar.</p>
          )}
        </div>

        {/* Impacto cuotas */}
        <div className="bg-[#0C1424] border border-white/[0.06] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-[#EF4444]/10 flex items-center justify-center">
              <AlertCircle className="w-3.5 h-3.5 text-[#EF4444]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#F1F5F9]">Impacto de cuotas con inflación</h2>
              <p className="text-xs text-[#475569]">Lo que el Excel no te calcula</p>
            </div>
          </div>
          <div className="bg-[#080E1A] rounded-xl p-4 mb-4 border border-white/[0.05] space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-[10px] text-[#64748B] mb-1">Precio del producto ($)</p>
                <input
                  type="number" min="1" step="1000"
                  value={cuotaPrecio}
                  onChange={(e) => setCuotaPrecio(e.target.value)}
                  className="w-full bg-[#0C1424] border border-white/[0.08] text-[#F1F5F9] rounded-lg px-2.5 py-1.5 text-sm font-mono outline-none focus:border-[#10B981]/50 transition-colors"
                />
              </div>
              <div>
                <p className="text-[10px] text-[#64748B] mb-1">Cuotas</p>
                <input
                  type="number" min="1" max="60" step="1"
                  value={cuotasN}
                  onChange={(e) => setCuotasN(e.target.value)}
                  className="w-full bg-[#0C1424] border border-white/[0.08] text-[#F1F5F9] rounded-lg px-2.5 py-1.5 text-sm font-mono outline-none focus:border-[#10B981]/50 transition-colors"
                />
              </div>
              <div>
                <p className="text-[10px] text-[#64748B] mb-1">Inflación %/mes</p>
                <input
                  type="number" min="0" max="100" step="0.5"
                  value={cuotaInflStr}
                  onChange={(e) => setCuotaInflStr(e.target.value)}
                  className="w-full bg-[#0C1424] border border-white/[0.08] text-[#F1F5F9] rounded-lg px-2.5 py-1.5 text-sm font-mono outline-none focus:border-[#10B981]/50 transition-colors"
                />
              </div>
            </div>
            <div className="pt-1 border-t border-white/[0.05]">
              <p className="text-[10px] text-[#475569]">
                {formatARS(precioHoy)} en {cuotas} cuotas · inflación {cuotaInflStr}%/mes
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2.5 border-b border-white/[0.05]">
              <span className="text-xs text-[#94A3B8]">Cuota fija</span>
              <span className="text-sm font-mono font-semibold text-[#F1F5F9]">{formatARS(cuotaFija)}/mes</span>
            </div>
            <div className="flex items-center justify-between py-2.5 border-b border-white/[0.05]">
              <span className="text-xs text-[#94A3B8]">Valor real última cuota</span>
              <span className="text-sm font-mono font-semibold text-[#EF4444]">{formatARS(Math.round(valorRealUltimaCuota))}</span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-xs text-[#94A3B8]">Lo que perdés por inflación</span>
              <span className="text-sm font-mono font-bold text-[#EF4444]">−{formatARS(Math.round(perdidasInflacion))}</span>
            </div>
          </div>
          <div className="flex items-start gap-2.5 bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-xl px-3.5 py-3 mt-4">
            <AlertCircle className="w-3.5 h-3.5 text-[#EF4444] mt-0.5 shrink-0" />
            <p className="text-xs text-[#EF4444]">
              En {cuotas} cuotas perdés el{" "}
              <strong>{((perdidasInflacion / precioHoy) * 100).toFixed(0)}% del valor real</strong>.
              Aplicá un ajuste por inflación o pasá a precios con actualización automática.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
