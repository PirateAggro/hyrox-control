import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildPress,
  replay,
  type Action,
  type Press,
  type SessionContext,
} from "./engine.ts";
import { formatDuration, summaryRows } from "./summary.ts";

const ctx: SessionContext = {
  participants: ["U1", "U2"],
  stations: ["S1", "S2"],
};
const names = {
  participants: { U1: "Cristina", U2: "Judith" },
  stations: { S1: "SkiErg", S2: "Wall Balls" },
};

function run(context: SessionContext, actions: [Action, number][]) {
  const presses: Press[] = [];
  let t = 0;
  for (const [a, after] of actions) {
    t += after * 1000;
    presses.push(buildPress(presses, context, a, t));
  }
  return replay(presses, context).totals;
}

test("línies en l'ordre de l'exemple d'equip del §5", () => {
  const totals = run(ctx, [
    [{ kind: "START" }, 0],
    [{ kind: "SWITCH", participantId: "U2" }, 10],
    [{ kind: "TRANSITION" }, 20],
    [{ kind: "RUN" }, 3],
    [{ kind: "NEXT_STATION" }, 60],
    [{ kind: "SWITCH", participantId: "U2" }, 30],
    [{ kind: "FINISHED" }, 40],
  ]);
  const rows = summaryRows(totals, ctx, names, "team");
  assert.deepEqual(
    rows.map((r) => `${r.label} ${formatDuration(r.ms)}`),
    [
      "Cristina – SkiErg 0:10",
      "Judith – SkiErg 0:20",
      "Equip – SkiErg 0:30",
      "Transició – SkiErg 0:03",
      "Run – SkiErg 1:00",
      "Cristina – Wall Balls 0:30",
      "Judith – Wall Balls 0:40",
      "Equip – Wall Balls 1:10",
      "Cristina – Total proves 0:40",
      "Judith – Total proves 1:00",
      "Total Hyrox 2:43",
    ],
  );
});

test("mode individual: sense línies d'equip ni totals per participant", () => {
  const solo = { participants: ["U1"], stations: ["S1", "S2"] };
  const totals = run(solo, [
    [{ kind: "START" }, 0],
    [{ kind: "TRANSITION" }, 50],
    [{ kind: "NEXT_STATION" }, 5],
    [{ kind: "FINISHED" }, 40],
  ]);
  assert.deepEqual(
    summaryRows(totals, solo, names, "individual").map((r) => r.label),
    [
      "Cristina – SkiErg",
      "Transició – SkiErg",
      "Cristina – Wall Balls",
      "Total Hyrox",
    ],
  );
});

test("formatDuration", () => {
  assert.equal(formatDuration(0), "0:00");
  assert.equal(formatDuration(83_999), "1:23");
  assert.equal(formatDuration(3_723_000), "1:02:03");
});
