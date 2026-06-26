import { supabase } from "@/lib/supabase";
import type { Order, OrderItem, TablesInsert } from "@/lib/types/database";

// Cast pragmático: los tipos manuales no incluyen Relationships que Supabase v2 requiere
// Reemplazar por tipos auto-generados cuando se corra: npx supabase gen types typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export async function getOrders(userId: string, options?: {
  months?: number;
  channel?: string;
  state?: string;
  limit?: number;
}) {
  let query = db
    .from("orders")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false });

  if (options?.channel) query = query.eq("channel", options.channel);
  if (options?.state)   query = query.eq("state", options.state);
  if (options?.limit)   query = query.limit(options.limit);
  if (options?.months) {
    const since = new Date();
    since.setMonth(since.getMonth() - options.months);
    query = query.gte("date", since.toISOString().split("T")[0]);
  }

  return query as unknown as Promise<{ data: Order[]; error: null } | { data: null; error: Error }>;
}

export async function getOrderWithItems(orderId: string) {
  const { data, error } = await db
    .from("orders")
    .select("*, items:order_items(*)")
    .eq("id", orderId)
    .single();

  return { data: data as (Order & { items: OrderItem[] }) | null, error };
}

export async function createOrder(
  order: TablesInsert<"orders">,
  items: TablesInsert<"order_items">[]
): Promise<Order | null> {
  const { data: newOrder, error } = await db
    .from("orders")
    .insert(order)
    .select()
    .single();

  if (error || !newOrder) return null;

  const typed = newOrder as Order;
  if (items.length > 0) {
    const itemsWithOrderId = items.map((i) => ({
      ...i,
      order_id: typed.id,
      user_id: order.user_id,
    }));
    await db.from("order_items").insert(itemsWithOrderId);
  }

  return typed;
}

export async function getSalesByChannel(userId: string, months = 3) {
  return db.rpc("get_sales_by_channel", { p_user_id: userId, p_months: months });
}

export async function getTopProducts(userId: string, limit = 10) {
  return db.rpc("get_top_products", { p_user_id: userId, p_limit: limit });
}

export async function getMonthlySales(userId: string, months = 6) {
  const since = new Date();
  since.setMonth(since.getMonth() - months);
  return db
    .from("orders")
    .select("date, amount_total, amount_cost, margin, channel")
    .eq("user_id", userId)
    .not("state", "in", '("cancelled","returned")')
    .gte("date", since.toISOString().split("T")[0])
    .order("date", { ascending: true });
}
