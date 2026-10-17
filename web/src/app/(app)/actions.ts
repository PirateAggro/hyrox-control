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
 *
 * `keep`: sessions de les quals aquest mòbil té còpia local (potser amb
 * pulsacions sense guardar): no es tanquen, es poden reprendre.
 */
export async function closeStaleSessions(keep: string[] = []) {
  const { supabase } = await requireOperator();
  const { data: open } = await supabase
    .from("sessions")
    .select("id, presses(kind)")
    .is("closed_at", null);

  const stale = (open ?? [])
    .filter((s) => {
      const kinds = (s.presses as { kind: string }[]).map((p) => p.kind);
      return (
        kinds.length > 0 && !kinds.includes("FINISHED") && !keep.includes(s.id)
      );
    })
    .map((s) => s.id);
  if (stale.length === 0) return;

  await supabase
    .from("sessions")
    .update({ closed_at: new Date().toISOString() })
    .in("id", stale);
  revalidatePath("/");
}

/**
 * Esborra una sessió completament: les pulsacions i els participants de la
 * sessió s'esborren en cascada. No es pot desfer; la pantalla ho demana
 * confirmar abans. RLS només deixa esborrar les sessions de l'usuari.
 */
export async function deleteSession(
  sessionId: string,
): Promise<{ ok: boolean }> {
  const { supabase } = await requireOperator();
  const { data, error } = await supabase
    .from("sessions")
    .delete()
    .eq("id", sessionId)
    .select("id");
  revalidatePath("/");
  return { ok: !error && (data ?? []).length === 1 };
}
