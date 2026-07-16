import { supabase } from "@/lib/supabase";
import type { Quote, QuoteItem } from "@/lib/types/database";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export type QuoteWithItems = Quote & { items: QuoteItem[] };

export async function getQuotes(userId: string): Promise<QuoteWithItems[]> {
  const { data, error } = await db
    .from("quotes")
    .select("*, items:quote_items(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) { console.error("getQuotes:", error); return []; }
  return (data ?? []) as QuoteWithItems[];
}

export async function saveQuote(
  userId: string,
  quote: Omit<Quote, "created_at" | "updated_at">,
  items: Omit<QuoteItem, "id">[]
): Promise<QuoteWithItems | null> {
  // Upsert quote header
  const { data: saved, error } = await db
    .from("quotes")
    .upsert({ ...quote, user_id: userId }, { onConflict: "id" })
    .select()
    .single();

  if (error || !saved) { console.error("saveQuote header:", error); return null; }

  const q = saved as Quote;

  // Replace items: delete old + insert new
  await db.from("quote_items").delete().eq("quote_id", q.id);

  if (items.length > 0) {
    const rows = items.map((item, i) => ({
      ...item,
      quote_id: q.id,
      user_id: userId,
      sort_order: i,
    }));
    const { error: itemsErr } = await db.from("quote_items").insert(rows);
    if (itemsErr) { console.error("saveQuote items:", itemsErr); return null; }
  }

  // Fetch with items
  const { data: full } = await db
    .from("quotes")
    .select("*, items:quote_items(*)")
    .eq("id", q.id)
    .single();

  return full as QuoteWithItems;
}

export async function deleteQuote(id: string, userId: string): Promise<boolean> {
  const { error } = await db
    .from("quotes")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) { console.error("deleteQuote:", error); return false; }
  return true;
}
