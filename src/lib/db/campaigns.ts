import { supabase } from "@/lib/supabase";
import type { AdCampaign } from "@/lib/types/database";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export async function getAdCampaigns(userId: string, state?: "active" | "paused" | "ended") {
  let query = db
    .from("ad_campaigns")
    .select("*")
    .eq("user_id", userId)
    .order("date_start", { ascending: false });

  if (state) query = query.eq("state", state);
  return query;
}

export async function getAdSummary(userId: string) {
  const { data } = await db
    .from("ad_campaigns")
    .select("spend, revenue_attributed, impressions, clicks, orders_attributed")
    .eq("user_id", userId)
    .eq("state", "active");

  const rows = data as Pick<AdCampaign, "spend" | "revenue_attributed" | "impressions" | "clicks" | "orders_attributed">[] | null;
  if (!rows?.length) return null;

  const totalSpend       = rows.reduce((s, c) => s + c.spend, 0);
  const totalRevenue     = rows.reduce((s, c) => s + c.revenue_attributed, 0);
  const totalImpressions = rows.reduce((s, c) => s + c.impressions, 0);
  const totalClicks      = rows.reduce((s, c) => s + c.clicks, 0);
  const totalOrders      = rows.reduce((s, c) => s + c.orders_attributed, 0);

  return {
    spend:       totalSpend,
    revenue:     totalRevenue,
    roas:        totalSpend > 0 ? +(totalRevenue / totalSpend).toFixed(2) : 0,
    ctr:         totalImpressions > 0 ? +(totalClicks / totalImpressions * 100).toFixed(2) : 0,
    cpa:         totalOrders > 0 ? +(totalSpend / totalOrders).toFixed(0) : 0,
    impressions: totalImpressions,
    clicks:      totalClicks,
    campaigns:   rows.length,
  };
}
