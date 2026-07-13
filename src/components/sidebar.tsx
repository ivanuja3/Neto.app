"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Truck,
  Users,
  TrendingUp,
  Calculator,
  Megaphone,
  FileText,
  Wallet,
  Bot,
  Settings,
  LogOut,
  LineChart,
  Menu,
  X,
  ClipboardList,
  ScanLine,
  BookOpen,
  UserCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "./auth-provider";
import { useCompany } from "./company-provider";
import { getNavKeys } from "@/lib/rubro-config";
import { signOut } from "@/lib/auth";

const NAV_SECTIONS = [
  {
    label: "Operaciones",
    items: [
      { key: "dashboard",    label: "Dashboard",     href: "/dashboard",    icon: LayoutDashboard },
      { key: "ventas",       label: "Ventas",        href: "/ventas",        icon: ShoppingCart },
      { key: "presupuestos", label: "Presupuestos",  href: "/presupuestos",  icon: ClipboardList },
      { key: "caja",         label: "Caja / POS",    href: "/caja",          icon: ScanLine },
      { key: "inventario",   label: "Inventario",    href: "/inventario",    icon: Package },
      { key: "clientes",     label: "Clientes",      href: "/clientes",      icon: Users },
      { key: "empleados",    label: "Empleados",     href: "/empleados",     icon: UserCircle },
      { key: "proveedores",  label: "Proveedores",   href: "/proveedores",   icon: Truck },
    ],
  },
  {
    label: "Análisis",
    items: [
      { key: "margenes",     label: "Márgenes",      href: "/margenes",      icon: TrendingUp },
      { key: "costos",       label: "Costos",        href: "/costos",        icon: Calculator },
      { key: "flujo",        label: "Flujo de caja", href: "/flujo",         icon: Wallet },
      { key: "proyecciones", label: "Proyecciones",  href: "/proyecciones",  icon: LineChart },
    ],
  },
  {
    label: "Crecimiento",
    items: [
      { key: "ads",           label: "Meta Ads",      href: "/ads",           icon: Megaphone },
      { key: "impuestos",     label: "Impuestos AR",  href: "/impuestos",     icon: FileText },
      { key: "contabilidad",  label: "Contabilidad",  href: "/contabilidad",  icon: BookOpen, badge: "Preview" as const },
      { key: "ia",            label: "Neto IA",       href: "/ia",            icon: Bot, badge: "Beta" as const },
    ],
  },
];

/* ─── Neto mark (inline SVG — no image dependency) ─── */
function NetoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
      <defs>
        <linearGradient id="netoGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#10B981" />
          <stop offset="1" stopColor="#059669" />
        </linearGradient>
        <linearGradient id="netoGradInner" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#34D399" stopOpacity="0.15" />
          <stop offset="1" stopColor="#059669" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#netoGrad)" />
      <rect width="32" height="32" rx="8" fill="url(#netoGradInner)" />
      {/* N mark — left vert + diagonal + right vert */}
      <path d="M10 23V9L22 23V9" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ─── Logo ─── */
function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <NetoMark size={32} />
      <span className="font-black text-[15px] text-[#F1F5F9] tracking-tight">
        NETO<span className="text-[#10B981]">.</span>
      </span>
    </div>
  );
}

/* ─── Nav items ─── */
function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { company } = useCompany();
  const router = useRouter();
  const enabledKeys = getNavKeys(company?.industry);

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  const initials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : "IU";

  return (
    <>
      <nav className="flex-1 px-2.5 py-3 overflow-y-auto">
        {NAV_SECTIONS.map((section, si) => (
          <div key={section.label} className={si > 0 ? "mt-5" : ""}>
            <div className="space-y-0.5">
              {section.items.filter((item) => enabledKeys.includes(item.key as never)).map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                const isIncomplete = !!(item as { badge?: string }).badge;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "relative flex items-center gap-2.5 px-3 py-[8px] rounded-lg text-sm transition-colors duration-100 group",
                      active
                        ? "bg-[#10B981]/[0.10] text-[#10B981]"
                        : "text-[#64748B] hover:bg-white/[0.07] hover:text-[#CBD5E1]"
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[16px] bg-[#10B981] rounded-r-full" />
                    )}
                    <Icon className={cn(
                      "w-[14px] h-[14px] shrink-0",
                      active ? "text-[#10B981]" : "text-[#475569] group-hover:text-[#64748B]"
                    )} />
                    <span className={cn("flex-1 text-[13px] leading-none", active && "font-semibold")}>
                      {item.label}
                    </span>
                    {isIncomplete && !active && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#475569] shrink-0" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mx-4 h-px shrink-0 bg-white/[0.05]" />

      <div className="px-2.5 py-3 space-y-0.5 shrink-0">
        <Link
          href="/configuracion"
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-2.5 px-3 py-[8px] rounded-lg text-sm transition-colors duration-100 group",
            pathname === "/configuracion"
              ? "bg-[#10B981]/[0.10] text-[#10B981]"
              : "text-[#64748B] hover:bg-white/[0.07] hover:text-[#CBD5E1]"
          )}
        >
          <Settings className="w-[14px] h-[14px] shrink-0 text-[#475569] group-hover:text-[#64748B]" />
          <span className="flex-1 text-[13px]">Configuración</span>
        </Link>

        <div className="flex items-center gap-2.5 px-3 py-[9px] rounded-xl">
          <div className="shrink-0">
            <div className="w-6 h-6 rounded-md bg-[#111E30] border border-white/[0.08] flex items-center justify-center">
              <span className="text-[10px] font-bold text-[#64748B]">{initials}</span>
            </div>
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-[12px] font-semibold text-[#F1F5F9] truncate leading-tight">
              {user?.email?.split("@")[0] ?? "Usuario"}
            </p>
            <p className="text-[10px] text-[#475569] truncate leading-tight mt-0.5">Plan gratuito</p>
          </div>
          <button
            onClick={handleSignOut}
            className="w-6 h-6 flex items-center justify-center rounded-lg text-[#475569] hover:bg-white/[0.06] hover:text-[#EF4444] transition-colors shrink-0"
            title="Cerrar sesión"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </>
  );
}

/* ─── Sidebar ─── */
export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <>
      {/* ════ MOBILE ONLY ════ */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-40 h-14 bg-[#060D19] border-b border-white/[0.05] flex items-center justify-between px-4">
        <button
          onClick={() => setMobileOpen(true)}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-[#94A3B8] hover:bg-white/[0.06] hover:text-[#F1F5F9] transition-colors"
          aria-label="Abrir menú"
        >
          <Menu className="w-5 h-5" />
        </button>
        <Logo />
        <div className="w-9" />
      </div>

      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div
        className={cn(
          "lg:hidden fixed top-0 left-0 h-screen w-[260px] z-50",
          "bg-[#060D19] border-r border-white/[0.05] flex flex-col",
          "transition-transform duration-300 ease-in-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between px-4 h-14 shrink-0 border-b border-white/[0.05]">
          <Logo />
          <button
            onClick={() => setMobileOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-[#475569] hover:bg-white/[0.06] hover:text-[#F1F5F9] transition-colors"
            aria-label="Cerrar menú"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="mx-4 h-px shrink-0 bg-gradient-to-r from-transparent via-[#10B981]/[0.18] to-transparent" />
        <NavItems onNavigate={() => setMobileOpen(false)} />
      </div>

      {/* ════ DESKTOP ONLY ════ */}
      <aside
        className="hidden lg:flex lg:flex-col w-[220px] shrink-0 h-screen sticky top-0 border-r border-white/[0.05] bg-[#060D19]"
        style={{ borderTop: "2px solid #10B981" }}
      >
        <div className="flex items-center gap-3 px-4 h-[60px] shrink-0">
          <Logo />
        </div>
        <div className="mx-4 h-px shrink-0 bg-gradient-to-r from-transparent via-[#10B981]/[0.18] to-transparent" />
        <NavItems />
      </aside>
    </>
  );
}
