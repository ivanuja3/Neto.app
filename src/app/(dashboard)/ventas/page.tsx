"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/components/auth-provider";
import { getPnlMonthly } from "@/lib/db/analytics";
import { getSalesByChannel, getTopProducts, createOrder, getOrders } from "@/lib/db/orders";
import { getProducts, registerStockMove } from "@/lib/db/products";
import { Modal, Field, inputCls, selectCls, SaveButton } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { CsvImport } from "@/components/csv-import";
import { formatARS } from "@/lib/mock-data";
import { supabase } from "@/lib/supabase";
import { ArrowUpRight, PlusCircle, ShoppingCart, RefreshCw, Upload, Search, X, Calendar } from "lucide-react";
import type { Order } from "@/lib/types/database";
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

const MES_LABELS: Record<string, string> = {
  "01": "Ene", "02": "Feb", "03": "Mar", "04": "Abr",
  "05": "May", "06": "Jun", "07": "Jul", "08": "Ago",
  "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dic",
};
function mesLabel(yyyymm: string) {
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
function canalColor(ch: string) {
  return CANAL_COLORS[ch.toLowerCase().replace(/\s/g, "")] ?? "#6366F1";
}

type ProductOption = { id: string; name: string; sku: string | null; list_price: number; price_cash: number | null; price_installments: number | null; standard_cost: number };

const CANALES = ["mercadolibre", "tiendanube", "instagram", "whatsapp", "web", "other"];

function genSku(name: string): string {
  const prefix = name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 4).padEnd(3, "X");
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${suffix}`;
}

function FormVenta({ userId, onSaved, onClose }: { userId: string; onSaved: () => void; onClose: () => void }) {
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState("");
  const [products,    setProducts]    = useState<ProductOption[]>([]);
  const [skuCode,     setSkuCode]     = useState("");
  const [prodSearch,  setProdSearch]  = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedProd, setSelectedProd] = useState<ProductOption | null>(null);
  const [form, setForm] = useState({
    canal:          "tiendanube",
    fecha:          new Date().toISOString().split("T")[0],
    productId:      "",
    productName:    "",
    qty:            "1",
    precioUnit:     "",
    costoUnit:      "",
    estadoPago:     "paid" as "not_paid" | "paid" | "partial" | "refunded",
    metodoPago:     "cash",
    notes:          "",
  });

  useEffect(() => {
    getProducts(userId).then((r: { data: ProductOption[] | null }) => {
      const prods = r.data ?? [];
      setProducts(prods);
      // no pre-seleccionar nada, el usuario busca
    });
  }, [userId]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  function selectProduct(prod: ProductOption) {
    setSelectedProd(prod);
    setProdSearch(prod.name);
    setShowDropdown(false);
    setForm((f) => ({
      ...f,
      productId:   prod.id,
      productName: prod.name,
      precioUnit:  String(prod.price_cash ?? prod.list_price),
      costoUnit:   String(prod.standard_cost),
    }));
    setSkuCode(prod.sku ?? genSku(prod.name));
  }

  function clearProduct() {
    setSelectedProd(null);
    setProdSearch("");
    setShowDropdown(false);
    setForm((f) => ({ ...f, productId: "", productName: "", precioUnit: "", costoUnit: "" }));
    setSkuCode("");
  }

  const prodResults = prodSearch.trim().length > 0
    ? products.filter((p) => {
        const q = prodSearch.toLowerCase();
        return p.name.toLowerCase().includes(q) || (p.sku ?? "").toLowerCase().includes(q);
      }).slice(0, 10)
    : products.slice(0, 10);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.productId || !selectedProd) { setError("Seleccioná un producto de la lista"); return; }
    const qty    = parseInt(form.qty) || 1;
    const precio = parseFloat(form.precioUnit) || 0;
    const costo  = parseFloat(form.costoUnit)  || 0;
    if (precio <= 0) { setError("El precio debe ser mayor a 0"); return; }
    setSaving(true);
    setError("");

    const subtotal = precio * qty;
    const costoTotal = costo * qty;

    try {
      const result = await createOrder(
        {
          user_id:          userId,
          date:             form.fecha,
          channel:          form.canal as "tiendanube" | "mercadolibre" | "whatsapp" | "instagram" | "web" | "other",
          state:            "delivered",
          amount_subtotal:  subtotal,
          amount_total:     subtotal,
          amount_cost:      costoTotal,
          amount_discount:  0,
          amount_shipping:  0,
          amount_tax:       0,
          payment_state:    form.estadoPago,
          payment_method:   form.metodoPago,
          partner_id:       null,
          order_number:     null,
          notes:            form.notes.trim() || null,
        },
        [{
          user_id:       userId,
          order_id:      "",
          product_id:    form.productId,
          product_name:  form.productName,
          qty,
          price_unit:    precio,
          cost_unit:     costo,
          discount_pct:  0,
          price_subtotal: subtotal,
          cost_subtotal:  costoTotal,
        }]
      );

      if (!result) { setError("Error al guardar. Intentá de nuevo."); return; }

      // best-effort: stock move failure no bloquea la venta ya guardada
      await registerStockMove({
        user_id:    userId,
        product_id: form.productId,
        date:       form.fecha,
        type:       "out",
        qty:        -qty,
        cost_unit:  costo,
        ref_type:   "manual",
        ref_id:     null,
        notes:      `Venta manual - ${skuCode}`,
      }).catch((err) => console.error("registerStockMove error:", err));

      onSaved();
      onClose();
    } catch (err) {
      console.error("handleSubmit venta error:", err);
      setError("Error al guardar. Intentá de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Canal de venta">
          <select value={form.canal} onChange={(e) => set("canal", e.target.value)} className={selectCls}>
            {CANALES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Fecha">
          <input type="date" value={form.fecha} onChange={(e) => set("fecha", e.target.value)} className={inputCls} />
        </Field>
      </div>

      <Field label="Producto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#475569] pointer-events-none" />
          <input
            value={prodSearch}
            onChange={(e) => { setProdSearch(e.target.value); setShowDropdown(true); if (!e.target.value) clearProduct(); }}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
            placeholder={products.length === 0 ? "Cargando productos..." : "Buscá por nombre o código..."}
            className={inputCls + " pl-9 pr-8"}
            autoComplete="off"
          />
          {prodSearch && (
            <button type="button" onClick={clearProduct}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#475569] hover:text-[#94A3B8] transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          {showDropdown && prodResults.length > 0 && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[#0D1829] border border-white/[0.10] rounded-xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto">
              {prodResults.map((p) => (
                <button key={p.id} type="button" onMouseDown={() => selectProduct(p)}
                  className="w-full flex items-start gap-3 px-4 py-3 hover:bg-white/[0.04] transition-colors text-left border-b border-white/[0.04] last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-[#F1F5F9] font-medium leading-tight truncate">{p.name}</p>
                    <p className="text-[11px] text-[#475569] font-mono mt-0.5">{p.sku ?? "Sin código"}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[12px] font-mono font-semibold text-[#10B981]">
                      ${(p.price_cash ?? p.list_price).toLocaleString("es-AR")}
                    </p>
                    {p.price_installments && (
                      <p className="text-[10px] font-mono text-[#F59E0B] mt-0.5">
                        cuotas ${p.price_installments.toLocaleString("es-AR")}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        {selectedProd && (
          <p className="text-[11px] text-[#10B981] mt-1.5 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] inline-block" />
            Producto seleccionado
          </p>
        )}
      </Field>

      {skuCode && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-2.5 flex items-center justify-between">
          <span className="text-xs text-[#475569]">Código SKU</span>
          <span className="text-sm font-mono font-bold text-[#94A3B8] tracking-widest">{skuCode}</span>
        </div>
      )}

      {/* Price pills — aparecen cuando el producto tiene múltiples precios */}
      {form.productId && (() => {
        const prod = products.find((p) => p.id === form.productId);
        if (!prod || (!prod.price_cash && !prod.price_installments)) return null;
        const pills = [
          { label: "Efectivo", value: prod.price_cash, key: "cash" },
          { label: "Lista",    value: prod.list_price,  key: "list" },
          { label: "Cuotas",   value: prod.price_installments, key: "inst" },
        ].filter((p) => p.value);
        return (
          <div>
            <p className="text-[11px] text-[#475569] mb-1.5">Seleccioná el precio:</p>
            <div className="flex gap-2 flex-wrap">
              {pills.map((pill) => {
                const active = parseFloat(form.precioUnit) === pill.value;
                return (
                  <button key={pill.key} type="button"
                    onClick={() => set("precioUnit", String(pill.value))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      active
                        ? "bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30"
                        : "bg-white/[0.04] text-[#475569] border-white/[0.06] hover:border-white/[0.14] hover:text-[#94A3B8]"
                    }`}>
                    {pill.label}: {formatARS(pill.value!)}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}

      <div className="grid grid-cols-3 gap-3">
        <Field label="Cantidad">
          <input type="number" min="1" step="1" value={form.qty}
            onChange={(e) => set("qty", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Precio unit. ($)">
          <input type="number" min="0" step="0.01" value={form.precioUnit}
            onChange={(e) => set("precioUnit", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Costo unit. ($)">
          <input type="number" min="0" step="0.01" value={form.costoUnit}
            onChange={(e) => set("costoUnit", e.target.value)} className={inputCls} />
        </Field>
      </div>

      {form.precioUnit && form.qty && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-2.5 flex items-center justify-between">
          <span className="text-xs text-[#475569]">Total venta</span>
          <span className="text-sm font-mono font-bold text-[#10B981]">
            {formatARS((parseFloat(form.precioUnit) || 0) * (parseInt(form.qty) || 1))}
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Método de pago">
          <select value={form.metodoPago} onChange={(e) => set("metodoPago", e.target.value)} className={selectCls}>
            <option value="cash">Efectivo</option>
            <option value="transfer">Transferencia</option>
            <option value="debit">Débito</option>
            <option value="installments_3">Crédito 3 cuotas</option>
            <option value="installments_6">Crédito 6 cuotas</option>
            <option value="installments_12">Crédito 12 cuotas</option>
            <option value="other">Otro</option>
          </select>
        </Field>
        <Field label="Estado de cobro">
          <select value={form.estadoPago} onChange={(e) => set("estadoPago", e.target.value)} className={selectCls}>
            <option value="paid">Cobrado</option>
            <option value="not_paid">Pendiente</option>
          </select>
        </Field>
      </div>

      <Field label="Notas (opcional)">
        <input value={form.notes} onChange={(e) => set("notes", e.target.value)}
          placeholder="Nro de pedido, cliente..." className={inputCls} />
      </Field>

      {error && <p className="text-xs text-[#EF4444] bg-[#EF4444]/[0.08] border border-[#EF4444]/20 rounded-lg px-3 py-2">{error}</p>}
      <SaveButton saving={saving} label="Registrar venta" />
    </form>
  );
}

type ChannelRow = { channel: string; ordenes: number; ingresos: number; margen_pct: number };
type TopProductRow = { product_id: string; product_name: string; qty_vendida: number; ingresos: number; margen_pct: number };
type PnlRow      = { mes: string; ingresos: number };

/* ── Tipos y helpers del Historial ── */
type Periodo = "hoy" | "ayer" | "semana" | "mes" | "rango";

function periodDates(p: Periodo): { from: string; to: string } {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const addDays = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
  switch (p) {
    case "hoy":    return { from: fmt(today), to: fmt(today) };
    case "ayer":   return { from: fmt(addDays(today, -1)), to: fmt(addDays(today, -1)) };
    case "semana": return { from: fmt(addDays(today, -6)), to: fmt(today) };
    case "mes": {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return { from: fmt(start), to: fmt(today) };
    }
    default:       return { from: fmt(addDays(today, -29)), to: fmt(today) };
  }
}

const METODOS_PAGO = [
  { key: "", label: "Todos" },
  { key: "cash", label: "Efectivo" },
  { key: "debit", label: "Débito" },
  { key: "transfer", label: "Transferencia" },
  { key: "mercadopago", label: "MercadoPago" },
  { key: "installments_3", label: "3 cuotas" },
  { key: "installments_6", label: "6 cuotas" },
  { key: "installments_12", label: "12 cuotas" },
  { key: "other", label: "Otro" },
];

const CANAL_LABEL: Record<string, string> = {
  tiendanube: "Tienda Nube", mercadolibre: "MercadoLibre",
  instagram: "Instagram", whatsapp: "WhatsApp", web: "Web", other: "Otro",
};

const PAGO_STATE_LABEL: Record<string, { label: string; color: string }> = {
  paid:     { label: "Cobrado",   color: "text-[#10B981] bg-[#10B981]/10" },
  not_paid: { label: "Pendiente", color: "text-[#F59E0B] bg-[#F59E0B]/10" },
  partial:  { label: "Parcial",   color: "text-[#3B82F6] bg-[#3B82F6]/10" },
  refunded: { label: "Devuelto",  color: "text-[#EF4444] bg-[#EF4444]/10" },
};

export default function VentasPage() {
  const { user }   = useAuth();
  const [tab,        setTab]        = useState<"resumen" | "historial">("resumen");
  const [loading,    setLoading]    = useState(true);
  const [channels,   setChannels]   = useState<ChannelRow[]>([]);
  const [topProds,   setTopProds]   = useState<TopProductRow[]>([]);
  const [pnlData,    setPnlData]    = useState<PnlRow[]>([]);
  const [modalOpen,  setModalOpen]  = useState(false);
  const [showCsv,    setShowCsv]    = useState(false);
  const [syncing,    setSyncing]    = useState(false);
  const [syncMsg,    setSyncMsg]    = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey((k) => k + 1);

  /* Historial */
  const [periodo,      setPeriodo]      = useState<Periodo>("mes");
  const [metodoPago,   setMetodoPago]   = useState("");
  const [rangoFrom,    setRangoFrom]    = useState("");
  const [rangoTo,      setRangoTo]      = useState("");
  const [orders,       setOrders]       = useState<Order[]>([]);
  const [histLoading,  setHistLoading]  = useState(false);

  const histReqRef = useRef(0);
  const loadHistorial = useCallback(async () => {
    if (!user) return;
    setHistLoading(true);
    const myReq = ++histReqRef.current;
    const { from, to } = periodo === "rango" && rangoFrom && rangoTo
      ? { from: rangoFrom, to: rangoTo }
      : periodDates(periodo);
    try {
      const res = await getOrders(user.id, {
        dateFrom: from,
        dateTo: to,
        paymentMethod: metodoPago || undefined,
      });
      if (histReqRef.current !== myReq) return;
      setOrders(res.data ?? []);
    } catch (err) {
      console.error("Ventas historial load error:", err);
    } finally {
      if (histReqRef.current === myReq) setHistLoading(false);
    }
  }, [user, periodo, metodoPago, rangoFrom, rangoTo, refreshKey]);

  useEffect(() => {
    if (tab === "historial") loadHistorial();
  }, [tab, loadHistorial]);

  async function handleTnSync() {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { setSyncMsg("❌ Sesión expirada. Recargá la página."); return; }

      const res = await fetch("/api/tiendanube/sync", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json() as { synced?: number; skipped?: number; error?: string };

      if (!res.ok) {
        setSyncMsg(json.error === "TN no conectado"
          ? "⚠️ Tienda Nube no conectada. Andá a Configuración → Integraciones."
          : "❌ Error al sincronizar. Intentá de nuevo.");
      } else {
        setSyncMsg(`✅ ${json.synced} ventas importadas, ${json.skipped} ya existían.`);
        if ((json.synced ?? 0) > 0) refresh();
      }
    } catch {
      setSyncMsg("❌ Error de red. Verificá tu conexión.");
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMsg(null), 6000);
    }
  }

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    async function load() {
      try {
        const [chanRes, topRes, pnlRes] = await Promise.all([
          getSalesByChannel(user!.id, 1),
          getTopProducts(user!.id, 10),
          getPnlMonthly(user!.id, 6),
        ]);
        if (cancelled) return;
        setChannels(chanRes.data ?? []);
        setTopProds(topRes.data  ?? []);
        setPnlData(pnlRes.data   ?? []);
      } catch (err) {
        console.error("VentasPage load error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [user, refreshKey]);

  const totalChan   = channels.reduce((s, r) => s + Number(r.ingresos), 0);
  const ventasPorCanal = channels.map((r) => ({
    canal:      r.channel,
    ingresos:   Number(r.ingresos),
    porcentaje: totalChan > 0 ? +((Number(r.ingresos) / totalChan) * 100).toFixed(1) : 0,
    color:      canalColor(r.channel),
  }));

  const ingresosPorMes = pnlData.map((r) => ({
    mes:      mesLabel(r.mes),
    ingresos: Number(r.ingresos),
  }));

  const skus = topProds.map((r) => ({
    nombre:   r.product_name,
    unidades: Number(r.qty_vendida),
    ingresos: Number(r.ingresos),
    margen:   Number(r.margen_pct),
  }));

  const histTotal   = orders.reduce((s, o) => s + Number(o.amount_total), 0);
  const { from: pFrom, to: pTo } = periodo !== "rango" ? periodDates(periodo) : { from: rangoFrom, to: rangoTo };

  return (
    <div className="p-6 pb-12 space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#F1F5F9] tracking-tight">Ventas</h1>
          <p className="text-sm text-[#64748B] mt-1">
            {tab === "resumen" ? "Ingresos por canal y producto" : "Historial de transacciones"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleTnSync}
            disabled={syncing}
            className="flex items-center gap-2 text-sm border border-white/[0.08] text-[#94A3B8] font-medium px-3 py-2 rounded-lg hover:border-white/[0.16] hover:text-[#F1F5F9] transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Sincronizando..." : "Sync TN"}
          </button>
          <button
            onClick={() => setShowCsv(true)}
            className="flex items-center gap-2 text-sm border border-white/[0.08] text-[#94A3B8] font-medium px-3 py-2 rounded-lg hover:border-white/[0.16] hover:text-[#F1F5F9] transition-all"
          >
            <Upload className="w-3.5 h-3.5" />
            Importar CSV
          </button>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 text-sm bg-[#10B981] text-[#080E1A] font-semibold px-4 py-2 rounded-lg hover:bg-[#0D9268] transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            Registrar venta
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/[0.06] -mb-2">
        {(["resumen", "historial"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t
                ? "border-[#10B981] text-[#10B981]"
                : "border-transparent text-[#475569] hover:text-[#94A3B8]"
            }`}>
            {t === "resumen" ? "Resumen" : "Historial"}
          </button>
        ))}
      </div>

      {tab === "historial" && (
        <div className="space-y-4 pb-20">
          {/* Chips período */}
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {(["hoy","ayer","semana","mes","rango"] as Periodo[]).map((p) => (
                <button key={p} onClick={() => setPeriodo(p)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all capitalize flex items-center gap-1.5 ${
                    periodo === p
                      ? "bg-[#3B82F6]/15 text-[#3B82F6] border-[#3B82F6]/30"
                      : "bg-white/[0.03] text-[#475569] border-white/[0.08] hover:border-white/[0.16] hover:text-[#94A3B8]"
                  }`}>
                  {p === "rango" && <Calendar className="w-3 h-3" />}
                  {p === "hoy" ? "Hoy" : p === "ayer" ? "Ayer" : p === "semana" ? "Semana" : p === "mes" ? "Mes" : "Rango"}
                </button>
              ))}
            </div>
            {periodo === "rango" && (
              <div className="flex items-center gap-2">
                <input type="date" value={rangoFrom} onChange={(e) => setRangoFrom(e.target.value)}
                  className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#3B82F6]/40" />
                <span className="text-xs text-[#475569]">→</span>
                <input type="date" value={rangoTo} onChange={(e) => setRangoTo(e.target.value)}
                  className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#3B82F6]/40" />
              </div>
            )}
          </div>

          {/* Chips método de pago */}
          <div className="flex flex-wrap gap-2">
            {METODOS_PAGO.map((m) => (
              <button key={m.key} onClick={() => setMetodoPago(m.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  metodoPago === m.key
                    ? "bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30"
                    : "bg-white/[0.03] text-[#475569] border-white/[0.08] hover:border-white/[0.16] hover:text-[#94A3B8]"
                }`}>
                {m.label}
              </button>
            ))}
          </div>

          {/* Lista de órdenes */}
          <div className="bg-[#0C1424] border border-white/[0.06] rounded-xl overflow-hidden">
            {histLoading ? (
              <div className="divide-y divide-white/[0.04]">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
                    <div className="w-20 h-3.5 bg-white/[0.06] rounded" />
                    <div className="flex-1 h-3.5 bg-white/[0.04] rounded" />
                    <div className="w-24 h-3.5 bg-white/[0.06] rounded" />
                  </div>
                ))}
              </div>
            ) : orders.length === 0 ? (
              <EmptyState icon={ShoppingCart} title="Sin ventas en este período"
                description={`${pFrom === pTo ? pFrom : `${pFrom} → ${pTo}`}`} />
            ) : (
              <>
                <div className="grid grid-cols-5 px-5 py-2.5 bg-white/[0.02] border-b border-white/[0.04]">
                  {["Fecha", "Canal", "Total", "Cobro", "Método"].map((h) => (
                    <p key={h} className="text-[11px] font-semibold text-[#334155] uppercase tracking-wide">{h}</p>
                  ))}
                </div>
                {orders.map((o) => {
                  const ps = PAGO_STATE_LABEL[o.payment_state] ?? { label: o.payment_state, color: "text-[#94A3B8] bg-white/[0.06]" };
                  const metodo = METODOS_PAGO.find((m) => m.key === o.payment_method)?.label ?? "—";
                  return (
                    <div key={o.id} className="grid grid-cols-5 items-center px-5 py-3.5 border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.02] transition-colors">
                      <p className="text-[12px] text-[#94A3B8] font-mono">{o.date}</p>
                      <p className="text-[13px] text-[#F1F5F9] capitalize">
                        {CANAL_LABEL[o.channel] ?? o.channel}
                      </p>
                      <p className="text-[13px] font-mono font-semibold text-[#F1F5F9]">
                        {formatARS(Number(o.amount_total))}
                      </p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full w-fit ${ps.color}`}>
                        {ps.label}
                      </span>
                      <p className="text-[12px] text-[#475569]">{metodo}</p>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      )}

      {tab === "resumen" && loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-[#0C1424] border border-white/[0.06] rounded-xl p-5 animate-pulse">
              <div className="h-3.5 bg-white/[0.07] rounded w-24 mb-4" />
              <div className="h-7 bg-white/[0.07] rounded w-28" />
            </div>
          ))}
        </div>
      ) : ventasPorCanal.length === 0 ? (
        <div className="bg-[#0C1424] border border-white/[0.06] rounded-xl">
          <EmptyState icon={ShoppingCart} title="Sin ventas este mes"
            description="Registrá tu primera venta para ver el desglose por canal."
            action={{ label: "Registrar venta", onClick: () => setModalOpen(true) }} />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {ventasPorCanal.map((canal) => (
            <div key={canal.canal}
              className="bg-[#0C1424] border border-white/[0.06] rounded-xl p-5 hover:border-white/[0.10] transition-colors cursor-default">
              <div className="flex items-start justify-between mb-4">
                <span className="text-sm text-[#94A3B8] capitalize">{canal.canal}</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-md"
                  style={{ background: `${canal.color}20`, color: canal.color }}>
                  {canal.porcentaje}%
                </span>
              </div>
              <div className="text-[1.4rem] font-bold font-mono text-[#F1F5F9] tracking-tight relative">
                {formatARS(canal.ingresos)}
              </div>
              <div className="mt-3 h-1 rounded-full bg-white/[0.05]">
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${Math.min(canal.porcentaje * 1.5, 100)}%`, background: canal.color }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Evolución mensual */}
      <div className="bg-[#0C1424] border border-white/[0.06] rounded-xl p-5 hover:border-white/[0.10] transition-colors">
        <div className="mb-5">
          <h2 className="text-sm font-semibold text-[#F1F5F9]">Evolución de ingresos</h2>
        </div>
        {loading ? (
          <div className="h-[240px] bg-white/[0.03] rounded-lg animate-pulse" />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={ingresosPorMes} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.035)" vertical={false} />
              <XAxis dataKey="mes" tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`} />
              <Tooltip formatter={(v) => [formatARS(Number(v)), "Ingresos"]}
                contentStyle={{ background: "#0D1829", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 10, color: "#F1F5F9", fontSize: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}
                cursor={{ fill: "rgba(255,255,255,0.03)" }} />
              <Bar dataKey="ingresos" radius={[5, 5, 0, 0]}>
                {ingresosPorMes.map((_, i) => (
                  <Cell key={i} fill={i === ingresosPorMes.length - 1 ? "#10B981" : "#10B98160"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Top SKUs */}
      <div className="bg-[#0C1424] border border-white/[0.06] rounded-xl hover:border-white/[0.10] transition-colors">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
          <div>
            <h2 className="text-sm font-semibold text-[#F1F5F9]">Top productos por ingreso</h2>
          </div>
          <button className="flex items-center gap-1.5 text-xs text-[#10B981] hover:text-[#34D399] font-semibold transition-colors group">
            Ver todos <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>
        </div>
        {loading ? (
          <div className="divide-y divide-white/[0.04]">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
                <div className="w-5 h-3 bg-white/[0.06] rounded" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-white/[0.06] rounded w-40" />
                  <div className="h-2.5 bg-white/[0.04] rounded w-20" />
                </div>
                <div className="space-y-2 text-right">
                  <div className="h-3.5 bg-white/[0.06] rounded w-24" />
                  <div className="h-2.5 bg-white/[0.04] rounded w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : skus.length === 0 ? (
          <EmptyState icon={ShoppingCart} title="Sin productos vendidos"
            description="Los productos aparecerán acá una vez que registres ventas."
            action={{ label: "Registrar venta", onClick: () => setModalOpen(true) }} />
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {skus.sort((a, b) => b.ingresos - a.ingresos).map((sku, i) => {
              const margenColor = sku.margen >= 50 ? "#10B981" : sku.margen >= 40 ? "#F59E0B" : "#EF4444";
              return (
                <div key={i} className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.025] transition-colors">
                  <span className="text-xs font-mono text-[#475569] font-medium w-5 shrink-0">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-[#F1F5F9] font-medium truncate">{sku.nombre}</p>
                    <p className="text-[11px] text-[#475569] font-mono mt-0.5">{Math.round(sku.unidades)} unidades</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[13px] font-mono font-semibold text-[#F1F5F9]">{formatARS(sku.ingresos)}</p>
                    <p className="text-[11px] font-mono font-semibold mt-0.5" style={{ color: margenColor }}>
                      {sku.margen.toFixed(1)}% margen
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Barra de totales historial */}
      {tab === "historial" && !histLoading && (
        <div className="fixed bottom-0 left-[220px] right-0 z-30 bg-[#060D19]/95 backdrop-blur-sm border-t border-white/[0.06] px-6 py-3 flex items-center justify-between">
          <p className="text-sm text-[#475569]">
            <span className="font-semibold text-[#F1F5F9]">{orders.length}</span> {orders.length === 1 ? "venta" : "ventas"}
            {periodo !== "rango"
              ? ` · ${periodo === "hoy" ? "Hoy" : periodo === "ayer" ? "Ayer" : periodo === "semana" ? "Esta semana" : "Este mes"}`
              : ` · ${pFrom} → ${pTo}`}
          </p>
          <p className="text-sm font-mono font-bold text-[#10B981]">{formatARS(histTotal)}</p>
        </div>
      )}

      {/* Toast sincronización TN */}
      {syncMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl border border-white/[0.1] bg-[#0C1424] text-sm text-[#F1F5F9] shadow-2xl">
          {syncMsg}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Registrar venta" width="max-w-lg">
        <FormVenta userId={user?.id ?? ""} onSaved={refresh} onClose={() => setModalOpen(false)} />
      </Modal>

      {showCsv && (
        <CsvImport
          userId={user?.id ?? ""}
          onDone={refresh}
          onClose={() => setShowCsv(false)}
        />
      )}
    </div>
  );
}
