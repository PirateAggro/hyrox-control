/**
 * CSV dels resultats d'una sessió, per enviar per correu (01 §1).
 *
 * Pensat per obrir-se amb Excel en català o castellà:
 *  - separador `;` (amb configuració regional europea, Excel no separa per `,`)
 *  - decimals amb coma (`21,653`)
 *  - UTF-8 amb BOM, perquè Excel mostri bé els accents
 *
 * Una fila per línia de resultats (summaryRows, ordre del §5), amb els temps
 * exactes en segons amb mil·lèsimes i també en format de cronòmetre. Les
 * línies de hits deixen buits els temps i porten el recompte a la columna Hits.
 */
import type { SummaryRow } from "./summary.ts";
import { formatDuration } from "./summary.ts";

const KIND_LABEL: Record<SummaryRow["kind"], string> = {
  participant: "Prova",
  team: "Equip",
  transition: "Roxzone",
  run: "Run",
  hits: "Hits",
  participantTotal: "Total proves",
  total: "Total Hyrox",
};

function cell(value: string) {
  return /[;"\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function toCsv(
  rows: SummaryRow[],
  names: {
    participants: Record<string, string>;
    stations: Record<string, string>;
  },
) {
  const lines = [["Tipus", "Participant", "Estació", "Segons", "Temps", "Hits"]];
  for (const r of rows) {
    const hits = r.kind === "hits";
    lines.push([
      KIND_LABEL[r.kind],
      r.participantId ? (names.participants[r.participantId] ?? "") : "",
      r.stationId ? (names.stations[r.stationId] ?? "") : "",
      hits ? "" : (r.ms / 1000).toFixed(3).replace(".", ","),
      hits ? "" : formatDuration(r.ms),
      hits ? String(r.count ?? 0) : "",
    ]);
  }
  return "﻿" + lines.map((l) => l.map(cell).join(";")).join("\r\n") + "\r\n";
}
