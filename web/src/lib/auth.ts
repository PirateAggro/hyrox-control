import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Comprova que hi ha un usuari amb sessió i retorna el client. Cada usuari
 * només veu els seus participants i sessions (RLS, migració 6).
 *
 * Cal cridar-la dins de CADA Server Action: una action és un POST públic i la
 * comprovació de la pàgina que la conté no la protegeix (guia de Next,
 * `data-security.md`). `getUser()` i no `getSession()`: la primera valida el
 * token amb el servidor d'Auth; la segona es creu la cookie.
 */
export async function requireOperator() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

/**
 * Si l'usuari pot modificar les estacions (taula `admins`). RLS ja ho impedeix
 * a la base de dades; això serveix per amagar els formularis i donar un
 * missatge clar, perquè un UPDATE bloquejat per RLS no dona error: no fa res.
 */
export async function isAdmin(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const { data } = await supabase.rpc("is_admin");
  return data === true;
}

/** Com `requireOperator()`, però només per a administradors. */
export async function requireAdmin() {
  const ctx = await requireOperator();
  if (!(await isAdmin(ctx.supabase))) redirect("/stations");
  return ctx;
}
