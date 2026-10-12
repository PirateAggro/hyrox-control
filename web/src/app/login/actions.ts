"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mailConfigured, sendMail } from "@/lib/email";
import { siteUrl } from "@/lib/env";

export type LoginState = { error?: string; message?: string } | undefined;

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

// Un correu de recuperació per email i minut com a màxim: el formulari és
// públic i, si no, serviria per omplir la bústia de qualsevol.
const lastResetMail = new Map<string, number>();

/**
 * Recuperar la contrasenya, pas 1: envia un enllaç per correu.
 *
 * L'enllaç el genera el servidor (clau de servei) i s'envia pel Gmail de
 * l'aplicació, no pel correu de Supabase, que només en deixa enviar uns
 * quants per hora. Porta el token_hash cap a /reset, on es valida quan
 * l'usuari desa la contrasenya nova (no en obrir-lo: els antivirus del correu
 * obren els enllaços i el gastarien).
 *
 * La resposta és sempre la mateixa, hi hagi compte o no: el formulari no ha
 * de revelar quins emails estan registrats.
 */
export async function requestPasswordReset(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!email) return { error: "Cal l'email." };
  if (!mailConfigured())
    return { error: "El correu no està configurat al servidor." };

  const done = {
    message:
      "Si hi ha un compte amb aquest email, t'hi hem enviat un enllaç per canviar la contrasenya.",
  };
  const last = lastResetMail.get(email) ?? 0;
  if (Date.now() - last < 60_000) return done;
  lastResetMail.set(email, Date.now());

  try {
    const { data, error } = await createAdminClient().auth.admin.generateLink({
      type: "recovery",
      email,
    });
    if (error || !data.properties?.hashed_token) return done;

    const link = `${siteUrl()}/reset?token_hash=${encodeURIComponent(
      data.properties.hashed_token,
    )}`;
    await sendMail({
      to: email,
      subject: "Hyrox Control – canviar la contrasenya",
      text:
        `Per triar una contrasenya nova, obre aquest enllaç:\n\n${link}\n\n` +
        `L'enllaç només es pot fer servir una vegada i caduca al cap d'una hora. ` +
        `Si no ho has demanat tu, no cal que facis res.\n`,
    });
  } catch {
    // Mateixa resposta: no es diu si ha fallat per un compte inexistent.
  }
  return done;
}

/**
 * Recuperar la contrasenya, pas 2: valida l'enllaç i desa la contrasenya nova.
 * Si l'enllaç ja s'ha validat en un intent anterior (per exemple, una
 * contrasenya massa curta), l'usuari ja té sessió i només cal desar-la.
 */
export async function resetPassword(
  tokenHash: string,
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");
  if (password.length < 6)
    return { error: "La contrasenya ha de tenir almenys 6 caràcters." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "recovery",
    });
    if (error)
      return {
        error: "L'enllaç ha caducat o ja s'ha fet servir. Demana'n un de nou.",
      };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error?.code === "same_password")
    return { error: "La contrasenya nova ha de ser diferent de l'actual." };
  if (error?.code === "weak_password")
    return { error: "La contrasenya és massa curta o massa feble." };
  if (error) return { error: "No s'ha pogut desar la contrasenya." };

  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
