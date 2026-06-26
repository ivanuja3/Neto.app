"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { getKpisCurrentMonth, getPnlMonthly } from "@/lib/db/analytics";
import { getSalesByChannel, getTopProducts } from "@/lib/db/orders";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUpRight,
  Store,
  ShoppingBag,
  Target,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Bar,
  BarChart,
  Cell,
} from "recharts";
import { formatARS, formatNumber } from "@/lib/mock-data";

/* ─── Helpers ─── */
const MES_LABELS: Record<string, string> = {
  "01": "Ene", "02": "Feb", "03": "Mar", "04": "Abr",
  "05": "May", "06": "Jun", "07": "Jul", "08": "Ago",
  "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dic",
};
function mesLabel(yyyymm: string): string {
  return MES_LABELS[yyyymm.split("-")[1]] ?? yyyymm;
}

const CANAL_COLORS: Record<string, string> = {
  mercadolibre: "#FFE600",
  tiendanube:   "#1EE6A8",
  instagram:    "#E1306C",
  whatsapp:     "#25D366",
  web:          "#3B82F6",
  other:        "#6366F1",
};
function canalColor(channel: string): string {
  return CANAL_COLORS[channel.toLowerCase().replace(/\s/g, "")] ?? "#6366F1";
}

/* ─── Types ─── */
type KpiRow = {
  ingresos: number; ordenes: number; ticket_promedio: number;
  cm3: number; cm3_pct: number; roas: number; spend_ads: number; vs_mes_anterior: number;
};
type PnlRow = {
  mes: string; ingresos: number; cogs: number; cm1: number; cm1_pct: number;
  marketing: number; logistica: number; cm2: number; cm2_pct: number;
  gastos_fijos: number; cm3: number; cm3_pct: number;
};
type ChannelRow = { channel: string; ordenes: number; ingresos: number; margen_pct: number };
type TopProductRow = {
  product_id: string; product_name: string;
  qty_vendida: number; ingresos: number; costo: number; margen_pct: number;
};

/* ─── Skeleton ─── */
function SkeletonCard() {
  return (
    <div className="bg-[#0C1424] border border-white/[0.06] rounded-xl p-5 animate-pulse">
      <div className="h-3.5 bg-white/[0.07] rounded w-24 mb-4" />
      <div className="h-7 bg-white/[0.07] rounded w-32 mb-3" />
      <div className="h-3 bg-white/[0.07] rounded w-20" />
    </div>
  );
}

/* ─── KPI Card ─── */
function KpiCard({
  label, value, unit, change, changeLabel, icon: Icon, accent = "#10B981",
}: {
  label: string; value: number; unit: string;
  change: number; changeLabel: string; icon: React.ElementType; accent?: string;
}) {
  const positive = change > 0;
  const neutral  = change === 0;
  const changeColor = neutral ? "#94A3B8" : positive ? "#10B981" : "#EF4444";

  const displayValue =
    unit === "ARS" ? formatARS(value)
    : unit === "%"  ? `${value.toFixed(1)}%`
    : unit === "x"  ? `${value.toFixed(1)}x`
    : formatNumber(value);

  return (
    <div className="relative bg-[#0C1424] border border-white/[0.06] rounded-xl p-5 flex flex-col gap-4 overflow-hidden group hover:border-white/[0.12] hover:shadow-[0_8px_32px_rgba(0,0,0,0.3)] transition-all duration-200 cursor-default">
      <div className="absolute top-0 left-0 right-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent 0%, ${accent}90 35%, ${accent}90 65%, transparent 100%)` }} />
      <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-2/3 h-12 blur-2xl opacity-[0.12] pointer-events-none"
        style={{ background: accent }} />
      <div className="flex items-start justify-between relative">
        <span className="text-sm text-[#94A3B8]">{label}</span>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
          style={{ background: `${accent}1A` }}>
          <Icon className="w-[15px] h-[15px]" style={{ color: accent }} />
        </div>
      </div>
      <div className="relative">
        <div className="text-[1.6rem] font-bold text-[#F1F5F9] font-mono tracking-tight leading-none">
          {displayValue}
        </div>
        <div className="flex items-center gap-2 mt-2.5">
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-[3px] rounded-full"
            style={{ background: `${changeColor}1A`, color: changeColor }}>
            {neutral ? <Minus className="w-3 h-3" /> : positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {changeLabel}
          </span>
          <span className="text-[11px] text-[#475569]">vs mes anterior</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Custom chart tooltip ─── */
function ChartTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0D1829] border border-white/[0.10] rounded-xl p-3.5 shadow-2xl text-xs backdrop-blur-sm">
      <p className="text-[#94A3B8] font-medium mb-2.5">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 mb-1 last:mb-0">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="text-[#64748B]">{p.name === "ingresos" ? "Ingresos" : "CM3"}:</span>
          <span className="text-[#F1F5F9] font-mono font-semibold ml-auto pl-3">
            {p.name === "ingresos" ? formatARS(p.value) : `${p.value}%`}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ─── Semáforo de salud del negocio ─── */
type SaludColor = "verde" | "amarillo" | "rojo";

function saludColor(condition: SaludColor) {
  if (condition === "verde")    return { color: "#10B981", bg: "rgba(16,185,129,0.10)",  border: "rgba(16,185,129,0.20)" };
  if (condition === "amarillo") return { color: "#F59E0B", bg: "rgba(245,158,11,0.10)",  border: "rgba(245,158,11,0.20)" };
  return                               { color: "#EF4444", bg: "rgba(239,68,68,0.10)",   border: "rgba(239,68,68,0.20)" };
}

function SaludIndicator({ label, value, estado, detalle }: {
  label: string; value: string; estado: SaludColor; detalle: string;
}) {
  const s    = saludColor(estado);
  const Icon = estado === "verde" ? CheckCircle2 : estado === "amarillo" ? AlertTriangle : XCircle;
  return (
    <div className="flex items-center gap-3 py-2.5">
      <Icon className="w-4 h-4 shrink-0" style={{ color: s.color }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[13px] text-[#94A3B8]">{label}</span>
          <span className="font-mono font-bold text-[13px] shrink-0" style={{ color: s.color }}>{value}</span>
        </div>
        <p className="text-[11px] text-[#475569] mt-0.5">{detalle}</p>
      </div>
    </div>
  );
}

function SaludNegocio({ cm3, roas, costosPct }: { cm3: number; roas: number; costosPct: number }) {
  const cm3Estado: SaludColor    = cm3  >= 25 ? "verde" : cm3  >= 15 ? "amarillo" : "rojo";
  const roasEstado: SaludColor   = roas >= 2.5 ? "verde" : roas >= 1.5 ? "amarillo" : "rojo";
  const costosEstado: SaludColor = costosPct <= 75 ? "verde" : costosPct <= 85 ? "amarillo" : "rojo";

  const scores    = [cm3Estado, roasEstado, costosEstado];
  const verdes    = scores.filter((s) => s === "verde").length;
  const amarillos = scores.filter((s) => s === "amarillo").length;

  const globalColor: SaludColor = verdes === 3 ? "verde" : amarillos + verdes >= 2 ? "amarillo" : "rojo";
  const globalLabel = globalColor === "verde" ? "Negocio saludable"
    : globalColor === "amarillo" ? "Atención en algunos indicadores"
    : "Rentabilidad en riesgo";

  const gs         = saludColor(globalColor);
  const GlobalIcon = globalColor === "verde" ? CheckCircle2 : globalColor === "amarillo" ? AlertTriangle : XCircle;

  return (
    <div className="bg-[#0C1424] border rounded-xl p-5 hover:border-white/[0.10] transition-colors"
      style={{ borderColor: `${gs.color}30` }}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: gs.bg }}>
            <GlobalIcon className="w-4 h-4" style={{ color: gs.color }} />
          </div>
          <div>
            <p className="text-sm font-bold text-[#F1F5F9]">{globalLabel}</p>
            <p className="text-[11px] text-[#475569]">Diagnóstico automático del mes</p>
          </div>
        </div>
        <div className="flex gap-1.5">
          {scores.map((s, i) => (
            <span key={i} className="w-2.5 h-2.5 rounded-full"
              style={{ background: saludColor(s).color, opacity: 0.85 }} />
          ))}
        </div>
      </div>
      <div className="mt-3 divide-y divide-white/[0.04]">
        <SaludIndicator label="Margen neto (CM3)" value={`${cm3.toFixed(1)}%`} estado={cm3Estado}
          detalle={cm3Estado === "verde" ? "Saludable — por encima del 25%" : cm3Estado === "amarillo" ? "Zona de atención — objetivo: superar 25%" : "Crítico — estás perdiendo rentabilidad"} />
        <SaludIndicator label="ROAS Real (post-comisiones)" value={`${roas.toFixed(1)}x`} estado={roasEstado}
          detalle={roasEstado === "verde" ? "Ads rentables — por encima de 2.5x" : roasEstado === "amarillo" ? "Ads en zona gris — revisá creativos o audiencias" : "Ads quemando plata — pausar y reestructurar"} />
        <SaludIndicator label="Costos sobre ingresos" value={`${costosPct.toFixed(1)}%`} estado={costosEstado}
          detalle={costosEstado === "verde" ? "Estructura de costos eficiente" : costosEstado === "amarillo" ? "Costos elevados — analizá variables" : "Los costos superan el umbral de riesgo"} />
      </div>
    </div>
  );
}

/* ─── Trend icon ─── */
function Trend({ dir }: { dir: "up" | "down" | "neutral" }) {
  if (dir === "up")
    return <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#10B981]"><TrendingUp className="w-3.5 h-3.5" /> Subiendo</span>;
  if (dir === "down")
    return <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#EF4444]"><TrendingDown className="w-3.5 h-3.5" /> Bajando</span>;
  return <Minus className="w-4 h-4 text-[#475569]" />;
}

/* ─── Page ─── */
export default function DashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading]   = useState(true);
  const [kpiData, setKpiData]   = useState<KpiRow | null>(null);
  const [pnlData, setPnlData]   = useState<PnlRow[]>([]);
  const [channels, setChannels] = useState<ChannelRow[]>([]);
  const [topProds, setTopProds] = useState<TopProductRow[]>([]);

  useEffect(() => {
    if (!user) return;
    async function load() {
      const [kpiRes, pnlRes, chanRes, topRes] = await Promise.all([
        getKpisCurrentMonth(user!.id),
        getPnlMonthly(user!.id, 6),
        getSalesByChannel(user!.id, 1),
        getTopProducts(user!.id, 10),
      ]);
      setKpiData(kpiRes.data?.[0] ?? null);
      setPnlData(pnlRes.data ?? []);
      setChannels(chanRes.data ?? []);
      setTopProds(topRes.data ?? []);
      setLoading(false);
    }
    load();
  }, [user]);

  /* ── Derived values ── */
  const ing    = Number(kpiData?.ingresos ?? 0);
  const cm3Pct = Number(kpiData?.cm3_pct  ?? 0);
  const roas   = Number(kpiData?.roas      ?? 0);
  const spend  = Number(kpiData?.spend_ads ?? 0);
  const mer    = spend > 0 ? +(ing / spend).toFixed(2) : 0;
  const vsMes  = Number(kpiData?.vs_mes_anterior ?? 0);

  const kpiCards = {
    ingresos:      { label: "Ingresos del mes",  value: ing,   unit: "ARS", change: vsMes, changeLabel: `${vsMes > 0 ? "+" : ""}${vsMes.toFixed(1)}%` },
    cm3:           { label: "CM3 (Margen neto)", value: cm3Pct, unit: "%",  change: 0,     changeLabel: "—" },
    roasReal:      { label: "ROAS Real",          value: roas,   unit: "x",  change: 0,     changeLabel: "—" },
    mer:           { label: "MER",                value: mer,    unit: "x",  change: 0,     changeLabel: "—" },
    ordenes:       { label: "Órdenes",            value: Number(kpiData?.ordenes ?? 0),         unit: "",    change: 0, changeLabel: "—" },
    ticketPromedio:{ label: "Ticket promedio",    value: Number(kpiData?.ticket_promedio ?? 0), unit: "ARS", change: 0, changeLabel: "—" },
  };

  const ingresosPorMes = pnlData.map((r) => ({
    mes: mesLabel(r.mes),
    ingresos: Number(r.ingresos),
    cm3: Number(r.cm3_pct),
  }));

  const totalChan = channels.reduce((s, r) => s + Number(r.ingresos), 0);
  const ventasPorCanal = channels.map((r) => ({
    canal:      r.channel,
    ingresos:   Number(r.ingresos),
    porcentaje: totalChan > 0 ? +((Number(r.ingresos) / totalChan) * 100).toFixed(1) : 0,
    color:      canalColor(r.channel),
  }));

  const skus = topProds.map((r) => ({
    nombre:   r.product_name,
    sku:      r.product_id.substring(0, 8).toUpperCase(),
    unidades: Number(r.qty_vendida),
    ingresos: Number(r.ingresos),
    costo:    Number(r.costo),
    margen:   Number(r.margen_pct),
    roasReal: 0,
    tendencia: "neutral" as "up" | "down" | "neutral",
  }));

  const lastPnl  = pnlData[pnlData.length - 1];
  const costosPct = Number(lastPnl?.ingresos ?? 0) > 0
    ? +(100 - Number(lastPnl?.cm3_pct ?? 0)).toFixed(1)
    : 0;

  /* ── Render ── */
  return (
    <div className="p-6 pb-12 space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[#F1F5F9] tracking-tight">Dashboard</h1>
            <div className="flex items-center gap-1.5 bg-[#10B981]/10 border border-[#10B981]/25 rounded-full px-2.5 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
              <span className="text-[10px] font-bold text-[#10B981] uppercase tracking-wider">Live</span>
            </div>
          </div>
          <p className="text-sm text-[#64748B] mt-1">
            {new Date().toLocaleString("es-AR", { month: "long", year: "numeric" }).replace(/^\w/, (c) => c.toUpperCase())} · Supabase
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <select className="text-sm bg-[#0C1424] border border-white/[0.08] text-[#94A3B8] rounded-lg px-3 py-1.5 outline-none hover:border-white/[0.14] focus:border-[#10B981]/40 transition-colors cursor-pointer">
            <option>Este mes</option>
            <option>Mes anterior</option>
            <option>Últimos 3 meses</option>
            <option>Este año</option>
          </select>
          <button className="hidden sm:block text-sm bg-[#10B981] text-[#080E1A] font-semibold px-4 py-1.5 rounded-lg hover:bg-[#0D9268] active:scale-95 transition-all whitespace-nowrap">
            Exportar PDF
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label={kpiCards.ingresos.label}  value={kpiCards.ingresos.value}  unit={kpiCards.ingresos.unit}  change={kpiCards.ingresos.change}  changeLabel={kpiCards.ingresos.changeLabel}  icon={Store}     accent="#10B981" />
          <KpiCard label={kpiCards.cm3.label}        value={kpiCards.cm3.value}        unit={kpiCards.cm3.unit}        change={kpiCards.cm3.change}        changeLabel={kpiCards.cm3.changeLabel}        icon={Target}    accent="#3B82F6" />
          <KpiCard label={kpiCards.roasReal.label}   value={kpiCards.roasReal.value}   unit={kpiCards.roasReal.unit}   change={kpiCards.roasReal.change}   changeLabel={kpiCards.roasReal.changeLabel}   icon={BarChart3} accent="#F59E0B" />
          <KpiCard label={kpiCards.mer.label}        value={kpiCards.mer.value}        unit={kpiCards.mer.unit}        change={kpiCards.mer.change}        changeLabel={kpiCards.mer.changeLabel}        icon={ShoppingBag} accent="#8B5CF6" />
        </div>
      )}

      {/* Semáforo de salud */}
      {!loading && <SaludNegocio cm3={cm3Pct} roas={roas} costosPct={Number(costosPct)} />}

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Ingresos vs CM3 */}
        <div className="lg:col-span-2 bg-[#0C1424] border border-white/[0.06] rounded-xl p-5 hover:border-white/[0.10] transition-colors">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="text-sm font-semibold text-[#F1F5F9]">Ingresos y CM3</h2>
              <p className="text-xs text-[#475569] mt-0.5">Evolución últimos 6 meses</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-[2px] bg-[#10B981] rounded-full" />
                <span className="text-[#64748B]">Ingresos</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-[2px] bg-[#3B82F6] rounded-full opacity-60" style={{ borderTop: "2px dashed #3B82F6", background: "none" }} />
                <span className="text-[#64748B]">CM3 %</span>
              </div>
            </div>
          </div>
          {loading ? (
            <div className="h-[220px] bg-white/[0.03] rounded-lg animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={ingresosPorMes} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.035)" vertical={false} />
                <XAxis dataKey="mes" tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="ingresos" orientation="left" tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`} />
                <YAxis yAxisId="cm3" orientation="right" tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} domain={[0, 50]} />
                <Tooltip content={<ChartTooltip />} />
                <Line yAxisId="ingresos" type="monotone" dataKey="ingresos" stroke="#10B981" strokeWidth={2.5}
                  dot={{ r: 3.5, fill: "#10B981", strokeWidth: 0 }} activeDot={{ r: 5, fill: "#10B981", stroke: "#10B981", strokeWidth: 3, strokeOpacity: 0.3 }} name="ingresos" />
                <Line yAxisId="cm3" type="monotone" dataKey="cm3" stroke="#3B82F6" strokeWidth={2} strokeDasharray="5 3"
                  dot={{ r: 3, fill: "#3B82F6", strokeWidth: 0 }} activeDot={{ r: 4.5, fill: "#3B82F6", stroke: "#3B82F6", strokeWidth: 3, strokeOpacity: 0.3 }} name="cm3" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Ventas por canal */}
        <div className="bg-[#0C1424] border border-white/[0.06] rounded-xl p-5 hover:border-white/[0.10] transition-colors">
          <div className="mb-5">
            <h2 className="text-sm font-semibold text-[#F1F5F9]">Ventas por canal</h2>
            <p className="text-xs text-[#475569] mt-0.5">Distribución del mes</p>
          </div>
          {loading ? (
            <div className="h-[220px] bg-white/[0.03] rounded-lg animate-pulse" />
          ) : ventasPorCanal.length === 0 ? (
            <div className="h-[220px] flex items-center justify-center text-xs text-[#475569]">Sin datos de canal este mes</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={ventasPorCanal} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.035)" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} domain={[0, 60]} />
                <YAxis dataKey="canal" type="category" tick={{ fill: "#94A3B8", fontSize: 11 }} axisLine={false} tickLine={false} width={100} />
                <Tooltip formatter={(v) => [`${v}%`, "Participación"]}
                  contentStyle={{ background: "#0D1829", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 10, color: "#F1F5F9", fontSize: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }} />
                <Bar dataKey="porcentaje" radius={[0, 5, 5, 0]}>
                  {ventasPorCanal.map((entry) => (
                    <Cell key={entry.canal} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* SKU Table */}
      <div className="bg-[#0C1424] border border-white/[0.06] rounded-xl hover:border-white/[0.10] transition-colors">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
          <div>
            <h2 className="text-sm font-semibold text-[#F1F5F9]">Performance por SKU</h2>
            <p className="text-xs text-[#475569] mt-0.5">Ordenado por margen</p>
          </div>
          <button className="flex items-center gap-1.5 text-xs text-[#10B981] hover:text-[#34D399] transition-colors font-semibold group">
            Ver todos
            <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>
        </div>
        {loading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 bg-white/[0.03] rounded animate-pulse" />
            ))}
          </div>
        ) : skus.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-[#475569]">No hay ventas registradas aún</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  <th className="text-left text-xs font-medium text-[#475569] px-5 py-3 w-8">#</th>
                  {["Producto", "Unidades", "Ingresos", "Costo", "Margen", "Tendencia"].map((col) => (
                    <th key={col} className="text-left text-xs font-medium text-[#475569] px-5 py-3">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {skus.map((sku, i) => (
                  <tr key={sku.sku} className={`border-b border-white/[0.04] hover:bg-white/[0.025] transition-colors ${i === skus.length - 1 ? "border-b-0" : ""}`}>
                    <td className="px-5 py-3.5"><span className="text-xs font-mono text-[#475569] font-medium">{String(i + 1).padStart(2, "0")}</span></td>
                    <td className="px-5 py-3.5">
                      <div>
                        <p className="text-[#F1F5F9] font-medium text-[13px]">{sku.nombre}</p>
                        <p className="text-[11px] text-[#475569] font-mono mt-0.5">{sku.sku}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-[#94A3B8] font-mono text-[13px]">{formatNumber(sku.unidades)}</td>
                    <td className="px-5 py-3.5 text-[#F1F5F9] font-mono font-semibold text-[13px]">{formatARS(sku.ingresos)}</td>
                    <td className="px-5 py-3.5 text-[#64748B] font-mono text-[13px]">{formatARS(sku.costo)}</td>
                    <td className="px-5 py-3.5">
                      <span className="font-mono font-bold text-[13px] px-2 py-0.5 rounded-md"
                        style={{
                          color: sku.margen >= 50 ? "#10B981" : sku.margen >= 40 ? "#F59E0B" : "#EF4444",
                          background: sku.margen >= 50 ? "rgba(16,185,129,0.10)" : sku.margen >= 40 ? "rgba(245,158,11,0.10)" : "rgba(239,68,68,0.10)",
                        }}>
                        {sku.margen.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-5 py-3.5"><Trend dir={sku.tendencia} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bottom KPI row */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <KpiCard label={kpiCards.ordenes.label} value={kpiCards.ordenes.value} unit={kpiCards.ordenes.unit}
            change={kpiCards.ordenes.change} changeLabel={kpiCards.ordenes.changeLabel} icon={ShoppingBag} accent="#06B6D4" />
          <KpiCard label={kpiCards.ticketPromedio.label} value={kpiCards.ticketPromedio.value} unit={kpiCards.ticketPromedio.unit}
            change={kpiCards.ticketPromedio.change} changeLabel={kpiCards.ticketPromedio.changeLabel} icon={Store} accent="#A78BFA" />
        </div>
      )}
    </div>
  );
}
