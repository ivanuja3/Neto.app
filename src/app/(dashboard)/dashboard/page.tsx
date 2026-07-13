"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { getKpisCurrentMonth, getPnlMonthly } from "@/lib/db/analytics";
import { getSalesByChannel, getTopProducts } from "@/lib/db/orders";
import { getCompany } from "@/lib/db/companies";
import Link from "next/link";
import { AsesoramientoProfesional } from "@/components/asesoramiento-profesional";
import { WelcomeModal } from "@/components/welcome-modal";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUpRight,
  ArrowRight,
  Store,
  ShoppingBag,
  ShoppingCart,
  Package,
  Calculator,
  Target,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sparkles,
  Check,
  Star,
  Trophy,
  ChevronUp,
  ChevronDown,
  X,
  Pencil,
  Flag,
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
  label, value, unit, change, changeLabel, icon: Icon, accent = "#10B981", description,
}: {
  label: string; value: number; unit: string;
  change: number; changeLabel: string; icon: React.ElementType; accent?: string;
  description?: string;
}) {
  const [flipped, setFlipped] = useState(false);
  const positive = change > 0;
  const neutral  = change === 0;
  const changeColor = neutral ? "#94A3B8" : positive ? "#10B981" : "#EF4444";

  const displayValue =
    unit === "ARS" ? formatARS(value)
    : unit === "%"  ? `${value.toFixed(1)}%`
    : unit === "x"  ? `${value.toFixed(1)}x`
    : formatNumber(value);

  return (
    <div
      className="relative cursor-pointer select-none"
      style={{ perspective: "800px" }}
      onMouseEnter={() => description && setFlipped(true)}
      onMouseLeave={() => setFlipped(false)}
      onClick={() => description && setFlipped(f => !f)}
    >
      <div
        style={{
          transformStyle: "preserve-3d",
          transition: "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          position: "relative",
        }}
      >
        {/* Cara frontal */}
        <div
          className="bg-[#0C1424] border border-white/[0.06] rounded-xl p-5 flex flex-col gap-4"
          style={{ backfaceVisibility: "hidden", borderTop: "2px solid rgba(16,185,129,0.35)" }}
        >
          <div className="flex items-start justify-between">
            <span className="text-sm text-[#94A3B8]">{label}</span>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: `${accent}15` }}>
              <Icon className="w-[15px] h-[15px]" style={{ color: accent }} />
            </div>
          </div>
          <div>
            <div className="text-[1.6rem] font-bold text-[#F1F5F9] tracking-tight leading-none" style={{ fontVariantNumeric: "tabular-nums" }}>
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

        {/* Cara trasera */}
        {description && (
          <div
            className="absolute inset-0 rounded-xl p-5 flex flex-col items-center justify-center gap-3"
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              background: `${accent}10`,
              border: `1px solid ${accent}35`,
            }}
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: `${accent}22` }}>
              <Icon className="w-[15px] h-[15px]" style={{ color: accent }} />
            </div>
            <p className="text-xs text-[#94A3B8] text-center leading-relaxed">{description}</p>
          </div>
        )}
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
    <div className="bg-[#060D19] border border-[#10B981]/[0.18] rounded-lg px-3.5 py-3 shadow-2xl text-xs"
      style={{ borderTop: "2px solid rgba(16,185,129,0.35)" }}>
      <p className="text-[#475569] font-medium mb-2 tabular-nums">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 mb-1 last:mb-0">
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="text-[#64748B]">{p.name === "ingresos" ? "Ingresos" : "Margen"}:</span>
          <span className="text-[#F1F5F9] font-semibold tabular-nums ml-auto pl-4">
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
        <SaludIndicator label="Margen Neto" value={`${cm3.toFixed(1)}%`} estado={cm3Estado}
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

/* ─── Meta del mes ─── */
function MetaMes({
  ingresos, goal, userId, onSaved,
}: {
  ingresos: number; goal: number | null; userId: string; onSaved: (v: number | null) => void;
}) {
  const [editing, setEditing]   = useState(false);
  const [input,   setInput]     = useState("");
  const [saving,  setSaving]    = useState(false);
  const [saveErr, setSaveErr]   = useState<string | null>(null);

  const pct    = goal && goal > 0 ? Math.min(Math.round((ingresos / goal) * 100), 100) : 0;
  const falta  = goal ? Math.max(goal - ingresos, 0) : 0;
  const barColor = pct >= 100 ? "#10B981" : pct >= 60 ? "#F59E0B" : "#3B82F6";

  async function save() {
    const raw = input.replace(/\./g, "").replace(",", ".");
    const parsed = raw ? Number(raw) : 0;
    const val = !isNaN(parsed) && parsed > 0 ? parsed : null;
    setSaving(true);
    setSaveErr(null);
    try {
      const { updateCompany } = await import("@/lib/db/companies");
      await updateCompany(userId, { monthly_goal: val });
      onSaved(val);
      setEditing(false);
    } catch (err) {
      setSaveErr(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  if (!goal && !editing) {
    return (
      <button
        onClick={() => { setInput(""); setEditing(true); }}
        className="flex items-center gap-2 text-sm text-[#475569] hover:text-[#10B981] transition-colors border border-dashed border-white/[0.08] hover:border-[#10B981]/30 rounded-xl px-4 py-3 w-full"
      >
        <Flag className="w-4 h-4" />
        Fijar meta de ventas del mes
      </button>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden border border-[#F59E0B]/20"
      style={{ background: "linear-gradient(135deg, #0D1829 0%, #0C1424 100%)", boxShadow: "0 0 32px rgba(245,158,11,0.06)" }}>
      <div className="px-5 py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#F59E0B]/15 flex items-center justify-center">
              <Flag className="w-4 h-4 text-[#F59E0B]" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#F1F5F9] tracking-wide uppercase" style={{ fontSize: "11px", letterSpacing: "0.08em" }}>Meta del mes</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                <span className="text-[10px] text-[#10B981] font-semibold uppercase tracking-wider">Live</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-black tabular-nums" style={{ color: barColor }}>{pct}%</span>
            {!editing && (
              <button onClick={() => { setInput(goal?.toString() ?? ""); setEditing(true); }}
                className="w-7 h-7 rounded-lg bg-white/[0.05] hover:bg-white/[0.10] flex items-center justify-center transition-colors">
                <Pencil className="w-3.5 h-3.5 text-[#94A3B8]" />
              </button>
            )}
          </div>
        </div>

        {/* Barra */}
        {goal && (
          <>
            <div className="h-3 bg-white/[0.05] rounded-full overflow-hidden mb-2">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${barColor}cc, ${barColor})` }} />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#94A3B8]">
                {formatARS(ingresos)} facturados
              </span>
              <span className="text-[#475569]">
                {pct < 100 ? `Faltan ${formatARS(falta)}` : "Meta alcanzada"}
              </span>
              <span className="text-[#475569]">Meta: {formatARS(goal)}</span>
            </div>
          </>
        )}

        {/* Input edición */}
        {editing && (
          <div className="mt-3 space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => { setInput(e.target.value); setSaveErr(null); }}
                onKeyDown={(e) => e.key === "Enter" && save()}
                placeholder="Ej: 500000"
                autoFocus
                className="flex-1 bg-[#080E1A] border border-white/[0.10] text-[#F1F5F9] placeholder-[#475569] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#F59E0B]/50 transition-colors"
              />
              <button onClick={save} disabled={saving}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-[#080E1A] disabled:opacity-60 transition-colors"
                style={{ background: "#F59E0B" }}>
                {saving ? "..." : "Guardar"}
              </button>
              <button onClick={() => { setEditing(false); setSaveErr(null); }}
                className="px-3 py-2 rounded-lg text-sm text-[#475569] hover:text-[#94A3B8] border border-white/[0.06] transition-colors">
                Cancelar
              </button>
            </div>
            {saveErr && <p className="text-[11px] text-[#EF4444]">{saveErr}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Checklist de setup inicial ─── */
type SetupStep = {
  label: string;
  desc: string;
  href: string;
  done: boolean;
  icon: React.ElementType;
  accent: string;
};

const STEP_ACCENTS = ["#F97316", "#3B82F6", "#10B981", "#8B5CF6"];

function SetupChecklist({ steps }: { steps: SetupStep[] }) {
  const [collapsed, setCollapsed] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const done  = steps.filter((s) => s.done).length;
  const total = steps.length;
  const pct   = Math.round((done / total) * 100);

  if (done === total || dismissed) return null;

  const activeIdx = steps.findIndex((s) => !s.done);

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ boxShadow: "0 0 0 1px rgba(59,130,246,0.20), 0 4px 32px rgba(59,130,246,0.07)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-[#0D1829] via-[#0C1424] to-[#0D1829] border border-[#3B82F6]/20 rounded-t-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, #F97316, #EF4444)" }}>
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-[#F1F5F9]">Primeros pasos</p>
            <p className="text-xs text-[#475569]">{done} de {total} completados</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold bg-[#3B82F6] text-white px-2.5 py-1 rounded-full tabular-nums">
            {pct}%
          </span>
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="w-7 h-7 rounded-lg bg-white/[0.05] hover:bg-white/[0.10] flex items-center justify-center transition-colors"
          >
            {collapsed
              ? <ChevronDown className="w-4 h-4 text-[#94A3B8]" />
              : <ChevronUp   className="w-4 h-4 text-[#94A3B8]" />}
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="w-7 h-7 rounded-lg bg-white/[0.05] hover:bg-white/[0.10] flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-[#94A3B8]" />
          </button>
        </div>
      </div>

      {/* Steps */}
      {!collapsed && (
        <div className="bg-[#080E1A] border-x border-[#3B82F6]/15">
          {steps.map((step, i) => {
            const Icon    = step.icon;
            const isActive  = i === activeIdx;
            const isLocked  = !step.done && i > activeIdx;
            const accent    = step.accent;

            return (
              <div
                key={step.href}
                className={`flex items-center gap-4 px-5 py-4 border-b border-white/[0.04] last:border-b-0 transition-colors ${
                  isActive ? "bg-[#0D1829]" : ""
                }`}
                style={isActive ? { borderLeft: `3px solid ${accent}` } : { borderLeft: "3px solid transparent" }}
              >
                {/* Icon */}
                {step.done ? (
                  <div className="w-10 h-10 rounded-full bg-[#10B981] flex items-center justify-center shrink-0">
                    <Check className="w-5 h-5 text-white" />
                  </div>
                ) : isActive ? (
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `linear-gradient(135deg, ${accent}dd, ${accent}99)` }}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-white/[0.04] flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-[#1E293B]" />
                  </div>
                )}

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold leading-tight ${
                    step.done ? "text-[#10B981]" : isLocked ? "text-[#334155]" : "text-[#F1F5F9]"
                  }`}>
                    {step.label}
                  </p>
                  <p className={`text-xs mt-0.5 ${isLocked ? "text-[#1E293B]" : "text-[#475569]"}`}>
                    {step.desc}
                  </p>
                </div>

                {/* CTA */}
                {isActive && (
                  <Link
                    href={step.href}
                    className="flex items-center gap-1.5 text-white text-sm font-bold px-4 py-2 rounded-xl transition-all active:scale-95 shrink-0"
                    style={{ background: accent }}
                  >
                    ¡Empezar! <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
                {step.done && (
                  <span className="text-xs font-semibold text-[#10B981] shrink-0">Listo</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Footer con barra de progreso */}
      {!collapsed && (
        <div className="bg-[#080E1A] border border-t-0 border-[#3B82F6]/15 rounded-b-2xl px-5 py-3 flex items-center gap-3">
          <Trophy className="w-4 h-4 text-[#F59E0B] shrink-0" />
          <span className="text-xs text-[#475569]">{done} de {total} completados</span>
          <div className="flex-1 h-1 bg-white/[0.05] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, background: "linear-gradient(90deg, #3B82F6, #10B981)" }}
            />
          </div>
          <span className="text-xs font-bold text-[#3B82F6] tabular-nums">{pct}%</span>
        </div>
      )}
    </div>
  );
}

/* ─── Page ─── */
export default function DashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading]   = useState(true);
  const [kpiData, setKpiData]   = useState<KpiRow | null>(null);
  const [pnlData, setPnlData]   = useState<PnlRow[]>([]);
  const [channels, setChannels] = useState<ChannelRow[]>([]);
  const [topProds, setTopProds] = useState<TopProductRow[]>([]);
  const [company,    setCompany]   = useState<{ name: string; industry?: string | null; monthly_goal?: number | null } | null>(null);
  const [monthlyGoal, setMonthlyGoal] = useState<number | null>(null);
  const [loadError,  setLoadError] = useState(false);

  useEffect(() => {
    if (!user) return;
    async function load() {
      try {
        const [kpiRes, pnlRes, chanRes, topRes, comp] = await Promise.all([
          getKpisCurrentMonth(user!.id),
          getPnlMonthly(user!.id, 6),
          getSalesByChannel(user!.id, 1),
          getTopProducts(user!.id, 10),
          getCompany(user!.id),
        ]);
        setKpiData(kpiRes.data?.[0] ?? null);
        setPnlData(pnlRes.data ?? []);
        setChannels(chanRes.data ?? []);
        setTopProds(topRes.data ?? []);
        setCompany(comp ? { name: comp.name ?? "", industry: comp.industry, monthly_goal: comp.monthly_goal } : null);
        setMonthlyGoal(comp?.monthly_goal ?? null);
      } catch (err) {
        console.error("Dashboard load error:", err);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  /* ── Derived values ── */
  const ing    = Number(kpiData?.ingresos ?? 0);
  const cm3Pct = Number(kpiData?.cm3_pct  ?? 0);
  const roas   = Number(kpiData?.roas      ?? 0);
  const spend  = Number(kpiData?.spend_ads ?? 0);
  const mer    = spend > 0 ? +(ing / spend).toFixed(2) : 0;
  const ordenes = Number(kpiData?.ordenes ?? 0);
  const cpa    = spend > 0 && ordenes > 0 ? Math.round(spend / ordenes) : 0;
  const vsMes  = Number(kpiData?.vs_mes_anterior ?? 0);
  const isEcommerce = !company?.industry ||
    ["ecommerce", "tienda", "retail", "comercio"].some(k => company.industry?.toLowerCase().includes(k));

  const kpiCards = {
    ingresos: {
      label: "Ingresos del mes", value: ing, unit: "ARS", change: vsMes,
      changeLabel: `${vsMes > 0 ? "+" : ""}${vsMes.toFixed(1)}%`,
      description: "Total facturado este mes. Es la plata que entró antes de descontar costos y gastos.",
    },
    cm3: {
      label: "Ganancia neta", value: cm3Pct, unit: "%", change: 0, changeLabel: "—",
      description: "Lo que te queda después de pagar el costo de los productos, los costos fijos y la publicidad. Tu ganancia real.",
    },
    roasReal: {
      label: "ROAS Real", value: roas, unit: "x", change: 0, changeLabel: "—",
      description: "Por cada $1 invertido en anuncios, cuántos $1 de ventas generás. Ej: 4x significa que recuperás 4 veces lo invertido.",
    },
    mer: {
      label: "Eficiencia de marketing", value: mer, unit: "x", change: 0, changeLabel: "—",
      description: "Relación entre todas tus ventas y todo lo que gastás en marketing. Más alto = más eficiente. Lo ideal es superar 3x.",
    },
    cpa: {
      label: "CPA", value: cpa, unit: "ARS", change: 0, changeLabel: "—",
      description: "Cuánto te cuesta conseguir cada venta con publicidad. Calculado como gasto en ads dividido la cantidad de órdenes. Mientras más bajo, más eficiente tu inversión.",
    },
    ordenes: {
      label: "Órdenes",
      value: ordenes, unit: "", change: 0, changeLabel: "—",
      description: "Cantidad de pedidos recibidos este mes en todos tus canales de venta.",
    },
    ticketPromedio: {
      label: "Ticket promedio",
      value: Number(kpiData?.ticket_promedio ?? 0), unit: "ARS", change: 0, changeLabel: "—",
      description: "Cuánto gasta en promedio cada cliente por pedido. Subirlo es una de las formas más rápidas de aumentar tu ganancia.",
    },
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

  const setupSteps: SetupStep[] = [
    { label: "Configurá tu negocio", desc: "Nombre, rubro y condición fiscal", href: "/configuracion", icon: Store,        accent: STEP_ACCENTS[0], done: !!(company?.name && company.name !== "Mi negocio") },
    { label: "Cargá tus productos",  desc: "Precio de venta, costo y stock",   href: "/inventario",    icon: Package,      accent: STEP_ACCENTS[1], done: topProds.length > 0 },
    { label: "Registrá una venta",   desc: "Así empezás a ver tus métricas",   href: "/ventas",        icon: ShoppingCart, accent: STEP_ACCENTS[2], done: Number(kpiData?.ordenes ?? 0) > 0 },
    { label: "Cargá tus costos",     desc: "Alquiler, sueldos y otros gastos", href: "/costos",        icon: Calculator,   accent: STEP_ACCENTS[3], done: Number(lastPnl?.cogs ?? 0) > 0 },
  ];

  /* ── Render ── */
  return (
    <div className="p-6 pb-12 space-y-6 max-w-[1400px]">
      {/* Modal de bienvenida — solo primer login */}
      {user && !loading && (
        <WelcomeModal
          userId={user.id}
          email={user.email ?? undefined}
          businessName={company?.name ?? undefined}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#F1F5F9] tracking-tight">
            {company?.name && company.name !== "Mi negocio"
              ? company.name
              : "Dashboard"}
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            {new Date().toLocaleString("es-AR", { month: "long", year: "numeric" }).replace(/^\w/, (c) => c.toUpperCase())} · {company?.name && company.name !== "Mi negocio" ? "Dashboard" : "Neto.app"}
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

      {/* Error de carga */}
      {loadError && (
        <div className="flex items-center gap-2 bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444] text-sm px-4 py-3 rounded-xl">
          <XCircle className="w-4 h-4 shrink-0" />
          No se pudieron cargar los datos. Revisá tu conexión y recargá la página.
        </div>
      )}

      {/* Meta del mes */}
      {!loading && !loadError && user && (
        <MetaMes
          ingresos={ing}
          goal={monthlyGoal}
          userId={user.id}
          onSaved={setMonthlyGoal}
        />
      )}

      {/* Setup checklist — visible hasta completar los 4 pasos */}
      {!loading && !loadError && <SetupChecklist steps={setupSteps} />}

      {/* KPI Grid */}
      {loading ? (
        <div className={`grid grid-cols-2 gap-4 ${isEcommerce ? "lg:grid-cols-5" : "lg:grid-cols-4"}`}>
          {Array.from({ length: isEcommerce ? 5 : 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className={`grid grid-cols-2 gap-4 ${isEcommerce ? "lg:grid-cols-5" : "lg:grid-cols-4"}`}>
          <KpiCard label={kpiCards.ingresos.label}  value={kpiCards.ingresos.value}  unit={kpiCards.ingresos.unit}  change={kpiCards.ingresos.change}  changeLabel={kpiCards.ingresos.changeLabel}  icon={Store}       accent="#10B981" description={kpiCards.ingresos.description} />
          <KpiCard label={kpiCards.cm3.label}        value={kpiCards.cm3.value}        unit={kpiCards.cm3.unit}        change={kpiCards.cm3.change}        changeLabel={kpiCards.cm3.changeLabel}        icon={Target}      accent="#3B82F6" description={kpiCards.cm3.description} />
          <KpiCard label={kpiCards.roasReal.label}   value={kpiCards.roasReal.value}   unit={kpiCards.roasReal.unit}   change={kpiCards.roasReal.change}   changeLabel={kpiCards.roasReal.changeLabel}   icon={BarChart3}   accent="#F59E0B" description={kpiCards.roasReal.description} />
          <KpiCard label={kpiCards.mer.label}        value={kpiCards.mer.value}        unit={kpiCards.mer.unit}        change={kpiCards.mer.change}        changeLabel={kpiCards.mer.changeLabel}        icon={ShoppingBag} accent="#8B5CF6" description={kpiCards.mer.description} />
          {isEcommerce && (
            <KpiCard label={kpiCards.cpa.label} value={kpiCards.cpa.value} unit={kpiCards.cpa.unit} change={kpiCards.cpa.change} changeLabel={kpiCards.cpa.changeLabel} icon={ShoppingCart} accent="#EC4899" description={kpiCards.cpa.description} />
          )}
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
              <h2 className="text-sm font-semibold text-[#F1F5F9]">Ingresos y Margen Neto</h2>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-[2px] bg-[#10B981] rounded-full" />
                <span className="text-[#64748B]">Ingresos</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-[2px] bg-[#3B82F6] rounded-full opacity-60" style={{ borderTop: "2px dashed #3B82F6", background: "none" }} />
                <span className="text-[#64748B]">Margen Neto %</span>
              </div>
            </div>
          </div>
          {loading ? (
            <div className="h-[220px] bg-[#10B981]/[0.04] rounded-lg animate-pulse" />
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
          </div>
          {loading ? (
            <div className="h-[220px] bg-[#10B981]/[0.04] rounded-lg animate-pulse" />
          ) : ventasPorCanal.length === 0 ? (
            <div className="h-[220px] flex items-center justify-center text-xs text-[#475569]">Sin datos de canal este mes</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={ventasPorCanal} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.035)" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} domain={[0, "auto"]} />
                <YAxis dataKey="canal" type="category" tick={{ fill: "#94A3B8", fontSize: 11 }} axisLine={false} tickLine={false} width={100} />
                <Tooltip formatter={(v) => [`${v}%`, "Participación"]}
                  contentStyle={{ background: "#060D19", border: "1px solid rgba(16,185,129,0.20)", borderTop: "2px solid rgba(16,185,129,0.35)", borderRadius: 8, color: "#F1F5F9", fontSize: 12 }} />
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
          </div>
          <button className="flex items-center gap-1.5 text-xs text-[#10B981] hover:text-[#34D399] transition-colors font-semibold group">
            Ver todos
            <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>
        </div>
        {loading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 bg-[#10B981]/[0.04] rounded animate-pulse" />
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
                        <div className="flex items-center gap-2">
                          <p className="text-[#F1F5F9] font-medium text-[13px]">{sku.nombre}</p>
                          {i === 0 && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-[#F59E0B]/15 text-[#FCD34D] border border-[#F59E0B]/20 px-1.5 py-[2px] rounded-md">
                              <Star className="w-2.5 h-2.5" /> Estrella
                            </span>
                          )}
                        </div>
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
      <div className="px-6 pb-6 mt-4">
        <AsesoramientoProfesional />
      </div>
    </div>
  );
}
