"use client";

import { useEffect, useState, useMemo, Fragment } from "react";
import { useAuth } from "@/components/auth-provider";
import { getPnlMonthly, getAnalyticLines, getExpenses } from "@/lib/db/analytics";
import { getOrders } from "@/lib/db/orders";
import { getPurchases } from "@/lib/db/purchases";
import { getInventoryValue } from "@/lib/db/products";
import { BookOpen, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { formatARS } from "@/lib/mock-data";

function mesLabel(m: string) {
  const [y, mo] = m.split("-");
  const d = new Date(Number(y), Number(mo) - 1);
  return d.toLocaleDateString("es-AR", { month: "short", year: "2-digit" }).replace(".", "");
}

/* ── TIPOS ───────────────────────────────────────────────── */
type PnlRow = { mes: string; ingresos: number; cogs: number; cm1: number; cm1_pct: number; marketing: number; logistica: number; cm2: number; cm2_pct: number; gastos_fijos: number; cm3: number; cm3_pct: number };
type Expense = { id: string; name: string; type: string; amount: number; frequency: string; category: string | null };
type Order   = { id: string; date: string; channel: string; payment_state: string; amount_total: number; payment_method?: string };
type Purchase = { id: string; date: string; state: string; amount_total: number; partner?: { name: string } | null };
type Line    = { id: string; date: string; name: string; category: string; amount: number };

type AppData = {
  pnl: PnlRow[];
  expenses: Expense[];
  orders: Order[];
  purchases: Purchase[];
  lines: Line[];
  inventoryValue: number;
};

/* ── SKELETON ────────────────────────────────────────────── */
function Sk({ h = "h-4", w = "w-full" }: { h?: string; w?: string }) {
  return <div className={`${h} ${w} bg-white/[0.06] rounded animate-pulse`} />;
}

/* ── BALANCE GENERAL ─────────────────────────────────────── */
function BalanceGeneral({ data, loading }: { data: AppData | null; loading: boolean }) {
  const inventario    = data?.inventoryValue ?? 0;
  const clientesPend  = (data?.orders ?? []).filter((o) => o.payment_state === "pending").reduce((s, o) => s + Number(o.amount_total), 0);
  const proveedPend   = (data?.purchases ?? []).filter((p) => p.state !== "received" && p.state !== "invoiced" && p.state !== "cancelled").reduce((s, p) => s + Number(p.amount_total), 0);
  const cm3Total      = (data?.pnl ?? []).reduce((s, r) => s + Number(r.cm3), 0);
  const cajaAprox     = Math.max(cm3Total, 0);

  const totalAC   = cajaAprox + clientesPend + inventario;
  const totalANC  = 0; // sin bienes de uso registrados
  const totalActivo = totalAC + totalANC;

  const totalPC   = proveedPend;
  const totalPNC  = 0;
  const totalPasivo = totalPC + totalPNC;
  const totalPN   = totalActivo - totalPasivo;

  type BalItem = { label: string; value: number; sub?: string; vacio?: boolean };

  const activoCorriente: BalItem[] = [
    { label: "Caja y bancos (estimado)",        value: cajaAprox,     sub: "Acumulado de resultado neto" },
    { label: "Créditos por ventas",             value: clientesPend,  sub: `${(data?.orders ?? []).filter((o) => o.payment_state === "pending").length} ventas pendientes de cobro` },
    { label: "Bienes de cambio (inventario)",   value: inventario,    sub: "Valor de costo del stock actual" },
  ];
  const activoNoCorriente: BalItem[] = [
    { label: "Bienes de uso",                   value: 0, vacio: true, sub: "Sin activos fijos registrados" },
  ];
  const pasivoCorriente: BalItem[] = [
    { label: "Proveedores",                     value: proveedPend,   sub: `${(data?.purchases ?? []).filter((p) => p.state !== "received" && p.state !== "invoiced" && p.state !== "cancelled").length} compras pendientes de pago` },
  ];

  if (loading) return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {[0, 1].map((i) => <div key={i} className="bg-[#0C1424] border border-white/[0.06] rounded-xl p-5 space-y-3"><Sk h="h-5" w="w-40" />{Array.from({length:4}).map((_,j)=><Sk key={j}/>)}</div>)}
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* ACTIVO */}
      <div className="bg-[#0C1424] border border-white/[0.06] rounded-xl p-5 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#F1F5F9]">ACTIVO</h2>
          <p className="text-lg font-black font-mono text-[#10B981]">{formatARS(totalActivo)}</p>
        </div>

        <div>
          <p className="text-[10px] font-bold text-[#10B981] uppercase tracking-widest mb-2">Activo Corriente</p>
          <div className="space-y-1">
            {activoCorriente.map((i) => (
              <div key={i.label} className="flex items-start justify-between py-1.5 border-b border-white/[0.03]">
                <div><p className={`text-[13px] ${i.vacio ? "text-[#334155]" : "text-[#E2E8F0]"}`}>{i.label}</p>{i.sub && <p className="text-[10px] text-[#475569] mt-0.5">{i.sub}</p>}</div>
                <p className={`text-[13px] font-mono shrink-0 pl-4 ${i.vacio ? "text-[#334155]" : "text-[#F1F5F9]"}`}>{formatARS(i.value)}</p>
              </div>
            ))}
            <div className="flex justify-between pt-2"><p className="text-[12px] font-semibold text-[#94A3B8]">Subtotal</p><p className="text-[13px] font-bold font-mono text-[#10B981]">{formatARS(totalAC)}</p></div>
          </div>
        </div>

        <div>
          <p className="text-[10px] font-bold text-[#3B82F6] uppercase tracking-widest mb-2">Activo No Corriente</p>
          <div className="space-y-1">
            {activoNoCorriente.map((i) => (
              <div key={i.label} className="flex items-start justify-between py-1.5 border-b border-white/[0.03]">
                <div><p className="text-[13px] text-[#334155]">{i.label}</p>{i.sub && <p className="text-[10px] text-[#334155] mt-0.5">{i.sub}</p>}</div>
                <p className="text-[13px] font-mono text-[#334155] shrink-0 pl-4">{formatARS(0)}</p>
              </div>
            ))}
            <div className="flex justify-between pt-2"><p className="text-[12px] font-semibold text-[#94A3B8]">Subtotal</p><p className="text-[13px] font-bold font-mono text-[#3B82F6]">{formatARS(totalANC)}</p></div>
          </div>
        </div>
      </div>

      {/* PASIVO + PN */}
      <div className="space-y-5">
        <div className="bg-[#0C1424] border border-white/[0.06] rounded-xl p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#F1F5F9]">PASIVO</h2>
            <p className="text-lg font-black font-mono text-[#EF4444]">{formatARS(totalPasivo)}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-[#F59E0B] uppercase tracking-widest mb-2">Pasivo Corriente</p>
            <div className="space-y-1">
              {pasivoCorriente.map((i) => (
                <div key={i.label} className="flex items-start justify-between py-1.5 border-b border-white/[0.03]">
                  <div><p className="text-[13px] text-[#E2E8F0]">{i.label}</p>{i.sub && <p className="text-[10px] text-[#475569] mt-0.5">{i.sub}</p>}</div>
                  <p className="text-[13px] font-mono text-[#F1F5F9] shrink-0 pl-4">{formatARS(i.value)}</p>
                </div>
              ))}
              <div className="flex justify-between pt-2"><p className="text-[12px] font-semibold text-[#94A3B8]">Subtotal</p><p className="text-[13px] font-bold font-mono text-[#F59E0B]">{formatARS(totalPC)}</p></div>
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold text-[#EF4444] uppercase tracking-widest mb-2">Pasivo No Corriente</p>
            <div className="py-2 text-[13px] text-[#334155]">Sin deudas a largo plazo registradas</div>
          </div>
        </div>

        <div className="bg-[#0C1424] border border-white/[0.06] rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#F1F5F9]">PATRIMONIO NETO</h2>
            <p className="text-lg font-black font-mono text-[#8B5CF6]">{formatARS(totalPN)}</p>
          </div>
          <div className="flex justify-between py-1.5 border-b border-white/[0.03]">
            <p className="text-[13px] text-[#E2E8F0]">Resultado acumulado</p>
            <p className={`text-[13px] font-mono ${totalPN >= 0 ? "text-[#F1F5F9]" : "text-[#EF4444]"}`}>{formatARS(totalPN)}</p>
          </div>
        </div>

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
type MayorCuenta = { nombre: string; codigo: string; tipo: "activo" | "pasivo" | "resultado"; movs: { fecha: string; concepto: string; debe: number; haber: number }[] };

function LibroMayor({ data, loading }: { data: AppData | null; loading: boolean }) {
  const cuentas: MayorCuenta[] = useMemo(() => {
    if (!data) return [];
    const ventas: MayorCuenta = {
      nombre: "Ventas", codigo: "4.1.1", tipo: "resultado",
      movs: (data.orders).map((o) => ({
        fecha:    o.date,
        concepto: `Venta ${o.channel}${o.payment_method ? ` · ${o.payment_method}` : ""}`,
        debe: 0,
        haber: Number(o.amount_total),
      })),
    };
    const proveedores: MayorCuenta = {
      nombre: "Proveedores", codigo: "2.1.1", tipo: "pasivo",
      movs: (data.purchases).map((p) => ({
        fecha:    p.date,
        concepto: p.partner?.name ? `Compra — ${p.partner.name}` : "Compra",
        debe:  (p.state === "received" || p.state === "invoiced") ? Number(p.amount_total) : 0,
        haber: (p.state !== "received" && p.state !== "invoiced" && p.state !== "cancelled") ? Number(p.amount_total) : 0,
      })),
    };
    const movGenerales: MayorCuenta = {
      nombre: "Movimientos generales", codigo: "1.1.1", tipo: "activo",
      movs: (data.lines).map((l) => ({
        fecha:    l.date,
        concepto: l.name || l.category,
        debe:  l.amount > 0 ? Math.abs(l.amount) : 0,
        haber: l.amount < 0 ? Math.abs(l.amount) : 0,
      })),
    };
    return [ventas, proveedores, movGenerales].filter((c) => c.movs.length > 0);
  }, [data]);

  const [idx, setIdx] = useState(0);

  if (loading) return (
    <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-5">
      <div className="bg-[#0C1424] border border-white/[0.06] rounded-xl p-4 space-y-3">{Array.from({length:3}).map((_,i)=><Sk key={i}/>)}</div>
      <div className="bg-[#0C1424] border border-white/[0.06] rounded-xl p-5 space-y-3">{Array.from({length:6}).map((_,i)=><Sk key={i}/>)}</div>
    </div>
  );

  if (cuentas.length === 0) return (
    <div className="py-16 text-center">
      <BookOpen className="w-8 h-8 text-[#334155] mx-auto mb-3" />
      <p className="text-sm text-[#475569]">Sin movimientos registrados todavía</p>
    </div>
  );

  const cuenta = cuentas[Math.min(idx, cuentas.length - 1)];
  const totalDebe  = cuenta.movs.reduce((s, m) => s + m.debe, 0);
  const totalHaber = cuenta.movs.reduce((s, m) => s + m.haber, 0);
  const saldo = cuenta.tipo === "activo" ? totalDebe - totalHaber : totalHaber - totalDebe;

  let acum = 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-5">
      <div className="bg-[#0C1424] border border-white/[0.06] rounded-xl overflow-hidden">
        <p className="px-4 py-3 text-[10px] font-bold text-[#475569] uppercase tracking-widest border-b border-white/[0.06]">Plan de cuentas</p>
        {cuentas.map((c, i) => {
          const d = c.movs.reduce((s, m) => s + m.debe, 0);
          const h = c.movs.reduce((s, m) => s + m.haber, 0);
          const s = c.tipo === "activo" ? d - h : h - d;
          return (
            <button key={c.codigo} onClick={() => setIdx(i)}
              className={`w-full flex items-center justify-between px-4 py-3 text-left border-b border-white/[0.03] transition-colors ${i === idx ? "bg-[#3B82F6]/[0.10]" : "hover:bg-white/[0.03]"}`}>
              <div>
                <p className={`text-[12px] font-semibold ${i === idx ? "text-[#60A5FA]" : "text-[#E2E8F0]"}`}>{c.nombre}</p>
                <p className="text-[10px] text-[#475569] mt-0.5">{c.codigo}</p>
              </div>
              <p className={`text-[11px] font-mono font-bold shrink-0 pl-2 ${s >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}>{formatARS(Math.abs(s))}</p>
            </button>
          );
        })}
      </div>

      <div className="bg-[#0C1424] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div><h3 className="text-sm font-bold text-[#F1F5F9]">{cuenta.nombre}</h3><p className="text-[11px] text-[#475569] mt-0.5">Cuenta {cuenta.codigo} · {cuenta.movs.length} movimientos</p></div>
          <div className="text-right"><p className="text-[10px] text-[#475569]">Saldo</p><p className={`text-lg font-black font-mono ${saldo >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}>{formatARS(Math.abs(saldo))}</p></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.04] bg-white/[0.02]">
                {["Fecha", "Concepto", "Debe", "Haber", "Saldo"].map((h) => (
                  <th key={h} className="text-left text-[11px] font-medium text-[#475569] px-4 py-2.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cuenta.movs.map((m, i) => {
                const delta = cuenta.tipo === "activo" ? m.debe - m.haber : m.haber - m.debe;
                acum += delta;
                return (
                  <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-[12px] text-[#94A3B8] whitespace-nowrap">{m.fecha}</td>
                    <td className="px-4 py-3 text-[13px] text-[#E2E8F0]">{m.concepto}</td>
                    <td className="px-4 py-3 font-mono text-[12px] text-[#10B981] text-right">{m.debe > 0 ? formatARS(m.debe) : "—"}</td>
                    <td className="px-4 py-3 font-mono text-[12px] text-[#EF4444] text-right">{m.haber > 0 ? formatARS(m.haber) : "—"}</td>
                    <td className="px-4 py-3 font-mono text-[12px] font-semibold text-right" style={{ color: acum >= 0 ? "#F1F5F9" : "#EF4444" }}>{formatARS(Math.abs(acum))}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-white/[0.02]">
                <td colSpan={2} className="px-4 py-3 text-[12px] font-semibold text-[#94A3B8]">Totales</td>
                <td className="px-4 py-3 font-mono text-[12px] font-bold text-[#10B981] text-right">{formatARS(totalDebe)}</td>
                <td className="px-4 py-3 font-mono text-[12px] font-bold text-[#EF4444] text-right">{formatARS(totalHaber)}</td>
                <td className="px-4 py-3 font-mono text-[12px] font-bold text-right" style={{ color: saldo >= 0 ? "#10B981" : "#EF4444" }}>{formatARS(Math.abs(saldo))}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ── ESTADO DE RESULTADOS ────────────────────────────────── */
function PctBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5 justify-end">
      <span className="text-[11px] font-mono w-10 text-right" style={{ color }}>{pct.toFixed(1)}%</span>
      <div className="w-16 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${Math.min(Math.abs(pct), 100)}%`, background: color }} />
      </div>
    </div>
  );
}

function EstadoResultados({ data, loading }: { data: AppData | null; loading: boolean }) {
  const [periodo, setPeriodo] = useState<"mes" | "ytd">("mes");

  const pnl = data?.pnl ?? [];
  const expenses = data?.expenses ?? [];

  const mes = pnl[pnl.length - 1];

  const ytd = pnl.reduce((acc, r) => ({
    ingresos:     acc.ingresos    + Number(r.ingresos),
    cogs:         acc.cogs        + Number(r.cogs),
    cm1:          acc.cm1         + Number(r.cm1),
    marketing:    acc.marketing   + Number(r.marketing),
    logistica:    acc.logistica   + Number(r.logistica),
    cm2:          acc.cm2         + Number(r.cm2),
    gastos_fijos: acc.gastos_fijos+ Number(r.gastos_fijos),
    cm3:          acc.cm3         + Number(r.cm3),
  }), { ingresos: 0, cogs: 0, cm1: 0, marketing: 0, logistica: 0, cm2: 0, gastos_fijos: 0, cm3: 0 });

  const d = periodo === "mes" ? (mes ?? { ingresos: 0, cogs: 0, cm1: 0, marketing: 0, logistica: 0, cm2: 0, gastos_fijos: 0, cm3: 0 }) : ytd;

  const base    = d.ingresos;
  const pct     = (v: number) => base > 0 ? (v / base) * 100 : 0;

  const fixedExps = expenses.filter((e) => e.type === "fixed").map((e) => ({
    nombre: e.name,
    valor: e.frequency === "monthly" ? e.amount : e.frequency === "quarterly" ? e.amount / 3 : e.amount / 12,
  }));

  const periodoLabel = periodo === "mes"
    ? (mes ? mesLabel(mes.mes) : "—")
    : pnl.length > 0 ? `${mesLabel(pnl[0].mes)} – ${mesLabel(pnl[pnl.length - 1].mes)}` : "—";

  if (loading) return (
    <div className="space-y-3">
      {Array.from({ length: 8 }).map((_, i) => <Sk key={i} h={i % 3 === 2 ? "h-10" : "h-6"} />)}
    </div>
  );

  if (!mes && periodo === "mes") return (
    <div className="py-16 text-center">
      <TrendingUp className="w-8 h-8 text-[#334155] mx-auto mb-3" />
      <p className="text-sm text-[#475569]">Sin datos del mes actual todavía</p>
    </div>
  );

  type Fila = { label: string; valor: number; isTotal?: boolean; isSub?: boolean; indent?: boolean; color?: string };

  const filas: Fila[] = [
    { label: "Ventas",                  valor: d.ingresos },
    { label: "= Ventas Netas",          valor: d.ingresos,     isSub: true, color: "#F1F5F9" },
    { label: "Costo de mercadería",     valor: -d.cogs,        indent: true },
    { label: "= Resultado Bruto",       valor: d.cm1,          isSub: true, color: "#10B981" },
    { label: "Marketing / Publicidad",  valor: -d.marketing,   indent: true },
    { label: "Logística y envíos",      valor: -d.logistica,   indent: true },
    { label: "= Margen Operativo",      valor: d.cm2,          isSub: true, color: "#3B82F6" },
    ...fixedExps.slice(0, 6).map((e): Fila => ({ label: e.nombre, valor: -e.valor, indent: true })),
    ...(fixedExps.length > 6 ? [{ label: `+ ${fixedExps.length - 6} gastos más`, valor: -(d.gastos_fijos - fixedExps.slice(0, 6).reduce((s, e) => s + e.valor, 0)), indent: true } as Fila] : []),
    { label: "= Resultado Neto",        valor: d.cm3,          isTotal: true, color: d.cm3 >= 0 ? "#10B981" : "#EF4444" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {([["mes", "Mes actual"] , ["ytd", "Acumulado"]] as const).map(([k, lbl]) => (
          <button key={k} onClick={() => setPeriodo(k)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
              periodo === k ? "bg-[#8B5CF6]/20 text-[#A78BFA] border border-[#8B5CF6]/30" : "bg-white/[0.04] text-[#475569] hover:text-[#94A3B8]"
            }`}>
            {lbl} {k === "mes" && mes ? `(${mesLabel(mes.mes)})` : k === "ytd" && pnl.length > 0 ? `(${pnl.length} meses)` : ""}
          </button>
        ))}
        <span className="text-[11px] text-[#334155] ml-2">{periodoLabel}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-5">
        {/* Tabla */}
        <div className="bg-[#080E1A] border border-white/[0.06] rounded-xl overflow-hidden">
          <div className="grid grid-cols-[1fr_140px_120px] border-b border-white/[0.06] bg-white/[0.02]">
            <p className="px-5 py-2.5 text-[11px] font-medium text-[#475569]">Concepto</p>
            <p className="px-5 py-2.5 text-[11px] font-medium text-[#475569] text-right">Importe</p>
            <p className="px-5 py-2.5 text-[11px] font-medium text-[#475569]">% ventas</p>
          </div>

          {/* Sección ingresos */}
          <p className="px-5 pt-4 pb-1 text-[10px] font-bold text-[#475569] uppercase tracking-widest">Ingresos</p>
          <table className="w-full">
            <tbody>
              {filas.map((f, i) => {
                const color = f.color ?? (f.valor >= 0 ? "#F1F5F9" : "#94A3B8");
                const p = pct(f.valor);
                const headers: Record<number, string> = { 2: "Costo de ventas", 4: "Gastos operativos", 7: "Gastos fijos" };
                return (
                  <Fragment key={i}>
                    {headers[i] && (
                      <tr><td colSpan={3} className="px-5 pt-4 pb-1"><p className="text-[10px] font-bold text-[#475569] uppercase tracking-widest">{headers[i]}</p></td></tr>
                    )}
                    <tr className={`border-b border-white/[0.03] ${f.isTotal ? "bg-white/[0.03]" : "hover:bg-white/[0.02]"}`}>
                      <td className={`px-5 py-2.5 ${f.isTotal ? "font-bold" : f.isSub ? "font-semibold" : ""} ${f.indent ? "pl-10" : ""}`}>
                        <span className={`text-[13px] ${f.isTotal ? "text-[#F1F5F9]" : f.isSub ? "text-[#E2E8F0]" : "text-[#94A3B8]"}`}>{f.label}</span>
                      </td>
                      <td className="px-5 py-2.5 text-right">
                        <span className={`text-[13px] font-mono ${f.isTotal ? "font-bold text-base" : "font-semibold"}`} style={{ color }}>
                          {f.valor < 0 && !f.isTotal ? `(${formatARS(Math.abs(f.valor))})` : formatARS(Math.abs(f.valor))}
                        </span>
                      </td>
                      <td className="px-5 py-2.5">
                        {(f.isSub || f.isTotal) && <PctBar pct={Math.abs(p)} color={color} />}
                      </td>
                    </tr>
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Panel lateral */}
        <div className="space-y-3">
          {[
            { label: "Ventas",             valor: d.ingresos, color: "#F1F5F9", p: 100 },
            { label: "Resultado Bruto",    valor: d.cm1,      color: "#10B981", p: Math.round(pct(d.cm1)) },
            { label: "Margen Operativo",   valor: d.cm2,      color: "#3B82F6", p: Math.round(pct(d.cm2)) },
            { label: "Resultado Neto",     valor: d.cm3,      color: d.cm3 >= 0 ? "#8B5CF6" : "#EF4444", p: Math.round(pct(d.cm3)) },
          ].map((item) => (
            <div key={item.label} className="bg-[#080E1A] border border-white/[0.06] rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] text-[#475569]">{item.label}</p>
                <span className="text-[11px] font-bold font-mono px-1.5 py-0.5 rounded" style={{ color: item.color, background: `${item.color}15` }}>{item.p}%</span>
              </div>
              <p className="text-base font-black font-mono" style={{ color: item.color }}>{formatARS(item.valor)}</p>
              <div className="mt-2 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${Math.min(Math.abs(item.p), 100)}%`, background: item.color }} />
              </div>
            </div>
          ))}

          {/* Cascada */}
          <div className="bg-[#080E1A] border border-white/[0.06] rounded-xl p-4">
            <p className="text-[10px] font-bold text-[#475569] uppercase tracking-widest mb-3">Cascada de márgenes</p>
            {[
              { label: "−CMV",        pct: Math.round(pct(-d.cogs)),                           color: "#EF4444" },
              { label: "−Marketing",  pct: Math.round(pct(-d.marketing)),                      color: "#F59E0B" },
              { label: "−Logística",  pct: Math.round(pct(-d.logistica)),                      color: "#F97316" },
              { label: "−Gtos fijos", pct: Math.round(pct(-d.gastos_fijos)),                   color: "#6366F1" },
              { label: "= Neto",      pct: Math.round(pct(d.cm3)), positive: d.cm3 >= 0,       color: "#8B5CF6" },
            ].map((r) => (
              <div key={r.label} className="flex items-center gap-2 mb-1.5">
                <p className="text-[11px] text-[#475569] w-24 shrink-0">{r.label}</p>
                <div className="flex-1 h-4 bg-white/[0.04] rounded overflow-hidden">
                  <div className="h-full rounded flex items-center justify-end pr-1.5" style={{ width: `${Math.min(Math.abs(r.pct), 100)}%`, background: `${r.color}40` }}>
                    <span className="text-[9px] font-mono font-bold" style={{ color: r.color }}>{Math.abs(r.pct)}%</span>
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
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AppData | null>(null);
  const [tab, setTab] = useState<"balance" | "mayor" | "resultados">("balance");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    async function load() {
      try {
        const [pnlRes, expRes, ordRes, purRes, lineRes, invVal] = await Promise.all([
          getPnlMonthly(user!.id, 12),
          getExpenses(user!.id),
          getOrders(user!.id, { limit: 500 }),
          getPurchases(user!.id, { months: 12 }),
          getAnalyticLines(user!.id),
          getInventoryValue(user!.id),
        ]);
        if (cancelled) return;
        setData({
          pnl:            (pnlRes.data ?? []).map((r: PnlRow) => ({ ...r, ingresos: Number(r.ingresos), cogs: Number(r.cogs), cm1: Number(r.cm1), cm1_pct: Number(r.cm1_pct), marketing: Number(r.marketing), logistica: Number(r.logistica), cm2: Number(r.cm2), cm2_pct: Number(r.cm2_pct), gastos_fijos: Number(r.gastos_fijos), cm3: Number(r.cm3), cm3_pct: Number(r.cm3_pct) })),
          expenses:       (expRes.data ?? []) as Expense[],
          orders:         ((ordRes as { data: Order[] | null }).data ?? []),
          purchases:      (purRes.data ?? []) as Purchase[],
          lines:          (lineRes.data ?? []) as Line[],
          inventoryValue: invVal,
        });
      } catch (err) {
        console.error("Contabilidad load error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [user]);

  const pnl  = data?.pnl ?? [];
  const mes  = pnl[pnl.length - 1];
  const totalActivo = (() => {
    const cm3Total = pnl.reduce((s, r) => s + r.cm3, 0);
    const inv      = data?.inventoryValue ?? 0;
    const cliPend  = (data?.orders ?? []).filter((o) => o.payment_state === "pending").reduce((s, o) => s + Number(o.amount_total), 0);
    return Math.max(cm3Total, 0) + inv + cliPend;
  })();
  const totalPasivo  = (data?.purchases ?? []).filter((p) => p.state !== "received" && p.state !== "invoiced" && p.state !== "cancelled").reduce((s, p) => s + Number(p.amount_total), 0);
  const totalPN      = totalActivo - totalPasivo;

  const tabs = [
    { key: "balance",    label: "Balance General" },
    { key: "mayor",      label: "Libro Mayor" },
    { key: "resultados", label: "Estado de Resultados" },
  ] as const;

  return (
    <div className="p-6 pb-12 space-y-6 max-w-[1400px]">
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-bold text-[#F1F5F9] tracking-tight">Contabilidad</h1>
        </div>
        <p className="text-sm text-[#64748B] mt-1">Balance General · Libro Mayor · Estado de Resultados</p>
      </div>

      {/* KPI rápidos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="bg-[#0C1424] border border-white/[0.06] rounded-xl p-4 space-y-3"><Sk h="h-3" w="w-24" /><Sk h="h-7" w="w-36" /></div>)
          : [
              { label: "Total Activo",    value: formatARS(totalActivo),  icon: TrendingUp,   color: "#10B981" },
              { label: "Total Pasivo",    value: formatARS(totalPasivo),  icon: TrendingDown, color: "#EF4444" },
              { label: "Patrimonio Neto", value: formatARS(totalPN),      icon: BookOpen,     color: "#8B5CF6" },
              { label: "Resultado Neto",  value: mes ? `${Number(mes.cm3_pct).toFixed(1)}%` : "—", icon: Minus, color: "#3B82F6",
                sub: mes ? formatARS(Number(mes.cm3)) : "" },
            ].map((k) => {
              const Icon = k.icon;
              return (
                <div key={k.label} className="bg-[#0C1424] border border-white/[0.06] rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-3.5 h-3.5" style={{ color: k.color }} />
                    <p className="text-[11px] text-[#475569]">{k.label}</p>
                  </div>
                  <p className="text-xl font-black font-mono" style={{ color: k.color }}>{k.value}</p>
                  {(k as { sub?: string }).sub && <p className="text-[11px] text-[#475569] mt-0.5 font-mono">{(k as { sub?: string }).sub}</p>}
                </div>
              );
            })}
      </div>

      {/* Tabs */}
      <div className="bg-[#0C1424] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="flex border-b border-white/[0.06]">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-6 py-3.5 text-sm font-semibold transition-colors ${tab === t.key ? "text-[#F1F5F9] border-b-2 border-[#8B5CF6]" : "text-[#475569] hover:text-[#94A3B8]"}`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="p-5">
          {tab === "balance"    && <BalanceGeneral       data={data} loading={loading} />}
          {tab === "mayor"      && <LibroMayor           data={data} loading={loading} />}
          {tab === "resultados" && <EstadoResultados     data={data} loading={loading} />}
        </div>
      </div>
    </div>
  );
}
