import { supabase } from "@/lib/supabase";
import type { Expense } from "@/lib/types/database";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export async function getKpisCurrentMonth(userId: string) {
  return db.rpc("get_kpis_current_month", { p_user_id: userId });
}

export async function getPnlMonthly(userId: string, months = 6) {
  return db.rpc("get_pnl_monthly", { p_user_id: userId, p_months: months });
}

export async function getAnalyticLines(userId: string, options?: {
  category?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  let query = db
    .from("analytic_lines")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false });

  if (options?.category) query = query.eq("category", options.category);
  if (options?.dateFrom) query = query.gte("date", options.dateFrom);
  if (options?.dateTo)   query = query.lte("date", options.dateTo);
  return query;
}

export async function getExpenses(userId: string, type?: "fixed" | "variable") {
  let query = db
    .from("expenses")
    .select("*")
    .eq("user_id", userId)
    .eq("active", true)
    .order("category");

  if (type) query = query.eq("type", type);
  return query;
}

export async function createExpense(expense: {
  user_id: string;
  name: string;
  category: string;
  type: "fixed" | "variable";
  amount: number;
  frequency: "monthly" | "quarterly" | "yearly";
  cost_center_id?: string | null;
}) {
  return db.from("expenses").insert(expense).select().single();
}

export async function deleteExpense(id: string) {
  return db.from("expenses").update({ active: false }).eq("id", id);
}

export async function getTotalFixedExpenses(userId: string): Promise<number> {
  const { data } = await db
    .from("expenses")
    .select("amount, frequency")
    .eq("user_id", userId)
    .eq("active", true)
    .eq("type", "fixed");

  const rows = data as Pick<Expense, "amount" | "frequency">[] | null;
  return rows?.reduce((sum, e) => {
    const monthly = e.frequency === "monthly"   ? e.amount
                  : e.frequency === "quarterly" ? e.amount / 3
                  : e.frequency === "yearly"    ? e.amount / 12
                  : 0;
    return sum + monthly;
  }, 0) ?? 0;
}
