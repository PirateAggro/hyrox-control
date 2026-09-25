/**
 * Client de Supabase amb la clau de servei: salta RLS.
 *
 * ⚠️ Només per a feines del servidor sense operador al davant: l'enviament del
 * correu (s'executa després d'haver respost al mòbil) i el manteniment del
 * projecte actiu. Mai des d'un component de client.
 */
import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "@/lib/env";

export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY.");
  return createClient(supabaseConfig().url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
