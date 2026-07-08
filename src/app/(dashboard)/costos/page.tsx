"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { getExpenses, getKpisCurrentMonth, createExpense, deleteExpense } from "@/lib/db/analytics";
import { getCompany } from "@/lib/db/companies";
import { Modal, Field, inputCls, selectCls, SaveButton } from "@/components/ui/modal";
import { PlusCircle, Pencil, Trash2, AlertCircle, Receipt, Sparkles } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { formatARS } from "@/lib/mock-data";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

type CostoItem = {
  id: string;
  nombre: string;
  categoria: "fijo" | "variable";
  tipo: string;
  valor: number;
  periodicidad: string;
};

const TIPO_COLORS: Record<string, string> = {
  Infraestructura: "#3B82F6",
  Personal:        "#8B5CF6",
  Tecnología:      "#06B6D4",
  Profesional:     "#F59E0B",
  Producto:        "#10B981",
  Logística:       "#F97316",
  Comisiones:      "#EC4899",
  Marketing:       "#EF4444",
  General:         "#6366F1",
};

function toMonthly(amount: number, frequency: string): number {
  if (frequency === "quarterly") return amount / 3;
  if (frequency === "yearly")    return amount / 12;
  return amount;
}

/* ── Form agregar costo ── */
const CATEGORIAS = ["Infraestructura", "Personal", "Tecnología", "Profesional", "Producto", "Logística", "Comisiones", "Marketing", "General"];

/* ── Plantillas de gastos por rubro ── */
type Sugerencia = { nombre: string; categoria: string; tipo: "fixed" | "variable"; monto: number; emoji: string };

const PLANTILLAS: Record<string, Sugerencia[]> = {
  ecommerce: [
    { emoji: "🏪", nombre: "Comisión Tienda Nube / MercadoLibre", categoria: "Comisiones",      tipo: "variable", monto: 40000  },
    { emoji: "📦", nombre: "Logística y envíos",                  categoria: "Logística",        tipo: "variable", monto: 35000  },
    { emoji: "📣", nombre: "Meta Ads / publicidad",               categoria: "Marketing",        tipo: "variable", monto: 60000  },
    { emoji: "🏢", nombre: "Alquiler depósito",                   categoria: "Infraestructura",  tipo: "fixed",    monto: 90000  },
    { emoji: "👤", nombre: "Contador / gestor",                   categoria: "Profesional",      tipo: "fixed",    monto: 30000  },
    { emoji: "💻", nombre: "Herramientas y software",             categoria: "Tecnología",       tipo: "fixed",    monto: 15000  },
    { emoji: "👥", nombre: "Sueldo empleado",                     categoria: "Personal",         tipo: "fixed",    monto: 200000 },
    { emoji: "⚡", nombre: "Servicios (luz, internet)",           categoria: "Infraestructura",  tipo: "fixed",    monto: 20000  },
  ],
  gastronomia: [
    { emoji: "🏠", nombre: "Alquiler del local",                  categoria: "Infraestructura",  tipo: "fixed",    monto: 150000 },
    { emoji: "⚡", nombre: "Gas y electricidad",                  categoria: "Infraestructura",  tipo: "fixed",    monto: 40000  },
    { emoji: "👥", nombre: "Personal de cocina",                  categoria: "Personal",         tipo: "fixed",    monto: 300000 },
    { emoji: "🧾", nombre: "Contador",                            categoria: "Profesional",      tipo: "fixed",    monto: 30000  },
    { emoji: "🚀", nombre: "Plataformas delivery (PedidosYa, etc)", categoria: "Comisiones",    tipo: "variable", monto: 50000  },
    { emoji: "📣", nombre: "Publicidad en redes",                 categoria: "Marketing",        tipo: "variable", monto: 25000  },
  ],
  servicios: [
    { emoji: "💻", nombre: "Herramientas y software",             categoria: "Tecnología",       tipo: "fixed",    monto: 20000  },
    { emoji: "📣", nombre: "Meta Ads / publicidad",               categoria: "Marketing",        tipo: "variable", monto: 40000  },
    { emoji: "🏢", nombre: "Espacio de coworking / alquiler",     categoria: "Infraestructura",  tipo: "fixed",    monto: 60000  },
    { emoji: "🧾", nombre: "Contador",                            categoria: "Profesional",      tipo: "fixed",    monto: 30000  },
    { emoji: "⚡", nombre: "Internet y telefonía",                categoria: "Infraestructura",  tipo: "fixed",    monto: 15000  },
    { emoji: "👥", nombre: "Empleado / colaborador",              categoria: "Personal",         tipo: "fixed",    monto: 180000 },
  ],
  retail: [
    { emoji: "🏠", nombre: "Alquiler del local",                  categoria: "Infraestructura",  tipo: "fixed",    monto: 200000 },
    { emoji: "👥", nombre: "Personal de local",                   categoria: "Personal",         tipo: "fixed",    monto: 250000 },
    { emoji: "📦", nombre: "Flete y logística",                   categoria: "Logística",        tipo: "variable", monto: 20000  },
    { emoji: "📣", nombre: "Publicidad",                          categoria: "Marketing",        tipo: "variable", monto: 30000  },
    { emoji: "🧾", nombre: "Contador / gestor",                   categoria: "Profesional",      tipo: "fixed",    monto: 30000  },
    { emoji: "⚡", nombre: "Servicios del local",                 categoria: "Infraestructura",  tipo: "fixed",    monto: 30000  },
  ],
};

function getPlantilla(industry: string | null): Sugerencia[] {
  if (!industry) return PLANTILLAS.ecommerce;
  const k = industry.toLowerCase();
  if (k.includes("gastro") || k.includes("comida") || k.includes("restaurant")) return PLANTILLAS.gastronomia;
  if (k.includes("servic")) return PLANTILLAS.servicios;
  if (k.includes("retail") || k.includes("ropa") || k.includes("indument")) return PLANTILLAS.retail;
  return PLANTILLAS.ecommerce;
}

function FormCosto({ userId, onSaved, onClose, initial }: { userId: string; onSaved: () => void; onClose: () => void; initial?: Partial<{ nombre: string; categoria: string; tipo: string; monto: string }> | null }) {
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");
  const [form, setForm]     = useState({
    nombre:       initial?.nombre    ?? "",
    categoria:    initial?.categoria ?? "General",
    tipo:         (initial?.tipo as "fixed" | "variable") ?? "fixed",
    monto:        initial?.monto     ?? "",
    periodicidad: "monthly" as "monthly" | "quarterly" | "yearly",
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre.trim() || !form.monto) { setError("Completá todos los campos"); return; }
    setSaving(true);
    setError("");
    const { error: dbErr } = await createExpense({
      user_id:   userId,
      name:      form.nombre.trim(),
      category:  form.categoria,
      type:      form.tipo,
      amount:    parseFloat(form.monto),
      frequency: form.periodicidad,
    });
    if (dbErr) { setError("Error al guardar. Intentá de nuevo."); setSaving(false); return; }
    onSaved();
    onClose();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Concepto">
        <input value={form.nombre} onChange={(e) => set("nombre", e.target.value)}
          placeholder="Ej: Alquiler depósito" className={inputCls} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Categoría">
          <select value={form.categoria} onChange={(e) => set("categoria", e.target.value)} className={selectCls}>
            {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Tipo">
          <select value={form.tipo} onChange={(e) => set("tipo", e.target.value)} className={selectCls}>
            <option value="fixed">Fijo</option>
            <option value="variable">Variable</option>
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Monto ($)">
          <input type="number" min="0" step="0.01" value={form.monto} onChange={(e) => set("monto", e.target.value)}
            placeholder="85000" className={inputCls} />
        </Field>
        <Field label="Periodicidad">
          <select value={form.periodicidad} onChange={(e) => set("periodicidad", e.target.value)} className={selectCls}>
            <option value="monthly">Mensual</option>
            <option value="quarterly">Trimestral</option>
            <option value="yearly">Anual</option>
          </select>
        </Field>
      </div>

      {error && <p className="text-xs text-[#EF4444] bg-[#EF4444]/[0.08] border border-[#EF4444]/20 rounded-lg px-3 py-2">{error}</p>}
      <SaveButton saving={saving} label="Agregar costo" />
    </form>
  );
}

function SkeletonRow() {
  return (
    <tr className="border-b border-white/[0.04]">
      {Array.from({ length: 5 }).map((_, i) => (
        <td key={i} className="px-5 py-3.5"><div className="h-4 bg-white/[0.06] rounded animate-pulse" /></td>
      ))}
    </tr>
  );
}

export default function CostosPage() {
  const { user } = useAuth();
  const [loading, setLoading]   = useState(true);
  const [costos, setCostos]     = useState<CostoItem[]>([]);
  const [ingresosMes, setIngresosMes] = useState(0);
  const [industry, setIndustry] = useState<string | null>(null);
  const [tab, setTab]           = useState<"todos" | "fijo" | "variable">("todos");
  const [modalOpen, setModalOpen] = useState(false);
  const [prefill, setPrefill]   = useState<Partial<{ nombre: string; categoria: string; tipo: string; monto: string }> | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey((k) => k + 1);

  useEffect(() => {
    if (!user) return;
    async function load() {
      const [expRes, kpiRes, companyRes] = await Promise.all([
        getExpenses(user!.id),
        getKpisCurrentMonth(user!.id),
        getCompany(user!.id),
      ]);

      const items: CostoItem[] = (expRes.data ?? []).map((e: {
        id: string; name: string; type: string; category: string | null;
        amount: number; frequency: string;
      }) => ({
        id:          e.id,
        nombre:      e.name,
        categoria:   (e.type === "fixed" ? "fijo" : "variable") as "fijo" | "variable",
        tipo:        e.category ?? "General",
        valor:       toMonthly(e.amount, e.frequency),
        periodicidad: e.frequency,
      }));

      setCostos(items);
      setIngresosMes(Number(kpiRes.data?.[0]?.ingresos ?? 0));
      setIndustry(companyRes?.industry ?? null);
      setLoading(false);
    }
    load();
  }, [user, refreshKey]);

  const fijos     = costos.filter((c) => c.categoria === "fijo");
  const variables = costos.filter((c) => c.categoria === "variable");
  const filtrados = tab === "todos" ? costos : tab === "fijo" ? fijos : variables;

  const totalFijos     = fijos.reduce((s, c) => s + c.valor, 0);
  const totalVariables = variables.reduce((s, c) => s + c.valor, 0);
  const totalCostos    = totalFijos + totalVariables;

  const margenCubiertos  = ingresosMes > 0 ? ((ingresosMes - totalCostos) / ingresosMes) * 100 : 0;
  const ventasNecesarias = totalVariables < ingresosMes && totalFijos > 0
    ? totalFijos / (1 - totalVariables / Math.max(ingresosMes, 1))
    : 0;

  const byTipo    = costos.reduce<Record<string, number>>((acc, c) => { acc[c.tipo] = (acc[c.tipo] ?? 0) + c.valor; return acc; }, {});
  const tipoData  = Object.entries(byTipo).map(([tipo, valor]) => ({ tipo, valor })).sort((a, b) => b.valor - a.valor);

  return (
    <div className="p-6 pb-12 space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#F1F5F9] tracking-tight">Costos</h1>
          <p className="text-sm text-[#64748B] mt-1">Costos fijos, variables y punto de equilibrio</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 text-sm bg-[#10B981] text-[#080E1A] font-semibold px-4 py-2 rounded-lg hover:bg-[#0D9268] transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          Agregar costo
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-[#0C1424] border border-white/[0.06] rounded-xl p-5 animate-pulse">
            <div className="h-3.5 bg-white/[0.07] rounded w-20 mb-3" />
            <div className="h-7 bg-white/[0.07] rounded w-28 mb-2" />
            <div className="h-3 bg-white/[0.07] rounded w-16" />
          </div>
        )) : (
          [
            { label: "Total costos",         value: formatARS(totalCostos),              sub: `${ingresosMes > 0 ? ((totalCostos / ingresosMes) * 100).toFixed(1) : "—"}% de ingresos`, color: "#EF4444" },
            { label: "Costos fijos",          value: formatARS(totalFijos),               sub: `${fijos.length} ítems`,     color: "#3B82F6" },
            { label: "Costos variables",      value: formatARS(totalVariables),           sub: `${variables.length} ítems`, color: "#F59E0B" },
            { label: "Punto de equilibrio",   value: ventasNecesarias > 0 ? formatARS(Math.round(ventasNecesarias)) : "—",
              sub: margenCubiertos > 0 ? `Superavit ${margenCubiertos.toFixed(1)}%` : "En déficit", color: margenCubiertos > 0 ? "#10B981" : "#EF4444" },
          ].map((k) => (
            <div key={k.label} className="bg-[#0C1424] border border-white/[0.06] rounded-xl p-5 hover:border-white/[0.12] transition-colors cursor-default">
              <p className="text-sm text-[#94A3B8]">{k.label}</p>
              <p className="text-2xl font-bold font-mono mt-3" style={{ color: k.color }}>{k.value}</p>
              <p className="text-xs text-[#475569] mt-1">{k.sub}</p>
            </div>
          ))
        )}
      </div>

      {/* Alerta punto de equilibrio */}
      {!loading && ingresosMes > 0 && ingresosMes < ventasNecesarias && (
        <div className="flex items-start gap-3 bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-xl px-5 py-4">
          <AlertCircle className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-[#EF4444]">Estás por debajo del punto de equilibrio</p>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              Necesitás {formatARS(Math.round(ventasNecesarias - ingresosMes))} más de ingresos para cubrir todos los costos.
            </p>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Fijos vs variables */}
        <div className="bg-[#0C1424] border border-white/[0.06] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#F1F5F9] mb-5">Estructura de costos</h2>
          {loading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => <div key={i} className="h-8 bg-white/[0.04] rounded animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-3">
              {[
                { label: "Costos variables", valor: totalVariables, color: "#F59E0B", pct: totalCostos > 0 ? (totalVariables / totalCostos) * 100 : 0 },
                { label: "Costos fijos",     valor: totalFijos,     color: "#3B82F6", pct: totalCostos > 0 ? (totalFijos / totalCostos) * 100 : 0 },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-[#94A3B8]">{item.label}</span>
                    <span className="text-sm font-mono font-semibold text-[#F1F5F9]">
                      {formatARS(item.valor)} <span style={{ color: item.color }}>({item.pct.toFixed(0)}%)</span>
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-white/[0.06]">
                    <div className="h-full rounded-full transition-all" style={{ width: `${item.pct}%`, background: item.color }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Por tipo */}
        <div className="bg-[#0C1424] border border-white/[0.06] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#F1F5F9] mb-4">Costos por categoría</h2>
          {loading ? (
            <div className="h-[180px] bg-white/[0.03] rounded-lg animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={tipoData} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <YAxis dataKey="tipo" type="category" tick={{ fill: "#94A3B8", fontSize: 10 }} axisLine={false} tickLine={false} width={80} />
                <Tooltip formatter={(v) => [formatARS(Number(v)), "Costo"]}
                  contentStyle={{ background: "#0D1829", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 10, color: "#F1F5F9", fontSize: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }} />
                <Bar dataKey="valor" radius={[0, 4, 4, 0]}>
                  {tipoData.map((entry) => (
                    <Cell key={entry.tipo} fill={TIPO_COLORS[entry.tipo] ?? "#475569"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Plantillas de gastos (solo cuando no hay costos cargados) */}
      {!loading && costos.length === 0 && (
        <div className="bg-[#0C1424] border border-white/[0.06] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-[#F59E0B]" />
            <h2 className="text-sm font-semibold text-[#F1F5F9]">Gastos típicos de tu rubro</h2>
            <span className="text-[11px] text-[#475569] ml-1">Hacé click para agregar rápido</span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {getPlantilla(industry).map((s) => (
              <button
                key={s.nombre}
                onClick={() => { setPrefill({ nombre: s.nombre, categoria: s.categoria, tipo: s.tipo, monto: String(s.monto) }); setModalOpen(true); }}
                className="text-left p-3.5 rounded-xl border border-white/[0.06] bg-[#080E1A] hover:border-white/[0.14] hover:bg-white/[0.02] transition-all group"
              >
                <span className="text-xl block mb-2">{s.emoji}</span>
                <p className="text-[12px] font-medium text-[#F1F5F9] leading-tight">{s.nombre}</p>
                <p className="text-[11px] text-[#475569] mt-1 font-mono">
                  ${s.monto.toLocaleString("es-AR")}/mes · {s.tipo === "fixed" ? "Fijo" : "Variable"}
                </p>
                <p className="text-[10px] text-[#10B981] mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                  + Agregar →
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tabla de costos */}
      <div className="bg-[#0C1424] border border-white/[0.06] rounded-xl">
        {/* Tabs */}
        <div className="flex items-center gap-1 px-5 py-4 border-b border-white/[0.06]">
          {(["todos", "fijo", "variable"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${tab === t ? "bg-[#10B981]/10 text-[#10B981]" : "text-[#475569] hover:text-[#94A3B8]"}`}>
              {t === "todos" ? "Todos" : t === "fijo" ? `Fijos (${fijos.length})` : `Variables (${variables.length})`}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.04]">
                {["Concepto", "Categoría", "Tipo", "Periodicidad", "Monto/mes", ""].map((col) => (
                  <th key={col} className="text-left text-xs font-medium text-[#475569] px-5 py-3">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
                : filtrados.length === 0
                ? (
                  <tr><td colSpan={6}>
                    <EmptyState icon={Receipt} title="Sin costos registrados"
                      description="Agregá tus costos fijos y variables para calcular el punto de equilibrio."
                      action={{ label: "Agregar costo", onClick: () => setModalOpen(true) }} />
                  </td></tr>
                )
                : filtrados.map((c, i) => (
                  <tr key={c.id} className={`group hover:bg-white/[0.02] transition-colors ${i < filtrados.length - 1 ? "border-b border-white/[0.04]" : ""}`}>
                    <td className="px-5 py-3.5 text-[#F1F5F9] font-medium">{c.nombre}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${c.categoria === "fijo" ? "bg-[#3B82F6]/10 text-[#3B82F6]" : "bg-[#F59E0B]/10 text-[#F59E0B]"}`}>
                        {c.categoria === "fijo" ? "Fijo" : "Variable"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs px-2 py-0.5 rounded"
                        style={{ background: `${TIPO_COLORS[c.tipo] ?? "#475569"}20`, color: TIPO_COLORS[c.tipo] ?? "#475569" }}>
                        {c.tipo}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-[#94A3B8] capitalize text-xs">{c.periodicidad}</td>
                    <td className="px-5 py-3.5 text-[#F1F5F9] font-mono font-semibold">{formatARS(c.valor)}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100">
                        <button className="text-[#475569] hover:text-[#94A3B8] transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                        <button
                          onClick={async () => { await deleteExpense(c.id); refresh(); }}
                          className="text-[#475569] hover:text-[#EF4444] transition-colors"
                        ><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Footer total */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-white/[0.06] bg-white/[0.02]">
          <span className="text-sm font-semibold text-[#94A3B8]">Total ({filtrados.length} ítems)</span>
          <span className="text-sm font-mono font-bold text-[#F1F5F9]">
            {formatARS(filtrados.reduce((s, c) => s + c.valor, 0))}
          </span>
        </div>
      </div>

      {/* Modal agregar costo */}
      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setPrefill(null); }} title="Agregar costo">
        <FormCosto userId={user?.id ?? ""} onSaved={refresh} onClose={() => { setModalOpen(false); setPrefill(null); }} initial={prefill} />
      </Modal>
    </div>
  );
}
