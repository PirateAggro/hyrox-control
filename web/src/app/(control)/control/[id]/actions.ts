"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { requireOperator } from "@/lib/auth";
import { loadSession } from "@/lib/sessions";
import {
  buildPress,
  InvalidPress,
  type Action,
  type Press,
} from "@/lib/timing/engine";
import { PG } from "@/lib/validation";
import { sendSessionEmail } from "@/lib/email";

/**
 * Resultat d'una pulsació.
 *  - ok: s'ha guardat; `presses` és la llista completa i `serverNow` l'hora
 *    del servidor, per corregir el desfasament del rellotge del mòbil.
 *  - invalid: la pulsació no és permesa (doble toc, etc.). No és un tall.
 *  - closed: la sessió ja no està en curs.
 *  - failed: no s'ha pogut guardar → 01 §1: és un tall i la sessió es tanca.
 *
 * ⚠️ Cap d'aquestes actions crida revalidatePath ni refresh: la pantalla de
 * control porta l'estat al client, i tornar-la a renderitzar al servidor no
 * aporta res.
 */
export type PressResult =
  | { ok: true; presses: Press[]; serverNow: number }
  | { ok: false; reason: "invalid" | "closed" | "failed"; message: string };

const fromPress = (sessionId: string, p: Press) => ({
  session_id: sessionId,
  seq: p.seq,
  kind: p.kind,
  participant_id: p.participantId ?? null,
  station_id: p.stationId ?? null,
  pressed_at: new Date(p.at).toISOString(),
});

export async function press(
  sessionId: string,
  action: Action,
): Promise<PressResult> {
  // L'hora de la pulsació és la d'arribada al servidor (decisió de la fase 2):
  // es pren abans de qualsevol consulta perquè la latència no s'hi sumi.
  const at = Date.now();
  const { supabase } = await requireOperator();

  const s = await loadSession(supabase, sessionId);
  if (!s) return { ok: false, reason: "failed", message: "Sessió no trobada." };
  if (s.status !== "en curs")
    return {
      ok: false,
      reason: "closed",
      message: `La sessió està ${s.status}.`,
    };

  let p: Press;
  try {
    p = buildPress(
      s.presses,
      s.ctx,
      action,
      Math.max(at, s.presses.at(-1)?.at ?? at),
    );
  } catch (e) {
    if (e instanceof InvalidPress)
      return { ok: false, reason: "invalid", message: e.message };
    throw e;
  }

  const { error } = await supabase
    .from("presses")
    .insert(fromPress(sessionId, p));
  if (error?.code === PG.uniqueViolation)
    // Una altra pulsació ha guanyat la carrera (doble toc des de dos llocs).
    return {
      ok: false,
      reason: "invalid",
      message: "Pulsació duplicada; ignorada.",
    };
  if (error)
    return {
      ok: false,
      reason: "failed",
      message: "No s'ha pogut guardar la pulsació.",
    };

  // 01 §1: en acabar, s'envia el correu als participants. Després de
  // respondre, perquè l'operador no hagi d'esperar Gmail; si falla, la sessió
  // continua completada i l'error queda a sessions.email_error.
  if (p.kind === "FINISHED")
    after(async () => {
      const r = await sendSessionEmail(sessionId);
      if (!r.ok) console.error(`Correu de la sessió ${sessionId}:`, r.error);
    });

  return { ok: true, presses: [...s.presses, p], serverNow: Date.now() };
}

/** Torna a enviar el correu d'una sessió completada (si ha fallat). */
export async function resendEmail(
  sessionId: string,
): Promise<{ message: string; ok: boolean }> {
  await requireOperator();
  const r = await sendSessionEmail(sessionId);
  revalidatePath(`/control/${sessionId}`);
  return r.ok
    ? { ok: true, message: `Correu enviat a ${r.sent} participant(s).` }
    : { ok: false, message: r.error ?? "No s'ha pogut enviar." };
}

/**
 * 01 §1: si es torna a entrar a una sessió ja començada (recàrrega, tancar el
 * navegador, sortir i tornar), la sessió es tanca com a interrompuda.
 * La crida el client en muntar la pantalla, no el servidor en renderitzar-la:
 * així una precàrrega d'enllaç (prefetch) no pot tancar una sessió.
 */
export async function closeSession(sessionId: string) {
  const { supabase } = await requireOperator();
  const s = await loadSession(supabase, sessionId);
  if (!s || s.status !== "en curs" || s.presses.length === 0) return;
  await supabase
    .from("sessions")
    .update({ closed_at: new Date().toISOString() })
    .eq("id", sessionId)
    .is("closed_at", null);
}
