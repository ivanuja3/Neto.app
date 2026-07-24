"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { getProducts, getRecentStockMoves, getProductCategories, createProduct, updateProduct, registerStockMove } from "@/lib/db/products";
import { getRecentSalesQty } from "@/lib/db/orders";
import { Modal, Field, inputCls, selectCls, SaveButton } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { PlusCircle, AlertTriangle, ArrowUp, ArrowDown, Package, Pencil, Upload, Search, X, TrendingUp } from "lucide-react";
import { FilterModal, FilterButton } from "@/components/ui/filter-modal";
import { ProductImport } from "@/components/product-import";
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
type ProductWithStock = { id: string; name: string; sku: string; type: "physical" | "service" | "digital"; list_price: number; price_cash: number | null; price_installments: number | null; standard_cost: number; category: { id?: string; name: string } | null; stock: { qty_on_hand: number; avg_cost: number }[] };
type StockMove = { id: string; type: string; qty: number; date: string; notes: string | null; product: { name: string; sku: string } | null };
type ProductCategory = { id: string; name: string };

/* ── Formulario agregar producto ── */
function FormProducto({ userId, onSaved, onClose }: { userId: string; onSaved: () => void; onClose: () => void }) {
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState("");
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [form, setForm] = useState({
    nombre:              "",
    sku:                 "",
    tipo:                "physical" as "physical" | "service",
    categoria:           "",
    precio:              "",
    precioCash:          "",
    precioInstallments:  "",
    costo:               "",
    stockInicial:        "0",
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
      user_id:            userId,
      name:               form.nombre.trim(),
      sku:                form.sku.trim() || `SKU-${Date.now()}`,
      category_id:        form.categoria || null,
      list_price:         parseFloat(form.precio) || 0,
      price_cash:         parseFloat(form.precioCash) || null,
      price_installments: parseFloat(form.precioInstallments) || null,
      standard_cost:      parseFloat(form.costo) || 0,
      active:             true,
      type:               form.tipo,
      notes:              null,
      barcode:            null,
      image_url:          null,
    });

    if (prodErr || !prod) { setError("Error al guardar el producto"); setSaving(false); return; }

    // Los servicios no tienen stock físico — nunca generan movimiento inicial,
    // así no quedan con qty_on_hand=0 disparando alertas de "sin stock".
    const stockInicial = form.tipo === "service" ? 0 : (parseInt(form.stockInicial) || 0);
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
      }).catch((err) => console.error("registerStockMove error:", err));
    }

    setSaving(false);
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

      <div className="grid grid-cols-2 gap-3">
        <Field label="Categoría">
          <select value={form.categoria} onChange={(e) => set("categoria", e.target.value)} className={selectCls}>
            <option value="">Sin categoría</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Tipo">
          <select value={form.tipo} onChange={(e) => set("tipo", e.target.value)} className={selectCls}>
            <option value="physical">Producto físico (con stock)</option>
            <option value="service">Servicio (sin stock)</option>
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Field label="Precio lista ($)">
          <input type="number" min="0" step="0.01" value={form.precio}
            onChange={(e) => set("precio", e.target.value)} placeholder="15000" className={inputCls} />
        </Field>
        <Field label="Precio efectivo ($)">
          <input type="number" min="0" step="0.01" value={form.precioCash}
            onChange={(e) => set("precioCash", e.target.value)} placeholder="Opcional" className={inputCls} />
        </Field>
        <Field label="Precio cuotas ($)">
          <input type="number" min="0" step="0.01" value={form.precioInstallments}
            onChange={(e) => set("precioInstallments", e.target.value)} placeholder="Opcional" className={inputCls} />
        </Field>
      </div>

      <Field label="Costo unitario ($)">
        <input type="number" min="0" step="0.01" value={form.costo}
          onChange={(e) => set("costo", e.target.value)} placeholder="7000" className={inputCls} />
      </Field>

      {form.tipo === "physical" && (
        <Field label="Stock inicial (unidades)">
          <input type="number" min="0" step="1" value={form.stockInicial}
            onChange={(e) => set("stockInicial", e.target.value)} placeholder="0" className={inputCls} />
        </Field>
      )}

      {error && <p className="text-xs text-[#EF4444] bg-[#EF4444]/[0.08] border border-[#EF4444]/20 rounded-lg px-3 py-2">{error}</p>}
      <SaveButton saving={saving} label="Agregar producto" />
    </form>
  );
}

type EditProductoProps = {
  userId: string;
  product: { id: string; nombre: string; sku: string; precio: number; precioCash: number | null; precioInstallments: number | null; costo: number; categoria: string; categoriaId?: string };
  onSaved: () => void;
  onClose: () => void;
};

function FormEditarProducto({ userId, product, onSaved, onClose }: EditProductoProps) {
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState("");
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [form, setForm] = useState({
    nombre:             product.nombre,
    sku:                product.sku ?? "",
    categoria:          product.categoriaId ?? "",
    precio:             String(product.precio),
    precioCash:         product.precioCash != null ? String(product.precioCash) : "",
    precioInstallments: product.precioInstallments != null ? String(product.precioInstallments) : "",
    costo:              String(product.costo),
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
    const { error: dbErr } = await updateProduct(product.id, {
      name:               form.nombre.trim(),
      sku:                form.sku.trim() || undefined,
      category_id:        form.categoria || null,
      list_price:         parseFloat(form.precio) || 0,
      price_cash:         parseFloat(form.precioCash) || null,
      price_installments: parseFloat(form.precioInstallments) || null,
      standard_cost:      parseFloat(form.costo) || 0,
    });
    if (dbErr) { setError("Error al guardar. Intentá de nuevo."); setSaving(false); return; }
    setSaving(false);
    onSaved();
    onClose();
  }

  const precio = parseFloat(form.precio) || 0;
  const costo  = parseFloat(form.costo)  || 0;
  const margen = precio > 0 ? ((precio - costo) / precio * 100).toFixed(1) : null;

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

      <div className="grid grid-cols-3 gap-3">
        <Field label="Precio lista ($)">
          <input type="number" min="0" step="0.01" value={form.precio}
            onChange={(e) => set("precio", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Precio efectivo ($)">
          <input type="number" min="0" step="0.01" value={form.precioCash}
            onChange={(e) => set("precioCash", e.target.value)} placeholder="Opcional" className={inputCls} />
        </Field>
        <Field label="Precio cuotas ($)">
          <input type="number" min="0" step="0.01" value={form.precioInstallments}
            onChange={(e) => set("precioInstallments", e.target.value)} placeholder="Opcional" className={inputCls} />
        </Field>
      </div>

      <Field label="Costo unitario ($)">
        <input type="number" min="0" step="0.01" value={form.costo}
          onChange={(e) => set("costo", e.target.value)} className={inputCls} />
      </Field>

      {margen !== null && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-2.5 flex items-center justify-between">
          <span className="text-xs text-[#475569]">Margen bruto estimado</span>
          <span className="text-sm font-mono font-bold"
            style={{ color: Number(margen) >= 40 ? "#10B981" : Number(margen) >= 20 ? "#F59E0B" : "#EF4444" }}>
            {margen}%
          </span>
        </div>
      )}

      {error && <p className="text-xs text-[#EF4444] bg-[#EF4444]/[0.08] border border-[#EF4444]/20 rounded-lg px-3 py-2">{error}</p>}
      <SaveButton saving={saving} label="Guardar cambios" />
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
  const [showImport, setShowImport] = useState(false);
  const [editProduct, setEditProduct] = useState<EditProductoProps["product"] | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch]      = useState("");
  const [catFilter, setCatFilter] = useState<string>("todas");
  const [filterOpen, setFilterOpen] = useState(false);
  const [showBulk, setShowBulk]  = useState(false);
  const [bulkPct, setBulkPct]    = useState("");
  const [bulkField, setBulkField] = useState<"list_price" | "price_cash" | "price_installments" | "standard_cost">("list_price");
  const [bulkSaving, setBulkSaving] = useState(false);
  const refresh = () => setRefreshKey((k) => k + 1);

  useEffect(() => {
    if (!user) return;
    async function load() {
      try {
        const [prodRes, moveRes, topRes] = await Promise.all([
          getProducts(user!.id),
          getRecentStockMoves(user!.id, 12),
          getRecentSalesQty(user!.id, 30),
        ]);
        setProducts(prodRes.data ?? []);
        setMoves(moveRes.data   ?? []);
        const qmap: Record<string, number> = {};
        for (const r of (topRes.data ?? [])) {
          qmap[r.product_id] = Number(r.qty_vendida);
        }
        setQtyVendida(qmap);
      } catch (err) {
        console.error("InventarioPage load error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user, refreshKey]);

  /* ── Derived data ── */
  // Los servicios no tienen stock físico — quedan afuera de la tabla,
  // alertas y KPIs de inventario (que asumen unidades físicas repuestas).
  const servicios = products.filter((p) => p.type === "service");
  const items = products.filter((p) => p.type !== "service").map((p) => {
    const inv     = p.stock?.[0];
    const stock   = Number(inv?.qty_on_hand ?? 0);
    const cost    = Number(inv?.avg_cost ?? p.standard_cost ?? 0);
    const vendido = qtyVendida[p.id] ?? 0; // unidades vendidas en los últimos 30 días
    // Punto de reposición: demanda diaria (a partir de la venta real de los
    // últimos 30 días) × 7 días de anticipación. Antes era 15% del propio
    // stock actual, lo cual es matemáticamente imposible de disparar.
    const minimo  = vendido > 0 ? Math.max(1, Math.ceil((vendido / 30) * 7)) : 0;
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
  const baseList  = tab === "todos" ? items : tab === "alerta" ? enAlerta : criticos;
  const uniqueCats = Array.from(new Set(items.map((i) => i.categoria))).sort();
  const filtrados = baseList
    .filter((i) => catFilter === "todas" || i.categoria === catFilter)
    .filter((i) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return i.nombre.toLowerCase().includes(q) || (i.sku ?? "").toLowerCase().includes(q);
    });
  const bulkTargets = catFilter === "todas" ? items : items.filter((i) => i.categoria === catFilter);
  const bulkCount   = bulkTargets.length;

  const totalValor     = items.reduce((s, i) => s + i.valorStock, 0);
  const totalUnidades  = items.reduce((s, i) => s + i.stockActual, 0);
  const validCobertura = items.filter((i) => i.diasCobertura < 999);
  const coberturaPromedio = validCobertura.length > 0
    ? Math.round(validCobertura.reduce((s, i) => s + i.diasCobertura, 0) / validCobertura.length)
    : 0;

  const byCat     = items.reduce<Record<string, number>>((acc, i) => { acc[i.categoria] = (acc[i.categoria] ?? 0) + i.valorStock; return acc; }, {});
  const catData   = Object.entries(byCat).map(([categoria, valor]) => ({ categoria, valor })).sort((a, b) => b.valor - a.valor);

  async function handleBulkUpdate() {
    const pct = Number(bulkPct);
    if (!pct || isNaN(pct)) return;
    setBulkSaving(true);
    for (const item of bulkTargets) {
      const prod = products.find((p) => p.id === item.id);
      if (!prod) continue;
      if (bulkField === "list_price") {
        await updateProduct(item.id, { list_price: Math.round(prod.list_price * (1 + pct / 100)) });
      } else if (bulkField === "price_cash") {
        const base = prod.price_cash ?? prod.list_price;
        await updateProduct(item.id, { price_cash: Math.round(base * (1 + pct / 100)) });
      } else if (bulkField === "price_installments") {
        const base = prod.price_installments ?? prod.list_price;
        await updateProduct(item.id, { price_installments: Math.round(base * (1 + pct / 100)) });
      } else {
        await updateProduct(item.id, { standard_cost: Math.round(item.costoUnitario * (1 + pct / 100)) });
      }
    }
    setBulkSaving(false);
    setShowBulk(false);
    setBulkPct("");
    refresh();
  }

  return (
    <div className="p-6 pb-12 space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#F1F5F9] tracking-tight">Inventario</h1>
          {!loading && (
            <div className="flex items-center gap-4 mt-1.5">
              <span className="flex items-center gap-1.5 text-sm text-[#64748B]">
                <Package className="w-3.5 h-3.5" />
                Total de referencias <span className="text-[#F1F5F9] font-semibold ml-1">{items.length}</span>
              </span>
              <span className="text-[#334155]">|</span>
              <span className="text-sm text-[#64748B]">
                Costo total de inventario <span className="text-[#F1F5F9] font-semibold ml-1">{formatARS(totalValor)}</span>
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 text-sm border border-white/[0.08] text-[#94A3B8] font-medium px-3 py-2 rounded-lg hover:border-white/[0.16] hover:text-[#F1F5F9] transition-all"
          >
            <Upload className="w-3.5 h-3.5" />
            Importar Excel
          </button>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 text-sm bg-[#10B981] text-[#080E1A] font-semibold px-4 py-2 rounded-lg hover:bg-[#0D9268] transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            Agregar producto
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-[#0C1424] border border-white/[0.06] rounded-xl p-5">
            <div className="h-3.5 skeleton w-24 mb-3" />
            <div className="h-7 skeleton w-28 mb-2" />
            <div className="h-3 skeleton w-20" />
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
              <p className="text-2xl font-bold tabular-nums mt-3" style={{ color: k.color }}>{k.value}</p>
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
            <div className="h-[180px] bg-[#10B981]/[0.04] rounded-lg" />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={catData} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <YAxis dataKey="categoria" type="category" tick={{ fill: "#94A3B8", fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
                <Tooltip formatter={(v) => [formatARS(Number(v)), "Valor en stock"]}
                  contentStyle={{ background: "#060D19", border: "1px solid rgba(16,185,129,0.20)", borderTop: "2px solid rgba(16,185,129,0.35)", borderRadius: 8, color: "#F1F5F9", fontSize: 12 }} />
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
                <div key={i} className="flex items-center gap-3 px-5 py-3">
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
        {/* Tabs + bulk link */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-1">
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
          <button onClick={() => setShowBulk(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#F97316] hover:text-[#FB923C] transition-colors">
            <TrendingUp className="w-3.5 h-3.5" />
            Actualización masiva de precios
          </button>
        </div>

        {/* Búsqueda + filtros */}
        <FilterModal
          open={filterOpen}
          onClose={() => setFilterOpen(false)}
          sections={[
            {
              type: "chips",
              label: "Categoría",
              key: "categoria",
              multi: false,
              options: uniqueCats.map((c) => ({ value: c, label: c })),
            },
          ]}
          values={{ categoria: catFilter === "todas" ? "" : catFilter }}
          onApply={(v) => setCatFilter((v.categoria as string) || "todas")}
        />
        <div className="flex items-center gap-2 px-5 py-3 border-b border-white/[0.06]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#475569] pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o SKU..."
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg pl-9 pr-8 py-2 text-sm text-[#F1F5F9] placeholder-[#475569] focus:outline-none focus:border-[#10B981]/40 transition-colors"
            />
            {search && (
              <button onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#475569] hover:text-[#94A3B8] transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {uniqueCats.length > 0 && (
            <FilterButton
              onClick={() => setFilterOpen(true)}
              activeCount={catFilter !== "todas" ? 1 : 0}
            />
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.04]">
                {["Producto", "Categoría", "Stock actual", "Mínimo", "Cobertura", "Costo unit.", "Valor en stock", "Estado", ""].map((col) => (
                  <th key={col} className="text-left text-xs font-medium text-[#475569] px-5 py-3">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-white/[0.04]">
                    {Array.from({ length: 8 }).map((__, j) => (
                      <td key={j} className="px-5 py-3.5"><div className="h-4 bg-white/[0.06] rounded" /></td>
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
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => {
                            const prod = products.find((p) => p.id === item.id);
                            setEditProduct({
                              id:                 item.id,
                              nombre:             item.nombre,
                              sku:                item.sku ?? "",
                              precio:             prod?.list_price ?? 0,
                              precioCash:         prod?.price_cash ?? null,
                              precioInstallments: prod?.price_installments ?? null,
                              costo:              item.costoUnitario,
                              categoria:          item.categoria,
                              categoriaId:        prod?.category?.id,
                            });
                          }}
                          className="text-[#475569] hover:text-[#94A3B8] transition-colors p-1 rounded hover:bg-white/[0.04]"
                          title="Editar producto"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
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

      {/* Servicios — sin stock, no entran en la tabla ni en las alertas de arriba */}
      {!loading && servicios.length > 0 && (
        <div className="bg-[#0C1424] border border-white/[0.06] rounded-xl">
          <div className="px-5 py-4 border-b border-white/[0.06]">
            <h2 className="text-sm font-semibold text-[#F1F5F9]">Servicios</h2>
            <p className="text-xs text-[#475569] mt-0.5">Sin stock físico — matrícula, cuotas, honorarios, etc.</p>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {servicios.map((s) => (
              <div key={s.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
                <div>
                  <p className="text-[13px] text-[#F1F5F9] font-medium">{s.name}</p>
                  <p className="text-[11px] text-[#475569] font-mono mt-0.5">{s.sku}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-mono font-semibold text-[#F1F5F9] text-sm">{formatARS(s.list_price)}</span>
                  <button
                    onClick={() => setEditProduct({
                      id: s.id, nombre: s.name, sku: s.sku ?? "",
                      precio: s.list_price, precioCash: s.price_cash, precioInstallments: s.price_installments,
                      costo: s.standard_cost, categoria: s.category?.name ?? "Sin categoría", categoriaId: s.category?.id,
                    })}
                    className="text-[#475569] hover:text-[#94A3B8] transition-colors p-1 rounded hover:bg-white/[0.04]"
                    title="Editar servicio"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal actualización masiva de precios */}
      {showBulk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0C1424] border border-white/[0.10] rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-bold text-[#F1F5F9]">Actualización masiva de precios</h2>
                <p className="text-xs text-[#475569] mt-0.5">Aplicá un ajuste porcentual a un grupo de productos</p>
              </div>
              <button onClick={() => { setShowBulk(false); setBulkPct(""); }}
                className="text-[#475569] hover:text-[#94A3B8] transition-colors p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <Field label="Campo a actualizar">
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { key: "list_price",         label: "Precio lista" },
                    { key: "price_cash",          label: "Precio efectivo" },
                    { key: "price_installments",  label: "Precio cuotas" },
                    { key: "standard_cost",       label: "Costo unitario" },
                  ] as const).map((f) => (
                    <button key={f.key} onClick={() => setBulkField(f.key)}
                      className={`py-2 rounded-lg text-sm font-medium transition-all border ${
                        bulkField === f.key
                          ? "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30"
                          : "bg-white/[0.03] text-[#475569] border-white/[0.06] hover:border-white/[0.12] hover:text-[#94A3B8]"
                      }`}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Categoría">
                <select
                  value={catFilter}
                  onChange={(e) => setCatFilter(e.target.value)}
                  className={selectCls}>
                  <option value="todas">Todas las categorías</option>
                  {uniqueCats.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>

              <Field label="Porcentaje de ajuste">
                <div className="relative">
                  <input
                    type="number"
                    value={bulkPct}
                    onChange={(e) => setBulkPct(e.target.value)}
                    placeholder="Ej: 15 para +15%, -10 para reducir 10%"
                    className={inputCls + " pr-8"}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#475569] text-sm font-mono">%</span>
                </div>
              </Field>

              {bulkPct && !isNaN(Number(bulkPct)) && Number(bulkPct) !== 0 && (
                <div className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm border ${
                  Number(bulkPct) > 0
                    ? "bg-[#10B981]/[0.08] border-[#10B981]/20 text-[#10B981]"
                    : "bg-[#EF4444]/[0.08] border-[#EF4444]/20 text-[#EF4444]"
                }`}>
                  <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Se ajustará el <strong>{ { list_price: "precio lista", price_cash: "precio efectivo", price_installments: "precio cuotas", standard_cost: "costo unitario" }[bulkField] }</strong> de{" "}
                    <strong>{bulkCount}</strong> producto{bulkCount !== 1 ? "s" : ""} en{" "}
                    {Number(bulkPct) > 0 ? "+" : ""}{bulkPct}%
                  </span>
                </div>
              )}

              <button
                onClick={handleBulkUpdate}
                disabled={bulkSaving || !bulkPct || isNaN(Number(bulkPct)) || Number(bulkPct) === 0 || bulkCount === 0}
                className="w-full py-2.5 rounded-xl font-semibold text-sm bg-[#F97316] text-white hover:bg-[#EA6C0A] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {bulkSaving ? "Actualizando..." : `Confirmar (${bulkCount} productos)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal agregar producto */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Agregar producto">
        <FormProducto userId={user?.id ?? ""} onSaved={refresh} onClose={() => setModalOpen(false)} />
      </Modal>

      {showImport && (
        <ProductImport userId={user?.id ?? ""} onDone={refresh} onClose={() => setShowImport(false)} />
      )}

      {/* Modal editar producto */}
      <Modal open={!!editProduct} onClose={() => setEditProduct(null)} title="Editar producto">
        {editProduct && (
          <FormEditarProducto
            userId={user?.id ?? ""}
            product={editProduct}
            onSaved={refresh}
            onClose={() => setEditProduct(null)}
          />
        )}
      </Modal>
    </div>
  );
}
