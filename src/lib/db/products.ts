import { supabase } from "@/lib/supabase";
import type { Product, InventoryLevel, TablesInsert, TablesUpdate } from "@/lib/types/database";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export async function getProductCategories(userId: string) {
  return db
    .from("product_categories")
    .select("id, name")
    .eq("user_id", userId)
    .order("name");
}

export async function getProducts(userId: string, includeInactive = false) {
  let query = db
    .from("products")
    .select(`*, stock:inventory_levels(*), category:product_categories(id, name)`)
    .eq("user_id", userId)
    .order("name");

  if (!includeInactive) query = query.eq("active", true);
  return query;
}

export async function getProduct(productId: string) {
  return db
    .from("products")
    .select(`*, stock:inventory_levels(*), category:product_categories(id, name)`)
    .eq("id", productId)
    .single();
}

export async function createProduct(product: TablesInsert<"products">) {
  const { data, error } = await db
    .from("products")
    .insert(product)
    .select()
    .single();

  if (!error && data) {
    const typed = data as Product;
    await db.from("inventory_levels").insert({
      user_id: product.user_id,
      product_id: typed.id,
      qty_on_hand: 0,
      avg_cost: product.standard_cost ?? 0,
    });
  }

  return { data: data as Product | null, error };
}

export async function updateProduct(productId: string, updates: TablesUpdate<"products">) {
  return db
    .from("products")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", productId)
    .select()
    .single();
}

export async function registerStockMove(move: TablesInsert<"stock_moves">) {
  const { data, error } = await db
    .from("stock_moves")
    .insert(move)
    .select()
    .single();

  if (!error) {
    await db.rpc("update_inventory_level", {
      p_user_id:    move.user_id,
      p_product_id: move.product_id,
      p_qty:        move.qty,
      p_cost_unit:  move.cost_unit ?? 0,
      p_type:       move.type,
    });
  }

  return { data, error };
}

export async function getLowStockProducts(userId: string, threshold = 10) {
  return db
    .from("inventory_levels")
    .select(`*, product:products(id, name, sku, list_price, standard_cost)`)
    .eq("user_id", userId)
    .lt("qty_on_hand", threshold)
    .order("qty_on_hand", { ascending: true });
}

export async function getRecentStockMoves(userId: string, limit = 12) {
  return db
    .from("stock_moves")
    .select("*, product:products(id, name, sku)")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .limit(limit);
}

export async function getInventoryValue(userId: string): Promise<number> {
  const { data } = await db
    .from("inventory_levels")
    .select("qty_on_hand, avg_cost")
    .eq("user_id", userId);

  const rows = data as Pick<InventoryLevel, "qty_on_hand" | "avg_cost">[] | null;
  return rows?.reduce((sum, r) => sum + r.qty_on_hand * r.avg_cost, 0) ?? 0;
}
