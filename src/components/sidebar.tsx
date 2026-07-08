"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
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
      { key: "ads",       label: "Meta Ads",      href: "/ads",           icon: Megaphone },
      { key: "impuestos", label: "Impuestos AR",  href: "/impuestos",     icon: FileText },
      { key: "ia",        label: "Neto IA",       href: "/ia",            icon: Bot, badge: "Beta" as const },
    ],
  },
];

/* ─── Logo ─── */
function Logo() {
  return (
    <div className="flex items-center gap-3">
      <Image src="/logo.png" alt="Neto" width={28} height={28} className="rounded-lg shrink-0" />
      <span className="font-bold text-[#F1F5F9] tracking-tight">
        Neto<span className="text-[#10B981]">.app</span>
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
          <div key={section.label} className={si > 0 ? "mt-4" : ""}>
            {/* Section label */}
            <p className="text-[9.5px] font-semibold text-[#334155] uppercase tracking-widest px-3 mb-1">
              {section.label}
            </p>

            <div className="space-y-0.5">
              {section.items.filter((item) => enabledKeys.includes(item.key as never)).map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                const isBeta = (item as { badge?: string }).badge === "Beta";

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "relative flex items-center gap-3 px-3 py-[9px] rounded-xl text-sm transition-all duration-150 group",
                      active
                        ? "bg-[#10B981]/[0.10] text-[#10B981]"
                        : isBeta
                        ? "text-[#94A3B8] hover:bg-white/[0.04] hover:text-[#6EE7B7]"
                        : "text-[#94A3B8] hover:bg-white/[0.04] hover:text-[#E2E8F0]"
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[18px] bg-[#10B981] rounded-r-full" />
                    )}
                    <Icon className={cn(
                      "w-[15px] h-[15px] shrink-0 transition-colors duration-150",
                      active ? "text-[#10B981]" : isBeta ? "text-[#475569] group-hover:text-[#6EE7B7]" : "text-[#475569] group-hover:text-[#94A3B8]"
                    )} />
                    <span className={cn("flex-1 text-[13px] leading-none", active && "font-semibold")}>
                      {item.label}
                    </span>
                    {(item as { badge?: string }).badge && (
                      <span className={cn(
                        "text-[9px] font-bold px-1.5 py-[3px] rounded-md tracking-wide",
                        active
                          ? "bg-[#10B981]/20 text-[#10B981]"
                          : "bg-gradient-to-r from-[#10B981]/20 to-[#06B6D4]/15 text-[#34D399] border border-[#10B981]/15"
                      )}>
                        {(item as { badge?: string }).badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mx-4 h-px shrink-0 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

      <div className="px-2.5 py-3 space-y-0.5 shrink-0">
        <Link
          href="/configuracion"
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 px-3 py-[9px] rounded-xl text-sm transition-all duration-150 group",
            pathname === "/configuracion"
              ? "bg-gradient-to-r from-[#10B981]/[0.14] to-[#10B981]/[0.02] text-[#10B981]"
              : "text-[#94A3B8] hover:bg-white/[0.04] hover:text-[#E2E8F0]"
          )}
        >
          <Settings className="w-[15px] h-[15px] text-[#475569] group-hover:text-[#94A3B8] transition-colors" />
          <span className="flex-1 text-[13px]">Configuración</span>
        </Link>

        <div className="flex items-center gap-2.5 px-3 py-[9px] rounded-xl">
          <div className="shrink-0">
            <div className="w-7 h-7 rounded-full bg-[#10B981]/15 flex items-center justify-center">
              <span className="text-[11px] font-bold text-[#10B981]">{initials}</span>
            </div>
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-[12px] font-semibold text-[#F1F5F9] truncate leading-tight">
              {user?.email?.split("@")[0] ?? "Usuario"}
            </p>
            <p className="text-[10px] text-[#F59E0B] font-medium truncate leading-tight mt-0.5">Plan Gratis</p>
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
        <div className="mx-4 h-px shrink-0 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
        <NavItems onNavigate={() => setMobileOpen(false)} />
      </div>

      {/* ════ DESKTOP ONLY ════ */}
      <aside className="hidden lg:flex lg:flex-col w-[220px] shrink-0 h-screen sticky top-0 border-r border-white/[0.05] bg-[#060D19]">
        <div className="flex items-center gap-3 px-5 h-[60px] shrink-0">
          <Logo />
        </div>
        <div className="mx-4 h-px shrink-0 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
        <NavItems />
      </aside>
    </>
  );
}
