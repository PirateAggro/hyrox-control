"use server";

import { revalidatePath } from "next/cache";
import { requireOperator } from "@/lib/auth";

/**
 * 01 §1: "Tancar sessió el proper cop que s'entri a l'aplicació". Qualsevol
 * sessió començada (amb pulsacions) que encara estigui en curs quan l'operador
 * torna a l'inici s'ha quedat penjada per un tall: es tanca com a
 * interrompuda. Les que tenen FINISHED ja estan completades i no es toquen.
 *
 * La crida el client en muntar l'inici, no el servidor en renderitzar-lo: una
 * precàrrega (prefetch) de "/" no ha de poder tancar una sessió.
 */
export async function closeStaleSessions() {
  const { supabase } = await requireOperator();
  const { data: open } = await supabase
    .from("sessions")
    .select("id, presses(kind)")
    .is("closed_at", null);

  const stale = (open ?? [])
    .filter((s) => {
      const kinds = (s.presses as { kind: string }[]).map((p) => p.kind);
      return kinds.length > 0 && !kinds.includes("FINISHED");
    })
    .map((s) => s.id);
  if (stale.length === 0) return;

  await supabase
    .from("sessions")
    .update({ closed_at: new Date().toISOString() })
    .in("id", stale);
  revalidatePath("/");
}
