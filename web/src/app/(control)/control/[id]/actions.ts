"use server";

import { revalidatePath } from "next/cache";
import { requireOperator } from "@/lib/auth";
import { loadSession } from "@/lib/sessions";
import {
  buildPress,
  InvalidPress,
  type Action,
  type Press,
} from "@/lib/timing/engine";
import { mergePresses, validatePending } from "@/lib/timing/sync";
import { PG } from "@/lib/validation";
import { sendSessionEmailTo } from "@/lib/email";

/**
 * Resultat d'una pulsació.
 *  - ok: s'ha guardat; `presses` és la llista completa i `serverNow` l'hora
 *    del servidor, per corregir el desfasament del rellotge del mòbil.
 *  - invalid: la pulsació no és permesa (doble toc, etc.). No és un tall.
 *  - closed: la sessió ja no està en curs.
 *  - failed: no s'ha pogut guardar → 01 §1: és un tall; la pantalla continua
 *    sense connexió i ho torna a provar amb syncPresses.
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

  return { ok: true, presses: [...s.presses, p], serverNow: Date.now() };
}

/**
 * Resultat de la sincronització. A més dels de press:
 *  - conflict: les pulsacions del mòbil no lliguen amb les guardades (la
 *    sessió s'ha fet servir des d'un altre lloc). No es reintenta.
 */
export type SyncResult =
  | { ok: true; presses: Press[]; serverNow: number }
  | { ok: false; reason: "closed" | "failed" | "conflict"; message: string };

/**
 * 01 §1: guarda les pulsacions fetes sense connexió. El mòbil envia la seva
 * llista sencera; es guarden les que falten, amb l'hora del mòbil corregida
 * pel desfasament amb el servidor. Es pot cridar tantes vegades com calgui:
 * les ja guardades no es tornen a guardar.
 */
export async function syncPresses(
  sessionId: string,
  local: Press[],
): Promise<SyncResult> {
  const now = Date.now();
  const { supabase } = await requireOperator();

  const s = await loadSession(supabase, sessionId);
  if (!s) return { ok: false, reason: "closed", message: "Sessió no trobada." };

  const merged = mergePresses(s.presses, local);
  if (!merged)
    return {
      ok: false,
      reason: "conflict",
      message: "La sessió s'ha fet servir des d'un altre lloc.",
    };
  const tail = merged.slice(s.presses.length);
  if (tail.length === 0)
    return { ok: true, presses: s.presses, serverNow: Date.now() };

  if (s.status !== "en curs")
    return {
      ok: false,
      reason: "closed",
      message: `La sessió està ${s.status}.`,
    };

  let pending: Press[];
  try {
    pending = validatePending(s.presses, tail, s.ctx, now);
  } catch (e) {
    if (e instanceof InvalidPress)
      return { ok: false, reason: "conflict", message: e.message };
    throw e;
  }

  const { error } = await supabase
    .from("presses")
    .insert(pending.map((p) => fromPress(sessionId, p)));
  // Una altra crida ha guardat alguna d'aquestes pulsacions: la propera
  // sincronització ja les trobarà guardades.
  if (error)
    return {
      ok: false,
      reason: "failed",
      message: "No s'han pogut guardar les pulsacions.",
    };

  return { ok: true, presses: [...s.presses, ...pending], serverNow: Date.now() };
}

/**
 * Envia els resultats a UN participant, després que l'operador ho hagi
 * confirmat a la pantalla de resultats. En acabar la sessió no s'envia res sol.
 */
export async function sendEmailTo(
  sessionId: string,
  participantId: string,
): Promise<{ ok: boolean; message: string }> {
  const { supabase } = await requireOperator();
  // sendSessionEmailTo llegeix amb la clau de servei (salta RLS): primer cal
  // comprovar amb la sessió de l'usuari que la sessió és seva.
  const { data: own } = await supabase
    .from("sessions")
    .select("id")
    .eq("id", sessionId)
    .maybeSingle();
  if (!own) return { ok: false, message: "Sessió no trobada." };
  const r = await sendSessionEmailTo(sessionId, participantId);
  revalidatePath(`/control/${sessionId}`);
  return r.ok
    ? { ok: true, message: "Correu enviat." }
    : { ok: false, message: r.error ?? "No s'ha pogut enviar." };
}

/**
 * 01 §1: si es torna a entrar a una sessió ja començada des d'un mòbil que no
 * en té la còpia local (un altre mòbil, o el navegador l'ha esborrada), la
 * sessió es tanca com a interrompuda. Amb la còpia, es reprèn.
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
