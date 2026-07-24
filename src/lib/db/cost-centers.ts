import { supabase } from "@/lib/supabase";
import type { CostCenter, CostCenterTransfer } from "@/lib/types/database";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export async function getCostCenters(userId: string, options?: { activeOnly?: boolean }) {
  let query = db.from("cost_centers").select("*").eq("user_id", userId).order("name");
  if (options?.activeOnly) query = query.eq("active", true);
  return query as Promise<{ data: CostCenter[] | null; error: unknown }>;
}

export async function createCostCenter(userId: string, name: string) {
  return db.from("cost_centers").insert({ user_id: userId, name }).select().single();
}

export async function renameCostCenter(id: string, userId: string, name: string) {
  return db.from("cost_centers").update({ name }).eq("id", id).eq("user_id", userId).select().single();
}

export async function setCostCenterActive(id: string, userId: string, active: boolean) {
  return db.from("cost_centers").update({ active }).eq("id", id).eq("user_id", userId).select().single();
}

export async function getCostCenterTransfers(userId: string) {
  return db
    .from("cost_center_transfers")
    .select(`*, from_center:cost_centers!cost_center_transfers_from_cost_center_id_fkey(id, name), to_center:cost_centers!cost_center_transfers_to_cost_center_id_fkey(id, name)`)
    .eq("user_id", userId)
    .order("date", { ascending: false }) as Promise<{
      data: (CostCenterTransfer & { from_center: { id: string; name: string } | null; to_center: { id: string; name: string } | null })[] | null;
      error: unknown;
    }>;
}

export async function createCostCenterTransfer(transfer: {
  user_id: string;
  date: string;
  from_cost_center_id: string;
  to_cost_center_id: string;
  amount: number;
  notes?: string | null;
}) {
  return db.from("cost_center_transfers").insert(transfer).select().single();
}

export async function deleteCostCenterTransfer(id: string, userId: string) {
  return db.from("cost_center_transfers").delete().eq("id", id).eq("user_id", userId);
}

// Balance neto por centro de costo: positivo = prestó más de lo que
// recibió (le deben esa plata), negativo = debe esa plata.
export function computeBalances(
  transfers: { from_cost_center_id: string; to_cost_center_id: string; amount: number }[]
): Record<string, number> {
  const balances: Record<string, number> = {};
  for (const t of transfers) {
    const amt = Number(t.amount);
    balances[t.from_cost_center_id] = (balances[t.from_cost_center_id] ?? 0) + amt;
    balances[t.to_cost_center_id]   = (balances[t.to_cost_center_id]   ?? 0) - amt;
  }
  return balances;
}
