"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error: string } | undefined;

/**
 * L'inici de sessió es fa al servidor, no al navegador: així el navegador no
 * parla mai amb Supabase (01 §1, "Accés").
 *
 * No hi ha registre: el compte únic d'operador es crea al panell de Supabase.
 */
export async function signIn(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Cal l'email i la contrasenya." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  // El mateix missatge per a email desconegut i contrasenya incorrecta: si no,
  // el formulari revelaria quins emails tenen compte.
  if (error) return { error: "Email o contrasenya incorrectes." };

  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
