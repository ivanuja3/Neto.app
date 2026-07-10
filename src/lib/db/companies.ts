import { supabase } from "@/lib/supabase";
import type { Company, TablesInsert, TablesUpdate } from "@/lib/types/database";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export async function getCompany(userId: string): Promise<Company | null> {
  const { data, error } = await db
    .from("companies")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createCompany(company: TablesInsert<"companies">) {
  const { data, error } = await db
    .from("companies")
    .insert(company)
    .select()
    .single();
  if (error) throw error;
  return data as Company;
}

export async function updateCompany(userId: string, updates: TablesUpdate<"companies">) {
  const { data, error } = await db
    .from("companies")
    .update(updates)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw error;
  return data as Company;
}

// Crea la empresa por defecto si el usuario todavía no tiene una (primer login).
// Usa upsert con ignoreDuplicates para ser idempotente y evitar race conditions.
export async function ensureCompany(
  userId: string,
  email: string | null,
  businessName?: string | null,
  industry?: string | null
): Promise<Company> {
  const { data, error } = await db
    .from("companies")
    .upsert(
      {
        user_id: userId,
        name: businessName || "Mi negocio",
        cuit: null,
        address: null,
        phone: null,
        email: email ?? null,
        currency: "ARS",
        fiscal_year_start: 1,
        tax_regime: "responsable_inscripto",
        industry: industry || "ecommerce",
      },
      { onConflict: "user_id", ignoreDuplicates: true }
    )
    .select()
    .maybeSingle();

  if (error) throw error;

  // ignoreDuplicates devuelve null cuando la fila ya existía → leerla
  if (!data) return getCompany(userId).then((c) => c!);
  return data as Company;
}
