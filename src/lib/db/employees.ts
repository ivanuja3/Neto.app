import { supabase } from "@/lib/supabase";
import type { Employee, TablesInsert, TablesUpdate } from "@/lib/types/database";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export async function getEmployees(userId: string): Promise<Employee[]> {
  const { data, error } = await db
    .from("employees")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) { console.error("getEmployees:", error); return []; }
  return (data ?? []) as Employee[];
}

export async function upsertEmployee(
  employee: TablesInsert<"employees"> | (TablesUpdate<"employees"> & { id: string })
): Promise<Employee | null> {
  const { data, error } = await db
    .from("employees")
    .upsert(employee, { onConflict: "id" })
    .select()
    .single();

  if (error) { console.error("upsertEmployee:", error); return null; }
  return data as Employee;
}

export async function deleteEmployee(id: string, userId: string): Promise<boolean> {
  const { error } = await db
    .from("employees")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) { console.error("deleteEmployee:", error); return false; }
  return true;
}
