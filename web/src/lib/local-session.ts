import type { Press } from "@/lib/timing/engine";
import { clock } from "@/lib/clock";

/**
 * Còpia local de les pulsacions d'una sessió al navegador del mòbil (01 §1).
 * Serveix per continuar sense connexió i per reprendre la sessió després
 * d'una recàrrega. El navegador la pot esborrar o no deixar-la fer servir
 * (navegació privada): per això cada accés va dins un try/catch i, si no hi
 * és, la pantalla es comporta com abans.
 *
 * Caduca al cap de 12 hores: una sessió abandonada no ha de quedar oberta.
 */
const PREFIX = "hyrox:session:";
const TTL = 12 * 60 * 60 * 1000;

type Stored = { presses: Press[]; savedAt: number };

/** El text guardat tal qual (estable entre lectures, per a useSyncExternalStore). */
export function readLocalRaw(sessionId: string): string | null {
  try {
    return localStorage.getItem(PREFIX + sessionId);
  } catch {
    return null;
  }
}

export function parseLocal(raw: string | null): Press[] | null {
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as Stored;
    if (!Array.isArray(s.presses) || clock() - s.savedAt > TTL) return null;
    return s.presses;
  } catch {
    return null;
  }
}

export function saveLocal(sessionId: string, presses: Press[]) {
  try {
    const s: Stored = { presses, savedAt: clock() };
    localStorage.setItem(PREFIX + sessionId, JSON.stringify(s));
  } catch {}
}

export function clearLocal(sessionId: string) {
  try {
    localStorage.removeItem(PREFIX + sessionId);
  } catch {}
}

/** Sessions amb còpia local vigent. Esborra de passada les caducades. */
export function localSessionIds(): string[] {
  const ids: string[] = [];
  try {
    for (const key of Object.keys(localStorage)) {
      if (!key.startsWith(PREFIX)) continue;
      const id = key.slice(PREFIX.length);
      if (parseLocal(localStorage.getItem(key))) ids.push(id);
      else localStorage.removeItem(key);
    }
  } catch {}
  return ids;
}
