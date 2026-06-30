import { supabase } from "./supabase";

export async function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUp(email: string, password: string, firstName: string, lastName: string) {
  return supabase.auth.signUp({
    email,
    password,
    options: { data: { first_name: firstName, last_name: lastName } },
  });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function sendPasswordReset(email: string) {
  const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/reset-password` : undefined;
  return supabase.auth.resetPasswordForEmail(email, { redirectTo });
}

export async function updatePassword(password: string) {
  return supabase.auth.updateUser({ password });
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function getUser() {
  const { data } = await supabase.auth.getUser();
  return data.user;
}
