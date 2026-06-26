"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { getProducts, getRecentStockMoves, getProductCategories, createProduct, registerStockMove } from "@/lib/db/products";
import { getTopProducts } from "@/lib/db/orders";
import { Modal, Field, inputCls, selectCls, SaveButton } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { PlusCircle, AlertTriangle, ArrowUp, ArrowDown, Package } from "lucide-react";
import { formatARS, formatNumber } from "@/lib/mock-data";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

type EstadoStock = "ok" | "bajo" | "critico";

function getEstado(stockActual: number, stockMinimo: number): EstadoStock {
  if (stockActual <= stockMinimo)     return "critico";
  if (stockActual <= stockMinimo * 2) return "bajo";
  return "ok";
}

const estadoConfig: Record<EstadoStock, { label: string; color: string }> = {
  ok:      { label: "OK",      color: "#10B981" },
  bajo:    { label: "Bajo",    color: "#F59E0B" },
  critico: { label: "Crítico", color: "#EF4444" },
};

const CAT_COLORS: Record<string, string> = {
  Indumentaria: "#10B981",
  Accesorios:   "#3B82F6",
  Calzado:      "#8B5CF6",
};
function catColor(cat: string) {
  return CAT_COLORS[cat] ?? "#475569";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ProductWithStock = { id: string; name: string; sku: string; standard_cost: number; category: { name: string } | null; stock: { qty_on_hand: number; avg_cost: number }[] };
type StockMove = { id: string; type: string; qty: number; date: string; notes: string | null; product: { name: string; sku: string } | null };
type ProductCategory = { id: string; name: string };

/* ── Formulario agregar producto ── */
function FormProducto({ userId, onSaved, onClose }: { userId: string; onSaved: () => void; onClose: () => void }) {
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState("");
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [form, setForm] = useState({
    nombre:     "",
    sku:        "",
    categoria:  "",
    precio:     "",
    costo:      "",
    stockInicial: "0",
  });

  useEffect(() => {
    getProductCategories(userId).then((r: { data: ProductCategory[] | null }) => setCategories(r.data ?? []));
  }, [userId]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre.trim()) { setError("El nombre es obligatorio"); return; }
    setSaving(true);
    setError("");

    const { data: prod, error: prodErr } = await createProduct({
      user_id:       userId,
      name:          form.nombre.trim(),
      sku:           form.sku.trim() || `SKU-${Date.now()}`,
      category_id:   form.categoria || null,
      list_price:    parseFloat(form.precio) || 0,
      standard_cost: parseFloat(form.costo)  || 0,
      active:        true,
      type:          "physical",
      notes:         null,
      barcode:       null,
      image_url:     null,
    });

    if (prodErr || !prod) { setError("Error al guardar el producto"); setSaving(false); return; }

    const stockInicial = parseInt(form.stockInicial) || 0;
    if (stockInicial > 0) {
      await registerStockMove({
        user_id:    userId,
        product_id: prod.id,
        type:       "in",
        qty:        stockInicial,
        date:       new Date().toISOString().split("T")[0],
        cost_unit:  parseFloat(form.costo) || 0,
        notes:      "Stock inicial",
        ref_type:   "manual",
        ref_id:     null,
      });
    }

    onSaved();
    onClose();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nombre del producto">
          <input value={form.nombre} onChange={(e) => set("nombre", e.target.value)}
            placeholder="Ej: Remera básica blanca" className={inputCls} />
        </Field>
        <Field label="SKU">
          <input value={form.sku} onChange={(e) => set("sku", e.target.value)}
            placeholder="Ej: REM-BLC-M" className={inputCls} />
        </Field>
      </div>

      <Field label="Categoría">
        <select value={form.categoria} onChange={(e) => set("categoria", e.target.value)} className={selectCls}>
          <option value="">Sin categoría</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Precio de venta ($)">
          <input type="number" min="0" step="0.01" value={form.precio}
            onChange={(e) => set("precio", e.target.value)} placeholder="15000" className={inputCls} />
        </Field>
        <Field label="Costo unitario ($)">
          <input type="number" min="0" step="0.01" value={form.costo}
            onChange={(e) => set("costo", e.target.value)} placeholder="7000" className={inputCls} />
        </Field>
      </div>

      <Field label="Stock inicial (unidades)">
        <input type="number" min="0" step="1" value={form.stockInicial}
          onChange={(e) => set("stockInicial", e.target.value)} placeholder="0" className={inputCls} />
      </Field>

      {error && <p className="text-xs text-[#EF4444] bg-[#EF4444]/[0.08] border border-[#EF4444]/20 rounded-lg px-3 py-2">{error}</p>}
      <SaveButton saving={saving} label="Agregar producto" />
    </form>
  );
}

export default function InventarioPage() {
  const { user } = useAuth();
  const [loading, setLoading]    = useState(true);
  const [products, setProducts]  = useState<ProductWithStock[]>([]);
  const [moves, setMoves]        = useState<StockMove[]>([]);
  const [qtyVendida, setQtyVendida] = useState<Record<string, number>>({});
  const [tab, setTab]            = useState<"todos" | "alerta" | "critico">("todos");
  const [modalOpen, setModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey((k) => k + 1);

  useEffect(() => {
    if (!user) return;
    async function load() {
      const [prodRes, moveRes, topRes] = await Promise.all([
        getProducts(user!.id),
        getRecentStockMoves(user!.id, 12),
        getTopProducts(user!.id, 100),
      ]);
      setProducts(prodRes.data ?? []);
      setMoves(moveRes.data   ?? []);
      // Build qty_vendida map from top products
      const qmap: Record<string, number> = {};
      for (const r of (topRes.data ?? [])) {
        qmap[r.product_id] = Number(r.qty_vendida);
      }
      setQtyVendida(qmap);
      setLoading(false);
    }
    load();
  }, [user, refreshKey]);

  /* ── Derived data ── */
  const items = products.map((p) => {
    const inv     = p.stock?.[0];
    const stock   = Number(inv?.qty_on_hand ?? 0);
    const cost    = Number(inv?.avg_cost ?? p.standard_cost ?? 0);
    const minimo  = Math.max(10, Math.round(stock * 0.15)); // 15% como stock mínimo
    const vendido = qtyVendida[p.id] ?? 0;
    const cobertura = vendido > 0 ? Math.round((stock / vendido) * 30) : 999;
    return {
      id:            p.id,
      nombre:        p.name,
      sku:           p.sku,
      categoria:     p.category?.name ?? "Sin categoría",
      stockActual:   stock,
      stockMinimo:   minimo,
      costoUnitario: cost,
      valorStock:    stock * cost,
      estado:        getEstado(stock, minimo),
      diasCobertura: Math.min(cobertura, 999),
    };
  });

  const criticos = items.filter((i) => i.estado === "critico");
  const enAlerta = items.filter((i) => i.estado !== "ok");
  const filtrados = tab === "todos" ? items : tab === "alerta" ? enAlerta : criticos;

  const totalValor     = items.reduce((s, i) => s + i.valorStock, 0);
  const totalUnidades  = items.reduce((s, i) => s + i.stockActual, 0);
  const validCobertura = items.filter((i) => i.diasCobertura < 999);
  const coberturaPromedio = validCobertura.length > 0
    ? Math.round(validCobertura.reduce((s, i) => s + i.diasCobertura, 0) / validCobertura.length)
    : 0;

  const byCat     = items.reduce<Record<string, number>>((acc, i) => { acc[i.categoria] = (acc[i.categoria] ?? 0) + i.valorStock; return acc; }, {});
  const catData   = Object.entries(byCat).map(([categoria, valor]) => ({ categoria, valor })).sort((a, b) => b.valor - a.valor);

  return (
    <div className="p-6 pb-12 space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#F1F5F9] tracking-tight">Inventario</h1>
          <p className="text-sm text-[#64748B] mt-1">Stock, cobertura y capital inmovilizado</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 text-sm bg-[#10B981] text-[#080E1A] font-semibold px-4 py-2 rounded-lg hover:bg-[#0D9268] transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          Agregar producto
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-[#0C1424] border border-white/[0.06] rounded-xl p-5 animate-pulse">
            <div className="h-3.5 bg-white/[0.07] rounded w-24 mb-3" />
            <div className="h-7 bg-white/[0.07] rounded w-28 mb-2" />
            <div className="h-3 bg-white/[0.07] rounded w-20" />
          </div>
        )) : (
          [
            { label: "Valor del inventario",  value: formatARS(totalValor),            sub: "capital inmovilizado en stock", color: "#F1F5F9" },
            { label: "Unidades en stock",      value: formatNumber(totalUnidades),      sub: `${items.length} productos activos`, color: "#3B82F6" },
            { label: "Productos en alerta",    value: String(enAlerta.length),          sub: `${criticos.length} crítico${criticos.length !== 1 ? "s" : ""} · bajo stock mínimo`, color: enAlerta.length > 0 ? "#F59E0B" : "#10B981" },
            { label: "Cobertura promedio",     value: coberturaPromedio > 0 ? `${coberturaPromedio} días` : "—", sub: "a ritmo actual de ventas", color: coberturaPromedio < 15 ? "#EF4444" : coberturaPromedio < 30 ? "#F59E0B" : "#10B981" },
          ].map((k) => (
            <div key={k.label} className="bg-[#0C1424] border border-white/[0.06] rounded-xl p-5 hover:border-white/[0.12] transition-colors cursor-default">
              <p className="text-sm text-[#94A3B8]">{k.label}</p>
              <p className="text-2xl font-bold font-mono mt-3" style={{ color: k.color }}>{k.value}</p>
              <p className="text-xs text-[#475569] mt-1">{k.sub}</p>
            </div>
          ))
        )}
      </div>

      {/* Alerta críticos */}
      {!loading && criticos.length > 0 && (
        <div className="flex items-start gap-3 bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-xl px-5 py-4">
          <AlertTriangle className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-[#EF4444]">
              {criticos.length === 1 ? "1 producto está por debajo del stock mínimo" : `${criticos.length} productos están por debajo del stock mínimo`}
            </p>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              {criticos.map((i) => i.nombre).join(" · ")} — Considerá reponer stock urgente.
            </p>
          </div>
        </div>
      )}

      {/* Chart + Movimientos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Valor por categoría */}
        <div className="bg-[#0C1424] border border-white/[0.06] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#F1F5F9] mb-4">Valor por categoría</h2>
          {loading ? (
            <div className="h-[180px] bg-white/[0.03] rounded-lg animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={catData} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <YAxis dataKey="categoria" type="category" tick={{ fill: "#94A3B8", fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
                <Tooltip formatter={(v) => [formatARS(Number(v)), "Valor en stock"]}
                  contentStyle={{ background: "#0D1829", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 10, color: "#F1F5F9", fontSize: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }} />
                <Bar dataKey="valor" radius={[0, 4, 4, 0]}>
                  {catData.map((entry) => <Cell key={entry.categoria} fill={catColor(entry.categoria)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Movimientos recientes */}
        <div className="bg-[#0C1424] border border-white/[0.06] rounded-xl">
          <div className="px-5 py-4 border-b border-white/[0.06]">
            <h2 className="text-sm font-semibold text-[#F1F5F9]">Movimientos recientes</h2>
            <p className="text-xs text-[#475569] mt-0.5">Entradas y salidas de stock</p>
          </div>
          {loading ? (
            <div className="divide-y divide-white/[0.04]">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3 animate-pulse">
                  <div className="w-7 h-7 rounded-lg bg-white/[0.05]" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 bg-white/[0.06] rounded w-32" />
                    <div className="h-2.5 bg-white/[0.04] rounded w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : moves.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-[#475569]">Sin movimientos registrados</div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {moves.map((m) => {
                const isIn = m.type === "in";
                return (
                  <div key={m.id} className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.02] transition-colors">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isIn ? "bg-[#10B981]/10" : "bg-[#EF4444]/10"}`}>
                      {isIn ? <ArrowUp className="w-3.5 h-3.5 text-[#10B981]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#EF4444]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-[#F1F5F9] font-medium truncate">{m.product?.name ?? "Producto"}</p>
                      <p className="text-[11px] text-[#475569] mt-0.5">
                        {m.date} · {m.notes ?? m.type}
                      </p>
                    </div>
                    <span className={`text-sm font-mono font-semibold shrink-0 ${isIn ? "text-[#10B981]" : "text-[#94A3B8]"}`}>
                      {isIn ? "+" : "−"}{Math.round(Number(m.qty))} u.
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-[#0C1424] border border-white/[0.06] rounded-xl">
        <div className="flex items-center gap-1 px-5 py-4 border-b border-white/[0.06]">
          {([
            { key: "todos",   label: `Todos (${items.length})` },
            { key: "alerta",  label: `En alerta (${enAlerta.length})` },
            { key: "critico", label: `Crítico (${criticos.length})` },
          ] as const).map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${tab === t.key ? "bg-[#10B981]/10 text-[#10B981]" : "text-[#475569] hover:text-[#94A3B8]"}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.04]">
                {["Producto", "Categoría", "Stock actual", "Mínimo", "Cobertura", "Costo unit.", "Valor en stock", "Estado"].map((col) => (
                  <th key={col} className="text-left text-xs font-medium text-[#475569] px-5 py-3">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-white/[0.04]">
                    {Array.from({ length: 8 }).map((__, j) => (
                      <td key={j} className="px-5 py-3.5"><div className="h-4 bg-white/[0.06] rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : filtrados.length === 0 ? (
                <tr><td colSpan={8}>
                  <EmptyState icon={Package} title="Sin productos"
                    description="Agregá tu primer producto para empezar a gestionar el inventario."
                    action={{ label: "Agregar producto", onClick: () => setModalOpen(true) }} />
                </td></tr>
              ) : (
                filtrados.map((item, i) => {
                  const cfg = estadoConfig[item.estado];
                  const covColor = item.diasCobertura < 15 ? "#EF4444" : item.diasCobertura < 30 ? "#F59E0B" : "#10B981";
                  return (
                    <tr key={item.id} className={`hover:bg-white/[0.02] transition-colors ${i < filtrados.length - 1 ? "border-b border-white/[0.04]" : ""}`}>
                      <td className="px-5 py-3.5">
                        <p className="text-[13px] text-[#F1F5F9] font-medium">{item.nombre}</p>
                        <p className="text-[11px] text-[#475569] font-mono mt-0.5">{item.sku}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs px-2 py-0.5 rounded"
                          style={{ background: `${catColor(item.categoria)}20`, color: catColor(item.categoria) }}>
                          {item.categoria}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono font-bold text-[#F1F5F9]">{formatNumber(item.stockActual)}</td>
                      <td className="px-5 py-3.5 font-mono text-[#475569]">{formatNumber(item.stockMinimo)}</td>
                      <td className="px-5 py-3.5">
                        <span className="font-mono font-bold text-sm" style={{ color: covColor }}>
                          {item.diasCobertura >= 999 ? "∞" : `${item.diasCobertura}d`}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-[#94A3B8] text-[13px]">{formatARS(item.costoUnitario)}</td>
                      <td className="px-5 py-3.5 font-mono font-semibold text-[#F1F5F9]">{formatARS(item.valorStock)}</td>
                      <td className="px-5 py-3.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded"
                          style={{ background: `${cfg.color}20`, color: cfg.color }}>
                          {cfg.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-5 py-3.5 border-t border-white/[0.06] bg-white/[0.02]">
          <span className="text-sm font-semibold text-[#94A3B8]">{filtrados.length} productos</span>
          <span className="text-sm font-mono font-bold text-[#F1F5F9]">
            {formatARS(filtrados.reduce((s, i) => s + i.valorStock, 0))} en stock
          </span>
        </div>
      </div>

      {/* Modal agregar producto */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Agregar producto">
        <FormProducto userId={user?.id ?? ""} onSaved={refresh} onClose={() => setModalOpen(false)} />
      </Modal>
    </div>
  );
}
