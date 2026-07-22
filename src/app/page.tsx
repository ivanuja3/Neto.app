"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import {
  BarChart3,
  TrendingUp,
  Package,
  Users,
  ArrowRight,
  Check,
  ChevronRight,
  Store,
  Target,
  Calculator,
  Bot,
  Wallet,
  Activity,
  Menu,
  X,
  MessageCircle,
  Zap,
  Sparkles,
  Rocket,
  Wrench,
  LayoutDashboard,
  ShoppingCart,
  ClipboardList,
  ScanLine,
  UserCircle,
  Truck,
  LineChart,
  Megaphone,
  FileText,
  BookOpen,
} from "lucide-react";
import { useState } from "react";

/* ─── Paleta ─── */
const G = "#10B981"; // verde
const B = "#3B82F6"; // azul
const WA_ASESOR = "https://wa.me/5493518551669?text=" + encodeURIComponent("Hola Iván! Tengo una duda sobre Neto.app antes de registrarme.");

/* ─── Hero mockup (mini dashboard) ─── */
function DashMockup() {
  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden shadow-2xl border border-white/[0.08] card-lift"
      style={{ background: "#0C1424" }}
    >
      {/* Topbar */}
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/[0.06]">
        <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]/60" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]/60" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]/60" />
        <span className="ml-3 text-[11px] text-[#475569]">Dashboard — Julio 2026</span>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-3 p-4">
        {[
          { label: "Ingresos", value: "$2.840.000", color: G, up: true },
          { label: "Margen neto", value: "34,2%", color: B, up: true },
          { label: "Órdenes", value: "127", color: "#F59E0B", up: false },
        ].map((k) => (
          <div
            key={k.label}
            className="rounded-lg p-3 border border-white/[0.05]"
            style={{ background: "#080E1A" }}
          >
            <p className="text-[10px] text-[#64748B]">{k.label}</p>
            <p className="text-sm font-bold mt-1 font-mono" style={{ color: k.color }}>
              {k.value}
            </p>
            <p className="text-[9px] mt-0.5" style={{ color: k.up ? G : "#EF4444" }}>
              {k.up ? "↑ 12% vs mes ant." : "↓ 3% vs mes ant."}
            </p>
          </div>
        ))}
      </div>

      {/* Fake chart bars */}
      <div className="px-4 pb-4">
        <div
          className="rounded-lg p-3 border border-white/[0.05]"
          style={{ background: "#080E1A" }}
        >
          <p className="text-[10px] text-[#64748B] mb-3">Ventas por mes</p>
          <div className="flex items-end gap-1.5 h-16">
            {[40, 55, 48, 62, 71, 58, 80].map((h, i) => (
              <div key={i} className="flex-1 rounded-sm" style={{
                height: `${h}%`,
                background: i === 6
                  ? `linear-gradient(to top, ${G}, ${G}88)`
                  : `rgba(16,185,129,0.18)`,
                transition: "height 0.6s var(--ease-out)",
              }} />
            ))}
          </div>
          <div className="flex justify-between mt-1.5">
            {["Ene","Feb","Mar","Abr","May","Jun","Jul"].map((m) => (
              <span key={m} className="text-[8px] text-[#334155]">{m}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Gradient overlay bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none"
        style={{ background: "linear-gradient(to top, #0C1424, transparent)" }}
      />
    </div>
  );
}

/* ─── Feature card ─── */
function FeatureCard({
  icon: Icon,
  title,
  desc,
  accent,
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
  accent: string;
}) {
  return (
    <div className="group rounded-xl p-5 border border-white/[0.06] bg-[#0C1424] card-lift">
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110"
        style={{ background: `${accent}18` }}
      >
        <Icon className="w-4.5 h-4.5" style={{ color: accent }} />
      </div>
      <h3 className="text-[15px] font-semibold text-[#F1F5F9] mb-1.5">{title}</h3>
      <p className="text-[13px] text-[#64748B] leading-relaxed">{desc}</p>
    </div>
  );
}

/* ─── Nav ─── */
function Nav({ authed }: { authed: boolean }) {
  const [open, setOpen] = useState(false);
  const links = [
    { label: "Funcionalidades", href: "#features" },
    { label: "Secciones", href: "#secciones" },
    { label: "Cómo funciona", href: "#como" },
    { label: "Precios", href: "#precios" },
  ];
  return (
    <nav className="sticky top-0 z-50 border-b border-white/[0.06] backdrop-blur-md"
      style={{ background: "rgba(8,14,26,0.88)" }}>
      <div className="max-w-6xl mx-auto px-5 flex items-center justify-between h-14">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-lg tracking-tight">
          <span className="w-7 h-7 rounded-lg flex items-center justify-center text-[#080E1A] font-black text-sm"
            style={{ background: G }}>N</span>
          <span className="text-[#F1F5F9]">Neto</span>
          <span style={{ color: G }}>.app</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-6">
          {links.map((l) => (
            <a key={l.href} href={l.href}
              className="text-sm text-[#94A3B8] hover:text-[#F1F5F9] transition-colors">
              {l.label}
            </a>
          ))}
        </div>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-3">
          {authed ? (
            <Link href="/dashboard"
              className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg text-[#080E1A] transition-colors btn-neto"
              style={{ background: G }}>
              Ir al dashboard <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <>
              <Link href="/login"
                className="text-sm text-[#94A3B8] hover:text-[#F1F5F9] transition-colors px-3 py-2">
                Iniciar sesión
              </Link>
              <Link href="/signup"
                className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg text-[#080E1A] transition-colors btn-neto"
                style={{ background: G }}>
                Empezar gratis <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button className="md:hidden text-[#94A3B8]" onClick={() => setOpen(!open)}>
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-white/[0.06] px-5 py-4 space-y-3"
          style={{ background: "#080E1A" }}>
          {links.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)}
              className="block text-sm text-[#94A3B8] hover:text-[#F1F5F9] py-1">
              {l.label}
            </a>
          ))}
          <div className="pt-3 border-t border-white/[0.06] flex flex-col gap-2">
            {authed ? (
              <Link href="/dashboard"
                className="text-center text-sm font-semibold px-4 py-2.5 rounded-lg text-[#080E1A]"
                style={{ background: G }}>
                Ir al dashboard
              </Link>
            ) : (
              <>
                <Link href="/login"
                  className="text-center text-sm text-[#94A3B8] border border-white/[0.1] px-4 py-2.5 rounded-lg hover:border-white/[0.2]">
                  Iniciar sesión
                </Link>
                <Link href="/signup"
                  className="text-center text-sm font-semibold px-4 py-2.5 rounded-lg text-[#080E1A]"
                  style={{ background: G }}>
                  Empezar gratis
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

/* ─── Página ─── */
export default function LandingPage() {
  const { user } = useAuth();
  const authed = !!user;

  const features = [
    {
      icon: BarChart3,
      title: "Dashboard en tiempo real",
      desc: "Ingresos, márgenes, órdenes y ROAS en un solo lugar. Sin Excel, sin cuentas manuales.",
      accent: G,
    },
    {
      icon: TrendingUp,
      title: "Márgenes reales: Bruto, Operativo y Neto",
      desc: "Calculá cuánto te queda después de costos, logística y marketing. Sabé qué producto te conviene.",
      accent: B,
    },
    {
      icon: Package,
      title: "Inventario y stock",
      desc: "Movimientos de stock, valorización del inventario, alertas de stock bajo y costo promedio ponderado.",
      accent: "#F59E0B",
    },
    {
      icon: Activity,
      title: "Flujo de caja y proyecciones",
      desc: "Anticipá si tu negocio va a tener saldo positivo el próximo mes antes de que sea tarde.",
      accent: "#8B5CF6",
    },
    {
      icon: Target,
      title: "Meta Ads integrado",
      desc: "Conectá tu cuenta de Meta Ads y mirá el ROAS real: gasto en publicidad versus ventas generadas.",
      accent: "#EC4899",
    },
    {
      icon: Store,
      title: "Integración con Tienda Nube",
      desc: "Sincronizá tus pedidos automáticamente desde Tienda Nube. Sin copiar y pegar nada.",
      accent: "#06B6D4",
    },
    {
      icon: Calculator,
      title: "Impuestos y IIBB",
      desc: "Calculá tu carga impositiva mensual incluyendo Ingresos Brutos por provincia y contribuciones.",
      accent: "#F97316",
    },
    {
      icon: Users,
      title: "Clientes y proveedores",
      desc: "Directorio completo con historial de compras, deuda pendiente y frecuencia de compra.",
      accent: "#10B981",
    },
    {
      icon: Bot,
      title: "Neto IA (beta)",
      desc: "Consultá tus números en lenguaje natural. ¿Qué producto me da más margen? ¿Cuándo voy a quedar sin stock?",
      accent: G,
    },
  ];

  const secciones = [
    {
      label: "Operaciones",
      accent: G,
      items: [
        { icon: LayoutDashboard, title: "Dashboard", desc: "Panorama del día: ingresos, margen, ROAS y alertas apenas entrás." },
        { icon: ShoppingCart, title: "Ventas", desc: "Todas tus órdenes de todos los canales, con margen calculado por venta." },
        { icon: ClipboardList, title: "Presupuestos", desc: "Cotizaciones profesionales que se convierten en venta con un clic." },
        { icon: ScanLine, title: "Caja / POS", desc: "Cobrá en el local y que quede todo cargado automáticamente." },
        { icon: Package, title: "Inventario", desc: "Stock, costo promedio ponderado y alertas de reposición en tiempo real." },
        { icon: Users, title: "Clientes", desc: "Cuenta corriente, historial de compras y quién te debe qué." },
        { icon: UserCircle, title: "Empleados", desc: "Tu equipo, roles y actividad, todo en un mismo lugar." },
        { icon: Truck, title: "Proveedores", desc: "Órdenes de compra y cuánto le debés a cada proveedor." },
      ],
    },
    {
      label: "Análisis",
      accent: B,
      items: [
        { icon: TrendingUp, title: "Márgenes", desc: "Bruto, Operativo y Neto por producto, para saber qué te conviene vender." },
        { icon: Calculator, title: "Costos", desc: "Fijos y variables, con tu punto de equilibrio calculado solo." },
        { icon: Wallet, title: "Flujo de caja", desc: "Entra y sale de plata, mes a mes, sin sorpresas de último momento." },
        { icon: LineChart, title: "Proyecciones", desc: "Hacia dónde va tu negocio si seguís al ritmo actual." },
      ],
    },
    {
      label: "Crecimiento",
      accent: "#8B5CF6",
      items: [
        { icon: Megaphone, title: "Meta Ads", desc: "ROAS real: cuánto gastás en publicidad versus lo que te vuelve." },
        { icon: FileText, title: "Impuestos AR", desc: "IIBB por provincia y tu carga fiscal, calculada automáticamente." },
        { icon: BookOpen, title: "Contabilidad", desc: "Balance General y Libro Mayor, contabilidad de verdad para tu negocio.", badge: "Preview" },
        { icon: Bot, title: "Neto IA", desc: "Preguntale a tus números en lenguaje natural y obtené respuestas al instante.", badge: "Beta" },
      ],
    },
  ];

  const steps = [
    {
      n: "01",
      title: "Registrate en 2 minutos",
      desc: "Creá tu cuenta, elegí tu rubro y arrancás con 14 días gratis, sin tarjeta.",
    },
    {
      n: "02",
      title: "Conectá tu negocio",
      desc: "Integrá tu Tienda Nube con un clic o cargá tus ventas manualmente. El sistema se adapta a vos.",
    },
    {
      n: "03",
      title: "Tomá decisiones con datos",
      desc: "Mirá tus márgenes reales, proyectá el próximo mes y encontrá dónde está la plata de tu negocio.",
    },
  ];

  const plans = [
    {
      id: "starter",
      label: "Starter",
      price: "$19",
      period: "USD / mes",
      desc: "Para negocios en crecimiento",
      icon: Zap,
      accent: B,
      features: [
        "Hasta 300 órdenes / mes",
        "Dashboard + KPIs en tiempo real",
        "Ventas, inventario y clientes",
        "Costos fijos y flujo de caja",
        "Impuestos AR",
        "Soporte por WhatsApp",
      ],
    },
    {
      id: "pro",
      label: "Pro",
      price: "$29",
      period: "USD / mes",
      desc: "Para escalar sin límites",
      icon: Sparkles,
      accent: G,
      popular: true,
      features: [
        "Órdenes ilimitadas",
        "Todo lo de Starter",
        "Meta Ads integrado (ROAS real)",
        "Proyecciones y márgenes",
        "Neto IA incluido",
        "Soporte prioritario",
      ],
    },
    {
      id: "scale",
      label: "Scale",
      price: "$49",
      period: "USD / mes",
      desc: "Todo, sin restricciones",
      icon: Rocket,
      accent: "#8B5CF6",
      features: [
        "Todo lo de Pro",
        "Contabilidad completa (Balance y Libro Mayor)",
        "Presupuestos y facturación",
        "Reportes y exportación avanzada",
        "Onboarding personalizado con Iván",
        "Soporte prioritario dedicado",
      ],
    },
  ];

  return (
    <div className="min-h-screen text-[#F1F5F9] page-enter" style={{ background: "#080E1A" }}>
      <Nav authed={authed} />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden pt-20 pb-24 px-5">
        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full opacity-[0.07] blur-3xl pointer-events-none"
          style={{ background: G }} />

        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          {/* Left */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] text-[12px] text-[#94A3B8] mb-6">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: G }} />
              14 días gratis · sin tarjeta de crédito
            </div>

            <h1 className="text-4xl lg:text-5xl font-black tracking-tight leading-[1.1] mb-5">
              Sabé exactamente{" "}
              <span style={{ color: G }}>cuánto ganás neto</span>{" "}
              en tu negocio
            </h1>

            <p className="text-[17px] text-[#94A3B8] leading-relaxed mb-8 max-w-lg">
              La plataforma de finanzas para ecommerce argentino. Márgenes reales,
              inventario inteligente y proyecciones — sin Excel, sin cuentas a mano.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-10">
              {authed ? (
                <Link
                  href="/dashboard"
                  className="flex items-center justify-center gap-2 text-[15px] font-bold px-6 py-3.5 rounded-xl text-[#080E1A] btn-neto"
                  style={{ background: G }}
                >
                  Ir al dashboard <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <Link
                  href="/signup"
                  className="flex items-center justify-center gap-2 text-[15px] font-bold px-6 py-3.5 rounded-xl text-[#080E1A] btn-neto"
                  style={{ background: G }}
                >
                  Empezar gratis <ArrowRight className="w-4 h-4" />
                </Link>
              )}
              {!authed && (
                <Link
                  href="/login"
                  className="flex items-center justify-center gap-2 text-[15px] font-medium px-6 py-3.5 rounded-xl border border-white/[0.1] text-[#94A3B8] hover:border-white/[0.2] hover:text-[#F1F5F9] transition-all"
                >
                  Ya tengo cuenta
                </Link>
              )}
            </div>

            {/* Social proof mini */}
            <div className="flex flex-wrap items-center gap-4 text-[13px] text-[#475569]">
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" style={{ color: G }} />
                Sin tarjeta de crédito
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" style={{ color: G }} />
                Setup en 2 minutos
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" style={{ color: G }} />
                Datos 100% privados
              </div>
            </div>
          </div>

          {/* Right — mockup */}
          <div className="relative hidden lg:block">
            <div className="absolute -inset-4 rounded-3xl opacity-20 blur-2xl"
              style={{ background: `linear-gradient(135deg, ${G}40, ${B}30)` }} />
            <DashMockup />
          </div>
        </div>
      </section>

      {/* ── Logos strip ── */}
      <div className="border-y border-white/[0.05] py-5">
        <div className="max-w-6xl mx-auto px-5 flex flex-wrap items-center justify-center gap-8 text-[13px] text-[#334155]">
          {[
            "🇦🇷  Hecho para Argentina",
            "🏪  Integración con Tienda Nube",
            "📊  Compatible con Meta Ads",
            "🔒  Datos encriptados con Supabase",
          ].map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
      </div>

      {/* ── Pain ── */}
      <section className="py-20 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-black tracking-tight mb-4">
              Tu negocio crece, pero{" "}
              <span style={{ color: "#EF4444" }}>¿sabés realmente cuánto ganás?</span>
            </h2>
            <p className="text-[16px] text-[#64748B] max-w-2xl mx-auto">
              La mayoría de los dueños de ecommerce manejan sus finanzas con planillas
              desactualizadas, sin saber el margen real ni cuándo van a quedar sin stock.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5 stagger-list">
            {[
              {
                emoji: "😤",
                title: "Excel desactualizado",
                desc: "Planillas que nunca están al día, fórmulas rotas y horas perdidas conciliando ventas.",
                fix: "Neto actualiza tus números automáticamente.",
              },
              {
                emoji: "🤷",
                title: "Sin saber el margen real",
                desc: "Vendiste $500.000 pero después de costos, envíos y publicidad ¿qué te quedó?",
                fix: "Neto calcula Margen Bruto, Operativo y Neto en tiempo real.",
              },
              {
                emoji: "📦",
                title: "Stock sin control",
                desc: "Te quedaste sin el producto más vendido o acumulás mercadería que no rota.",
                fix: "Neto alerta cuando el stock baja del umbral.",
              },
            ].map((p) => (
              <div key={p.title}
                className="rounded-xl p-5 border border-white/[0.06] bg-[#0C1424] card-lift">
                <span className="text-3xl mb-3 block">{p.emoji}</span>
                <h3 className="text-[15px] font-semibold text-[#F1F5F9] mb-2">{p.title}</h3>
                <p className="text-[13px] text-[#64748B] mb-3">{p.desc}</p>
                <p className="text-[12px] font-semibold" style={{ color: G }}>✓ {p.fix}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-20 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: G }}>
              Funcionalidades
            </p>
            <h2 className="text-3xl lg:text-4xl font-black tracking-tight mb-4">
              Todo lo que necesitás para gestionar tu negocio
            </h2>
            <p className="text-[16px] text-[#64748B] max-w-xl mx-auto">
              Neto reemplaza 5 herramientas distintas en una sola plataforma pensada
              para el ecommerce argentino.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-list">
            {features.map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Secciones de la app ── */}
      <section id="secciones" className="py-20 px-5 border-t border-white/[0.04]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: "#8B5CF6" }}>
              Recorré la app
            </p>
            <h2 className="text-3xl lg:text-4xl font-black tracking-tight mb-4">
              Cada sección de Neto, explicada
            </h2>
            <p className="text-[16px] text-[#64748B] max-w-xl mx-auto">
              Así está organizado el dashboard por dentro — las mismas 16 secciones
              que vas a ver apenas te registrés.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {secciones.map((grupo) => (
              <div key={grupo.label}
                className="rounded-2xl border border-white/[0.06] bg-[#0C1424] p-5 card-lift">
                <p className="text-[11px] font-bold uppercase tracking-widest mb-4"
                  style={{ color: grupo.accent }}>
                  {grupo.label}
                </p>
                <div className="space-y-4">
                  {grupo.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.title} className="flex items-start gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                          style={{ background: `${grupo.accent}18` }}
                        >
                          <Icon className="w-4 h-4" style={{ color: grupo.accent }} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-[13px] font-semibold text-[#F1F5F9]">{item.title}</p>
                            {item.badge && (
                              <span
                                className="text-[8.5px] font-black uppercase tracking-wider px-1.5 py-[1px] rounded-full shrink-0"
                                style={{ background: `${grupo.accent}18`, color: grupo.accent }}
                              >
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[12px] text-[#64748B] leading-snug mt-0.5">{item.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="como" className="py-20 px-5 border-t border-white/[0.04]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: B }}>
              Cómo funciona
            </p>
            <h2 className="text-3xl lg:text-4xl font-black tracking-tight">
              De cero a números reales en 3 pasos
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((s, i) => (
              <div key={s.n} className="relative">
                {i < 2 && (
                  <div className="hidden md:block absolute top-6 left-[calc(100%_-_16px)] w-1/2 h-px border-t border-dashed border-white/[0.08]" />
                )}
                <div className="text-5xl font-black mb-4 font-mono" style={{ color: `${G}22` }}>
                  {s.n}
                </div>
                <h3 className="text-[16px] font-bold text-[#F1F5F9] mb-2">{s.title}</h3>
                <p className="text-[13px] text-[#64748B] leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="precios" className="py-20 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: G }}>
              Precios
            </p>
            <h2 className="text-3xl lg:text-4xl font-black tracking-tight mb-4">
              Simple. Sin sorpresas.
            </h2>
            <p className="text-[16px] text-[#64748B]">
              14 días gratis en cualquier plan. Cobro manual en ARS al tipo de cambio del día.
            </p>
          </div>

          <div className="max-w-4xl mx-auto grid sm:grid-cols-3 gap-5">
            {plans.map((plan) => {
              const Icon = plan.icon;
              return (
                <div
                  key={plan.id}
                  className="relative rounded-2xl border p-6 flex flex-col gap-4 card-lift"
                  style={{
                    background: plan.popular ? `${plan.accent}07` : "#0C1424",
                    borderColor: plan.popular ? `${plan.accent}40` : "rgba(255,255,255,0.07)",
                    boxShadow: plan.popular ? `0 0 32px ${plan.accent}14` : "none",
                  }}
                >
                  {plan.popular && (
                    <span
                      className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[11px] font-black uppercase tracking-widest text-[#080E1A]"
                      style={{ background: plan.accent }}
                    >
                      Más elegido
                    </span>
                  )}

                  <div className="flex items-center gap-2.5 pt-1">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: `${plan.accent}18` }}
                    >
                      <Icon className="w-4.5 h-4.5" style={{ color: plan.accent }} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#F1F5F9]">{plan.label}</p>
                      <p className="text-[11px] text-[#64748B]">{plan.desc}</p>
                    </div>
                  </div>

                  <div className="flex items-end gap-1.5">
                    <span className="text-4xl font-black text-[#F1F5F9] leading-none">{plan.price}</span>
                    <span className="text-xs text-[#64748B] mb-1">{plan.period}</span>
                  </div>

                  <ul className="space-y-2.5 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5">
                        <Check className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: plan.accent }} />
                        <span className="text-[13px] text-[#94A3B8]">{f}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href="/signup"
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold transition-all btn-neto"
                    style={
                      plan.popular
                        ? { background: plan.accent, color: "#080E1A" }
                        : { background: "rgba(255,255,255,0.06)", color: "#F1F5F9", border: "1px solid rgba(255,255,255,0.1)" }
                    }
                  >
                    Empezar gratis <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              );
            })}
          </div>

          {/* Desarrollo a medida */}
          <div className="max-w-4xl mx-auto mt-5 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 flex items-center gap-4 flex-wrap sm:flex-nowrap card-lift">
            <div className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center shrink-0">
              <Wrench className="w-5 h-5 text-[#94A3B8]" />
            </div>
            <div className="flex-1 min-w-[200px]">
              <p className="text-sm font-bold text-[#F1F5F9]">¿Tu negocio necesita algo distinto?</p>
              <p className="text-xs text-[#64748B] mt-0.5">
                Desarrollo a medida para tu negocio — módulos, integraciones o reportes hechos a tu manera.
              </p>
            </div>
            <a
              href={WA_ASESOR}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold bg-white/[0.06] text-[#F1F5F9] border border-white/[0.08] hover:bg-white/[0.09] transition-colors shrink-0"
            >
              <MessageCircle className="w-4 h-4" />
              Contactar al equipo
            </a>
          </div>

          <p className="text-center text-[13px] text-[#475569] mt-6">
            ¿Tenés dudas antes de arrancar?{" "}
            <a href={WA_ASESOR} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold hover:opacity-80 transition-opacity" style={{ color: G }}>
              Hablá con Iván por WhatsApp <MessageCircle className="w-3.5 h-3.5" />
            </a>
          </p>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-24 px-5 border-t border-white/[0.04]">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6"
            style={{ background: `${G}18` }}>
            <Wallet className="w-7 h-7" style={{ color: G }} />
          </div>
          <h2 className="text-3xl lg:text-5xl font-black tracking-tight mb-5">
            Empezá a tomar decisiones{" "}
            <span style={{ color: G }}>con números reales</span>
          </h2>
          <p className="text-[17px] text-[#64748B] mb-8 max-w-xl mx-auto">
            14 días gratis, sin tarjeta de crédito. Cancelás cuando quieras.
          </p>
          {authed ? (
            <Link href="/dashboard"
              className="inline-flex items-center gap-2 text-[16px] font-bold px-8 py-4 rounded-xl text-[#080E1A] btn-neto"
              style={{ background: G }}>
              Ir al dashboard <ArrowRight className="w-4.5 h-4.5" />
            </Link>
          ) : (
            <Link href="/signup"
              className="inline-flex items-center gap-2 text-[16px] font-bold px-8 py-4 rounded-xl text-[#080E1A] btn-neto"
              style={{ background: G }}>
              Empezar gratis <ArrowRight className="w-4.5 h-4.5" />
            </Link>
          )}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.05] py-8 px-5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm font-bold">
            <span className="w-6 h-6 rounded-md flex items-center justify-center text-[#080E1A] font-black text-xs"
              style={{ background: G }}>N</span>
            <span className="text-[#F1F5F9]">Neto</span>
            <span style={{ color: G }}>.app</span>
            <span className="text-[#334155] font-normal ml-2 text-xs">
              © {new Date().getFullYear()} — Hecho con ♥ en Argentina
            </span>
          </div>
          <div className="flex items-center gap-5 text-[13px] text-[#475569]">
            <Link href="/terminos" className="hover:text-[#94A3B8] transition-colors">
              Términos
            </Link>
            <Link href="/privacidad" className="hover:text-[#94A3B8] transition-colors">
              Privacidad
            </Link>
            <Link href="/login" className="hover:text-[#94A3B8] transition-colors">
              Iniciar sesión
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
