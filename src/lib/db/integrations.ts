import { supabase } from "@/lib/supabase";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export type Integration = {
  id: string;
  user_id: string;
  channel: string;
  store_id: string | null;
  created_at: string;
  updated_at: string;
};

export async function getIntegrations(userId: string): Promise<Integration[]> {
  const { data, error } = await db
    .from("integrations")
    .select("id, user_id, channel, store_id, created_at, updated_at")
    .eq("user_id", userId);
  if (error) throw error;
  return data ?? [];
}

export async function deleteIntegration(userId: string, channel: string) {
  return db
    .from("integrations")
    .delete()
    .eq("user_id", userId)
    .eq("channel", channel);
}
