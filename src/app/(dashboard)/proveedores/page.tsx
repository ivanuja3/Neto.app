"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { getSuppliers, getPurchases, createSupplier, createPurchaseOrder } from "@/lib/db/purchases";
import { Modal, Field, inputCls, selectCls, SaveButton } from "@/components/ui/modal";
import { PlusCircle, AlertTriangle, CheckCircle, Clock, Phone, Mail, ExternalLink } from "lucide-react";
import { formatARS } from "@/lib/mock-data";

type OcEstado = "pagado" | "pendiente" | "vencido";
type TabOC    = "todas" | "pendiente" | "vencido";
type TabProv  = "todos" | "activo" | "inactivo";

const ocConfig: Record<OcEstado, { label: string; color: string; icon: React.ElementType }> = {
  pagado:   { label: "Pagado",    color: "#10B981", icon: CheckCircle },
  pendiente:{ label: "Pendiente", color: "#F59E0B", icon: Clock },
  vencido:  { label: "Vencido",   color: "#EF4444", icon: AlertTriangle },
};

const CAT_COLORS: Record<string, string> = {
  Indumentaria: "#10B981",
  Logística:    "#3B82F6",
  Embalaje:     "#F59E0B",
  General:      "#6366F1",
};
function catColor(cat: string) { return CAT_COLORS[cat] ?? "#6366F1"; }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Supplier = { id: string; name: string; email: string | null; phone: string | null; payment_terms: string | null; lead_time: number; notes: string | null; active: boolean };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Purchase = { id: string; partner_id: string | null; purchase_number: string | null; date: string; date_expected: string | null; state: string; amount_total: number; notes: string | null; partner: { name: string } | null };

/* ── Formulario nuevo proveedor ── */
function FormProveedor({ userId, onSaved, onClose }: { userId: string; onSaved: () => void; onClose: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");
  const [form, setForm] = useState({ nombre: "", email: "", telefono: "", condicionPago: "Contado", diasEntrega: "7" });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre.trim()) { setError("El nombre es obligatorio"); return; }
    setSaving(true);
    setError("");
    const { error: dbErr } = await createSupplier({
      user_id:       userId,
      name:          form.nombre.trim(),
      type:          "supplier",
      email:         form.email.trim()    || null,
      phone:         form.telefono.trim() || null,
      payment_terms: form.condicionPago.trim() || null,
      lead_time:     parseInt(form.diasEntrega) || 7,
    });
    if (dbErr) { setError("Error al guardar. Intentá de nuevo."); setSaving(false); return; }
    onSaved();
    onClose();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Nombre o razón social">
        <input value={form.nombre} onChange={(e) => set("nombre", e.target.value)}
          placeholder="Ej: Textiles del Norte SA" className={inputCls} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Email">
          <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)}
            placeholder="info@proveedor.com" className={inputCls} />
        </Field>
        <Field label="Teléfono">
          <input value={form.telefono} onChange={(e) => set("telefono", e.target.value)}
            placeholder="+54 9 11 ..." className={inputCls} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Condición de pago">
          <select value={form.condicionPago} onChange={(e) => set("condicionPago", e.target.value)} className={selectCls}>
            <option>Contado</option>
            <option>30 días</option>
            <option>60 días</option>
            <option>90 días</option>
            <option>Anticipo 50%</option>
          </select>
        </Field>
        <Field label="Plazo entrega (días)">
          <input type="number" min="0" step="1" value={form.diasEntrega}
            onChange={(e) => set("diasEntrega", e.target.value)} placeholder="7" className={inputCls} />
        </Field>
      </div>
      {error && <p className="text-xs text-[#EF4444] bg-[#EF4444]/[0.08] border border-[#EF4444]/20 rounded-lg px-3 py-2">{error}</p>}
      <SaveButton saving={saving} label="Agregar proveedor" />
    </form>
  );
}

/* ── Formulario nueva orden de compra ── */
function FormOC({ userId, suppliers, defaultSupplierId, onSaved, onClose }: {
  userId: string;
  suppliers: Supplier[];
  defaultSupplierId?: string;
  onSaved: () => void;
  onClose: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");
  const [form, setForm] = useState({
    supplierId:   defaultSupplierId ?? (suppliers[0]?.id ?? ""),
    monto:        "",
    fecha:        new Date().toISOString().split("T")[0],
    fechaEsperada:"",
    notas:        "",
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.supplierId) { setError("Seleccioná un proveedor"); return; }
    if (!form.monto)      { setError("Ingresá el monto"); return; }
    setSaving(true);
    setError("");
    const { error: dbErr } = await createPurchaseOrder({
      user_id:       userId,
      partner_id:    form.supplierId,
      date:          form.fecha,
      date_expected: form.fechaEsperada || null,
      state:         "confirmed",
      amount_total:  parseFloat(form.monto),
      notes:         form.notas.trim() || null,
    });
    if (dbErr) { setError("Error al guardar. Intentá de nuevo."); setSaving(false); return; }
    onSaved();
    onClose();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Proveedor">
        <select value={form.supplierId} onChange={(e) => set("supplierId", e.target.value)} className={selectCls}>
          {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Monto total ($)">
          <input type="number" min="0" step="0.01" value={form.monto}
            onChange={(e) => set("monto", e.target.value)} placeholder="250000" className={inputCls} />
        </Field>
        <Field label="Fecha">
          <input type="date" value={form.fecha} onChange={(e) => set("fecha", e.target.value)} className={inputCls} />
        </Field>
      </div>
      <Field label="Fecha esperada de entrega">
        <input type="date" value={form.fechaEsperada} onChange={(e) => set("fechaEsperada", e.target.value)} className={inputCls} />
      </Field>
      <Field label="Notas (opcional)">
        <input value={form.notas} onChange={(e) => set("notas", e.target.value)}
          placeholder="Ej: 200 remeras talle M" className={inputCls} />
      </Field>
      {error && <p className="text-xs text-[#EF4444] bg-[#EF4444]/[0.08] border border-[#EF4444]/20 rounded-lg px-3 py-2">{error}</p>}
      <SaveButton saving={saving} label="Crear orden de compra" />
    </form>
  );
}

function purchaseEstado(p: Purchase): OcEstado {
  if (p.state === "received" || p.state === "invoiced") return "pagado";
  if (p.date_expected && new Date(p.date_expected) < new Date() && p.state !== "cancelled") return "vencido";
  return "pendiente";
}

export default function ProveedoresPage() {
  const { user }   = useAuth();
  const [loading, setLoading]       = useState(true);
  const [suppliers, setSuppliers]   = useState<Supplier[]>([]);
  const [purchases, setPurchases]   = useState<Purchase[]>([]);
  const [tabProv, setTabProv]       = useState<TabProv>("todos");
  const [tabOC, setTabOC]           = useState<TabOC>("todas");
  const [expandido, setExpandido]   = useState<string | null>(null);
  const [modalProv, setModalProv]   = useState(false);
  const [modalOC,   setModalOC]     = useState(false);
  const [ocProvId,  setOcProvId]    = useState<string | undefined>();
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey((k) => k + 1);

  function openNewOC(supplierId?: string) {
    setOcProvId(supplierId);
    setModalOC(true);
  }

  useEffect(() => {
    if (!user) return;
    async function load() {
      try {
        const [supRes, purRes] = await Promise.all([
          getSuppliers(user!.id),
          getPurchases(user!.id),
        ]);
        setSuppliers(supRes.data ?? []);
        setPurchases(purRes.data ?? []);
      } catch (err) {
        console.error("ProveedoresPage load error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user, refreshKey]);

  /* ── Derived data ── */
  // saldoPendiente per supplier = sum of non-received purchases
  const saldoMap: Record<string, number> = {};
  const ultimoPedidoMap: Record<string, string> = {};
  for (const p of purchases) {
    if (!p.partner_id) continue;
    if (p.state !== "received" && p.state !== "invoiced" && p.state !== "cancelled") {
      saldoMap[p.partner_id] = (saldoMap[p.partner_id] ?? 0) + Number(p.amount_total);
    }
    const cur = ultimoPedidoMap[p.partner_id];
    if (!cur || p.date > cur) ultimoPedidoMap[p.partner_id] = p.date;
  }

  const proveedores = suppliers.map((s) => ({
    id:            s.id,
    nombre:        s.name,
    contacto:      s.name,
    categoria:     s.notes ? s.notes.split(" ")[0] : "General",
    estado:        s.active ? "activo" : "inactivo",
    email:         s.email ?? "",
    telefono:      s.phone ?? "",
    condicionPago: s.payment_terms ?? "Contado",
    diasEntrega:   s.lead_time ?? 7,
    ultimoPedido:  ultimoPedidoMap[s.id] ?? "—",
    saldoPendiente: saldoMap[s.id] ?? 0,
  }));

  const ordenesCompra = purchases
    .filter((p) => p.state !== "cancelled")
    .map((p) => ({
      id:          p.purchase_number ?? `OC-${p.id.substring(0, 6).toUpperCase()}`,
      proveedor:   p.partner?.name ?? "—",
      proveedorId: p.partner_id ?? "",
      detalle:     p.notes ?? "Sin descripción",
      fecha:       p.date,
      vencimiento: p.date_expected ?? "—",
      monto:       Number(p.amount_total),
      estado:      purchaseEstado(p),
    }));

  const provFiltrados = tabProv === "todos" ? proveedores : proveedores.filter((p) => p.estado === tabProv);
  const ocFiltradas   = tabOC === "todas"   ? ordenesCompra : ordenesCompra.filter((oc) => oc.estado === tabOC);

  const deudaTotal    = proveedores.reduce((s, p) => s + p.saldoPendiente, 0);
  const provActivos   = proveedores.filter((p) => p.estado === "activo").length;
  const ocVencidas    = ordenesCompra.filter((oc) => oc.estado === "vencido").length;
  const ocPendientes  = ordenesCompra.filter((oc) => oc.estado === "pendiente");
  const plazoPromedio = provActivos > 0
    ? Math.round(proveedores.filter((p) => p.estado === "activo").reduce((s, p) => s + p.diasEntrega, 0) / provActivos)
    : 0;

  return (
    <div className="p-6 pb-12 space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#F1F5F9] tracking-tight">Proveedores</h1>
          {!loading && (
            <div className="flex items-center gap-4 mt-1.5">
              <span className="text-sm text-[#64748B]">
                Total proveedores <span className="text-[#F1F5F9] font-semibold ml-1">{proveedores.length}</span>
              </span>
              <span className="text-[#334155]">|</span>
              <span className="text-sm text-[#64748B]">
                Total por pagar{" "}
                <span className={`font-semibold ml-1 ${deudaTotal > 0 ? "text-[#EF4444]" : "text-[#10B981]"}`}>
                  {formatARS(deudaTotal)}
                </span>
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => openNewOC()}
            className="flex items-center gap-2 text-sm border border-white/[0.08] text-[#94A3B8] font-medium px-4 py-2 rounded-lg hover:bg-white/[0.04] transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            Nueva OC
          </button>
          <button
            onClick={() => setModalProv(true)}
            className="flex items-center gap-2 text-sm bg-[#10B981] text-[#080E1A] font-semibold px-4 py-2 rounded-lg hover:bg-[#0D9268] transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            Agregar proveedor
          </button>
        </div>
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
            { label: "Deuda con proveedores", value: formatARS(deudaTotal),          sub: "saldo pendiente total",             color: deudaTotal > 500000 ? "#EF4444" : "#F59E0B" },
            { label: "Proveedores activos",   value: String(provActivos),             sub: `de ${proveedores.length} en total`, color: "#3B82F6" },
            { label: "Próximos vencimientos", value: String(ocPendientes.length),     sub: "órdenes pendientes de pago",        color: ocPendientes.length > 0 ? "#F59E0B" : "#10B981" },
            { label: "Plazo entrega prom.",   value: plazoPromedio > 0 ? `${plazoPromedio} días` : "—", sub: "promedio de proveedores activos", color: "#94A3B8" },
          ].map((k) => (
            <div key={k.label} className="bg-[#0C1424] border border-white/[0.06] rounded-xl p-5 hover:border-white/[0.12] transition-colors cursor-default">
              <p className="text-sm text-[#94A3B8]">{k.label}</p>
              <p className="text-2xl font-bold font-mono mt-3" style={{ color: k.color }}>{k.value}</p>
              <p className="text-xs text-[#475569] mt-1">{k.sub}</p>
            </div>
          ))
        )}
      </div>

      {/* Alerta vencidos */}
      {!loading && ocVencidas > 0 && (
        <div className="flex items-start gap-3 bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-xl px-5 py-4">
          <AlertTriangle className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-[#EF4444]">
              {ocVencidas === 1 ? "1 orden de compra vencida" : `${ocVencidas} órdenes de compra vencidas`}
            </p>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              {ordenesCompra.filter((oc) => oc.estado === "vencido").map((oc) => `${oc.id} · ${oc.proveedor}`).join(" — ")}{" "}
              — Regularizá el pago para mantener la relación comercial.
            </p>
          </div>
        </div>
      )}

      {/* Órdenes de compra */}
      <div className="bg-[#0C1424] border border-white/[0.06] rounded-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div>
            <h2 className="text-sm font-semibold text-[#F1F5F9]">Órdenes de compra</h2>
            <p className="text-xs text-[#475569] mt-0.5">Historial y vencimientos</p>
          </div>
          <div className="flex items-center gap-1">
            {([
              { key: "todas",     label: `Todas (${ordenesCompra.length})` },
              { key: "pendiente", label: `Pendientes (${ocPendientes.length})` },
              { key: "vencido",   label: `Vencidas (${ocVencidas})` },
            ] as const).map((t) => (
              <button key={t.key} onClick={() => setTabOC(t.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${tabOC === t.key ? "bg-[#10B981]/10 text-[#10B981]" : "text-[#475569] hover:text-[#94A3B8]"}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.04]">
                {["N° Orden", "Proveedor", "Detalle", "Emisión", "Vencimiento", "Monto", "Estado"].map((col) => (
                  <th key={col} className="text-left text-xs font-medium text-[#475569] px-5 py-3">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-white/[0.04]">
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-5 py-3.5"><div className="h-4 bg-white/[0.06] rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : ocFiltradas.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-8 text-center text-sm text-[#475569]">Sin órdenes de compra</td></tr>
              ) : (
                ocFiltradas.map((oc, i) => {
                  const cfg  = ocConfig[oc.estado];
                  const Icon = cfg.icon;
                  return (
                    <tr key={oc.id} className={`hover:bg-white/[0.02] transition-colors ${i < ocFiltradas.length - 1 ? "border-b border-white/[0.04]" : ""}`}>
                      <td className="px-5 py-3.5 font-mono text-[#475569] text-[12px]">{oc.id}</td>
                      <td className="px-5 py-3.5 text-[13px] font-medium text-[#F1F5F9]">{oc.proveedor}</td>
                      <td className="px-5 py-3.5 text-[12px] text-[#94A3B8] max-w-[180px] truncate">{oc.detalle}</td>
                      <td className="px-5 py-3.5 font-mono text-[12px] text-[#94A3B8]">{oc.fecha}</td>
                      <td className="px-5 py-3.5 font-mono text-[12px]">
                        <span style={{ color: oc.estado === "vencido" ? "#EF4444" : "#F1F5F9" }}>{oc.vencimiento}</span>
                      </td>
                      <td className="px-5 py-3.5 font-mono font-semibold text-[#F1F5F9]">{formatARS(oc.monto)}</td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded"
                          style={{ background: `${cfg.color}20`, color: cfg.color }}>
                          <Icon className="w-2.5 h-2.5" />{cfg.label}
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
          <span className="text-sm font-semibold text-[#94A3B8]">{ocFiltradas.length} órdenes</span>
          <span className="text-sm font-mono font-bold text-[#F1F5F9]">
            {formatARS(ocFiltradas.filter((oc) => oc.estado !== "pagado").reduce((s, oc) => s + oc.monto, 0))}{" "}
            <span className="text-[#475569] font-normal">pendiente de pago</span>
          </span>
        </div>
      </div>

      {/* Tabla de proveedores */}
      <div className="bg-[#0C1424] border border-white/[0.06] rounded-xl">
        <div className="flex items-center gap-1 px-5 py-4 border-b border-white/[0.06]">
          <h2 className="text-sm font-semibold text-[#F1F5F9] flex-1">Directorio de proveedores</h2>
          {([
            { key: "todos",    label: `Todos (${proveedores.length})` },
            { key: "activo",   label: `Activos (${proveedores.filter((p) => p.estado === "activo").length})` },
            { key: "inactivo", label: `Inactivos (${proveedores.filter((p) => p.estado === "inactivo").length})` },
          ] as const).map((t) => (
            <button key={t.key} onClick={() => setTabProv(t.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${tabProv === t.key ? "bg-[#10B981]/10 text-[#10B981]" : "text-[#475569] hover:text-[#94A3B8]"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="divide-y divide-white/[0.04]">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
                <div className="w-9 h-9 rounded-xl bg-white/[0.06]" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-white/[0.06] rounded w-36" />
                  <div className="h-2.5 bg-white/[0.04] rounded w-24" />
                </div>
                <div className="h-5 bg-white/[0.06] rounded w-24" />
              </div>
            ))}
          </div>
        ) : provFiltrados.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-[#475569]">Sin proveedores registrados</div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {provFiltrados.map((prov) => {
              const isOpen = expandido === prov.id;
              const cc     = catColor(prov.categoria);
              const initials = prov.nombre.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
              const ocsProv  = ordenesCompra.filter((oc) => oc.proveedorId === prov.id);
              return (
                <div key={prov.id}>
                  <button onClick={() => setExpandido(isOpen ? null : prov.id)}
                    className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors text-left">
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-[11px] font-bold"
                      style={{ background: `${cc}18`, color: cc }}>
                      {initials}
                    </div>

                    {/* Nombre + categoría */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[13px] font-semibold text-[#F1F5F9]">{prov.nombre}</p>
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: `${cc}18`, color: cc }}>
                          {prov.categoria}
                        </span>
                        {prov.estado === "inactivo" && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-white/[0.05] text-[#475569]">Inactivo</span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#475569] mt-0.5">{prov.condicionPago}</p>
                    </div>

                    {/* Condición pago + entrega */}
                    <div className="hidden sm:flex items-center gap-6 shrink-0">
                      <div className="text-center">
                        <p className="text-[10px] text-[#475569]">Pago</p>
                        <p className="text-[12px] font-semibold text-[#94A3B8]">{prov.condicionPago}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-[#475569]">Entrega</p>
                        <p className="text-[12px] font-semibold text-[#94A3B8]">{prov.diasEntrega}d</p>
                      </div>
                    </div>

                    {/* Saldo */}
                    <div className="text-right shrink-0 min-w-[110px]">
                      <p className="text-[10px] text-[#475569]">Saldo pendiente</p>
                      <p className="text-[13px] font-mono font-bold"
                        style={{ color: prov.saldoPendiente > 0 ? "#F59E0B" : "#10B981" }}>
                        {prov.saldoPendiente > 0 ? formatARS(prov.saldoPendiente) : "Al día"}
                      </p>
                    </div>

                    <span className={`text-[#475569] transition-transform duration-200 shrink-0 ${isOpen ? "rotate-180" : ""}`}>▾</span>
                  </button>

                  {/* Detalle expandido */}
                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 bg-white/[0.015]">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-white/[0.04]">
                        <div className="space-y-2">
                          <p className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider">Contacto</p>
                          {prov.email && (
                            <div className="flex items-center gap-2 text-[12px] text-[#94A3B8]">
                              <Mail className="w-3 h-3 text-[#475569] shrink-0" />
                              <span className="truncate">{prov.email}</span>
                            </div>
                          )}
                          {prov.telefono && (
                            <div className="flex items-center gap-2 text-[12px] text-[#94A3B8]">
                              <Phone className="w-3 h-3 text-[#475569] shrink-0" />
                              {prov.telefono}
                            </div>
                          )}
                          {!prov.email && !prov.telefono && (
                            <p className="text-[12px] text-[#475569]">Sin datos de contacto</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <p className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider">Condiciones</p>
                          <p className="text-[12px] text-[#94A3B8]">Pago: <span className="text-[#F1F5F9] font-semibold">{prov.condicionPago}</span></p>
                          <p className="text-[12px] text-[#94A3B8]">Entrega: <span className="text-[#F1F5F9] font-semibold">{prov.diasEntrega} días hábiles</span></p>
                          <p className="text-[12px] text-[#94A3B8]">Último pedido: <span className="text-[#F1F5F9] font-semibold">{prov.ultimoPedido}</span></p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider">Órdenes recientes</p>
                          {ocsProv.slice(0, 3).map((oc) => {
                            const cfg = ocConfig[oc.estado];
                            return (
                              <div key={oc.id} className="flex items-center justify-between">
                                <span className="text-[11px] text-[#475569] font-mono">{oc.id}</span>
                                <span className="text-[11px] font-mono text-[#94A3B8]">{formatARS(oc.monto)}</span>
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                                  style={{ background: `${cfg.color}20`, color: cfg.color }}>
                                  {cfg.label}
                                </span>
                              </div>
                            );
                          })}
                          {ocsProv.length === 0 && <p className="text-[12px] text-[#475569]">Sin órdenes registradas</p>}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 mt-4">
                        <button
                          onClick={() => openNewOC(prov.id)}
                          className="flex items-center gap-1.5 text-[11px] text-[#10B981] hover:opacity-80 font-semibold transition-opacity"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Nueva orden de compra
                        </button>
                        <span className="text-white/[0.06]">|</span>
                        <button className="text-[11px] text-[#475569] hover:text-[#94A3B8] transition-colors">Editar proveedor</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal nuevo proveedor */}
      <Modal open={modalProv} onClose={() => setModalProv(false)} title="Agregar proveedor">
        <FormProveedor userId={user?.id ?? ""} onSaved={refresh} onClose={() => setModalProv(false)} />
      </Modal>

      {/* Modal nueva orden de compra */}
      <Modal open={modalOC} onClose={() => setModalOC(false)} title="Nueva orden de compra" width="max-w-lg">
        <FormOC
          userId={user?.id ?? ""}
          suppliers={suppliers}
          defaultSupplierId={ocProvId}
          onSaved={refresh}
          onClose={() => setModalOC(false)}
        />
      </Modal>
    </div>
  );
}
