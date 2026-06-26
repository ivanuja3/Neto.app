import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Cliente para usar en el navegador (respeta RLS con la sesión del usuario)
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Helper: obtener el user_id del usuario autenticado
export async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

// Helper: verificar si Supabase está configurado
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://placeholder.supabase.co"
  );
}
