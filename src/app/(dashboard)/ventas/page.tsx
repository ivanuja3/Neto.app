"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { getPnlMonthly } from "@/lib/db/analytics";
import { getSalesByChannel, getTopProducts, createOrder } from "@/lib/db/orders";
import { getProducts } from "@/lib/db/products";
import { Modal, Field, inputCls, selectCls, SaveButton } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { formatARS } from "@/lib/mock-data";
import { ArrowUpRight, PlusCircle, ShoppingCart } from "lucide-react";
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

type ProductOption = { id: string; name: string; list_price: number; standard_cost: number };

const CANALES = ["mercadolibre", "tiendanube", "instagram", "whatsapp", "web", "other"];

function FormVenta({ userId, onSaved, onClose }: { userId: string; onSaved: () => void; onClose: () => void }) {
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [form, setForm] = useState({
    canal:         "tiendanube",
    fecha:         new Date().toISOString().split("T")[0],
    productId:     "",
    productName:   "",
    qty:           "1",
    precioUnit:    "",
    costoUnit:     "",
    estadoPago:    "paid" as "not_paid" | "paid" | "partial" | "refunded",
    notes:         "",
  });

  useEffect(() => {
    getProducts(userId).then((r: { data: ProductOption[] | null }) => {
      const prods = r.data ?? [];
      setProducts(prods);
      if (prods.length > 0) {
        setForm((f) => ({
          ...f,
          productId:   prods[0].id,
          productName: prods[0].name,
          precioUnit:  String(prods[0].list_price),
          costoUnit:   String(prods[0].standard_cost),
        }));
      }
    });
  }, [userId]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  function handleProductChange(id: string) {
    const prod = products.find((p) => p.id === id);
    if (!prod) return;
    setForm((f) => ({
      ...f,
      productId:   prod.id,
      productName: prod.name,
      precioUnit:  String(prod.list_price),
      costoUnit:   String(prod.standard_cost),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.productId) { setError("Seleccioná un producto"); return; }
    const qty    = parseInt(form.qty) || 1;
    const precio = parseFloat(form.precioUnit) || 0;
    const costo  = parseFloat(form.costoUnit)  || 0;
    if (precio <= 0) { setError("El precio debe ser mayor a 0"); return; }
    setSaving(true);
    setError("");

    const subtotal = precio * qty;
    const costoTotal = costo * qty;

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

    if (!result) { setError("Error al guardar. Intentá de nuevo."); setSaving(false); return; }
    onSaved();
    onClose();
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
        <select value={form.productId} onChange={(e) => handleProductChange(e.target.value)} className={selectCls}>
          {products.length === 0
            ? <option value="">Cargando productos...</option>
            : products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)
          }
        </select>
      </Field>

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
        <Field label="Estado de pago">
          <select value={form.estadoPago} onChange={(e) => set("estadoPago", e.target.value)} className={selectCls}>
            <option value="paid">Cobrado</option>
            <option value="not_paid">Pendiente</option>
          </select>
        </Field>
        <Field label="Notas (opcional)">
          <input value={form.notes} onChange={(e) => set("notes", e.target.value)}
            placeholder="Nro de pedido, cliente..." className={inputCls} />
        </Field>
      </div>

      {error && <p className="text-xs text-[#EF4444] bg-[#EF4444]/[0.08] border border-[#EF4444]/20 rounded-lg px-3 py-2">{error}</p>}
      <SaveButton saving={saving} label="Registrar venta" />
    </form>
  );
}

type ChannelRow = { channel: string; ordenes: number; ingresos: number; margen_pct: number };
type TopProductRow = { product_id: string; product_name: string; qty_vendida: number; ingresos: number; margen_pct: number };
type PnlRow      = { mes: string; ingresos: number };

export default function VentasPage() {
  const { user }   = useAuth();
  const [loading,    setLoading]    = useState(true);
  const [channels,   setChannels]   = useState<ChannelRow[]>([]);
  const [topProds,   setTopProds]   = useState<TopProductRow[]>([]);
  const [pnlData,    setPnlData]    = useState<PnlRow[]>([]);
  const [modalOpen,  setModalOpen]  = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey((k) => k + 1);

  useEffect(() => {
    if (!user) return;
    async function load() {
      const [chanRes, topRes, pnlRes] = await Promise.all([
        getSalesByChannel(user!.id, 1),
        getTopProducts(user!.id, 10),
        getPnlMonthly(user!.id, 6),
      ]);
      setChannels(chanRes.data ?? []);
      setTopProds(topRes.data  ?? []);
      setPnlData(pnlRes.data   ?? []);
      setLoading(false);
    }
    load();
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

  return (
    <div className="p-6 pb-12 space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#F1F5F9] tracking-tight">Ventas</h1>
          <p className="text-sm text-[#64748B] mt-1">Ingresos por canal y producto</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 text-sm bg-[#10B981] text-[#080E1A] font-semibold px-4 py-2 rounded-lg hover:bg-[#0D9268] transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          Registrar venta
        </button>
      </div>

      {/* Canal cards */}
      {loading ? (
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
              className="relative bg-[#0C1424] border border-white/[0.06] rounded-xl p-5 overflow-hidden hover:border-white/[0.12] hover:shadow-[0_8px_24px_rgba(0,0,0,0.25)] transition-all duration-200 group cursor-default">
              <div className="absolute top-0 left-0 right-0 h-px"
                style={{ background: `linear-gradient(90deg, transparent, ${canal.color}80, transparent)` }} />
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-1/2 h-8 blur-xl opacity-[0.15] pointer-events-none"
                style={{ background: canal.color }} />
              <div className="flex items-start justify-between mb-4 relative">
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
          <p className="text-xs text-[#475569] mt-0.5">Últimos 6 meses</p>
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
            <p className="text-xs text-[#475569] mt-0.5">Ordenado por facturación del mes</p>
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Registrar venta" width="max-w-lg">
        <FormVenta userId={user?.id ?? ""} onSaved={refresh} onClose={() => setModalOpen(false)} />
      </Modal>
    </div>
  );
}
