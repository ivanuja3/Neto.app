"use client";

import Link from "next/link";
import { useState, useMemo, useEffect } from "react";
import {
  ArrowRight, ArrowLeft, CreditCard, TrendingDown, TrendingUp, Sun, Moon, Info,
} from "lucide-react";

const G = "#10B981";
const R = "#EF4444";
const THEME_KEY = "neto_landing_theme";

type Modo = "transaccion" | "cuotas" | "promedio";

const TERMINALES = [
  { id: "prisma",  label: "PosNet físico (Prisma / Fiserv)", transaccion: 2,   cuotas: 6,   promedio: 5 },
  { id: "tn",      label: "Tienda Nube (online)",             transaccion: 4,   cuotas: 9,   promedio: 8.5 },
  { id: "manual",  label: "Otra / ingresar manual",           transaccion: 0,   cuotas: 0,   promedio: 0 },
];

function formatARS(n: number) {
  if (!isFinite(n)) return "—";
  return n.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 });
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

export default function PosnetPage() {
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

  const [costo, setCosto]   = useState("100");
  const [margen, setMargen] = useState("50");
  const [terminalId, setTerminalId] = useState(TERMINALES[0].id);
  const [modo, setModo] = useState<Modo>("cuotas");
  const [comisionManual, setComisionManual] = useState("7");

  const terminal = TERMINALES.find((t) => t.id === terminalId) ?? TERMINALES[0];
  const comisionPct = terminalId === "manual" ? Number(comisionManual) || 0 : terminal[modo];

  const r = useMemo(() => {
    const c = Number(costo) || 0;
    const mb = (Number(margen) || 0) / 100;
    const comm = comisionPct / 100;

    // Como lo hace la mayoría: marca el costo (agrega el % como si fuera
    // ganancia directa) y fija ese precio, sin restar la comisión.
    const gananciaIngenua = c * mb;
    const precioIngenuo = c + gananciaIngenua;
    const comisionIngenua = precioIngenuo * comm;
    const gananciaRealIngenua = gananciaIngenua - comisionIngenua;
    const margenRealIngenuo = precioIngenuo > 0 ? (gananciaRealIngenua / precioIngenuo) * 100 : NaN;

    // Como lo hacemos bien: partimos de cuánto querés QUEDARTE neto, y
    // calculamos el precio de lista que hay que cobrar para que, después
    // de la comisión, te llegue exactamente eso.
    const quieroRecibir = mb < 1 ? c / (1 - mb) : NaN;
    const precioDeLista = comm < 1 ? quieroRecibir / (1 - comm) : NaN;
    const ganancia = quieroRecibir - c;
    const margenReal = quieroRecibir > 0 ? (ganancia / quieroRecibir) * 100 : NaN;

    return {
      gananciaIngenua, precioIngenuo, comisionIngenua, gananciaRealIngenua, margenRealIngenuo,
      quieroRecibir, precioDeLista, ganancia, margenReal,
    };
  }, [costo, margen, comisionPct]);

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

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[rgba(var(--neto-line-rgb),0.08)] bg-[rgba(var(--neto-line-rgb),0.04)] text-[12px] text-[var(--neto-text2)] mb-5">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: G }} />
          Gratis · sin registro
        </div>

        <h1 className="text-3xl lg:text-4xl font-black tracking-tight mb-3">
          Calculadora de <span style={{ color: G }}>comisiones Posnet</span>
        </h1>
        <p className="text-[16px] text-[var(--neto-text2)] max-w-2xl mb-8">
          El error más común al vender en un local físico: marcás el precio pensando en tu margen, pero te olvidás
          de restar la comisión de la tarjeta — y terminás ganando bastante menos de lo que creías.
        </p>

        {/* Formulario */}
        <div className="rounded-2xl border border-[rgba(var(--neto-line-rgb),0.06)] bg-[var(--neto-bg2)] p-6 card-lift mb-6">
          <h2 className="text-sm font-bold text-[var(--neto-text)] mb-5">Tus números</h2>
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <Field label="Costo del producto" value={costo} onChange={setCosto} suffix="ARS" />
            <Field label="Margen que querés ganar" value={margen} onChange={setMargen} suffix="%" />
          </div>

          <label className="block text-xs font-medium text-[var(--neto-text2)] mb-1.5">Terminal / plataforma de cobro</label>
          <select
            value={terminalId}
            onChange={(e) => setTerminalId(e.target.value)}
            className="w-full border border-[rgba(var(--neto-line-rgb),0.08)] text-[var(--neto-text)] rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#10B981]/50 transition-colors mb-4"
            style={{ background: "var(--neto-bg)" }}
          >
            {TERMINALES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>

          {terminalId === "manual" ? (
            <Field label="Comisión de la tarjeta" value={comisionManual} onChange={setComisionManual} suffix="%" />
          ) : (
            <div className="flex gap-2">
              {(["transaccion", "cuotas", "promedio"] as Modo[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setModo(m)}
                  className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all capitalize"
                  style={
                    modo === m
                      ? { background: G, color: "#080E1A" }
                      : { background: "rgba(var(--neto-line-rgb),0.05)", color: "var(--neto-text2)" }
                  }
                >
                  {m === "transaccion" ? "Transacción" : m === "cuotas" ? "Cuotas" : "Promedio"} ({terminal[m]}%)
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Comparación */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Panel A: como lo hace la mayoría */}
          <div className="rounded-2xl border p-6 card-lift" style={{ borderColor: `${R}30`, background: `${R}06` }}>
            <div className="flex items-center gap-2 mb-4">
              <TrendingDown className="w-4 h-4" style={{ color: R }} />
              <h2 className="text-sm font-bold text-[var(--neto-text)]">Como lo hace la mayoría</h2>
            </div>
            <p className="text-xs text-[var(--neto-text3)] mb-4">Marca el costo con el margen deseado y fija ese precio — sin restar la comisión.</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-[var(--neto-text3)]">Precio que fija</span><span className="font-mono font-semibold text-[var(--neto-text)]">{formatARS(r.precioIngenuo)}</span></div>
              <div className="flex justify-between"><span className="text-[var(--neto-text3)]">Ganancia que cree tener</span><span className="font-mono text-[var(--neto-text)]">{formatARS(r.gananciaIngenua)}</span></div>
              <div className="flex justify-between"><span className="text-[var(--neto-text3)]">Comisión de la tarjeta</span><span className="font-mono" style={{ color: R }}>-{formatARS(r.comisionIngenua)}</span></div>
            </div>
            <div className="mt-4 pt-4 border-t border-[rgba(var(--neto-line-rgb),0.08)]">
              <p className="text-[11px] text-[var(--neto-text3)] mb-1">Ganancia real (la sorpresa)</p>
              <p className="text-2xl font-black font-mono" style={{ color: R }}>{formatARS(r.gananciaRealIngenua)}</p>
              <p className="text-xs text-[var(--neto-text3)] mt-1">
                {isFinite(r.margenRealIngenuo) ? `${r.margenRealIngenuo.toFixed(1)}% de margen real` : "—"} (pensaba tener {margen || 0}%)
              </p>
            </div>
          </div>

          {/* Panel B: como lo hacemos bien */}
          <div className="rounded-2xl border p-6 card-lift" style={{ borderColor: `${G}30`, background: `${G}06` }}>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4" style={{ color: G }} />
              <h2 className="text-sm font-bold text-[var(--neto-text)]">Como hay que hacerlo</h2>
            </div>
            <p className="text-xs text-[var(--neto-text3)] mb-4">Partís de cuánto querés quedarte neto, y calculás el precio de lista necesario.</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-[var(--neto-text3)]">Querés recibir (neto)</span><span className="font-mono text-[var(--neto-text)]">{formatARS(r.quieroRecibir)}</span></div>
              <div className="flex justify-between"><span className="text-[var(--neto-text3)]">Comisión de la tarjeta</span><span className="font-mono" style={{ color: R }}>+{formatARS(r.precioDeLista - r.quieroRecibir)}</span></div>
              <div className="flex justify-between font-semibold"><span className="text-[var(--neto-text2)]">Precio de lista a cobrar</span><span className="font-mono text-[var(--neto-text)]">{formatARS(r.precioDeLista)}</span></div>
            </div>
            <div className="mt-4 pt-4 border-t border-[rgba(var(--neto-line-rgb),0.08)]">
              <p className="text-[11px] text-[var(--neto-text3)] mb-1">Ganancia real (la que pediste)</p>
              <p className="text-2xl font-black font-mono" style={{ color: G }}>{formatARS(r.ganancia)}</p>
              <p className="text-xs text-[var(--neto-text3)] mt-1">
                {isFinite(r.margenReal) ? `${r.margenReal.toFixed(1)}% de margen real` : "—"} — exactamente lo que pediste
              </p>
            </div>
          </div>
        </div>

        {/* Explicación */}
        <div className="mt-6 rounded-xl border border-[rgba(var(--neto-line-rgb),0.06)] bg-[rgba(var(--neto-line-rgb),0.02)] p-5 flex items-start gap-3">
          <Info className="w-4 h-4 text-[var(--neto-text4)] mt-0.5 shrink-0" />
          <p className="text-xs text-[var(--neto-text3)] leading-relaxed">
            La diferencia entre los dos paneles es siempre la comisión de la tarjeta que nadie resta a tiempo.
            Cuanta más comisión cobre la terminal (las cuotas suelen costar más que el pago en un solo pago),
            más se agranda la brecha entre lo que creés ganar y lo que realmente te queda.
          </p>
        </div>

        {/* Volver al hub */}
        <div className="mt-8">
          <Link href="/recursos" className="inline-flex items-center gap-1.5 text-sm font-semibold hover:opacity-80 transition-opacity" style={{ color: G }}>
            Ver todas las calculadoras gratis <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* CTA final */}
        <div className="mt-8 rounded-2xl border p-6 flex flex-col sm:flex-row items-center justify-between gap-4 card-lift"
          style={{ background: `${G}08`, borderColor: `${G}30` }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${G}18` }}>
              <CreditCard className="w-5 h-5" style={{ color: G }} />
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--neto-text)]">¿Querés esto calculado solo, en cada venta?</p>
              <p className="text-xs text-[var(--neto-text3)] mt-0.5">Neto lo hace automático para tu local físico, todos los meses — 14 días gratis.</p>
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
