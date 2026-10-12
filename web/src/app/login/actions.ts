"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error: string } | undefined;

/**
 * L'inici de sessió es fa al servidor, no al navegador: així el navegador no
 * parla mai amb Supabase (01 §1, "Accés").
 *
 * Els comptes nous es creen des de /register (`signUp`).
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

/**
 * Registre d'un usuari nou: només email i contrasenya. Sense confirmació per
 * correu ("Confirm email" desactivat a Supabase): el compte queda obert i
 * l'usuari entra directament. Cada usuari té els seus participants i sessions.
 */
export async function signUp(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Cal l'email i la contrasenya." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    switch (error.code) {
      case "user_already_exists":
      case "email_exists":
        return { error: "Ja hi ha un compte amb aquest email." };
      case "weak_password":
        return { error: "La contrasenya és massa curta o massa feble." };
      case "email_address_invalid":
        return { error: "L'email no és correcte." };
      case "signup_disabled":
        return { error: "El registre de comptes nous està tancat." };
      default:
        return { error: "No s'ha pogut crear el compte." };
    }
  }
  // Si a Supabase s'hagués activat "Confirm email", no hi hauria sessió.
  if (!data.session)
    return { error: "Compte creat. Confirma'l des del correu i entra." };

  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
