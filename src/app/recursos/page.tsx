"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { Calculator, ArrowRight, ArrowLeft, ArrowUpRight, Tag, TrendingUp, Percent, ShieldAlert, Megaphone } from "lucide-react";

const G = "#10B981";
const B = "#3B82F6";

/* Comisiones reales de Tienda Nube (con IVA, actualizadas mayo 2026) */
const CANALES = [
  { id: "tn_transferencia", label: "Tienda Nube — Transferencia", comision: 1.2 },
  { id: "tn_tarjeta_14d",   label: "Tienda Nube — Tarjeta/MODO (acreditación 14 días)", comision: 3.98 },
  { id: "tn_tarjeta_7d",    label: "Tienda Nube — Tarjeta/MODO (acreditación 7 días)",  comision: 5.07 },
  { id: "tn_tarjeta_1d",    label: "Tienda Nube — Tarjeta/MODO (acreditación 1 día)",   comision: 7.13 },
  { id: "manual",           label: "Otro canal (ingresar % manual)",                    comision: 0 },
];

function formatARS(n: number) {
  if (!isFinite(n)) return "—";
  return n.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
}

function StatTile({ label, value, icon: Icon, accent }: { label: string; value: string; icon: React.ElementType; accent: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#080E1A] p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-3.5 h-3.5" style={{ color: accent }} />
        <p className="text-[11px] text-[#64748B]">{label}</p>
      </div>
      <p className="text-xl font-black font-mono" style={{ color: accent }}>{value}</p>
    </div>
  );
}

export default function RecursosPage() {
  const [costo, setCosto]           = useState("12000");
  const [envio, setEnvio]            = useState("0");
  const [otros, setOtros]            = useState("0");
  const [canalId, setCanalId]        = useState(CANALES[1].id);
  const [comisionManual, setComisionManual] = useState("15");
  const [margen, setMargen]          = useState("25");

  const canal = CANALES.find((c) => c.id === canalId) ?? CANALES[0];
  const comisionPct = canalId === "manual" ? Number(comisionManual) || 0 : canal.comision;

  const resultado = useMemo(() => {
    const c = (Number(costo) || 0) + (Number(envio) || 0) + (Number(otros) || 0);
    const comm = comisionPct / 100;
    const marg = (Number(margen) || 0) / 100;

    const denom = 1 - comm - marg;
    const precioSugerido = denom > 0 ? c / denom : NaN;
    const precioMinimo   = 1 - comm > 0 ? c / (1 - comm) : NaN;
    const comisionMonto  = precioSugerido * comm;
    const gananciaNeta   = precioSugerido - comisionMonto - c;
    const margenReal     = precioSugerido > 0 ? (gananciaNeta / precioSugerido) * 100 : NaN;

    return { costoTotal: c, precioSugerido, precioMinimo, comisionMonto, gananciaNeta, margenReal };
  }, [costo, envio, otros, comisionPct, margen]);

  const invalido = !isFinite(resultado.precioSugerido) || resultado.precioSugerido <= 0;

  return (
    <div className="min-h-screen bg-[#080E1A] text-[#F1F5F9]">
      {/* Header simple */}
      <header className="border-b border-white/[0.06] px-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg tracking-tight">
            <span className="w-7 h-7 rounded-lg flex items-center justify-center text-[#080E1A] font-black text-sm" style={{ background: G }}>N</span>
            <span>
              <span className="text-[#F1F5F9]">Neto</span><span style={{ color: G }}>.app</span>
            </span>
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

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] text-[12px] text-[#94A3B8] mb-5">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: G }} />
          Gratis · sin registro
        </div>

        <h1 className="text-3xl lg:text-4xl font-black tracking-tight mb-3">
          Calculadora de <span style={{ color: G }}>precio y margen real</span>
        </h1>
        <p className="text-[16px] text-[#94A3B8] max-w-2xl mb-10">
          Cargá tus costos, elegí el canal de venta y el margen que querés ganar — te decimos a qué precio vender
          y cuál es el mínimo para no perder plata. Con las comisiones reales de Tienda Nube.
        </p>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Formulario */}
          <div className="rounded-2xl border border-white/[0.06] bg-[#0C1424] p-6 card-lift">
            <h2 className="text-sm font-bold text-[#F1F5F9] mb-5">Tus números</h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">Costo del producto</label>
                  <input type="number" value={costo} onChange={(e) => setCosto(e.target.value)}
                    className="w-full bg-[#080E1A] border border-white/[0.08] text-[#F1F5F9] rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#10B981]/50 transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">Envío que absorbés</label>
                  <input type="number" value={envio} onChange={(e) => setEnvio(e.target.value)}
                    className="w-full bg-[#080E1A] border border-white/[0.08] text-[#F1F5F9] rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#10B981]/50 transition-colors" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">Otros costos por unidad (packaging, etc.)</label>
                <input type="number" value={otros} onChange={(e) => setOtros(e.target.value)}
                  className="w-full bg-[#080E1A] border border-white/[0.08] text-[#F1F5F9] rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#10B981]/50 transition-colors" />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">Canal de venta</label>
                <select value={canalId} onChange={(e) => setCanalId(e.target.value)}
                  className="w-full bg-[#080E1A] border border-white/[0.08] text-[#F1F5F9] rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#10B981]/50 transition-colors">
                  {CANALES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>

              {canalId === "manual" && (
                <div>
                  <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">Comisión del canal (%)</label>
                  <input type="number" value={comisionManual} onChange={(e) => setComisionManual(e.target.value)}
                    className="w-full bg-[#080E1A] border border-white/[0.08] text-[#F1F5F9] rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#10B981]/50 transition-colors" />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">Margen neto que querés ganar (%)</label>
                <input type="number" value={margen} onChange={(e) => setMargen(e.target.value)}
                  className="w-full bg-[#080E1A] border border-white/[0.08] text-[#F1F5F9] rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#10B981]/50 transition-colors" />
              </div>
            </div>
          </div>

          {/* Resultado */}
          <div className="rounded-2xl border border-white/[0.06] bg-[#0C1424] p-6 card-lift">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-bold text-[#F1F5F9]">Resultado</h2>
              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full" style={{ background: `${G}18`, color: G }}>
                En vivo
              </span>
            </div>

            {invalido ? (
              <div className="flex items-start gap-3 bg-[#EF4444]/[0.08] border border-[#EF4444]/20 rounded-xl px-4 py-3.5">
                <ShieldAlert className="w-4 h-4 text-[#EF4444] mt-0.5 shrink-0" />
                <p className="text-xs text-[#EF4444]">
                  La comisión + el margen que pediste suman 100% o más — no hay precio posible que lo cubra. Bajá el margen o revisá la comisión.
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <StatTile label="Precio sugerido" value={formatARS(resultado.precioSugerido)} icon={Tag} accent={G} />
                  <StatTile label="Ganancia neta" value={formatARS(resultado.gananciaNeta)} icon={TrendingUp} accent={B} />
                  <StatTile label="Margen real" value={`${resultado.margenReal.toFixed(1)}%`} icon={Percent} accent="#F59E0B" />
                  <StatTile label="Precio mínimo (margen 0%)" value={formatARS(resultado.precioMinimo)} icon={ShieldAlert} accent="#EF4444" />
                </div>

                <div className="space-y-2 pt-4 border-t border-white/[0.06]">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#64748B]">Costo total por unidad</span>
                    <span className="text-[#F1F5F9] font-mono">{formatARS(resultado.costoTotal)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#64748B]">Comisión del canal ({comisionPct.toFixed(2)}%)</span>
                    <span className="text-[#F1F5F9] font-mono">{formatARS(resultado.comisionMonto)}</span>
                  </div>
                </div>
              </>
            )}
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
            <span>
              <span className="text-[#F1F5F9]">Neto</span><span style={{ color: G }}>.app</span>
            </span>
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
