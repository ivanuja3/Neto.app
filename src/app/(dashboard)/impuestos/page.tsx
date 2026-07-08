"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { getKpisCurrentMonth, getAnalyticLines } from "@/lib/db/analytics";
import { getOrders } from "@/lib/db/orders";
import { CheckCircle, Clock, AlertCircle, ExternalLink, Info, FileText, X, Zap, ShoppingCart, ChevronDown } from "lucide-react";
import { formatARS } from "@/lib/mock-data";
import type { Order } from "@/lib/types/database";

type EstadoVencimiento = "pagado" | "pendiente" | "vencido";

type ObligacionFiscal = {
  id: number;
  nombre: string;
  organismo: string;
  periodo: string;
  vencimiento: string;
  monto: number;
  estado: EstadoVencimiento;
  descripcion: string;
};

type AnalyticLine = {
  id: string;
  date: string;
  name: string;
  category: string;
  amount: number;
};

const estadoConfig: Record<EstadoVencimiento, { label: string; color: string; icon: React.ElementType }> = {
  pagado:   { label: "Pagado",    color: "#10B981", icon: CheckCircle },
  pendiente:{ label: "Pendiente", color: "#F59E0B", icon: Clock },
  vencido:  { label: "Vencido",   color: "#EF4444", icon: AlertCircle },
};

const coeficientesCM = [
  { jurisdiccion: "Córdoba",        coef_ing: 0.45, coef_gas: 0.42, alicuota: 2.5 },
  { jurisdiccion: "Buenos Aires",   coef_ing: 0.22, coef_gas: 0.25, alicuota: 3.0 },
  { jurisdiccion: "Santa Fe",       coef_ing: 0.15, coef_gas: 0.14, alicuota: 2.5 },
  { jurisdiccion: "Mendoza",        coef_ing: 0.10, coef_gas: 0.10, alicuota: 2.0 },
  { jurisdiccion: "Resto del país", coef_ing: 0.08, coef_gas: 0.09, alicuota: 2.5 },
];

/* Obligaciones del calendario fiscal — referencia estática, montos estimados sobre ingresos reales */
function buildObligaciones(ingresos: number): ObligacionFiscal[] {
  const ivaEst   = Math.round(ingresos * 0.105); // ~21% IVA sobre ~50% base imponible estimada
  const iibbCba  = Math.round(ingresos * 0.45 * 0.025);
  const ganancias = Math.round(ingresos * 0.045);
  return [
    {
      id: 1, nombre: "IVA — Declaración mensual", organismo: "ARCA",
      periodo: "Mayo 2026", vencimiento: "20/06/2026",
      monto: ivaEst, estado: "pagado",
      descripcion: "Débito fiscal (ventas) menos crédito fiscal (compras). Presentación vía ARCA.",
    },
    {
      id: 2, nombre: "IIBB — CM Córdoba", organismo: "SIFERE WEB",
      periodo: "Mayo 2026", vencimiento: "25/06/2026",
      monto: iibbCba, estado: "pendiente",
      descripcion: "Convenio Multilateral CM05. Alícuota comercio electrónico: 2.5% sobre ingresos brutos Córdoba.",
    },
    {
      id: 3, nombre: "Autónomos / Monotributo", organismo: "ARCA",
      periodo: "Junio 2026", vencimiento: "20/06/2026",
      monto: 38000, estado: "pagado",
      descripcion: "Cuota mensual según categoría vigente.",
    },
    {
      id: 4, nombre: "Ganancias — Anticipo 5/10", organismo: "ARCA",
      periodo: "Anual 2025", vencimiento: "30/06/2026",
      monto: ganancias, estado: "pendiente",
      descripcion: "5° anticipo de ganancias. Calculado sobre declaración jurada del período anterior.",
    },
    {
      id: 5, nombre: "IIBB — CM Buenos Aires", organismo: "SIFERE WEB",
      periodo: "Mayo 2026", vencimiento: "18/06/2026",
      monto: Math.round(ingresos * 0.22 * 0.03), estado: "vencido",
      descripcion: "Alícuota comercio: 3% sobre ingresos atribuibles a BA según coeficientes CM.",
    },
    {
      id: 6, nombre: "IVA — Declaración mensual", organismo: "ARCA",
      periodo: "Junio 2026", vencimiento: "20/07/2026",
      monto: Math.round(ivaEst * 1.1), estado: "pendiente",
      descripcion: "Próxima declaración. Estimado según ingresos del mes en curso.",
    },
  ];
}

const TIPO_COMPROBANTE = ["A", "B", "C"] as const;
type TipoComp = typeof TIPO_COMPROBANTE[number];

const COND_IVA = ["Responsable Inscripto", "Monotributista", "Consumidor Final", "Exento"];

export default function ImpuestosPage() {
  const { user } = useAuth();
  const [tab,          setTab]          = useState<"obligaciones" | "cm" | "facturacion">("obligaciones");
  const [loading,      setLoading]      = useState(true);
  const [ingresosMes,  setIngresosMes]  = useState(0);
  const [pagosLineas,  setPagosLineas]  = useState<AnalyticLine[]>([]);
  const [orders,         setOrders]         = useState<Order[]>([]);
  const [invoiceOrder,   setInvoiceOrder]   = useState<Order | null>(null);
  const [selectedIds,    setSelectedIds]    = useState<Set<string>>(new Set());
  const [bulkInvoice,    setBulkInvoice]    = useState(false);
  const [invoiceForm,    setInvoiceForm]    = useState({
    tipo:           "B" as TipoComp,
    puntoVenta:     "0001",
    clienteNombre:  "",
    clienteCuit:    "",
    condIva:        "Consumidor Final",
  });
  const setInv = (k: string, v: string) => setInvoiceForm((f) => ({ ...f, [k]: v }));

  const allSelected   = orders.length > 0 && selectedIds.size === orders.length;
  const someSelected  = selectedIds.size > 0 && !allSelected;

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setSelectedIds(allSelected ? new Set() : new Set(orders.map((o) => o.id)));
  }

  useEffect(() => {
    if (!user) return;
    async function load() {
      const [kpiRes, lineRes, ordRes] = await Promise.all([
        getKpisCurrentMonth(user!.id),
        getAnalyticLines(user!.id, { category: "impuesto" }),
        getOrders(user!.id, { limit: 20 }),
      ]);
      setIngresosMes(Number(kpiRes.data?.[0]?.ingresos ?? 0));
      setPagosLineas((lineRes.data ?? []).map((l: AnalyticLine) => ({ ...l, amount: Number(l.amount) })));
      setOrders((ordRes as { data: Order[] | null }).data ?? []);
      setLoading(false);
    }
    load();
  }, [user]);

  const obligaciones = buildObligaciones(ingresosMes);
  const totalPagado   = obligaciones.filter((o) => o.estado === "pagado").reduce((s, o) => s + o.monto, 0);
  const totalPendiente = obligaciones.filter((o) => o.estado === "pendiente").reduce((s, o) => s + o.monto, 0);
  const totalVencido  = obligaciones.filter((o) => o.estado === "vencido").reduce((s, o) => s + o.monto, 0);
  const cargaPct      = ingresosMes > 0 ? ((totalPagado + totalPendiente) / ingresosMes * 100).toFixed(1) : "—";

  const iibbTotal = coeficientesCM.reduce((s, j) => s + ingresosMes * j.coef_ing * (j.alicuota / 100), 0);

  return (
    <div className="p-6 pb-12 space-y-6 max-w-[1400px]">
      <div>
        <h1 className="text-2xl font-bold text-[#F1F5F9] tracking-tight">Impuestos AR</h1>
        <p className="text-sm text-[#64748B] mt-1">IVA, IIBB (Convenio Multilateral), Ganancias y Autónomos</p>
      </div>

      {/* Alerta vencido */}
      {!loading && totalVencido > 0 && (
        <div className="flex items-start gap-3 bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-xl px-5 py-4">
          <AlertCircle className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-[#EF4444]">
              {obligaciones.filter((o) => o.estado === "vencido").length === 1
                ? "Tenés 1 obligación vencida"
                : `Tenés ${obligaciones.filter((o) => o.estado === "vencido").length} obligaciones vencidas`}
            </p>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              {obligaciones.filter((o) => o.estado === "vencido").map((o) => o.nombre).join(" · ")} —
              Presentá la DDJJ para evitar multas e intereses.
            </p>
          </div>
          <button className="flex items-center gap-1 text-xs text-[#EF4444] hover:opacity-80 font-semibold shrink-0">
            Ver <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {loading ? Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-[#0C1424] border border-white/[0.06] rounded-xl p-5 animate-pulse">
            <div className="h-3.5 bg-white/[0.07] rounded w-28 mb-3" />
            <div className="h-7 bg-white/[0.07] rounded w-32 mb-2" />
            <div className="h-3 bg-white/[0.05] rounded w-20" />
          </div>
        )) : (
          [
            { label: "Pagado este mes",       value: formatARS(totalPagado),    color: "#10B981", sub: `${obligaciones.filter((o) => o.estado === "pagado").length} obligaciones` },
            { label: "Pendiente de pago",     value: formatARS(totalPendiente), color: "#F59E0B", sub: `${obligaciones.filter((o) => o.estado === "pendiente").length} obligaciones` },
            { label: "Carga fiscal estimada", value: `${cargaPct}%`,            color: "#94A3B8", sub: `sobre ${formatARS(ingresosMes)} de ingresos` },
          ].map((k) => (
            <div key={k.label} className="bg-[#0C1424] border border-white/[0.06] rounded-xl p-5 hover:border-white/[0.12] transition-colors cursor-default">
              <p className="text-sm text-[#94A3B8]">{k.label}</p>
              <p className="text-2xl font-bold font-mono mt-3" style={{ color: k.color }}>{k.value}</p>
              <p className="text-xs text-[#475569] mt-1">{k.sub}</p>
            </div>
          ))
        )}
      </div>

      {/* Tabs */}
      <div className="bg-[#0C1424] border border-white/[0.06] rounded-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-1">
            {([
              { key: "obligaciones", label: "Calendario fiscal" },
              { key: "cm",           label: "Convenio Multilateral" },
              { key: "facturacion",  label: "Facturación electrónica" },
            ] as const).map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${tab === t.key ? "bg-[#10B981]/10 text-[#10B981]" : "text-[#475569] hover:text-[#94A3B8]"}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {tab === "obligaciones" && (
          loading ? (
            <div className="divide-y divide-white/[0.04]">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
                  <div className="w-4 h-4 rounded-full bg-white/[0.06] shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-white/[0.06] rounded w-48" />
                    <div className="h-2.5 bg-white/[0.04] rounded w-64" />
                  </div>
                  <div className="h-5 bg-white/[0.06] rounded w-24" />
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {obligaciones.map((ob) => {
                const cfg  = estadoConfig[ob.estado];
                const Icon = cfg.icon;
                return (
                  <div key={ob.id} className="flex items-start gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors">
                    <Icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color: cfg.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-[#F1F5F9]">{ob.nombre}</p>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded"
                          style={{ background: `${cfg.color}20`, color: cfg.color }}>
                          {cfg.label}
                        </span>
                        <span className="text-[10px] font-medium bg-white/[0.04] text-[#94A3B8] px-2 py-0.5 rounded">
                          {ob.organismo}
                        </span>
                      </div>
                      <p className="text-xs text-[#475569] mt-0.5">{ob.descripcion}</p>
                      <p className="text-xs text-[#94A3B8] mt-1">
                        Período: <span className="text-[#F1F5F9]">{ob.periodo}</span> · Vence:{" "}
                        <span style={{ color: ob.estado === "vencido" ? "#EF4444" : "#F1F5F9" }}>{ob.vencimiento}</span>
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-mono font-bold text-[#F1F5F9]">{formatARS(ob.monto)}</p>
                      <p className="text-[10px] text-[#475569] mt-0.5">estimado</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
        {tab === "cm" && (
          <div className="p-5 space-y-4">
            <div className="flex items-start gap-3 bg-[#3B82F6]/10 border border-[#3B82F6]/20 rounded-xl px-4 py-3">
              <Info className="w-4 h-4 text-[#3B82F6] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-[#3B82F6]">¿Qué es el Convenio Multilateral?</p>
                <p className="text-xs text-[#94A3B8] mt-0.5">
                  Cuando vendés a clientes de varias provincias, el IIBB se distribuye entre ellas según coeficientes de ingresos y gastos. Presentación mensual vía SIFERE WEB (CM05).
                </p>
              </div>
            </div>

            {loading ? (
              <div className="h-[160px] bg-white/[0.03] rounded-lg animate-pulse" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.04]">
                      {["Jurisdicción", "Coef. ingresos", "Coef. gastos", "Alícuota", "Base IIBB", "IIBB estimado"].map((col) => (
                        <th key={col} className="text-left text-xs font-medium text-[#475569] px-4 py-3">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {coeficientesCM.map((j, i) => {
                      const base = ingresosMes * j.coef_ing;
                      const iibb = base * (j.alicuota / 100);
                      return (
                        <tr key={i} className="border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.02]">
                          <td className="px-4 py-3 text-[#F1F5F9] font-medium">{j.jurisdiccion}</td>
                          <td className="px-4 py-3 font-mono text-[#94A3B8]">{(j.coef_ing * 100).toFixed(0)}%</td>
                          <td className="px-4 py-3 font-mono text-[#94A3B8]">{(j.coef_gas * 100).toFixed(0)}%</td>
                          <td className="px-4 py-3 font-mono text-[#94A3B8]">{j.alicuota}%</td>
                          <td className="px-4 py-3 font-mono text-[#475569]">{formatARS(Math.round(base))}</td>
                          <td className="px-4 py-3 font-mono font-semibold text-[#F1F5F9]">{formatARS(Math.round(iibb))}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-white/[0.02]">
                      <td colSpan={5} className="px-4 py-3 text-sm font-semibold text-[#94A3B8]">Total IIBB estimado</td>
                      <td className="px-4 py-3 font-mono font-bold text-[#10B981]">{formatARS(Math.round(iibbTotal))}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}
        {tab === "facturacion" && (
          <div className="divide-y divide-white/[0.04]">
            {/* Banner ARCA */}
            <div className="px-5 py-4">
              <div className="flex items-center justify-between bg-[#F59E0B]/[0.08] border border-[#F59E0B]/20 rounded-xl px-4 py-3">
                <div className="flex items-center gap-3">
                  <Zap className="w-4 h-4 text-[#F59E0B] shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-[#F59E0B]">ARCA no conectado</p>
                    <p className="text-xs text-[#94A3B8] mt-0.5">Conectá tu clave fiscal para emitir comprobantes electrónicos directamente desde Neto.</p>
                  </div>
                </div>
                <button className="shrink-0 text-xs font-semibold text-[#080E1A] bg-[#F59E0B] hover:bg-[#D97706] px-3 py-1.5 rounded-lg transition-colors">
                  Conectar ARCA
                </button>
              </div>
            </div>

            {/* Ventas para facturar */}
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
                  <div className="w-32 h-3.5 bg-white/[0.06] rounded" />
                  <div className="flex-1 h-3.5 bg-white/[0.04] rounded" />
                  <div className="w-24 h-3.5 bg-white/[0.06] rounded" />
                </div>
              ))
            ) : orders.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <ShoppingCart className="w-8 h-8 text-[#334155] mx-auto mb-3" />
                <p className="text-sm font-semibold text-[#475569]">Sin ventas registradas</p>
                <p className="text-xs text-[#334155] mt-1">Registrá una venta desde la sección Ventas para poder facturarla.</p>
              </div>
            ) : (
              <>
                {/* Header tabla con checkbox "seleccionar todas" + botón facturar todas */}
                <div className="flex items-center justify-between px-5 py-2.5 bg-white/[0.02]">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={toggleAll}
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                        allSelected
                          ? "bg-[#3B82F6] border-[#3B82F6]"
                          : someSelected
                          ? "bg-[#3B82F6]/30 border-[#3B82F6]/60"
                          : "border-white/[0.20] bg-transparent hover:border-[#3B82F6]/50"
                      }`}
                      title={allSelected ? "Deseleccionar todas" : "Seleccionar todas"}
                    >
                      {(allSelected || someSelected) && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 10">
                          {allSelected
                            ? <path d="M1.5 5l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            : <path d="M2 5h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                          }
                        </svg>
                      )}
                    </button>
                    <div className="grid grid-cols-4 gap-0" style={{ width: "calc(100% - 28px)" }}>
                      {["Fecha", "Canal", "Total", "Estado pago"].map((h) => (
                        <p key={h} className="text-[11px] font-medium text-[#475569]">{h}</p>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => setBulkInvoice(true)}
                    className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-[#F1F5F9] bg-[#3B82F6] hover:bg-[#2563EB] px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Facturar todas las ventas
                  </button>
                </div>

                {/* Filas con checkbox individual */}
                {orders.map((o) => {
                  const checked = selectedIds.has(o.id);
                  return (
                    <div
                      key={o.id}
                      onClick={() => toggleOne(o.id)}
                      className={`flex items-center gap-3 px-5 py-3.5 cursor-pointer transition-colors ${
                        checked ? "bg-[#3B82F6]/[0.06]" : "hover:bg-white/[0.02]"
                      }`}
                    >
                      {/* Checkbox */}
                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        checked ? "bg-[#3B82F6] border-[#3B82F6]" : "border-white/[0.20]"
                      }`}>
                        {checked && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 10">
                            <path d="M1.5 5l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>

                      {/* Datos */}
                      <div className="flex-1 grid grid-cols-4 items-center gap-0">
                        <p className="text-[13px] text-[#F1F5F9]">{o.date}</p>
                        <p className="text-[13px] text-[#94A3B8] capitalize">{o.channel}</p>
                        <p className="text-[13px] font-mono font-semibold text-[#F1F5F9]">{formatARS(Number(o.amount_total))}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded w-fit ${
                          o.payment_state === "paid" ? "bg-[#10B981]/15 text-[#10B981]" : "bg-[#F59E0B]/15 text-[#F59E0B]"
                        }`}>
                          {o.payment_state === "paid" ? "Cobrado" : "Pendiente"}
                        </span>
                      </div>

                      {/* Botón individual */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setInvoiceOrder(o);
                          setInvoiceForm(f => ({ ...f, clienteNombre: "", clienteCuit: "" }));
                        }}
                        className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-[#3B82F6] hover:text-[#60A5FA] transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Facturar
                      </button>
                    </div>
                  );
                })}

                {/* Barra flotante de selección */}
                {selectedIds.size > 0 && (
                  <div className="sticky bottom-0 flex items-center justify-between px-5 py-3 bg-[#0D1829] border-t border-[#3B82F6]/30">
                    <p className="text-sm text-[#94A3B8]">
                      <span className="font-bold text-[#F1F5F9]">{selectedIds.size}</span> {selectedIds.size === 1 ? "venta seleccionada" : "ventas seleccionadas"}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedIds(new Set())}
                        className="text-xs text-[#475569] hover:text-[#94A3B8] transition-colors px-3 py-1.5"
                      >
                        Limpiar
                      </button>
                      <button
                        onClick={() => setBulkInvoice(true)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-[#F1F5F9] bg-[#3B82F6] hover:bg-[#2563EB] px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Facturar seleccionadas
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Modal facturación */}
      {invoiceOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0C1424] border border-white/[0.10] rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
              <div>
                <h2 className="text-base font-bold text-[#F1F5F9]">Emitir comprobante electrónico</h2>
                <p className="text-xs text-[#475569] mt-0.5">Venta del {invoiceOrder.date} · {formatARS(Number(invoiceOrder.amount_total))}</p>
              </div>
              <button onClick={() => setInvoiceOrder(null)} className="text-[#475569] hover:text-[#94A3B8] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
              {/* Formulario */}
              <div className="px-6 py-5 space-y-4 border-r border-white/[0.06]">
                <p className="text-xs font-semibold text-[#475569] uppercase tracking-widest">Datos del comprobante</p>

                <div>
                  <p className="text-xs text-[#475569] mb-2">Tipo de comprobante</p>
                  <div className="flex gap-2">
                    {TIPO_COMPROBANTE.map((t) => (
                      <button key={t} onClick={() => setInv("tipo", t)}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all ${
                          invoiceForm.tipo === t
                            ? "bg-[#3B82F6]/15 text-[#3B82F6] border-[#3B82F6]/30"
                            : "bg-white/[0.03] text-[#475569] border-white/[0.06] hover:border-white/[0.14]"
                        }`}>
                        {t}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-[#334155] mt-1.5">
                    {invoiceForm.tipo === "A" ? "Responsable Inscripto → Responsable Inscripto (con IVA discriminado)" :
                     invoiceForm.tipo === "B" ? "RI/Monotributista → Consumidor Final / Monotributista" :
                     "Monotributista → cualquier destinatario"}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-[#475569] mb-1.5">Punto de venta</p>
                    <input value={invoiceForm.puntoVenta} onChange={(e) => setInv("puntoVenta", e.target.value)}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-[#F1F5F9] font-mono focus:outline-none focus:border-[#3B82F6]/40" />
                  </div>
                  <div>
                    <p className="text-xs text-[#475569] mb-1.5">Condición IVA receptor</p>
                    <div className="relative">
                      <select value={invoiceForm.condIva} onChange={(e) => setInv("condIva", e.target.value)}
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-[#F1F5F9] focus:outline-none focus:border-[#3B82F6]/40 appearance-none">
                        {COND_IVA.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#475569] pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-[#475569] mb-1.5">Nombre / Razón social del receptor</p>
                  <input value={invoiceForm.clienteNombre} onChange={(e) => setInv("clienteNombre", e.target.value)}
                    placeholder="Consumidor Final" className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-[#F1F5F9] focus:outline-none focus:border-[#3B82F6]/40" />
                </div>

                <div>
                  <p className="text-xs text-[#475569] mb-1.5">CUIT del receptor</p>
                  <input value={invoiceForm.clienteCuit} onChange={(e) => setInv("clienteCuit", e.target.value)}
                    placeholder="00-00000000-0" className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-[#F1F5F9] font-mono focus:outline-none focus:border-[#3B82F6]/40" />
                </div>

                <div className="pt-2">
                  <button disabled className="w-full py-3 rounded-xl text-sm font-semibold bg-[#3B82F6]/20 text-[#3B82F6]/50 border border-[#3B82F6]/20 cursor-not-allowed flex items-center justify-center gap-2">
                    <Zap className="w-4 h-4" />
                    Emitir comprobante vía ARCA
                  </button>
                  <p className="text-[11px] text-[#475569] text-center mt-2">Conectá ARCA en Configuración para habilitar la emisión</p>
                </div>
              </div>

              {/* Preview comprobante */}
              <div className="px-6 py-5">
                <p className="text-xs font-semibold text-[#475569] uppercase tracking-widest mb-4">Vista previa del comprobante</p>
                <div className="border border-white/[0.12] rounded-xl overflow-hidden text-[12px]">
                  {/* Comprobante header */}
                  <div className="grid grid-cols-3 border-b border-white/[0.10]">
                    <div className="col-span-1 px-4 py-3 border-r border-white/[0.10]">
                      <p className="font-bold text-[#F1F5F9] text-[11px]">MI EMPRESA</p>
                      <p className="text-[#475569] text-[10px] mt-0.5">CUIT: 30-00000000-0</p>
                      <p className="text-[#475569] text-[10px]">Ing. Brutos: 000-000000-0</p>
                      <p className="text-[#475569] text-[10px] mt-1">Responsable Inscripto</p>
                    </div>
                    <div className="col-span-1 flex flex-col items-center justify-center py-3 border-r border-white/[0.10]">
                      <span className="text-3xl font-black text-[#3B82F6]">{invoiceForm.tipo}</span>
                      <p className="text-[10px] text-[#475569] mt-0.5">FACTURA</p>
                    </div>
                    <div className="col-span-1 px-4 py-3">
                      <p className="text-[#475569] text-[10px]">Pto. Venta: <span className="text-[#F1F5F9] font-mono">{invoiceForm.puntoVenta.padStart(4,"0")}</span></p>
                      <p className="text-[#475569] text-[10px]">Nro: <span className="text-[#F1F5F9] font-mono">00000001</span></p>
                      <p className="text-[#475569] text-[10px] mt-1">Fecha: <span className="text-[#F1F5F9]">{invoiceOrder.date}</span></p>
                    </div>
                  </div>

                  {/* Receptor */}
                  <div className="px-4 py-3 border-b border-white/[0.10] bg-white/[0.02]">
                    <p className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider mb-1">Receptor</p>
                    <div className="grid grid-cols-2 gap-1">
                      <p className="text-[11px] text-[#F1F5F9]">
                        <span className="text-[#475569]">Nombre: </span>
                        {invoiceForm.clienteNombre || "Consumidor Final"}
                      </p>
                      <p className="text-[11px] text-[#F1F5F9]">
                        <span className="text-[#475569]">CUIT: </span>
                        <span className="font-mono">{invoiceForm.clienteCuit || "00-00000000-0"}</span>
                      </p>
                      <p className="text-[11px] text-[#F1F5F9] col-span-2">
                        <span className="text-[#475569]">Condición IVA: </span>
                        {invoiceForm.condIva}
                      </p>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="px-4 py-3 border-b border-white/[0.10]">
                    <div className="grid grid-cols-4 text-[10px] text-[#475569] font-semibold uppercase mb-2">
                      <p className="col-span-2">Descripción</p>
                      <p className="text-right">Precio unit.</p>
                      <p className="text-right">Subtotal</p>
                    </div>
                    <div className="grid grid-cols-4 text-[11px]">
                      <p className="col-span-2 text-[#F1F5F9]">Venta {invoiceOrder.channel}</p>
                      <p className="text-right font-mono text-[#94A3B8]">{formatARS(Number(invoiceOrder.amount_total))}</p>
                      <p className="text-right font-mono text-[#F1F5F9] font-semibold">{formatARS(Number(invoiceOrder.amount_total))}</p>
                    </div>
                  </div>

                  {/* Totales */}
                  <div className="px-4 py-3 border-b border-white/[0.10] space-y-1">
                    {invoiceForm.tipo === "A" && (
                      <>
                        <div className="flex justify-between text-[11px]">
                          <span className="text-[#475569]">Neto gravado</span>
                          <span className="font-mono text-[#F1F5F9]">{formatARS(Math.round(Number(invoiceOrder.amount_total) / 1.21))}</span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                          <span className="text-[#475569]">IVA 21%</span>
                          <span className="font-mono text-[#F1F5F9]">{formatARS(Math.round(Number(invoiceOrder.amount_total) - Number(invoiceOrder.amount_total) / 1.21))}</span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between text-[13px] font-bold pt-1 border-t border-white/[0.06]">
                      <span className="text-[#F1F5F9]">TOTAL</span>
                      <span className="font-mono text-[#10B981]">{formatARS(Number(invoiceOrder.amount_total))}</span>
                    </div>
                  </div>

                  {/* CAE */}
                  <div className="px-4 py-3 bg-white/[0.02]">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-[#475569]">CAE: <span className="font-mono text-[#334155] tracking-widest">__ __ __ __ __ __ __</span></p>
                        <p className="text-[10px] text-[#475569] mt-0.5">Vto. CAE: ___/___/______</p>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-[#F59E0B] font-semibold">
                        <Zap className="w-3 h-3" />
                        Pendiente de emisión
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal facturación masiva */}
      {bulkInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0C1424] border border-white/[0.10] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] shrink-0">
              <div>
                <h2 className="text-base font-bold text-[#F1F5F9]">Facturación masiva</h2>
                <p className="text-xs text-[#475569] mt-0.5">
                  {selectedIds.size > 0
                    ? `${selectedIds.size} ${selectedIds.size === 1 ? "venta seleccionada" : "ventas seleccionadas"}`
                    : `${orders.length} ${orders.length === 1 ? "venta" : "ventas"} · Total del período`}
                </p>
              </div>
              <button onClick={() => setBulkInvoice(false)} className="text-[#475569] hover:text-[#94A3B8] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Configuración común */}
            <div className="px-6 py-4 border-b border-white/[0.06] shrink-0">
              <p className="text-xs font-semibold text-[#475569] uppercase tracking-widest mb-3">Configuración del comprobante</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-[#475569] mb-1 block">Tipo</label>
                  <div className="flex gap-1">
                    {TIPO_COMPROBANTE.map((t) => (
                      <button key={t} onClick={() => setInv("tipo", t)}
                        className={`flex-1 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                          invoiceForm.tipo === t
                            ? "bg-[#3B82F6] text-white"
                            : "bg-white/[0.04] text-[#94A3B8] hover:bg-white/[0.08]"
                        }`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-[#475569] mb-1 block">Punto de venta</label>
                  <input value={invoiceForm.puntoVenta} onChange={(e) => setInv("puntoVenta", e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-sm text-[#F1F5F9] font-mono focus:outline-none focus:border-[#3B82F6]/40" />
                </div>
                <div>
                  <label className="text-[11px] text-[#475569] mb-1 block">Condición IVA receptor</label>
                  <select value={invoiceForm.condIva} onChange={(e) => setInv("condIva", e.target.value)}
                    className="w-full bg-[#080E1A] border border-white/[0.08] rounded-lg px-3 py-1.5 text-sm text-[#F1F5F9] focus:outline-none focus:border-[#3B82F6]/40">
                    {COND_IVA.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Lista de ventas a facturar */}
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-4 px-6 py-2 bg-white/[0.02] text-[11px] font-medium text-[#475569]">
                {["Fecha", "Canal", "Total", "Pago"].map((h) => <p key={h}>{h}</p>)}
              </div>
              {(selectedIds.size > 0 ? orders.filter((o) => selectedIds.has(o.id)) : orders).map((o) => (
                <div key={o.id} className="grid grid-cols-4 items-center px-6 py-3 border-t border-white/[0.04]">
                  <p className="text-[13px] text-[#F1F5F9]">{o.date}</p>
                  <p className="text-[13px] text-[#94A3B8] capitalize">{o.channel}</p>
                  <p className="text-[13px] font-mono font-semibold text-[#F1F5F9]">{formatARS(Number(o.amount_total))}</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded w-fit ${
                    o.payment_state === "paid" ? "bg-[#10B981]/15 text-[#10B981]" : "bg-[#F59E0B]/15 text-[#F59E0B]"
                  }`}>
                    {o.payment_state === "paid" ? "Cobrado" : "Pendiente"}
                  </span>
                </div>
              ))}
            </div>

            {/* Footer con total y botón */}
            <div className="px-6 py-4 border-t border-white/[0.06] shrink-0">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs text-[#475569]">Total a facturar</p>
                  <p className="text-xl font-bold font-mono text-[#10B981] mt-0.5">
                    {formatARS(
                      (selectedIds.size > 0 ? orders.filter((o) => selectedIds.has(o.id)) : orders)
                        .reduce((s, o) => s + Number(o.amount_total), 0)
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[#475569]">Comprobantes a emitir</p>
                  <p className="text-xl font-bold text-[#F1F5F9] mt-0.5">
                    {selectedIds.size > 0 ? selectedIds.size : orders.length}
                  </p>
                </div>
              </div>
              <button disabled className="w-full py-3 rounded-xl text-sm font-semibold bg-[#3B82F6]/20 text-[#3B82F6]/50 border border-[#3B82F6]/20 cursor-not-allowed flex items-center justify-center gap-2">
                <Zap className="w-4 h-4" />
                Emitir {selectedIds.size > 0 ? selectedIds.size : orders.length} {(selectedIds.size > 0 ? selectedIds.size : orders.length) === 1 ? "comprobante" : "comprobantes"} vía ARCA
              </button>
              <p className="text-[11px] text-[#475569] text-center mt-2">Conectá ARCA en Configuración para habilitar la emisión</p>
            </div>
          </div>
        </div>
      )}

      {/* Pagos registrados en analytic_lines */}
      {!loading && pagosLineas.length > 0 && (
        <div className="bg-[#0C1424] border border-white/[0.06] rounded-xl">
          <div className="px-5 py-4 border-b border-white/[0.06]">
            <h2 className="text-sm font-semibold text-[#F1F5F9]">Pagos de impuestos registrados</h2>
            <p className="text-xs text-[#475569] mt-0.5">Líneas analíticas con categoría "impuesto"</p>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {pagosLineas.map((l) => (
              <div key={l.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
                <CheckCircle className="w-4 h-4 text-[#10B981] shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#F1F5F9] font-medium truncate">{l.name}</p>
                  <p className="text-xs text-[#475569] mt-0.5">{l.date}</p>
                </div>
                <span className="text-sm font-mono font-semibold text-[#EF4444] shrink-0">
                  −{formatARS(Math.abs(l.amount))}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
