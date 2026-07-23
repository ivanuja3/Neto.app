"use client";

import Link from "next/link";
import { useState, useMemo, useEffect } from "react";
import {
  Calculator, ArrowRight, ArrowLeft, TrendingUp, ShieldAlert,
  RefreshCw, Info, Sun, Moon,
} from "lucide-react";

const G = "#10B981";
const R = "#EF4444";
const THEME_KEY = "neto_landing_theme";

type Escenario = "tres_cuotas" | "sin_cuotas" | "contra_entrega";

const TABS: { id: Escenario; label: string }[] = [
  { id: "tres_cuotas",    label: "3 cuotas" },
  { id: "sin_cuotas",     label: "Sin cuotas" },
  { id: "contra_entrega", label: "Contra entrega" },
];

/* Defaults por escenario — todos editables */
const DEFAULTS: Record<Escenario, Record<string, string>> = {
  tres_cuotas:    { comisionMP: "9",    ivaComision: "21", cuotaSimple: "10", comisionTN: "2", cpaObjetivoUSD: "7", impuestos: "3" },
  sin_cuotas:     { comisionMP: "6.29", ivaComision: "21", comisionTN: "2", cpaObjetivoUSD: "7", impuestos: "3" },
  contra_entrega: { cpaObjetivoARS: "4500", pctEntrega: "30", impuestos: "3" },
};

function formatARS(n: number) {
  if (!isFinite(n)) return "—";
  return n.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
}
function formatUSD(n: number) {
  if (!isFinite(n)) return "—";
  return "US$ " + n.toLocaleString("en-US", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
}

function Field({ label, value, onChange, suffix }: { label: string; value: string; onChange: (v: string) => void; suffix?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[var(--neto-text2)] mb-1.5">{label}</label>
      <div className="relative">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border border-[rgba(var(--neto-line-rgb),0.08)] text-[var(--neto-text)] rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#10B981]/50 transition-colors"
          style={{ background: "var(--neto-bg)" }}
        />
        {suffix && <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-[var(--neto-text4)]">{suffix}</span>}
      </div>
    </div>
  );
}

function LineaResultado({ label, ars, usd, negativo, destacado }: { label: string; ars: number; usd: number; negativo?: boolean; destacado?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-2 ${destacado ? "border-t border-[rgba(var(--neto-line-rgb),0.08)] mt-1 pt-3" : ""}`}>
      <span className={`text-xs ${destacado ? "font-bold text-[var(--neto-text)]" : "text-[var(--neto-text3)]"}`}>{label}</span>
      <div className="text-right">
        <p className={`text-sm font-mono font-semibold ${destacado ? (negativo ? "text-[#EF4444]" : "text-[#10B981]") : "text-[var(--neto-text)]"}`}>
          {negativo && ars > 0 ? "-" : ""}{formatARS(Math.abs(ars))}
        </p>
        <p className="text-[10px] font-mono text-[var(--neto-text4)]">{formatUSD(usd)}</p>
      </div>
    </div>
  );
}

export default function RecursosPage() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") setTheme(saved);
  }, []);
  function toggleTheme() {
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      localStorage.setItem(THEME_KEY, next);
      return next;
    });
  }

  /* Dólar blue — se busca solo, editable */
  const [dolar, setDolar] = useState("1560");
  const [dolarCargando, setDolarCargando] = useState(true);
  const [dolarError, setDolarError] = useState(false);

  useEffect(() => {
    fetch("https://dolarapi.com/v1/dolares/blue")
      .then((r) => r.json())
      .then((d) => { if (d?.venta) setDolar(String(d.venta)); })
      .catch(() => setDolarError(true))
      .finally(() => setDolarCargando(false));
  }, []);

  /* Escenario activo */
  const [tab, setTab] = useState<Escenario>("tres_cuotas");

  /* Base compartida */
  const [precioVenta, setPrecioVenta] = useState("87990");
  const [producto, setProducto]       = useState("30000");
  const [packaging, setPackaging]     = useState("3000");
  const [envio, setEnvio]             = useState("5000");

  /* Campos por escenario (se resetean a default al cambiar de tab) */
  const [campos, setCampos] = useState<Record<string, string>>(DEFAULTS.tres_cuotas);

  function cambiarTab(t: Escenario) {
    setTab(t);
    setCampos(DEFAULTS[t]);
  }
  function setCampo(k: string, v: string) {
    setCampos((c) => ({ ...c, [k]: v }));
  }

  const dolarNum = Number(dolar) || 1;
  const toUSD = (ars: number) => ars / dolarNum;

  const r = useMemo(() => {
    const pv   = Number(precioVenta) || 0;
    const prod = Number(producto) || 0;
    const pack = Number(packaging) || 0;
    const env  = Number(envio) || 0;

    if (tab === "contra_entrega") {
      const cpaObjetivo = Number(campos.cpaObjetivoARS) || 0;
      const pctEntrega  = Number(campos.pctEntrega) || 0;
      const cpaReal     = pctEntrega > 0 ? cpaObjetivo / (pctEntrega / 100) : NaN;
      const gastosBase  = prod + pack + env;
      const ganancia    = pv - gastosBase - cpaReal;
      const cpaBreakEven = pv - gastosBase;
      const impuestosPct = Number(campos.impuestos) || 0;
      const impuestos = pv * (impuestosPct / 100);
      const gananciaConImpuestos = ganancia - impuestos;
      const pctGananciaConImpuestos = pv > 0 ? (gananciaConImpuestos / pv) * 100 : NaN;
      const cpaBreakEvenConImpuestos = cpaBreakEven - impuestos;
      return {
        pv, prod, pack, env, pctEntrega, cpaReal, impuestos,
        ganancia: gananciaConImpuestos, pctGanancia: pctGananciaConImpuestos, cpaBreakEven: cpaBreakEvenConImpuestos,
        llegaAMiMP: pv, comisionMP: 0, ivaMP: 0, comisionTN: 0, cuotaSimple: 0, ivaCuota: 0,
        cpaObjetivoARS: cpaObjetivo,
      };
    }

    const comisionMPpct  = Number(campos.comisionMP) || 0;
    const ivaPct         = Number(campos.ivaComision) || 0;
    const comisionTNpct  = Number(campos.comisionTN) || 0;
    const impuestosPct   = Number(campos.impuestos) || 0;
    const cpaObjetivoUSD = Number(campos.cpaObjetivoUSD) || 0;
    const cpaObjetivoARS = cpaObjetivoUSD * dolarNum;

    const comisionMP = pv * (comisionMPpct / 100);
    const ivaMP       = comisionMP * (ivaPct / 100);
    const comisionTN = pv * (comisionTNpct / 100);
    const impuestos   = pv * (impuestosPct / 100);

    let cuotaSimple = 0, ivaCuota = 0;
    if (tab === "tres_cuotas") {
      const cuotaPct = Number(campos.cuotaSimple) || 0;
      cuotaSimple = (pv - comisionTN) * (cuotaPct / 100);
      ivaCuota    = cuotaSimple * (ivaPct / 100);
    }

    const llegaAMiMP = pv - comisionMP - ivaMP - cuotaSimple - ivaCuota - comisionTN - impuestos;
    const gastosBase = prod + pack + env;
    const ganancia   = llegaAMiMP - gastosBase - cpaObjetivoARS;
    const pctGanancia = pv > 0 ? (ganancia / pv) * 100 : NaN;
    const cpaBreakEven = llegaAMiMP - gastosBase;

    return {
      pv, prod, pack, env, comisionMP, ivaMP, comisionTN, cuotaSimple, ivaCuota, impuestos,
      llegaAMiMP, cpaObjetivoARS, ganancia, pctGanancia, cpaBreakEven,
      pctEntrega: 0, cpaReal: 0,
    };
  }, [tab, campos, precioVenta, producto, packaging, envio, dolarNum]);

  const esNegativo = r.ganancia < 0;

  return (
    <div data-theme={theme} className="min-h-screen text-[var(--neto-text)] transition-colors duration-300" style={{ background: "var(--neto-bg)" }}>
      <header className="border-b border-[rgba(var(--neto-line-rgb),0.06)] px-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg tracking-tight">
            <span className="w-7 h-7 rounded-lg flex items-center justify-center text-[#080E1A] font-black text-sm" style={{ background: G }}>N</span>
            <span><span className="text-[var(--neto-text)]">Neto</span><span style={{ color: G }}>.app</span></span>
          </Link>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--neto-text2)] hover:text-[var(--neto-text)] hover:bg-[rgba(var(--neto-line-rgb),0.06)] transition-colors"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <Link href="/signup" className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg text-[#080E1A] btn-neto" style={{ background: G }}>
              Empezar gratis <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-5 py-12">
        <Link href="/recursos" className="inline-flex items-center gap-1.5 text-sm text-[var(--neto-text2)] hover:text-[var(--neto-text)] transition-colors mb-6">
          <ArrowLeft className="w-3.5 h-3.5" /> Volver a Recursos
        </Link>

        <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[rgba(var(--neto-line-rgb),0.08)] bg-[rgba(var(--neto-line-rgb),0.04)] text-[12px] text-[var(--neto-text2)]">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: G }} />
            Gratis · sin registro
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[rgba(var(--neto-line-rgb),0.08)] bg-[rgba(var(--neto-line-rgb),0.04)] text-[12px] text-[var(--neto-text2)]">
            {dolarCargando ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: dolarError ? "#F59E0B" : G }} />
            )}
            Dólar blue: <span className="font-mono font-semibold text-[var(--neto-text)]">${dolar}</span>
            <input
              type="number"
              value={dolar}
              onChange={(e) => setDolar(e.target.value)}
              className="w-16 bg-transparent border-b border-[rgba(var(--neto-line-rgb),0.15)] text-[var(--neto-text)] text-xs outline-none focus:border-[#10B981]/50 ml-1"
            />
          </div>
        </div>

        <h1 className="text-3xl lg:text-4xl font-black tracking-tight mb-3">
          Calculadora de <span style={{ color: G }}>rentabilidad real</span>
        </h1>
        <p className="text-[16px] text-[var(--neto-text2)] max-w-2xl mb-8">
          Comisión de Mercado Pago, IVA sobre la comisión, Tienda Nube, cuotas y contra entrega — la cuenta completa
          en pesos y dólares, no solo el margen bruto.
        </p>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => cambiarTab(t.id)}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
              style={
                tab === t.id
                  ? { background: G, color: "#080E1A" }
                  : { background: "rgba(var(--neto-line-rgb),0.05)", color: "var(--neto-text2)" }
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Formulario */}
          <div className="rounded-2xl border border-[rgba(var(--neto-line-rgb),0.06)] bg-[var(--neto-bg2)] p-6 card-lift">
            <h2 className="text-sm font-bold text-[var(--neto-text)] mb-5">Tus números</h2>

            <div className="space-y-4">
              <Field label="Precio de venta" value={precioVenta} onChange={setPrecioVenta} suffix="ARS" />

              <div className="grid grid-cols-2 gap-3">
                <Field label="Costo del producto" value={producto} onChange={setProducto} suffix="ARS" />
                <Field
                  label={tab === "contra_entrega" ? "Packaging + confirmaciones" : "Packaging"}
                  value={packaging} onChange={setPackaging} suffix="ARS"
                />
              </div>

              <Field label="Envío" value={envio} onChange={setEnvio} suffix="ARS" />

              <div className="pt-2 border-t border-[rgba(var(--neto-line-rgb),0.06)] space-y-4">
                {tab !== "contra_entrega" ? (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Comisión pasarela" value={campos.comisionMP} onChange={(v) => setCampo("comisionMP", v)} suffix="%" />
                      <Field label="IVA sobre comisión" value={campos.ivaComision} onChange={(v) => setCampo("ivaComision", v)} suffix="%" />
                    </div>
                    {tab === "tres_cuotas" && (
                      <Field label="Costo 3 cuotas" value={campos.cuotaSimple} onChange={(v) => setCampo("cuotaSimple", v)} suffix="%" />
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Comisión tienda" value={campos.comisionTN} onChange={(v) => setCampo("comisionTN", v)} suffix="%" />
                      <Field label="CPA objetivo (ads)" value={campos.cpaObjetivoUSD} onChange={(v) => setCampo("cpaObjetivoUSD", v)} suffix="USD" />
                    </div>
                    <Field label="Impuestos" value={campos.impuestos} onChange={(v) => setCampo("impuestos", v)} suffix="%" />
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="CPA objetivo (Meta)" value={campos.cpaObjetivoARS} onChange={(v) => setCampo("cpaObjetivoARS", v)} suffix="ARS" />
                    <Field label="% de entrega estimado" value={campos.pctEntrega} onChange={(v) => setCampo("pctEntrega", v)} suffix="%" />
                    <Field label="Impuestos" value={campos.impuestos} onChange={(v) => setCampo("impuestos", v)} suffix="%" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Resultado */}
          <div className="rounded-2xl border border-[rgba(var(--neto-line-rgb),0.06)] bg-[var(--neto-bg2)] p-6 card-lift">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-[var(--neto-text)]">Resultado</h2>
              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full" style={{ background: `${G}18`, color: G }}>
                En vivo
              </span>
            </div>

            {/* Ganancia grande */}
            <div className="rounded-xl p-4 mb-4 border" style={{
              background: esNegativo ? `${R}0C` : `${G}0C`,
              borderColor: esNegativo ? `${R}30` : `${G}30`,
            }}>
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp className="w-3.5 h-3.5" style={{ color: esNegativo ? R : G }} />
                <p className="text-[11px] text-[var(--neto-text2)]">Ganancia neta por venta</p>
              </div>
              <p className="text-2xl font-black font-mono" style={{ color: esNegativo ? R : G }}>
                {esNegativo ? "-" : ""}{formatARS(Math.abs(r.ganancia))}
                <span className="text-sm font-normal text-[var(--neto-text3)] ml-2">({formatUSD(toUSD(Math.abs(r.ganancia)))})</span>
              </p>
              <p className="text-xs text-[var(--neto-text3)] mt-1">
                {isFinite(r.pctGanancia) ? `${r.pctGanancia.toFixed(1)}% sobre precio de venta` : "—"}
              </p>
            </div>

            {/* Desglose */}
            <div className="divide-y divide-[rgba(var(--neto-line-rgb),0.04)]">
              {tab !== "contra_entrega" ? (
                <>
                  <LineaResultado label="Precio de venta" ars={r.pv} usd={toUSD(r.pv)} />
                  <LineaResultado label="Comisión pasarela" ars={r.comisionMP} usd={toUSD(r.comisionMP)} negativo />
                  <LineaResultado label="IVA sobre comisión" ars={r.ivaMP} usd={toUSD(r.ivaMP)} negativo />
                  {tab === "tres_cuotas" && (
                    <>
                      <LineaResultado label="Costo 3 cuotas" ars={r.cuotaSimple} usd={toUSD(r.cuotaSimple)} negativo />
                      <LineaResultado label="IVA sobre costo 3 cuotas" ars={r.ivaCuota} usd={toUSD(r.ivaCuota)} negativo />
                    </>
                  )}
                  <LineaResultado label="Comisión tienda" ars={r.comisionTN} usd={toUSD(r.comisionTN)} negativo />
                  <LineaResultado label="Impuestos" ars={r.impuestos} usd={toUSD(r.impuestos)} negativo />
                  <LineaResultado label="Llega a mi cuenta" ars={r.llegaAMiMP} usd={toUSD(r.llegaAMiMP)} destacado />
                  <LineaResultado label="Producto + packaging + envío" ars={r.prod + r.pack + r.env} usd={toUSD(r.prod + r.pack + r.env)} negativo />
                  <LineaResultado label="CPA objetivo (ads)" ars={r.cpaObjetivoARS} usd={toUSD(r.cpaObjetivoARS)} negativo />
                </>
              ) : (
                <>
                  <LineaResultado label="Precio de venta" ars={r.pv} usd={toUSD(r.pv)} />
                  <LineaResultado label="Producto + packaging + envío" ars={r.prod + r.pack + r.env} usd={toUSD(r.prod + r.pack + r.env)} negativo />
                  <LineaResultado label="CPA real estimado (objetivo ÷ % entrega)" ars={r.cpaReal} usd={toUSD(r.cpaReal)} negativo />
                  <LineaResultado label="Impuestos" ars={r.impuestos} usd={toUSD(r.impuestos)} negativo />
                </>
              )}
              <LineaResultado label="CPA break even (máximo posible)" ars={r.cpaBreakEven} usd={toUSD(r.cpaBreakEven)} destacado />
              <div className="flex items-center justify-between py-2 border-t border-[rgba(var(--neto-line-rgb),0.08)] mt-1 pt-3">
                <span className="text-xs font-bold text-[var(--neto-text)]">Ganancia real por producto</span>
                <div className="text-right">
                  <p className="text-sm font-mono font-bold" style={{ color: esNegativo ? R : G }}>
                    {esNegativo ? "-" : ""}{formatARS(Math.abs(r.ganancia))}
                  </p>
                  <p className="text-[10px] font-mono text-[var(--neto-text4)]">{formatUSD(toUSD(Math.abs(r.ganancia)))}</p>
                </div>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-xs font-bold text-[var(--neto-text)]">Porcentaje de ganancia</span>
                <span className="text-sm font-mono font-bold" style={{ color: esNegativo ? R : G }}>
                  {isFinite(r.pctGanancia) ? `${r.pctGanancia.toFixed(1)}%` : "—"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Explicación */}
        <div className="mt-6 rounded-xl border border-[rgba(var(--neto-line-rgb),0.06)] bg-[rgba(var(--neto-line-rgb),0.02)] p-5 flex items-start gap-3">
          <Info className="w-4 h-4 text-[var(--neto-text4)] mt-0.5 shrink-0" />
          <div className="text-xs text-[var(--neto-text3)] leading-relaxed space-y-1.5">
            <p><span className="font-semibold text-[var(--neto-text2)]">CPA (Costo por Adquisición):</span> lo que invertís en publicidad para generar una venta.</p>
            <p><span className="font-semibold text-[var(--neto-text2)]">CPA Break Even:</span> el máximo que podés invertir en ads por venta sin ganar ni perder plata.</p>
          </div>
        </div>

        {/* Volver al hub */}
        <div className="mt-10">
          <Link href="/recursos" className="inline-flex items-center gap-1.5 text-sm font-semibold hover:opacity-80 transition-opacity" style={{ color: G }}>
            Ver todas las calculadoras gratis <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* CTA final */}
        <div className="mt-10 rounded-2xl border p-6 flex flex-col sm:flex-row items-center justify-between gap-4 card-lift"
          style={{ background: `${G}08`, borderColor: `${G}30` }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${G}18` }}>
              <Calculator className="w-5 h-5" style={{ color: G }} />
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--neto-text)]">¿Querés esto calculado solo, en cada venta?</p>
              <p className="text-xs text-[var(--neto-text3)] mt-0.5">Neto lo hace automático para todo tu catálogo, todos los meses — 14 días gratis.</p>
            </div>
          </div>
          <Link href="/signup" className="flex items-center justify-center gap-2 text-sm font-bold px-5 py-2.5 rounded-xl text-[#080E1A] btn-neto shrink-0" style={{ background: G }}>
            Empezar gratis <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <footer className="border-t border-[rgba(var(--neto-line-rgb),0.05)] py-8 px-5 mt-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm font-bold">
            <span className="w-6 h-6 rounded-md flex items-center justify-center text-[#080E1A] font-black text-xs" style={{ background: G }}>N</span>
            <span><span className="text-[var(--neto-text)]">Neto</span><span style={{ color: G }}>.app</span></span>
            <span className="text-[var(--neto-text5)] font-normal ml-2 text-xs">© {new Date().getFullYear()} — Hecho con ♥ en Argentina</span>
          </div>
          <div className="flex items-center gap-5 text-[13px] text-[var(--neto-text4)]">
            <Link href="/terminos" className="hover:text-[var(--neto-text2)] transition-colors">Términos</Link>
            <Link href="/privacidad" className="hover:text-[var(--neto-text2)] transition-colors">Privacidad</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
