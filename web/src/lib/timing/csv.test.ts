import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPress, replay, type Action, type Press } from "./engine.ts";
import { summaryRows } from "./summary.ts";
import { toCsv } from "./csv.ts";

const ctx = { participants: ["U1", "U2"], stations: ["S1", "S2"] };
const names = {
  participants: { U1: "Núria", U2: 'Joan "el ràpid"' },
  stations: { S1: "SkiErg", S2: "Wall Balls; 100 reps" },
};

test("CSV: BOM, separador ;, decimals amb coma i temps exactes", () => {
  const presses: Press[] = [];
  const at = [0, 10_250, 30_500, 33_000, 90_125, 120_000];
  const actions: Action[] = [
    { kind: "START" },
    { kind: "SWITCH", participantId: "U2" },
    { kind: "TRANSITION" },
    { kind: "NEXT_STATION" },
    { kind: "SWITCH", participantId: "U2" },
    { kind: "FINISHED" },
  ];
  actions.forEach((a, i) => presses.push(buildPress(presses, ctx, a, at[i])));
  const { totals } = replay(presses, ctx);
  const csv = toCsv(summaryRows(totals, ctx, names, "team"), names);

  assert.ok(csv.startsWith("﻿"), "BOM per a Excel");
  const lines = csv.slice(1).trimEnd().split("\r\n");
  assert.deepEqual(lines, [
    "Tipus;Participant;Estació;Segons;Temps",
    "Prova;Núria;SkiErg;10,250;0:10",
    'Prova;"Joan ""el ràpid""";SkiErg;20,250;0:20',
    "Equip;;SkiErg;30,500;0:30",
    "Roxzone;;SkiErg;2,500;0:02",
    'Prova;Núria;"Wall Balls; 100 reps";57,125;0:57',
    'Prova;"Joan ""el ràpid""";"Wall Balls; 100 reps";29,875;0:29',
    'Equip;;"Wall Balls; 100 reps";87,000;1:27',
    "Total proves;Núria;;67,375;1:07",
    'Total proves;"Joan ""el ràpid""";;50,125;0:50',
    "Total Hyrox;;;120,000;2:00",
  ]);
});
