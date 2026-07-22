"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "./auth-provider";
import { ensureCompany } from "@/lib/db/companies";

// Rutas que no requieren plan activo/trial vigente (evita loop de redirect)
const BILLING_EXEMPT_PATHS = ["/billing"];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const ensuredFor = useRef<string | null>(null);
  const [planChecked, setPlanChecked] = useState(false);
  const [planAllowed, setPlanAllowed] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && ensuredFor.current !== user.id) {
      ensuredFor.current = user.id;
      const businessName = (user.user_metadata?.business_name as string | undefined) ?? null;
      const industry = (user.user_metadata?.industry as string | undefined) ?? null;
      ensureCompany(user.id, user.email ?? null, businessName, industry)
        .then((company) => {
          const isActive = company.subscription_status === "active";
          const isTrialing =
            company.subscription_status === "trialing" &&
            !!company.trial_ends_at &&
            new Date(company.trial_ends_at) > new Date();
          setPlanAllowed(isActive || isTrialing);
          setPlanChecked(true);
        })
        .catch((err) => {
          console.error("ensureCompany failed:", err);
          // Si falla la consulta, no bloqueamos al usuario por un error de red
          setPlanAllowed(true);
          setPlanChecked(true);
        });
    }
  }, [user]);

  useEffect(() => {
    if (!planChecked || BILLING_EXEMPT_PATHS.includes(pathname)) return;
    if (!planAllowed) {
      router.replace("/billing");
    }
  }, [planChecked, planAllowed, pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080E1A]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#10B981]/30 border-t-[#10B981] animate-spin" />
          <span className="text-[#94A3B8] text-sm">Cargando...</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
