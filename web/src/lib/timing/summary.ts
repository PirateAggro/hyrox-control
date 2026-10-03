/**
 * Línies de resultats en l'ordre de l'exemple del §5:
 *
 *   per cada estació visitada (en l'ordre de la visita):
 *     <participant> – <estació>      (cada participant)
 *     Equip – <estació>              (només en mode equip)
 *     <participant> – <estació> – hits (cada participant; només si en aquella
 *                                      estació s'han comptat hits)
 *     Roxzone – <estació>            (TRANSITION; si n'hi ha hagut)
 *     Run – <estació>                (si n'hi ha hagut)
 *   <participant> – Total proves     (només en mode equip)
 *   Total Hyrox
 *
 * En mode individual el temps d'equip de cada estació és el del participant,
 * i per això no es repeteix.
 */
import type { SessionContext, Totals } from "./engine.ts";

export type SummaryRow = {
  kind:
    | "participant"
    | "team"
    | "transition"
    | "run"
    | "hits"
    | "participantTotal"
    | "total";
  label: string;
  participantId?: string;
  stationId?: string;
  /** Temps de la línia. A les línies "hits" és 0: el valor és `count`. */
  ms: number;
  /** Només a les línies "hits". */
  count?: number;
};

export function summaryRows(
  totals: Totals,
  ctx: SessionContext,
  names: {
    participants: Record<string, string>;
    stations: Record<string, string>;
  },
  mode: "individual" | "team",
): SummaryRow[] {
  const rows: SummaryRow[] = [];
  const pName = (id: string) => names.participants[id] ?? "?";
  const sName = (id: string) => names.stations[id] ?? "?";

  for (const st of totals.stationOrder) {
    for (const p of ctx.participants) {
      const ms = totals.participantStation[p]?.[st];
      if (ms !== undefined)
        rows.push({
          kind: "participant",
          label: `${pName(p)} – ${sName(st)}`,
          participantId: p,
          stationId: st,
          ms,
        });
    }
    if (mode === "team" && totals.teamStation[st] !== undefined)
      rows.push({
        kind: "team",
        label: `Equip – ${sName(st)}`,
        stationId: st,
        ms: totals.teamStation[st],
      });
    // Hits de l'última estació: tots els participants (0 si algú no n'ha fet),
    // perquè es vegi la comparació, però només si n'hi ha hagut algun.
    if (ctx.participants.some((p) => (totals.hits[p]?.[st] ?? 0) > 0))
      for (const p of ctx.participants)
        rows.push({
          kind: "hits",
          label: `${pName(p)} – ${sName(st)} – hits`,
          participantId: p,
          stationId: st,
          ms: 0,
          count: totals.hits[p]?.[st] ?? 0,
        });
    if (totals.transition[st] !== undefined)
      rows.push({
        kind: "transition",
        label: `Roxzone – ${sName(st)}`,
        stationId: st,
        ms: totals.transition[st],
      });
    if (totals.run[st] !== undefined)
      rows.push({
        kind: "run",
        label: `Run – ${sName(st)}`,
        stationId: st,
        ms: totals.run[st],
      });
  }

  if (mode === "team")
    for (const p of ctx.participants) {
      const ms = Object.values(totals.participantStation[p] ?? {}).reduce(
        (a, b) => a + b,
        0,
      );
      rows.push({
        kind: "participantTotal",
        label: `${pName(p)} – Total proves`,
        participantId: p,
        ms,
      });
    }

  rows.push({ kind: "total", label: "Total Hyrox", ms: totals.total });
  return rows;
}

/** El valor que es mostra d'una línia: temps, o "12 hits". */
export function formatRowValue(row: SummaryRow) {
  return row.kind === "hits" ? `${row.count ?? 0} hits` : formatDuration(row.ms);
}

/** 83 s → "1:23"; 3723 s → "1:02:03". */
export function formatDuration(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}
