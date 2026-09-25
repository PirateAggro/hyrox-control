import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Comprova que hi ha un operador amb sessió i retorna el client.
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
