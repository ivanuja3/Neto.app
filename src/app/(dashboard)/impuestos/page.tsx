"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { getKpisCurrentMonth, getAnalyticLines } from "@/lib/db/analytics";
import { CheckCircle, Clock, AlertCircle, ExternalLink, Info } from "lucide-react";
import { formatARS } from "@/lib/mock-data";

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

export default function ImpuestosPage() {
  const { user } = useAuth();
  const [tab,          setTab]          = useState<"obligaciones" | "cm">("obligaciones");
  const [loading,      setLoading]      = useState(true);
  const [ingresosMes,  setIngresosMes]  = useState(0);
  const [pagosLineas,  setPagosLineas]  = useState<AnalyticLine[]>([]);

  useEffect(() => {
    if (!user) return;
    async function load() {
      const [kpiRes, lineRes] = await Promise.all([
        getKpisCurrentMonth(user!.id),
        getAnalyticLines(user!.id, { category: "impuesto" }),
      ]);
      setIngresosMes(Number(kpiRes.data?.[0]?.ingresos ?? 0));
      setPagosLineas((lineRes.data ?? []).map((l: AnalyticLine) => ({ ...l, amount: Number(l.amount) })));
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
        <div className="flex items-center gap-1 px-5 py-4 border-b border-white/[0.06]">
          {(["obligaciones", "cm"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${tab === t ? "bg-[#10B981]/10 text-[#10B981]" : "text-[#475569] hover:text-[#94A3B8]"}`}>
              {t === "obligaciones" ? "Calendario fiscal" : "Convenio Multilateral"}
            </button>
          ))}
        </div>

        {tab === "obligaciones" ? (
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
        ) : (
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
      </div>

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
