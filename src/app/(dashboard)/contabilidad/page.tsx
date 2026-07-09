"use client";

import { useState } from "react";
import { BookOpen, TrendingUp, TrendingDown, Minus, ChevronRight, Sparkles } from "lucide-react";

function formatARS(v: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(v);
}

/* ── BALANCE GENERAL ─────────────────────────────────────── */

type BalanceItem = { label: string; value: number; sub?: string; indent?: boolean };

const ACTIVO_CORRIENTE: BalanceItem[] = [
  { label: "Caja y bancos",                  value: 845_200,   sub: "Cta. cte. Banco Nación + efectivo" },
  { label: "Créditos por ventas",            value: 1_234_500, sub: "Facturas pendientes de cobro" },
  { label: "Bienes de cambio (inventario)",  value: 1_087_400, sub: "Valor de costo del stock actual" },
  { label: "Anticipos a proveedores",        value: 180_000,   sub: "Señas entregadas" },
];
const ACTIVO_NO_CORRIENTE: BalanceItem[] = [
  { label: "Bienes de uso — maquinaria",     value: 850_000 },
  { label: "Bienes de uso — vehículos",      value: 320_000 },
  { label: "Instalaciones y mejoras",        value: 450_000 },
];
const PASIVO_CORRIENTE: BalanceItem[] = [
  { label: "Proveedores",                    value: 567_300,  sub: "Deudas comerciales pendientes" },
  { label: "Deudas fiscales (ARCA / IIBB)",  value: 89_400 },
  { label: "Remuneraciones y cargas soc.",   value: 145_000 },
];
const PASIVO_NO_CORRIENTE: BalanceItem[] = [
  { label: "Préstamo bancario",              value: 420_000,  sub: "Banco Nación — 36 cuotas" },
];

const totalAC  = ACTIVO_CORRIENTE.reduce((s, i) => s + i.value, 0);
const totalANC = ACTIVO_NO_CORRIENTE.reduce((s, i) => s + i.value, 0);
const totalPC  = PASIVO_CORRIENTE.reduce((s, i) => s + i.value, 0);
const totalPNC = PASIVO_NO_CORRIENTE.reduce((s, i) => s + i.value, 0);
const totalActivo = totalAC + totalANC;
const totalPasivo = totalPC + totalPNC;
const capitalSocial = 1_500_000;
const resultados    = totalActivo - totalPasivo - capitalSocial;
const totalPN       = capitalSocial + resultados;

function BalanceGroup({ title, items, total, color }: { title: string; items: BalanceItem[]; total: number; color: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color }}>{title}</p>
      <div className="space-y-1">
        {items.map((i) => (
          <div key={i.label} className="flex items-start justify-between py-1.5 border-b border-white/[0.03]">
            <div>
              <p className="text-[13px] text-[#E2E8F0]">{i.label}</p>
              {i.sub && <p className="text-[10px] text-[#475569] mt-0.5">{i.sub}</p>}
            </div>
            <p className="text-[13px] font-mono text-[#F1F5F9] shrink-0 pl-4">{formatARS(i.value)}</p>
          </div>
        ))}
        <div className="flex justify-between pt-2">
          <p className="text-[12px] font-semibold text-[#94A3B8]">Subtotal</p>
          <p className="text-[13px] font-bold font-mono" style={{ color }}>{formatARS(total)}</p>
        </div>
      </div>
    </div>
  );
}

function BalanceGeneral() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* ACTIVO */}
      <div className="bg-[#0C1424] border border-white/[0.06] rounded-xl p-5 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#F1F5F9]">ACTIVO</h2>
          <p className="text-lg font-black font-mono text-[#10B981]">{formatARS(totalActivo)}</p>
        </div>
        <BalanceGroup title="Activo Corriente" items={ACTIVO_CORRIENTE} total={totalAC} color="#10B981" />
        <BalanceGroup title="Activo No Corriente" items={ACTIVO_NO_CORRIENTE} total={totalANC} color="#3B82F6" />
      </div>

      {/* PASIVO + PN */}
      <div className="space-y-5">
        <div className="bg-[#0C1424] border border-white/[0.06] rounded-xl p-5 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#F1F5F9]">PASIVO</h2>
            <p className="text-lg font-black font-mono text-[#EF4444]">{formatARS(totalPasivo)}</p>
          </div>
          <BalanceGroup title="Pasivo Corriente" items={PASIVO_CORRIENTE} total={totalPC} color="#F59E0B" />
          <BalanceGroup title="Pasivo No Corriente" items={PASIVO_NO_CORRIENTE} total={totalPNC} color="#EF4444" />
        </div>

        <div className="bg-[#0C1424] border border-white/[0.06] rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#F1F5F9]">PATRIMONIO NETO</h2>
            <p className="text-lg font-black font-mono text-[#8B5CF6]">{formatARS(totalPN)}</p>
          </div>
          <div className="space-y-1">
            {[
              { label: "Capital social", value: capitalSocial },
              { label: "Resultados acumulados", value: resultados },
            ].map((i) => (
              <div key={i.label} className="flex justify-between py-1.5 border-b border-white/[0.03]">
                <p className="text-[13px] text-[#E2E8F0]">{i.label}</p>
                <p className={`text-[13px] font-mono ${i.value >= 0 ? "text-[#F1F5F9]" : "text-[#EF4444]"}`}>{formatARS(i.value)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Ecuación */}
        <div className={`flex items-center justify-center gap-2 rounded-xl py-3 px-4 border text-sm font-bold ${
          Math.abs(totalActivo - totalPasivo - totalPN) < 1
            ? "bg-[#10B981]/[0.08] border-[#10B981]/20 text-[#10B981]"
            : "bg-[#EF4444]/[0.08] border-[#EF4444]/20 text-[#EF4444]"
        }`}>
          Activo = Pasivo + PN &nbsp;·&nbsp; {formatARS(totalActivo)} = {formatARS(totalPasivo + totalPN)}
        </div>
      </div>
    </div>
  );
}

/* ── LIBRO MAYOR ─────────────────────────────────────────── */

type Movimiento = { fecha: string; comprobante: string; concepto: string; debe: number; haber: number };
type Cuenta = { nombre: string; codigo: string; tipo: "activo" | "pasivo" | "resultado"; movimientos: Movimiento[] };

const CUENTAS: Cuenta[] = [
  {
    nombre: "Caja", codigo: "1.1.1",  tipo: "activo",
    movimientos: [
      { fecha: "01/07/2026", comprobante: "RC-0001", concepto: "Saldo inicial",           debe: 320_000, haber: 0 },
      { fecha: "03/07/2026", comprobante: "FC-0142", concepto: "Cobro cliente García",    debe: 285_000, haber: 0 },
      { fecha: "05/07/2026", comprobante: "OC-0089", concepto: "Pago proveedor aluminio", debe: 0,       haber: 145_000 },
      { fecha: "08/07/2026", comprobante: "FC-0143", concepto: "Cobro cliente Romero",    debe: 420_000, haber: 0 },
      { fecha: "10/07/2026", comprobante: "GS-0034", concepto: "Pago servicios",          debe: 0,       haber: 34_800 },
    ],
  },
  {
    nombre: "Banco Nación Cta. Cte.", codigo: "1.1.2", tipo: "activo",
    movimientos: [
      { fecha: "01/07/2026", comprobante: "BN-0001", concepto: "Saldo inicial",              debe: 510_000, haber: 0 },
      { fecha: "04/07/2026", comprobante: "TR-0012", concepto: "Transferencia cobro ML",     debe: 198_500, haber: 0 },
      { fecha: "07/07/2026", comprobante: "DB-0056", concepto: "Débito cuota préstamo",      debe: 0,       haber: 28_300 },
      { fecha: "09/07/2026", comprobante: "TR-0013", concepto: "Pago proveedor vidrios",     debe: 0,       haber: 95_000 },
      { fecha: "11/07/2026", comprobante: "TR-0014", concepto: "Cobro presupuesto obra TN",  debe: 312_000, haber: 0 },
    ],
  },
  {
    nombre: "Clientes", codigo: "1.2.1", tipo: "activo",
    movimientos: [
      { fecha: "02/07/2026", comprobante: "FA-0138", concepto: "Venta puerta corrediza — García",   debe: 485_000, haber: 0 },
      { fecha: "04/07/2026", comprobante: "FA-0139", concepto: "Presupuesto aceptado — Torres",     debe: 892_000, haber: 0 },
      { fecha: "06/07/2026", comprobante: "RC-0045", concepto: "Cobro parcial García",              debe: 0,       haber: 285_000 },
      { fecha: "08/07/2026", comprobante: "FA-0140", concepto: "Venta ventanas PVC — Municipalidad",debe: 1_140_000,haber: 0 },
      { fecha: "10/07/2026", comprobante: "RC-0046", concepto: "Cobro total Torres",               debe: 0,       haber: 892_000 },
    ],
  },
  {
    nombre: "Proveedores", codigo: "2.1.1", tipo: "pasivo",
    movimientos: [
      { fecha: "02/07/2026", comprobante: "FC-P-221", concepto: "Compra aluminio — Aluminios del Sur",  debe: 0,       haber: 320_000 },
      { fecha: "05/07/2026", comprobante: "OC-0089",  concepto: "Pago parcial Aluminios del Sur",       debe: 145_000, haber: 0 },
      { fecha: "07/07/2026", comprobante: "FC-P-222", concepto: "Compra vidrios — Vidriería Central",   debe: 0,       haber: 198_000 },
      { fecha: "09/07/2026", comprobante: "TR-0013",  concepto: "Pago total Vidriería Central",         debe: 95_000,  haber: 0 },
      { fecha: "11/07/2026", comprobante: "FC-P-223", concepto: "Compra herrajes — FerroCor S.A.",      debe: 0,       haber: 289_300 },
    ],
  },
  {
    nombre: "Ventas", codigo: "4.1.1", tipo: "resultado",
    movimientos: [
      { fecha: "02/07/2026", comprobante: "FA-0138", concepto: "Venta puerta corrediza — García",    debe: 0,         haber: 485_000 },
      { fecha: "04/07/2026", comprobante: "FA-0139", concepto: "Presupuesto aceptado — Torres",      debe: 0,         haber: 892_000 },
      { fecha: "08/07/2026", comprobante: "FA-0140", concepto: "Venta ventanas PVC — Municipalidad", debe: 0,         haber: 1_140_000 },
    ],
  },
];

function calcSaldo(movs: Movimiento[], tipo: "activo" | "pasivo" | "resultado") {
  const totalDebe  = movs.reduce((s, m) => s + m.debe, 0);
  const totalHaber = movs.reduce((s, m) => s + m.haber, 0);
  return tipo === "activo" ? totalDebe - totalHaber : totalHaber - totalDebe;
}

function LibroMayor() {
  const [cuentaIdx, setCuentaIdx] = useState(0);
  const cuenta = CUENTAS[cuentaIdx];
  const saldo = calcSaldo(cuenta.movimientos, cuenta.tipo);

  let saldoAcum = 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-5">
      {/* Lista de cuentas */}
      <div className="bg-[#0C1424] border border-white/[0.06] rounded-xl overflow-hidden">
        <p className="px-4 py-3 text-[10px] font-bold text-[#475569] uppercase tracking-widest border-b border-white/[0.06]">
          Plan de cuentas
        </p>
        {CUENTAS.map((c, i) => {
          const s = calcSaldo(c.movimientos, c.tipo);
          return (
            <button
              key={c.codigo}
              onClick={() => setCuentaIdx(i)}
              className={`w-full flex items-center justify-between px-4 py-3 text-left border-b border-white/[0.03] transition-colors ${
                i === cuentaIdx ? "bg-[#3B82F6]/[0.10]" : "hover:bg-white/[0.03]"
              }`}
            >
              <div>
                <p className={`text-[12px] font-semibold ${i === cuentaIdx ? "text-[#60A5FA]" : "text-[#E2E8F0]"}`}>{c.nombre}</p>
                <p className="text-[10px] text-[#475569] mt-0.5">{c.codigo} · {c.tipo}</p>
              </div>
              <div className="text-right shrink-0 pl-2">
                <p className={`text-[11px] font-mono font-bold ${s >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}>
                  {s >= 0 ? "" : "-"}{formatARS(Math.abs(s))}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Movimientos de la cuenta */}
      <div className="bg-[#0C1424] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div>
            <h3 className="text-sm font-bold text-[#F1F5F9]">{cuenta.nombre}</h3>
            <p className="text-[11px] text-[#475569] mt-0.5">Cuenta {cuenta.codigo} · Julio 2026</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-[#475569]">Saldo</p>
            <p className={`text-lg font-black font-mono ${saldo >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}>
              {formatARS(Math.abs(saldo))}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.04] bg-white/[0.02]">
                {["Fecha", "Comprobante", "Concepto", "Debe", "Haber", "Saldo parcial"].map((h) => (
                  <th key={h} className="text-left text-[11px] font-medium text-[#475569] px-4 py-2.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cuenta.movimientos.map((m, i) => {
                const delta = cuenta.tipo === "activo" ? m.debe - m.haber : m.haber - m.debe;
                saldoAcum += delta;
                return (
                  <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-[12px] text-[#94A3B8] whitespace-nowrap">{m.fecha}</td>
                    <td className="px-4 py-3 font-mono text-[12px] text-[#475569]">{m.comprobante}</td>
                    <td className="px-4 py-3 text-[13px] text-[#E2E8F0]">{m.concepto}</td>
                    <td className="px-4 py-3 font-mono text-[12px] text-[#10B981] text-right">
                      {m.debe > 0 ? formatARS(m.debe) : "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-[12px] text-[#EF4444] text-right">
                      {m.haber > 0 ? formatARS(m.haber) : "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-[12px] font-semibold text-right" style={{ color: saldoAcum >= 0 ? "#F1F5F9" : "#EF4444" }}>
                      {formatARS(Math.abs(saldoAcum))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-white/[0.02]">
                <td colSpan={3} className="px-4 py-3 text-[12px] font-semibold text-[#94A3B8]">Totales</td>
                <td className="px-4 py-3 font-mono text-[12px] font-bold text-[#10B981] text-right">
                  {formatARS(cuenta.movimientos.reduce((s, m) => s + m.debe, 0))}
                </td>
                <td className="px-4 py-3 font-mono text-[12px] font-bold text-[#EF4444] text-right">
                  {formatARS(cuenta.movimientos.reduce((s, m) => s + m.haber, 0))}
                </td>
                <td className="px-4 py-3 font-mono text-[12px] font-bold text-right" style={{ color: saldo >= 0 ? "#10B981" : "#EF4444" }}>
                  {formatARS(Math.abs(saldo))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ── ESTADO DE RESULTADOS ───────────────────────────────── */

type ERFila = { label: string; valor: number; esSub?: boolean; esTotal?: boolean; indent?: boolean; color?: string };

const VENTAS_BRUTAS   = 2_517_000;
const DESCUENTOS      =    45_000;
const VENTAS_NETAS    = VENTAS_BRUTAS - DESCUENTOS;
const CMV             = 1_285_440;
const RESULTADO_BRUTO = VENTAS_NETAS - CMV;

const GASTOS_COMERCIAL = [
  { label: "Publicidad y marketing",   valor: 89_400 },
  { label: "Flete y distribución",     valor: 67_200 },
  { label: "Comisiones de ventas",     valor: 74_160 },
];
const GASTOS_ADMIN = [
  { label: "Sueldos y cargas sociales", valor: 312_000 },
  { label: "Alquiler del local",        valor: 180_000 },
  { label: "Servicios (luz/gas/inet)",  valor:  34_800 },
  { label: "Honorarios contador",       valor:  45_000 },
  { label: "Software y herramientas",   valor:  12_400 },
];

const TOTAL_COMERCIAL = GASTOS_COMERCIAL.reduce((s, g) => s + g.valor, 0);
const TOTAL_ADMIN     = GASTOS_ADMIN.reduce((s, g) => s + g.valor, 0);
const RESULTADO_OP    = RESULTADO_BRUTO - TOTAL_COMERCIAL - TOTAL_ADMIN;
const INTERESES       = 28_300;
const RESULTADO_ANTES = RESULTADO_OP - INTERESES;
const IIBB            = Math.round(VENTAS_NETAS * 0.025 * 0.45);
const RESULTADO_NETO  = RESULTADO_ANTES - IIBB;

function PctBar({ pct, color }: { pct: number; color: string }) {
  const abs = Math.abs(pct);
  return (
    <div className="flex items-center gap-1.5 justify-end">
      <span className="text-[11px] font-mono w-10 text-right" style={{ color }}>
        {pct >= 0 ? "" : "-"}{abs.toFixed(1)}%
      </span>
      <div className="w-16 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${Math.min(abs, 100)}%`, background: color }} />
      </div>
    </div>
  );
}

function ERRow({ fila, base }: { fila: ERFila; base: number }) {
  const pct = base > 0 ? (fila.valor / base) * 100 : 0;
  const color = fila.color ?? (fila.valor >= 0 ? "#F1F5F9" : "#EF4444");
  return (
    <tr className={`border-b border-white/[0.03] ${fila.esTotal ? "bg-white/[0.03]" : "hover:bg-white/[0.02]"}`}>
      <td className={`px-5 py-2.5 ${fila.esTotal ? "font-bold" : fila.esSub ? "font-semibold" : ""} ${fila.indent ? "pl-10" : ""}`}>
        <span className={`text-[13px] ${fila.esTotal ? "text-[#F1F5F9]" : fila.esSub ? "text-[#E2E8F0]" : "text-[#94A3B8]"}`}>
          {fila.label}
        </span>
      </td>
      <td className="px-5 py-2.5 text-right">
        <span className={`text-[13px] font-mono ${fila.esTotal ? "font-bold text-base" : "font-semibold"}`} style={{ color }}>
          {fila.valor < 0 && !fila.esTotal ? `(${formatARS(Math.abs(fila.valor))})` : formatARS(Math.abs(fila.valor))}
        </span>
      </td>
      <td className="px-5 py-2.5">
        {fila.esSub || fila.esTotal
          ? <PctBar pct={fila.valor >= 0 ? pct : -pct} color={color} />
          : null}
      </td>
    </tr>
  );
}

function Separator({ label }: { label: string }) {
  return (
    <tr>
      <td colSpan={3} className="px-5 pt-4 pb-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#475569]">{label}</p>
      </td>
    </tr>
  );
}

function EstadoResultados() {
  const [periodo, setPeriodo] = useState<"mes" | "ytd">("mes");

  const mult = periodo === "ytd" ? 7 : 1;

  const filas: ERFila[] = [
    { label: "Ventas brutas",                    valor:  VENTAS_BRUTAS * mult },
    { label: "Descuentos y bonificaciones",       valor: -DESCUENTOS * mult, indent: true },
    { label: "= Ventas Netas",                    valor:  VENTAS_NETAS * mult, esSub: true, color: "#F1F5F9" },
    { label: "Costo de mercadería vendida (CMV)", valor: -CMV * mult, indent: true },
    { label: "= Resultado Bruto",                 valor:  RESULTADO_BRUTO * mult, esSub: true, color: "#10B981" },
    ...GASTOS_COMERCIAL.map((g) => ({ label: g.label, valor: -g.valor * mult, indent: true })),
    { label: "= Subtotal comercialización",       valor: -TOTAL_COMERCIAL * mult, esSub: true, color: "#F59E0B" },
    ...GASTOS_ADMIN.map((g) => ({ label: g.label, valor: -g.valor * mult, indent: true })),
    { label: "= Subtotal administración",         valor: -TOTAL_ADMIN * mult, esSub: true, color: "#F59E0B" },
    { label: "= Resultado Operativo (EBIT)",      valor:  RESULTADO_OP * mult, esTotal: true, color: RESULTADO_OP >= 0 ? "#3B82F6" : "#EF4444" },
    { label: "Intereses y gastos financieros",    valor: -INTERESES * mult, indent: true },
    { label: "= Resultado antes de impuestos",    valor:  RESULTADO_ANTES * mult, esSub: true, color: "#F1F5F9" },
    { label: `IIBB (2,5% × Córdoba)`,            valor: -IIBB * mult, indent: true },
    { label: "= Resultado Neto del Período",      valor:  RESULTADO_NETO * mult, esTotal: true, color: RESULTADO_NETO >= 0 ? "#10B981" : "#EF4444" },
  ];

  const SEPARATORS: Record<number, string> = {
    0: "Ingresos",
    3: "Costo de ventas",
    5: "Gastos de comercialización",
    8: "Gastos de administración",
    13: "Resultado financiero",
    15: "Impuestos y tasas",
  };

  const base = VENTAS_NETAS * mult;

  return (
    <div className="space-y-4">
      {/* Selector período */}
      <div className="flex items-center gap-2">
        {([["mes", "Julio 2026"], ["ytd", "Acumulado Ene–Jul"]] as const).map(([k, lbl]) => (
          <button key={k} onClick={() => setPeriodo(k)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
              periodo === k ? "bg-[#8B5CF6]/20 text-[#A78BFA] border border-[#8B5CF6]/30" : "bg-white/[0.04] text-[#475569] hover:text-[#94A3B8]"
            }`}>
            {lbl}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-5">
        {/* Tabla */}
        <div className="bg-[#080E1A] border border-white/[0.06] rounded-xl overflow-hidden">
          <div className="grid grid-cols-[1fr_140px_120px] border-b border-white/[0.06] bg-white/[0.02]">
            <p className="px-5 py-2.5 text-[11px] font-medium text-[#475569]">Concepto</p>
            <p className="px-5 py-2.5 text-[11px] font-medium text-[#475569] text-right">Importe</p>
            <p className="px-5 py-2.5 text-[11px] font-medium text-[#475569]">% ventas</p>
          </div>
          <table className="w-full">
            <tbody>
              {filas.map((f, i) => (
                <>
                  {SEPARATORS[i] && <Separator key={`sep-${i}`} label={SEPARATORS[i]} />}
                  <ERRow key={f.label} fila={f} base={base} />
                </>
              ))}
            </tbody>
          </table>
        </div>

        {/* Panel lateral — resumen visual */}
        <div className="space-y-3">
          {[
            { label: "Ventas Netas",        valor: VENTAS_NETAS * mult,    color: "#F1F5F9",  pct: 100 },
            { label: "Resultado Bruto",     valor: RESULTADO_BRUTO * mult, color: "#10B981",  pct: Math.round(RESULTADO_BRUTO / VENTAS_NETAS * 100) },
            { label: "Resultado Operativo", valor: RESULTADO_OP * mult,    color: "#3B82F6",  pct: Math.round(RESULTADO_OP / VENTAS_NETAS * 100) },
            { label: "Resultado Neto",      valor: RESULTADO_NETO * mult,  color: "#8B5CF6",  pct: Math.round(RESULTADO_NETO / VENTAS_NETAS * 100) },
          ].map((item) => (
            <div key={item.label} className="bg-[#080E1A] border border-white/[0.06] rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] text-[#475569]">{item.label}</p>
                <span className="text-[11px] font-bold font-mono px-1.5 py-0.5 rounded" style={{ color: item.color, background: `${item.color}15` }}>
                  {item.pct}%
                </span>
              </div>
              <p className="text-base font-black font-mono" style={{ color: item.color }}>
                {formatARS(item.valor)}
              </p>
              <div className="mt-2 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${item.pct}%`, background: item.color }} />
              </div>
            </div>
          ))}

          {/* Cascada simplificada */}
          <div className="bg-[#080E1A] border border-white/[0.06] rounded-xl p-4">
            <p className="text-[10px] font-bold text-[#475569] uppercase tracking-widest mb-3">Cascada de márgenes</p>
            {[
              { label: "−CMV",           pct: Math.round(CMV / VENTAS_NETAS * 100),           color: "#EF4444" },
              { label: "−Comercial",     pct: Math.round(TOTAL_COMERCIAL / VENTAS_NETAS * 100),color: "#F59E0B" },
              { label: "−Administración",pct: Math.round(TOTAL_ADMIN / VENTAS_NETAS * 100),    color: "#F97316" },
              { label: "−Financiero",    pct: Math.round((INTERESES + IIBB) / VENTAS_NETAS * 100), color: "#6366F1" },
              { label: "= Neto",         pct: Math.round(RESULTADO_NETO / VENTAS_NETAS * 100), color: "#8B5CF6" },
            ].map((r) => (
              <div key={r.label} className="flex items-center gap-2 mb-1.5">
                <p className="text-[11px] text-[#475569] w-28 shrink-0">{r.label}</p>
                <div className="flex-1 h-4 bg-white/[0.04] rounded overflow-hidden">
                  <div className="h-full rounded flex items-center justify-end pr-1.5"
                    style={{ width: `${Math.min(r.pct, 100)}%`, background: `${r.color}40` }}>
                    <span className="text-[9px] font-mono font-bold" style={{ color: r.color }}>{r.pct}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── PAGE ────────────────────────────────────────────────── */

export default function ContabilidadPage() {
  const [tab, setTab] = useState<"balance" | "mayor" | "resultados">("balance");

  const tabs = [
    { key: "balance",    label: "Balance General" },
    { key: "mayor",      label: "Libro Mayor" },
    { key: "resultados", label: "Estado de Resultados" },
  ] as const;

  return (
    <div className="p-6 pb-12 space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-[#F1F5F9] tracking-tight">Contabilidad</h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#8B5CF6]/20 text-[#A78BFA] border border-[#8B5CF6]/20 uppercase tracking-wider">
              Vista previa
            </span>
          </div>
          <p className="text-sm text-[#64748B] mt-1">Balance General · Libro Mayor · Activo y Pasivo</p>
        </div>
      </div>

      {/* Banner informativo */}
      <div className="flex items-start gap-3 bg-[#8B5CF6]/[0.08] border border-[#8B5CF6]/20 rounded-xl px-5 py-4">
        <Sparkles className="w-4 h-4 text-[#A78BFA] shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-[#A78BFA]">Esta sección está en desarrollo</p>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            Los datos que ves son de ejemplo para mostrar cómo va a funcionar. Cuando esté activa, todo se va a calcular automáticamente desde tus ventas, compras y movimientos reales.
          </p>
        </div>
        <div className="flex items-center gap-1 text-xs text-[#8B5CF6] font-semibold shrink-0">
          Próximamente <ChevronRight className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* KPI rápidos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Activo",      value: totalActivo,  icon: TrendingUp,   color: "#10B981" },
          { label: "Total Pasivo",      value: totalPasivo,  icon: TrendingDown, color: "#EF4444" },
          { label: "Patrimonio Neto",   value: totalPN,      icon: BookOpen,     color: "#8B5CF6" },
          { label: "Solvencia (A/P)",   value: null,         icon: Minus,        color: "#3B82F6",
            display: (totalActivo / totalPasivo).toFixed(2) + "x" },
        ].map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="bg-[#0C1424] border border-white/[0.06] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-3.5 h-3.5" style={{ color: k.color }} />
                <p className="text-[11px] text-[#475569]">{k.label}</p>
              </div>
              <p className="text-xl font-black font-mono" style={{ color: k.color }}>
                {k.display ?? formatARS(k.value!)}
              </p>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="bg-[#0C1424] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="flex border-b border-white/[0.06]">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-6 py-3.5 text-sm font-semibold transition-colors ${
                tab === t.key
                  ? "text-[#F1F5F9] border-b-2 border-[#8B5CF6]"
                  : "text-[#475569] hover:text-[#94A3B8]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="p-5">
          {tab === "balance"    && <BalanceGeneral />}
          {tab === "mayor"      && <LibroMayor />}
          {tab === "resultados" && <EstadoResultados />}
        </div>
      </div>
    </div>
  );
}
