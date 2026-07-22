import { supabase } from "@/lib/supabase";
import type { Purchase, TablesInsert } from "@/lib/types/database";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export async function createSupplier(partner: {
  user_id: string;
  name: string;
  type: "supplier";
  email?: string | null;
  phone?: string | null;
  payment_terms?: string | null;
  lead_time?: number;
  notes?: string | null;
}) {
  return db.from("partners").insert(partner).select().single();
}

export async function createPurchaseOrder(purchase: {
  user_id: string;
  partner_id: string;
  date: string;
  date_expected?: string | null;
  state: "draft" | "confirmed";
  amount_total: number;
  notes?: string | null;
}) {
  return db.from("purchases").insert(purchase).select().single();
}

export async function getSuppliers(userId: string) {
  return db
    .from("partners")
    .select("*")
    .eq("user_id", userId)
    .in("type", ["supplier", "both"])
    .eq("active", true)
    .order("name");
}

export async function getCustomers(userId: string) {
  return db
    .from("partners")
    .select("*")
    .eq("user_id", userId)
    .in("type", ["customer", "both"])
    .order("name");
}

export async function createCustomer(customer: {
  user_id: string;
  name: string;
  type: "customer";
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
}) {
  return db.from("partners").insert(customer).select().single();
}

export async function getPurchases(userId: string, options?: {
  state?: string;
  months?: number;
}) {
  let query = db
    .from("purchases")
    .select(`*, partner:partners(id, name), items:purchase_items(*)`)
    .eq("user_id", userId)
    .order("date", { ascending: false });

  if (options?.state) query = query.eq("state", options.state);
  if (options?.months) {
    const since = new Date();
    since.setMonth(since.getMonth() - options.months);
    query = query.gte("date", since.toISOString().split("T")[0]);
  }
  return query;
}

export async function createPurchase(
  purchase: TablesInsert<"purchases">,
  items: TablesInsert<"purchase_items">[]
) {
  const { data: newPurchase, error } = await db
    .from("purchases")
    .insert(purchase)
    .select()
    .single();

  if (error || !newPurchase) return { data: null, error };

  const typed = newPurchase as Purchase;
  if (items.length > 0) {
    const itemsWithId = items.map((i) => ({
      ...i,
      purchase_id: typed.id,
      user_id: purchase.user_id,
    }));
    const { error: itemsErr } = await db.from("purchase_items").insert(itemsWithId);
    if (itemsErr) console.error("createPurchase: purchase_items insert failed", itemsErr);
  }

  return { data: typed, error: null };
}

export async function updateCustomer(id: string, userId: string, data: {
  name?: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
}) {
  return db.from("partners").update(data).eq("id", id).eq("user_id", userId).select().single();
}

export async function deleteCustomer(id: string, userId: string) {
  return db.from("partners").delete().eq("id", id).eq("user_id", userId);
}

export async function updateSupplier(id: string, userId: string, data: {
  name?: string;
  email?: string | null;
  phone?: string | null;
  payment_terms?: string | null;
  lead_time?: number;
  notes?: string | null;
  active?: boolean;
}) {
  return db.from("partners").update(data).eq("id", id).eq("user_id", userId).select().single();
}

export async function getUnpaidByPartner(userId: string): Promise<Record<string, number>> {
  // "partial" también cuenta como deuda pendiente — el schema no trackea
  // cuánto se pagó de un pago parcial, así que hasta que exista esa
  // columna se cuenta el total (antes se excluía del todo, mostrando $0
  // de deuda para ventas con pago parcial).
  const { data } = await db
    .from("orders")
    .select("partner_id, amount_total")
    .eq("user_id", userId)
    .in("payment_state", ["not_paid", "partial"])
    .not("partner_id", "is", null);

  const map: Record<string, number> = {};
  for (const row of (data ?? []) as { partner_id: string; amount_total: number }[]) {
    map[row.partner_id] = (map[row.partner_id] ?? 0) + Number(row.amount_total);
  }
  return map;
}
