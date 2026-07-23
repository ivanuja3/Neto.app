"use client";

import Link from "next/link";
import { useState, useMemo, useEffect } from "react";
import {
  Calculator, ArrowRight, ArrowLeft, ArrowUpRight, TrendingUp, ShieldAlert,
  Megaphone, RefreshCw, Info,
} from "lucide-react";

const G = "#10B981";
const B = "#3B82F6";
const R = "#EF4444";

type Escenario = "tres_cuotas" | "sin_cuotas" | "contra_entrega";

const TABS: { id: Escenario; label: string }[] = [
  { id: "tres_cuotas",    label: "3 cuotas" },
  { id: "sin_cuotas",     label: "Sin cuotas" },
  { id: "contra_entrega", label: "Contra entrega" },
];

/* Defaults por escenario — todos editables */
const DEFAULTS: Record<Escenario, Record<string, string>> = {
  tres_cuotas:    { comisionMP: "9",    ivaComision: "21", cuotaSimple: "10", comisionTN: "2", cpaObjetivoUSD: "7" },
  sin_cuotas:     { comisionMP: "6.29", ivaComision: "21", comisionTN: "2", cpaObjetivoUSD: "7" },
  contra_entrega: { cpaObjetivoARS: "4500", pctEntrega: "30" },
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
      <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">{label}</label>
      <div className="relative">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-[#080E1A] border border-white/[0.08] text-[#F1F5F9] rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#10B981]/50 transition-colors"
        />
        {suffix && <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-[#475569]">{suffix}</span>}
      </div>
    </div>
  );
}

function LineaResultado({ label, ars, usd, negativo, destacado }: { label: string; ars: number; usd: number; negativo?: boolean; destacado?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-2 ${destacado ? "border-t border-white/[0.08] mt-1 pt-3" : ""}`}>
      <span className={`text-xs ${destacado ? "font-bold text-[#F1F5F9]" : "text-[#64748B]"}`}>{label}</span>
      <div className="text-right">
        <p className={`text-sm font-mono font-semibold ${destacado ? (negativo ? "text-[#EF4444]" : "text-[#10B981]") : "text-[#F1F5F9]"}`}>
          {negativo && ars > 0 ? "-" : ""}{formatARS(Math.abs(ars))}
        </p>
        <p className="text-[10px] font-mono text-[#475569]">{formatUSD(usd)}</p>
      </div>
    </div>
  );
}

export default function RecursosPage() {
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
      const pctGanancia = pv > 0 ? (ganancia / pv) * 100 : NaN;
      const cpaBreakEven = pv - gastosBase;
      return {
        pv, prod, pack, env, pctEntrega, cpaReal, ganancia, pctGanancia, cpaBreakEven,
        llegaAMiMP: pv, comisionMP: 0, ivaMP: 0, comisionTN: 0, cuotaSimple: 0, ivaCuota: 0,
        cpaObjetivoARS: cpaObjetivo,
      };
    }

    const comisionMPpct  = Number(campos.comisionMP) || 0;
    const ivaPct         = Number(campos.ivaComision) || 0;
    const comisionTNpct  = Number(campos.comisionTN) || 0;
    const cpaObjetivoUSD = Number(campos.cpaObjetivoUSD) || 0;
    const cpaObjetivoARS = cpaObjetivoUSD * dolarNum;

    const comisionMP = pv * (comisionMPpct / 100);
    const ivaMP       = comisionMP * (ivaPct / 100);
    const comisionTN = pv * (comisionTNpct / 100);

    let cuotaSimple = 0, ivaCuota = 0;
    if (tab === "tres_cuotas") {
      const cuotaPct = Number(campos.cuotaSimple) || 0;
      cuotaSimple = (pv - comisionTN) * (cuotaPct / 100);
      ivaCuota    = cuotaSimple * (ivaPct / 100);
    }

    const llegaAMiMP = pv - comisionMP - ivaMP - cuotaSimple - ivaCuota - comisionTN;
    const gastosBase = prod + pack + env;
    const ganancia   = llegaAMiMP - gastosBase - cpaObjetivoARS;
    const pctGanancia = pv > 0 ? (ganancia / pv) * 100 : NaN;
    const cpaBreakEven = llegaAMiMP - gastosBase;

    return {
      pv, prod, pack, env, comisionMP, ivaMP, comisionTN, cuotaSimple, ivaCuota,
      llegaAMiMP, cpaObjetivoARS, ganancia, pctGanancia, cpaBreakEven,
      pctEntrega: 0, cpaReal: 0,
    };
  }, [tab, campos, precioVenta, producto, packaging, envio, dolarNum]);

  const esNegativo = r.ganancia < 0;

  return (
    <div className="min-h-screen bg-[#080E1A] text-[#F1F5F9]">
      <header className="border-b border-white/[0.06] px-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg tracking-tight">
            <span className="w-7 h-7 rounded-lg flex items-center justify-center text-[#080E1A] font-black text-sm" style={{ background: G }}>N</span>
            <span><span className="text-[#F1F5F9]">Neto</span><span style={{ color: G }}>.app</span></span>
          </Link>
          <Link href="/signup" className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg text-[#080E1A] btn-neto" style={{ background: G }}>
            Empezar gratis <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-5 py-12">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-[#94A3B8] hover:text-[#F1F5F9] transition-colors mb-6">
          <ArrowLeft className="w-3.5 h-3.5" /> Volver a Neto.app
        </Link>

        <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] text-[12px] text-[#94A3B8]">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: G }} />
            Gratis · sin registro
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] text-[12px] text-[#94A3B8]">
            {dolarCargando ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: dolarError ? "#F59E0B" : G }} />
            )}
            Dólar blue: <span className="font-mono font-semibold text-[#F1F5F9]">${dolar}</span>
            <input
              type="number"
              value={dolar}
              onChange={(e) => setDolar(e.target.value)}
              className="w-16 bg-transparent border-b border-white/[0.15] text-[#F1F5F9] text-xs outline-none focus:border-[#10B981]/50 ml-1"
            />
          </div>
        </div>

        <h1 className="text-3xl lg:text-4xl font-black tracking-tight mb-3">
          Calculadora de <span style={{ color: G }}>rentabilidad real</span>
        </h1>
        <p className="text-[16px] text-[#94A3B8] max-w-2xl mb-8">
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
                  : { background: "rgba(255,255,255,0.05)", color: "#94A3B8" }
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Formulario */}
          <div className="rounded-2xl border border-white/[0.06] bg-[#0C1424] p-6 card-lift">
            <h2 className="text-sm font-bold text-[#F1F5F9] mb-5">Tus números</h2>

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

              <div className="pt-2 border-t border-white/[0.06] space-y-4">
                {tab !== "contra_entrega" ? (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Comisión Mercado Pago" value={campos.comisionMP} onChange={(v) => setCampo("comisionMP", v)} suffix="%" />
                      <Field label="IVA sobre comisión" value={campos.ivaComision} onChange={(v) => setCampo("ivaComision", v)} suffix="%" />
                    </div>
                    {tab === "tres_cuotas" && (
                      <Field label="Cuota simple (financiación 3 cuotas)" value={campos.cuotaSimple} onChange={(v) => setCampo("cuotaSimple", v)} suffix="%" />
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Comisión Tienda Nube" value={campos.comisionTN} onChange={(v) => setCampo("comisionTN", v)} suffix="%" />
                      <Field label="CPA objetivo (ads)" value={campos.cpaObjetivoUSD} onChange={(v) => setCampo("cpaObjetivoUSD", v)} suffix="USD" />
                    </div>
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="CPA objetivo (Meta)" value={campos.cpaObjetivoARS} onChange={(v) => setCampo("cpaObjetivoARS", v)} suffix="ARS" />
                    <Field label="% de entrega estimado" value={campos.pctEntrega} onChange={(v) => setCampo("pctEntrega", v)} suffix="%" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Resultado */}
          <div className="rounded-2xl border border-white/[0.06] bg-[#0C1424] p-6 card-lift">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-[#F1F5F9]">Resultado</h2>
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
                <p className="text-[11px] text-[#94A3B8]">Ganancia neta por venta</p>
              </div>
              <p className="text-2xl font-black font-mono" style={{ color: esNegativo ? R : G }}>
                {esNegativo ? "-" : ""}{formatARS(Math.abs(r.ganancia))}
                <span className="text-sm font-normal text-[#64748B] ml-2">({formatUSD(toUSD(Math.abs(r.ganancia)))})</span>
              </p>
              <p className="text-xs text-[#64748B] mt-1">
                {isFinite(r.pctGanancia) ? `${r.pctGanancia.toFixed(1)}% sobre precio de venta` : "—"}
              </p>
            </div>

            {/* Desglose */}
            <div className="divide-y divide-white/[0.04]">
              {tab !== "contra_entrega" ? (
                <>
                  <LineaResultado label="Precio de venta" ars={r.pv} usd={toUSD(r.pv)} />
                  <LineaResultado label="Comisión Mercado Pago" ars={r.comisionMP} usd={toUSD(r.comisionMP)} negativo />
                  <LineaResultado label="IVA sobre comisión" ars={r.ivaMP} usd={toUSD(r.ivaMP)} negativo />
                  {tab === "tres_cuotas" && (
                    <>
                      <LineaResultado label="Cuota simple" ars={r.cuotaSimple} usd={toUSD(r.cuotaSimple)} negativo />
                      <LineaResultado label="IVA sobre cuota simple" ars={r.ivaCuota} usd={toUSD(r.ivaCuota)} negativo />
                    </>
                  )}
                  <LineaResultado label="Comisión Tienda Nube" ars={r.comisionTN} usd={toUSD(r.comisionTN)} negativo />
                  <LineaResultado label="Llega a mi Mercado Pago" ars={r.llegaAMiMP} usd={toUSD(r.llegaAMiMP)} destacado />
                  <LineaResultado label="Producto + packaging + envío" ars={r.prod + r.pack + r.env} usd={toUSD(r.prod + r.pack + r.env)} negativo />
                  <LineaResultado label="CPA objetivo (ads)" ars={r.cpaObjetivoARS} usd={toUSD(r.cpaObjetivoARS)} negativo />
                </>
              ) : (
                <>
                  <LineaResultado label="Precio de venta" ars={r.pv} usd={toUSD(r.pv)} />
                  <LineaResultado label="Producto + packaging + envío" ars={r.prod + r.pack + r.env} usd={toUSD(r.prod + r.pack + r.env)} negativo />
                  <LineaResultado label="CPA real estimado (objetivo ÷ % entrega)" ars={r.cpaReal} usd={toUSD(r.cpaReal)} negativo />
                </>
              )}
              <LineaResultado label="CPA break even (máximo posible)" ars={r.cpaBreakEven} usd={toUSD(r.cpaBreakEven)} destacado />
            </div>
          </div>
        </div>

        {/* Explicación */}
        <div className="mt-6 rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 flex items-start gap-3">
          <Info className="w-4 h-4 text-[#475569] mt-0.5 shrink-0" />
          <div className="text-xs text-[#64748B] leading-relaxed space-y-1.5">
            <p><span className="font-semibold text-[#94A3B8]">CPA (Costo por Adquisición):</span> lo que invertís en publicidad para generar una venta.</p>
            <p><span className="font-semibold text-[#94A3B8]">CPA Break Even:</span> el máximo que podés invertir en ads por venta sin ganar ni perder plata.</p>
            <p><span className="font-semibold text-[#94A3B8]">% de ganancia:</span> en ecommerce suele estar sano entre 10% y 30% sobre el precio de venta.</p>
          </div>
        </div>

        {/* Más recursos */}
        <div className="mt-10">
          <h2 className="text-sm font-bold text-[#F1F5F9] mb-4">Más herramientas gratis</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <a
              href="https://calculadora-breakeven-ads.netlify.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-xl p-5 border border-white/[0.06] bg-[#0C1424] card-lift flex items-start gap-4"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${B}18` }}>
                <Megaphone className="w-5 h-5" style={{ color: B }} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold text-[#F1F5F9]">Calculadora Break Even — Meta Ads</p>
                  <ArrowUpRight className="w-3.5 h-3.5 text-[#475569] group-hover:text-[#94A3B8] transition-colors shrink-0" />
                </div>
                <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                  CPA máximo, ROAS objetivo y escenarios de rentabilidad por campaña — cuánto podés gastar en ads
                  sin perder plata.
                </p>
              </div>
            </a>
          </div>
        </div>

        {/* CTA final */}
        <div className="mt-10 rounded-2xl border p-6 flex flex-col sm:flex-row items-center justify-between gap-4 card-lift"
          style={{ background: `${G}08`, borderColor: `${G}30` }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${G}18` }}>
              <Calculator className="w-5 h-5" style={{ color: G }} />
            </div>
            <div>
              <p className="text-sm font-bold text-[#F1F5F9]">¿Querés esto calculado solo, en cada venta?</p>
              <p className="text-xs text-[#64748B] mt-0.5">Neto lo hace automático para todo tu catálogo, todos los meses — 14 días gratis.</p>
            </div>
          </div>
          <Link href="/signup" className="flex items-center justify-center gap-2 text-sm font-bold px-5 py-2.5 rounded-xl text-[#080E1A] btn-neto shrink-0" style={{ background: G }}>
            Empezar gratis <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <footer className="border-t border-white/[0.05] py-8 px-5 mt-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm font-bold">
            <span className="w-6 h-6 rounded-md flex items-center justify-center text-[#080E1A] font-black text-xs" style={{ background: G }}>N</span>
            <span><span className="text-[#F1F5F9]">Neto</span><span style={{ color: G }}>.app</span></span>
            <span className="text-[#334155] font-normal ml-2 text-xs">© {new Date().getFullYear()} — Hecho con ♥ en Argentina</span>
          </div>
          <div className="flex items-center gap-5 text-[13px] text-[#475569]">
            <Link href="/terminos" className="hover:text-[#94A3B8] transition-colors">Términos</Link>
            <Link href="/privacidad" className="hover:text-[#94A3B8] transition-colors">Privacidad</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
