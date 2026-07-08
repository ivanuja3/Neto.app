"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./auth-provider";
import { getCompany } from "@/lib/db/companies";
import type { Company } from "@/lib/types/database";

interface CompanyCtx {
  company: Company | null;
  loading: boolean;
  refresh: () => void;
}

const Ctx = createContext<CompanyCtx>({ company: null, loading: true, refresh: () => {} });

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    getCompany(user.id)
      .then(setCompany)
      .finally(() => setLoading(false));
  }, [user, tick]);

  return (
    <Ctx.Provider value={{ company, loading, refresh: () => setTick((t) => t + 1) }}>
      {children}
    </Ctx.Provider>
  );
}

export function useCompany() {
  return useContext(Ctx);
}
