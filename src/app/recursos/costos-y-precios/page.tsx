"use client";

import Link from "next/link";
import { useState, useMemo, useEffect } from "react";
import {
  ArrowRight, ArrowLeft, Layers, Scale, TrendingUp, Sun, Moon, Info, Plus, Trash2,
} from "lucide-react";

const G = "#10B981";
const R = "#EF4444";
const AMBER = "#F59E0B";
const THEME_KEY = "neto_landing_theme";

type Tab = "costo" | "precio" | "real";

type Item = { id: number; name: string; qty: string; price: string };

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

function TabButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: typeof Layers; label: string }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all"
      style={
        active
          ? { background: G, color: "#080E1A" }
          : { background: "rgba(var(--neto-line-rgb),0.05)", color: "var(--neto-text2)" }
      }
    >
      <Icon className="w-3.5 h-3.5" /> {label}
    </button>
  );
}

let nextId = 4;

export default function CostosYPreciosPage() {
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

  const [tab, setTab] = useState<Tab>("costo");

  // ── Tab 1: armá tu costo ──
  const [items, setItems] = useState<Item[]>([
    { id: 1, name: "Materia prima / producto", qty: "1", price: "10000" },
    { id: 2, name: "Mano de obra / armado", qty: "1", price: "2000" },
    { id: 3, name: "Packaging / envío interno", qty: "1", price: "1500" },
  ]);
  function updateItem(id: number, field: keyof Item, value: string) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, [field]: value } : it)));
  }
  function addItem() {
    setItems((prev) => [...prev, { id: nextId++, name: "", qty: "1", price: "0" }]);
  }
  function removeItem(id: number) {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }
  const costoTotal = useMemo(
    () => items.reduce((acc, it) => acc + (Number(it.qty) || 0) * (Number(it.price) || 0), 0),
    [items]
  );

  // ── Tab 2: marcación vs margen ──
  const [margenObjetivo, setMargenObjetivo] = useState("50");
  const comp = useMemo(() => {
    const c = costoTotal;
    const pct = (Number(margenObjetivo) || 0) / 100;

    const precioMarcacion = c * (1 + pct);
    const gananciaMarcacion = precioMarcacion - c;
    const margenRealMarcacion = precioMarcacion > 0 ? (gananciaMarcacion / precioMarcacion) * 100 : NaN;

    const precioMargen = pct < 1 ? c / (1 - pct) : NaN;
    const gananciaMargen = precioMargen - c;
    const margenRealMargen = precioMargen > 0 ? (gananciaMargen / precioMargen) * 100 : NaN;

    return { c, precioMarcacion, gananciaMarcacion, margenRealMarcacion, precioMargen, gananciaMargen, margenRealMargen };
  }, [costoTotal, margenObjetivo]);

  // ── Tab 3: ganancia real ──
  const [precioReal, setPrecioReal] = useState("15000");
  const [comisionPct, setComisionPct] = useState("0");
  const [impuestosPct, setImpuestosPct] = useState("3");
  const [gastosFijos, setGastosFijos] = useState("500000");

  const real = useMemo(() => {
    const c = costoTotal;
    const p = Number(precioReal) || 0;
    const comm = (Number(comisionPct) || 0) / 100;
    const tax = (Number(impuestosPct) || 0) / 100;
    const margenEsperado = (Number(margenObjetivo) || 0) / 100;

    const comisionMonto = p * comm;
    const impuestoMonto = p * tax;
    const gananciaReal = p - c - comisionMonto - impuestoMonto;
    const margenReal = p > 0 ? gananciaReal / p : NaN;
    const diferencia = margenReal - margenEsperado;

    const gf = Number(gastosFijos) || 0;
    const unidadesEquilibrio = gananciaReal > 0 ? gf / gananciaReal : NaN;
    const pesosEquilibrio = unidadesEquilibrio * p;

    return { c, p, comisionMonto, impuestoMonto, gananciaReal, margenReal, margenEsperado, diferencia, unidadesEquilibrio, pesosEquilibrio };
  }, [costoTotal, precioReal, comisionPct, impuestosPct, margenObjetivo, gastosFijos]);

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
          Cómo calcular bien <span style={{ color: G }}>tus costos y precios</span>
        </h1>
        <p className="text-[16px] text-[var(--neto-text2)] max-w-2xl mb-8">
          Armá el costo real de tu producto, entendé por qué &quot;marcar&quot; el costo no es lo mismo que definir un margen,
          y chequeá si el precio que cobrás hoy te deja lo que pensás — después de impuestos y comisiones.
        </p>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <TabButton active={tab === "costo"} onClick={() => setTab("costo")} icon={Layers} label="Armá tu costo" />
          <TabButton active={tab === "precio"} onClick={() => setTab("precio")} icon={Scale} label="Marcación vs margen" />
          <TabButton active={tab === "real"} onClick={() => setTab("real")} icon={TrendingUp} label="Ganancia real" />
        </div>

        {/* ── TAB 1: ARMÁ TU COSTO ── */}
        {tab === "costo" && (
          <div className="rounded-2xl border border-[rgba(var(--neto-line-rgb),0.06)] bg-[var(--neto-bg2)] p-6 card-lift mb-6">
            <h2 className="text-sm font-bold text-[var(--neto-text)] mb-1">¿Qué lleva tu producto?</h2>
            <p className="text-xs text-[var(--neto-text3)] mb-5">
              Sumá cada componente del costo — materia prima, mano de obra, packaging, envío interno — con su cantidad y precio unitario.
            </p>

            <div className="space-y-3">
              {items.map((it) => {
                const subtotal = (Number(it.qty) || 0) * (Number(it.price) || 0);
                return (
                  <div key={it.id} className="grid grid-cols-[1fr_70px_110px_110px_32px] gap-2 items-center">
                    <input
                      type="text"
                      value={it.name}
                      onChange={(e) => updateItem(it.id, "name", e.target.value)}
                      placeholder="Componente"
                      className="w-full border border-[rgba(var(--neto-line-rgb),0.08)] text-[var(--neto-text)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#10B981]/50 transition-colors"
                      style={{ background: "var(--neto-bg)" }}
                    />
                    <input
                      type="number"
                      value={it.qty}
                      onChange={(e) => updateItem(it.id, "qty", e.target.value)}
                      className="w-full border border-[rgba(var(--neto-line-rgb),0.08)] text-[var(--neto-text)] rounded-lg px-2 py-2 text-sm outline-none focus:border-[#10B981]/50 transition-colors text-center"
                      style={{ background: "var(--neto-bg)" }}
                    />
                    <input
                      type="number"
                      value={it.price}
                      onChange={(e) => updateItem(it.id, "price", e.target.value)}
                      className="w-full border border-[rgba(var(--neto-line-rgb),0.08)] text-[var(--neto-text)] rounded-lg px-2 py-2 text-sm outline-none focus:border-[#10B981]/50 transition-colors text-right"
                      style={{ background: "var(--neto-bg)" }}
                    />
                    <span className="text-xs font-mono text-[var(--neto-text2)] text-right pr-1">{formatARS(subtotal)}</span>
                    <button
                      onClick={() => removeItem(it.id)}
                      aria-label="Quitar componente"
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--neto-text4)] hover:text-[#EF4444] hover:bg-[rgba(239,68,68,0.08)] transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
              <div className="grid grid-cols-[1fr_70px_110px_110px_32px] gap-2 text-[10px] text-[var(--neto-text4)] px-0.5 -mt-1">
                <span>Nombre</span>
                <span className="text-center">Cant.</span>
                <span className="text-right">Precio unit.</span>
                <span className="text-right pr-1">Subtotal</span>
                <span />
              </div>
            </div>

            <button
              onClick={addItem}
              className="mt-4 flex items-center gap-1.5 text-xs font-semibold hover:opacity-80 transition-opacity"
              style={{ color: G }}
            >
              <Plus className="w-3.5 h-3.5" /> Agregar componente
            </button>

            <div className="mt-6 pt-5 border-t border-[rgba(var(--neto-line-rgb),0.08)] flex items-center justify-between">
              <span className="text-sm font-semibold text-[var(--neto-text2)]">Costo total del producto</span>
              <span className="text-2xl font-black font-mono" style={{ color: G }}>{formatARS(costoTotal)}</span>
            </div>
          </div>
        )}

        {/* ── TAB 2: MARCACIÓN VS MARGEN ── */}
        {tab === "precio" && (
          <>
            <div className="rounded-2xl border border-[rgba(var(--neto-line-rgb),0.06)] bg-[var(--neto-bg2)] p-6 card-lift mb-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--neto-text2)] mb-1.5">Costo del producto</label>
                  <div className="w-full border border-[rgba(var(--neto-line-rgb),0.08)] rounded-lg px-3.5 py-2.5 text-sm text-[var(--neto-text2)]" style={{ background: "rgba(var(--neto-line-rgb),0.03)" }}>
                    {formatARS(costoTotal)} <span className="text-[10px] text-[var(--neto-text4)]">(de &quot;Armá tu costo&quot;)</span>
                  </div>
                </div>
                <Field label="Porcentaje que querés aplicar" value={margenObjetivo} onChange={setMargenObjetivo} suffix="%" />
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <div className="rounded-2xl border p-6 card-lift" style={{ borderColor: `${R}30`, background: `${R}06` }}>
                <h2 className="text-sm font-bold text-[var(--neto-text)] mb-1">Marcación de costo</h2>
                <p className="text-xs text-[var(--neto-text3)] mb-4">Le sumás el {margenObjetivo || 0}% al costo. El error más común.</p>
                <p className="text-[11px] text-[var(--neto-text3)] font-mono mb-4">Precio = Costo × (1 + {margenObjetivo || 0}%)</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-[var(--neto-text3)]">Precio de venta</span><span className="font-mono font-semibold text-[var(--neto-text)]">{formatARS(comp.precioMarcacion)}</span></div>
                  <div className="flex justify-between"><span className="text-[var(--neto-text3)]">Ganancia en $</span><span className="font-mono text-[var(--neto-text)]">{formatARS(comp.gananciaMarcacion)}</span></div>
                </div>
                <div className="mt-4 pt-4 border-t border-[rgba(var(--neto-line-rgb),0.08)]">
                  <p className="text-[11px] text-[var(--neto-text3)] mb-1">Margen real sobre el precio</p>
                  <p className="text-2xl font-black font-mono" style={{ color: R }}>
                    {isFinite(comp.margenRealMarcacion) ? `${comp.margenRealMarcacion.toFixed(1)}%` : "—"}
                  </p>
                  <p className="text-xs text-[var(--neto-text3)] mt-1">no {margenObjetivo || 0}% — menos de lo que pensabas</p>
                </div>
              </div>

              <div className="rounded-2xl border p-6 card-lift" style={{ borderColor: `${G}30`, background: `${G}06` }}>
                <h2 className="text-sm font-bold text-[var(--neto-text)] mb-1">Margen de ganancia</h2>
                <p className="text-xs text-[var(--neto-text3)] mb-4">Definís que el {margenObjetivo || 0}% del precio final sea ganancia.</p>
                <p className="text-[11px] text-[var(--neto-text3)] font-mono mb-4">Precio = Costo ÷ (1 − {margenObjetivo || 0}%)</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-[var(--neto-text3)]">Precio de venta</span><span className="font-mono font-semibold text-[var(--neto-text)]">{formatARS(comp.precioMargen)}</span></div>
                  <div className="flex justify-between"><span className="text-[var(--neto-text3)]">Ganancia en $</span><span className="font-mono text-[var(--neto-text)]">{formatARS(comp.gananciaMargen)}</span></div>
                </div>
                <div className="mt-4 pt-4 border-t border-[rgba(var(--neto-line-rgb),0.08)]">
                  <p className="text-[11px] text-[var(--neto-text3)] mb-1">Margen real sobre el precio</p>
                  <p className="text-2xl font-black font-mono" style={{ color: G }}>
                    {isFinite(comp.margenRealMargen) ? `${comp.margenRealMargen.toFixed(1)}%` : "—"}
                  </p>
                  <p className="text-xs text-[var(--neto-text3)] mt-1">exactamente el {margenObjetivo || 0}% que pediste</p>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-[rgba(var(--neto-line-rgb),0.06)] bg-[rgba(var(--neto-line-rgb),0.02)] p-5 flex items-start gap-3">
              <Info className="w-4 h-4 text-[var(--neto-text4)] mt-0.5 shrink-0" />
              <p className="text-xs text-[var(--neto-text3)] leading-relaxed">
                &quot;Marcar&quot; el costo y &quot;definir un margen&quot; suenan parecido pero no son lo mismo: sumarle un % al costo
                siempre te da un precio más bajo (y un margen real más chico) que pedir que ese % sea del precio final.
                Cuanto más alto el porcentaje, más grande la diferencia.
              </p>
            </div>
          </>
        )}

        {/* ── TAB 3: GANANCIA REAL ── */}
        {tab === "real" && (
          <>
            <div className="rounded-2xl border border-[rgba(var(--neto-line-rgb),0.06)] bg-[var(--neto-bg2)] p-6 card-lift mb-6">
              <h2 className="text-sm font-bold text-[var(--neto-text)] mb-1">¿Estás ganando lo que pensás?</h2>
              <p className="text-xs text-[var(--neto-text3)] mb-5">
                Ingresá el precio al que vendés hoy — el costo se toma de &quot;Armá tu costo&quot; y el margen esperado, de &quot;Marcación vs margen&quot;.
              </p>
              <div className="grid sm:grid-cols-3 gap-4">
                <Field label="Precio de venta real" value={precioReal} onChange={setPrecioReal} suffix="ARS" />
                <Field label="Comisión de venta (plataforma / tarjeta)" value={comisionPct} onChange={setComisionPct} suffix="%" />
                <Field label="Impuestos (IIBB, IVA, etc.)" value={impuestosPct} onChange={setImpuestosPct} suffix="%" />
              </div>
            </div>

            <div className="rounded-2xl border border-[rgba(var(--neto-line-rgb),0.06)] bg-[var(--neto-bg2)] p-6 card-lift mb-6">
              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between"><span className="text-[var(--neto-text3)]">Precio de venta</span><span className="font-mono text-[var(--neto-text)]">{formatARS(real.p)}</span></div>
                <div className="flex justify-between"><span className="text-[var(--neto-text3)]">Costo del producto</span><span className="font-mono" style={{ color: R }}>-{formatARS(real.c)}</span></div>
                <div className="flex justify-between"><span className="text-[var(--neto-text3)]">Comisión de venta</span><span className="font-mono" style={{ color: R }}>-{formatARS(real.comisionMonto)}</span></div>
                <div className="flex justify-between"><span className="text-[var(--neto-text3)]">Impuestos</span><span className="font-mono" style={{ color: R }}>-{formatARS(real.impuestoMonto)}</span></div>
              </div>
              <div className="pt-4 border-t border-[rgba(var(--neto-line-rgb),0.08)] flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div>
                  <p className="text-[11px] text-[var(--neto-text3)] mb-1">Ganancia real por producto</p>
                  <p className="text-3xl font-black font-mono" style={{ color: real.gananciaReal >= 0 ? G : R }}>{formatARS(real.gananciaReal)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-[var(--neto-text3)] mb-1">Margen real vs. esperado ({(real.margenEsperado * 100).toFixed(0)}%)</p>
                  <p className="text-xl font-black font-mono" style={{ color: real.diferencia >= 0 ? G : R }}>
                    {isFinite(real.margenReal) ? `${(real.margenReal * 100).toFixed(1)}%` : "—"}
                    <span className="text-xs font-semibold ml-2">
                      ({real.diferencia >= 0 ? "+" : ""}{isFinite(real.diferencia) ? (real.diferencia * 100).toFixed(1) : "—"} pts)
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Punto de equilibrio */}
            <div className="rounded-2xl border p-6 card-lift" style={{ borderColor: `${AMBER}30`, background: `${AMBER}06` }}>
              <h2 className="text-sm font-bold text-[var(--neto-text)] mb-1">Punto de equilibrio</h2>
              <p className="text-xs text-[var(--neto-text3)] mb-4">¿Cuánto tenés que vender de este producto para cubrir tus gastos fijos del mes?</p>
              <div className="max-w-xs mb-4">
                <Field label="Gastos fijos mensuales" value={gastosFijos} onChange={setGastosFijos} suffix="ARS" />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] text-[var(--neto-text3)] mb-1">Unidades a vender por mes</p>
                  <p className="text-2xl font-black font-mono" style={{ color: AMBER }}>
                    {isFinite(real.unidadesEquilibrio) ? Math.ceil(real.unidadesEquilibrio).toLocaleString("es-AR") : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-[var(--neto-text3)] mb-1">Equivale a facturar</p>
                  <p className="text-2xl font-black font-mono" style={{ color: AMBER }}>{formatARS(real.pesosEquilibrio)}</p>
                </div>
              </div>
              {!(real.gananciaReal > 0) && (
                <p className="text-xs mt-4" style={{ color: R }}>
                  Con este precio no hay ganancia real por unidad — ningún volumen de ventas cubre los gastos fijos.
                </p>
              )}
            </div>
          </>
        )}

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
              <Layers className="w-5 h-5" style={{ color: G }} />
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--neto-text)]">¿Querés esto calculado solo, en cada producto?</p>
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
