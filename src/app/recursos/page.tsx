"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  ArrowRight, ArrowLeft, ArrowUpRight, Calculator, CreditCard, Megaphone, Sun, Moon,
} from "lucide-react";

const G = "#10B981";
const B = "#3B82F6";
const THEME_KEY = "neto_landing_theme";

const HERRAMIENTAS = [
  {
    href: "/recursos/rentabilidad",
    external: false,
    icon: Calculator,
    accent: G,
    title: "Calculadora de rentabilidad real",
    desc: "Comisión de pasarela, IVA, cuotas, Tienda Nube, contra entrega e impuestos — cuánto te queda de verdad por venta, en pesos y dólares.",
  },
  {
    href: "/recursos/posnet",
    external: false,
    icon: CreditCard,
    accent: B,
    title: "Calculadora de comisiones Posnet",
    desc: "El error más común al fijar precios en un local físico: no restar la comisión de la tarjeta. Compará cómo lo hace la mayoría vs. cómo hacerlo bien.",
  },
  {
    href: "https://calculadora-breakeven-ads.netlify.app/",
    external: true,
    icon: Megaphone,
    accent: "#8B5CF6",
    title: "Calculadora Break Even — Meta Ads",
    desc: "CPA máximo, ROAS objetivo y escenarios de rentabilidad por campaña — cuánto podés gastar en ads sin perder plata.",
  },
];

export default function RecursosHub() {
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
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-[var(--neto-text2)] hover:text-[var(--neto-text)] transition-colors mb-6">
          <ArrowLeft className="w-3.5 h-3.5" /> Volver a Neto.app
        </Link>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[rgba(var(--neto-line-rgb),0.08)] bg-[rgba(var(--neto-line-rgb),0.04)] text-[12px] text-[var(--neto-text2)] mb-5">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: G }} />
          Todo gratis · sin registro
        </div>

        <h1 className="text-3xl lg:text-4xl font-black tracking-tight mb-3">
          Recursos <span style={{ color: G }}>gratuitos</span> de Neto
        </h1>
        <p className="text-[16px] text-[var(--neto-text2)] max-w-2xl mb-10">
          Calculadoras reales para dueños de negocio en Argentina — las mismas cuentas que hace Neto por vos,
          en versión suelta y gratis para que las pruebes.
        </p>

        <div className="grid sm:grid-cols-2 gap-5">
          {HERRAMIENTAS.map((h) => {
            const Icon = h.icon;
            const cardClass = "group rounded-2xl p-6 border border-[rgba(var(--neto-line-rgb),0.06)] bg-[var(--neto-bg2)] card-lift flex flex-col gap-4";
            const inner = (
              <>
                <div className="flex items-start justify-between">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${h.accent}18` }}>
                    <Icon className="w-5 h-5" style={{ color: h.accent }} />
                  </div>
                  {h.external && (
                    <ArrowUpRight className="w-4 h-4 text-[var(--neto-text4)] group-hover:text-[var(--neto-text2)] transition-colors" />
                  )}
                </div>
                <div>
                  <p className="text-base font-bold text-[var(--neto-text)] mb-1.5">{h.title}</p>
                  <p className="text-sm text-[var(--neto-text3)] leading-relaxed">{h.desc}</p>
                </div>
                <span className="text-sm font-semibold mt-auto inline-flex items-center gap-1" style={{ color: h.accent }}>
                  {h.external ? "Abrir" : "Usar calculadora"} <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </>
            );
            return h.external ? (
              <a key={h.href} href={h.href} target="_blank" rel="noopener noreferrer" className={cardClass}>
                {inner}
              </a>
            ) : (
              <Link key={h.href} href={h.href} className={cardClass}>
                {inner}
              </Link>
            );
          })}
        </div>

        {/* CTA final */}
        <div className="mt-10 rounded-2xl border p-6 flex flex-col sm:flex-row items-center justify-between gap-4 card-lift"
          style={{ background: `${G}08`, borderColor: `${G}30` }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${G}18` }}>
              <Calculator className="w-5 h-5" style={{ color: G }} />
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--neto-text)]">¿Querés todo esto calculado solo, en cada venta?</p>
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
