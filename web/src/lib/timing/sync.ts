/**
 * Sincronització de les pulsacions fetes sense connexió (01 §1). Funcions
 * pures, com el motor.
 *
 * El mòbil guarda una còpia local de totes les pulsacions. Si una no es pot
 * guardar al servidor, la pantalla continua i les construeix ella mateixa amb
 * el mateix motor; quan torna la connexió, les envia totes i el servidor
 * guarda les que li falten.
 *
 * La llista del servidor sempre és el començament de la local: les dues
 * comparteixen les pulsacions guardades i la local hi afegeix les pendents.
 * Si en una mateixa posició no coincideixen, és que la sessió s'ha fet servir
 * des de dos llocs alhora, i no es barregen.
 */
import {
  buildPress,
  InvalidPress,
  type Action,
  type Press,
  type SessionContext,
} from "./engine.ts";

/** Mateixa pulsació, sense mirar l'hora (la del servidor és la bona). */
function samePress(a: Press, b: Press) {
  return (
    a.seq === b.seq &&
    a.kind === b.kind &&
    (a.participantId ?? null) === (b.participantId ?? null) &&
    (a.stationId ?? null) === (b.stationId ?? null)
  );
}

/**
 * Llista del servidor + les pulsacions locals que encara no hi són. Retorna
 * null si les dues llistes no coincideixen on es trepitgen.
 *
 * Que la local sigui més curta és normal: una pulsació que el servidor va
 * guardar però la resposta de la qual no va arribar al mòbil.
 */
export function mergePresses(server: Press[], local: Press[]): Press[] | null {
  const n = Math.min(server.length, local.length);
  for (let i = 0; i < n; i++) if (!samePress(server[i], local[i])) return null;
  return [...server, ...local.slice(server.length)];
}

/** L'acció de la pantalla que ha produït una pulsació. */
function actionOf(p: Press): Action {
  if (p.kind === "SWITCH")
    return { kind: "SWITCH", participantId: p.participantId ?? "" };
  if (p.kind === "CHANGE_STATION")
    return { kind: "CHANGE_STATION", stationId: p.stationId ?? "" };
  return { kind: p.kind } as Action;
}

/**
 * Comprova les pulsacions pendents tornant-les a construir amb el motor sobre
 * les guardades: han de sortir iguals. L'hora no pot anar enrere ni passar de
 * `now`. Llança InvalidPress si alguna no és vàlida.
 */
export function validatePending(
  saved: Press[],
  pending: Press[],
  ctx: SessionContext,
  now: number,
): Press[] {
  const all = [...saved];
  for (const p of pending) {
    const at = Math.min(Math.max(p.at, all.at(-1)?.at ?? p.at), now);
    const built = buildPress(all, ctx, actionOf(p), at);
    if (!samePress(built, p))
      throw new InvalidPress(p.seq, "no coincideix amb la sessió.");
    all.push(built);
  }
  return all.slice(saved.length);
}
