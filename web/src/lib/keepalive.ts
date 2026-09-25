/**
 * Manté actiu el projecte de Supabase.
 *
 * Al pla gratuït, un projecte sense activitat durant 7 dies es pausa, i llavors
 * l'app deixa de funcionar el dia que es va al gimnàs. Una consulta mínima cada
 * 24 hores ho evita. Viu dins de l'app (instrumentation.ts) perquè el
 * desplegament no depengui de cap tasca programada a la Pi.
 */
import { createAdminClient } from "@/lib/supabase/admin";

const DAY = 24 * 60 * 60 * 1000;

async function ping() {
  try {
    const { error } = await createAdminClient()
      .from("stations")
      .select("id", { head: true, count: "exact" });
    if (error)
      console.error("keepalive: Supabase ha respost amb error:", error.message);
  } catch (e) {
    console.error("keepalive:", e instanceof Error ? e.message : e);
  }
}

let started = false;

export function startKeepalive() {
  if (started || !process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  started = true;
  void ping();
  setInterval(ping, DAY).unref();
}
