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
