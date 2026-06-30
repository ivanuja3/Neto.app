"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./auth-provider";
import { ensureCompany } from "@/lib/db/companies";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const ensuredFor = useRef<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && ensuredFor.current !== user.id) {
      ensuredFor.current = user.id;
      ensureCompany(user.id, user.email ?? null).catch(() => {
        ensuredFor.current = null;
      });
    }
  }, [user]);

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
