import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildPress,
  InvalidPress,
  type Action,
  type Press,
  type SessionContext,
} from "./engine.ts";
import { mergePresses, validatePending } from "./sync.ts";

const ctx: SessionContext = {
  participants: ["U1", "U2"],
  stations: ["S1", "S2"],
};

/** Pulsacions a partir d'accions, una cada segon. */
function run(actions: Action[], from: Press[] = []) {
  const presses = [...from];
  for (const a of actions)
    presses.push(
      buildPress(presses, ctx, a, (presses.at(-1)?.at ?? 0) + 1000),
    );
  return presses;
}

const saved = run([
  { kind: "START" },
  { kind: "SWITCH", participantId: "U2" },
]);
const local = run(
  [
    { kind: "TRANSITION" },
    { kind: "CHANGE_STATION", stationId: "S2" },
    { kind: "HIT" },
    { kind: "FINISHED" },
  ],
  saved,
);

test("merge: el servidor més les pendents del mòbil", () => {
  assert.deepEqual(mergePresses(saved, local), local);
});

test("merge: l'hora del servidor guanya en les pulsacions comunes", () => {
  const server = saved.map((p) => ({ ...p, at: p.at + 7 }));
  const merged = mergePresses(server, local)!;
  assert.equal(merged[1].at, saved[1].at + 7);
  assert.equal(merged.length, local.length);
});

test("merge: el servidor en té més (resposta perduda)", () => {
  assert.deepEqual(mergePresses(local, saved), local);
});

test("merge: dos llocs alhora no es barregen", () => {
  const other = run([{ kind: "RUN" }], saved);
  assert.equal(mergePresses(other, local), null);
});

test("validate: les pendents bones passen", () => {
  const pending = local.slice(saved.length);
  assert.deepEqual(validatePending(saved, pending, ctx, Infinity), pending);
});

test("validate: l'hora no va enrere ni passa de now", () => {
  const [a, b] = local.slice(saved.length);
  const out = validatePending(
    saved,
    [
      { ...a, at: 0 },
      { ...b, at: 1e12 },
    ],
    ctx,
    5e11,
  );
  assert.equal(out[0].at, saved.at(-1)!.at);
  assert.equal(out[1].at, 5e11);
});

test("validate: una pulsació no permesa o canviada es rebutja", () => {
  const [a] = local.slice(saved.length);
  assert.throws(
    () => validatePending(saved, [{ ...a, kind: "HIT" }], ctx, Infinity),
    InvalidPress,
  );
  assert.throws(
    () => validatePending(saved, [{ ...a, seq: 9 }], ctx, Infinity),
    InvalidPress,
  );
  assert.throws(
    () =>
      validatePending(saved, [{ ...a, stationId: "S9" }], ctx, Infinity),
    InvalidPress,
  );
});
