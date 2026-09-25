"use server";

import { redirect } from "next/navigation";
import { requireOperator } from "@/lib/auth";

export type NewSessionState = { message?: string } | undefined;

/**
 * §4: crea la sessió amb els participants en l'ordre triat. Un participant és
 * mode "Individual"; més d'un, mode "Equip".
 *
 * Guarda l'ordre de les estacions actives en aquest moment (station_ids): si
 * després es modifiquen les estacions, la sessió no canvia.
 */
export async function createSession(
  _prev: NewSessionState,
  formData: FormData,
): Promise<NewSessionState> {
  const { supabase } = await requireOperator();

  // Els camps arriben en l'ordre de selecció.
  const ids = formData.getAll("participant").map(String);
  if (ids.length === 0) return { message: "Tria almenys un participant." };
  if (new Set(ids).size !== ids.length)
    return { message: "Hi ha un participant repetit." };

  const { data: valid } = await supabase
    .from("participants")
    .select("id")
    .in("id", ids)
    .eq("active", true);
  if ((valid ?? []).length !== ids.length)
    return {
      message: "Algun participant ja no està actiu. Torna-ho a provar.",
    };

  const { data: stations } = await supabase
    .from("stations")
    .select("id")
    .eq("active", true)
    .order("sort_order");
  if (!stations?.length) return { message: "No hi ha cap estació activa." };

  const { data: session, error } = await supabase
    .from("sessions")
    .insert({
      mode: ids.length === 1 ? "individual" : "team",
      station_ids: stations.map((s) => s.id),
    })
    .select("id")
    .single();
  if (error || !session) return { message: "No s'ha pogut crear la sessió." };

  const { error: e2 } = await supabase.from("session_participants").insert(
    ids.map((participant_id, i) => ({
      session_id: session.id,
      participant_id,
      position: i + 1,
    })),
  );
  if (e2) {
    await supabase.from("sessions").delete().eq("id", session.id);
    return { message: "No s'ha pogut crear la sessió." };
  }

  redirect(`/control/${session.id}`);
}
