import { test } from "node:test";
import assert from "node:assert/strict";
import {
  allowedActions,
  buildPress,
  InvalidPress,
  hitsOf,
  participantTotal,
  replay,
  type Action,
  type Press,
  type SessionContext,
} from "./engine.ts";

const S = ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"]; // S8 = Wall Balls
const team: SessionContext = { participants: ["U1", "U2"], stations: S };
const solo: SessionContext = { participants: ["U1"], stations: S };

/** Simula l'operador: cada acció passa `after` segons després de l'anterior. */
function session(ctx: SessionContext) {
  const presses: Press[] = [];
  let clock = 1_000_000;
  const api = {
    presses,
    press(action: Action, after = 0) {
      clock += after * 1000;
      presses.push(buildPress(presses, ctx, action, clock));
      return api;
    },
    result: (now?: number) => replay(presses, ctx, now),
  };
  return api;
}

const sec = (ms: number | undefined) => (ms ?? 0) / 1000;

function sumOfSegments(t: ReturnType<typeof replay>["totals"]) {
  const s = (m: Record<string, number>) =>
    Object.values(m).reduce((a, b) => a + b, 0);
  return s(t.teamStation) + s(t.transition) + s(t.run);
}

test("§5 exemple d'equip: 2 usuaris, 8 proves, sense CHANGE STATION", () => {
  const x = session(team).press({ kind: "START" });
  for (let i = 0; i < 8; i++) {
    const n = i + 1;
    // U1 fa 10·n s, U2 fa 20·n s de la prova n.
    x.press({ kind: "SWITCH", participantId: "U2" }, 10 * n);
    if (n < 8) {
      x.press({ kind: "TRANSITION" }, 20 * n);
      x.press({ kind: "RUN" }, 3); // transició de 3 s
      x.press({ kind: "NEXT_STATION" }, 60); // run de 60 s
    } else {
      x.press({ kind: "FINISHED" }, 20 * n);
    }
  }
  const { state, totals } = x.result();

  assert.equal(state.phase, "finished");
  for (let i = 0; i < 8; i++) {
    const n = i + 1;
    const st = S[i];
    assert.equal(
      sec(totals.participantStation.U1[st]),
      10 * n,
      `U1 prova ${n}`,
    );
    assert.equal(
      sec(totals.participantStation.U2[st]),
      20 * n,
      `U2 prova ${n}`,
    );
    assert.equal(sec(totals.teamStation[st]), 30 * n, `Equip prova ${n}`);
    if (n < 8) {
      assert.equal(sec(totals.transition[st]), 3, `Transició ${n}`);
      assert.equal(sec(totals.run[st]), 60, `Run ${n}`);
    }
  }
  // Com a l'exemple: després de la prova 8 no hi ha transició ni run.
  assert.equal(totals.transition.S8, undefined);
  assert.equal(totals.run.S8, undefined);
  // USUARI 1/2 - TOTAL PROVES
  assert.equal(sec(participantTotal(totals, "U1")), 10 * 36);
  assert.equal(sec(participantTotal(totals, "U2")), 20 * 36);
  // EQUIP - TOTAL HYROX = proves + transicions + runs.
  assert.equal(totals.total, sumOfSegments(totals));
  assert.equal(sec(totals.total), 30 * 36 + 7 * 3 + 7 * 60);
  assert.deepEqual(totals.stationOrder, S);
});

test("§5 exemple individual", () => {
  const x = session(solo).press({ kind: "START" });
  for (let n = 1; n <= 7; n++)
    x.press({ kind: "TRANSITION" }, 100)
      .press({ kind: "RUN" }, 5)
      .press({ kind: "NEXT_STATION" }, 50);
  x.press({ kind: "FINISHED" }, 100);
  const { totals } = x.result();
  for (const st of S) assert.equal(sec(totals.participantStation.U1[st]), 100);
  assert.equal(sec(totals.transition.S1), 5);
  assert.equal(sec(totals.run.S7), 50);
  assert.equal(sec(totals.total), 8 * 100 + 7 * 55);
});

test("§5 alternança dins la mateixa prova: el temps de qui torna s'acumula", () => {
  const { totals } = session(team)
    .press({ kind: "START" })
    .press({ kind: "SWITCH", participantId: "U2" }, 10)
    .press({ kind: "SWITCH", participantId: "U1" }, 15)
    .press({ kind: "SWITCH", participantId: "U2" }, 7)
    .press({ kind: "TRANSITION" }, 4)
    .result();
  assert.equal(sec(totals.participantStation.U1.S1), 10 + 7);
  assert.equal(sec(totals.participantStation.U2.S1), 15 + 4);
  assert.equal(sec(totals.teamStation.S1), 36);
});

test("TRANSITION ↔ RUN: s'hi pot anar i tornar", () => {
  const { totals, state } = session(team)
    .press({ kind: "START" })
    .press({ kind: "TRANSITION" }, 10)
    .press({ kind: "RUN" }, 2)
    .press({ kind: "TRANSITION" }, 30)
    .press({ kind: "RUN" }, 3)
    .result();
  assert.equal(state.phase, "run");
  assert.equal(sec(totals.transition.S1), 2 + 3);
  assert.equal(sec(totals.run.S1), 30);
});

test("NEXT STATION directe des de l'estació: el temps queda a l'estació", () => {
  const { totals, state } = session(team)
    .press({ kind: "START" })
    .press({ kind: "NEXT_STATION" }, 40)
    .result();
  assert.equal(sec(totals.teamStation.S1), 40);
  assert.equal(totals.transition.S1, undefined);
  assert.equal(state.stationId, "S2");
  assert.equal(state.participantId, "U1", "comença el participant número 1");
});

test("NEXT i CHANGE STATION comencen pel participant 1, encara que fos el 2", () => {
  const x = session(team)
    .press({ kind: "START" })
    .press({ kind: "SWITCH", participantId: "U2" }, 5)
    .press({ kind: "CHANGE_STATION", stationId: "S5" }, 5);
  assert.equal(x.result().state.participantId, "U1");
});

test("CHANGE STATION: el temps fins a triar l'estació va al RUN de la prova anterior", () => {
  const { totals, state } = session(team)
    .press({ kind: "START" })
    .press({ kind: "TRANSITION" }, 10)
    .press({ kind: "RUN" }, 3)
    // 50 s corrent + 8 s triant l'estació a la pantalla = 58 s de RUN.
    .press({ kind: "CHANGE_STATION", stationId: "S4" }, 58)
    .result();
  assert.equal(sec(totals.run.S1), 58);
  assert.equal(state.stationId, "S4");
});

test("CHANGE STATION enrere acumula prova, transició i run", () => {
  const { totals } = session(team)
    .press({ kind: "START" })
    .press({ kind: "TRANSITION" }, 10)
    .press({ kind: "RUN" }, 2)
    .press({ kind: "NEXT_STATION" }, 30) // S2
    .press({ kind: "CHANGE_STATION", stationId: "S1" }, 20) // torna a S1
    .press({ kind: "TRANSITION" }, 5)
    .press({ kind: "RUN" }, 1)
    .press({ kind: "NEXT_STATION" }, 30) // S2 un altre cop (seqüencial)
    .result();
  assert.equal(sec(totals.teamStation.S1), 10 + 5);
  assert.equal(sec(totals.transition.S1), 2 + 1);
  assert.equal(sec(totals.run.S1), 30 + 30);
  assert.equal(sec(totals.teamStation.S2), 20);
  assert.deepEqual(totals.stationOrder, ["S1", "S2"]);
});

test("les proves saltades amb CHANGE STATION no hi són", () => {
  const { totals } = session(team)
    .press({ kind: "START" })
    .press({ kind: "CHANGE_STATION", stationId: "S6" }, 10)
    .result();
  assert.deepEqual(totals.stationOrder, ["S1", "S6"]);
  for (const st of ["S2", "S3", "S4", "S5"])
    assert.equal(totals.teamStation[st], undefined);
});

test("l'última prova es comporta com les altres, sense NEXT STATION", () => {
  const x = session(team)
    .press({ kind: "START" })
    .press({ kind: "CHANGE_STATION", stationId: "S8" }, 10);
  const a = allowedActions(x.result().state, team);
  assert.deepEqual(
    { t: a.transition, r: a.run, n: a.next, c: a.change, f: a.finish },
    { t: true, r: true, n: false, c: true, f: true },
  );
  assert.deepEqual(a.switchTo, ["U2"]);
  assert.throws(() => x.press({ kind: "NEXT_STATION" }), InvalidPress);
  // Des de l'última: ROXZONE, RUN i tornar a una altra estació.
  x.press({ kind: "TRANSITION" }, 20)
    .press({ kind: "RUN" }, 5)
    .press({ kind: "CHANGE_STATION", stationId: "S3" }, 30);
  const { state, totals } = x.result();
  assert.equal(state.stationId, "S3");
  assert.equal(sec(totals.teamStation.S8), 20);
  assert.equal(sec(totals.transition.S8), 5);
  assert.equal(sec(totals.run.S8), 30);
  // Des de la Roxzone o el Run de l'última tampoc hi ha NEXT STATION.
  const y = session(team)
    .press({ kind: "START" })
    .press({ kind: "CHANGE_STATION", stationId: "S8" }, 10)
    .press({ kind: "RUN" }, 10);
  const b = allowedActions(y.result().state, team);
  assert.deepEqual(
    { t: b.transition, n: b.next, c: b.change, f: b.finish },
    { t: true, n: false, c: true, f: true },
  );
});

test("HIT: només a l'última prova, per al participant actiu, sense tocar temps", () => {
  const x = session(team).press({ kind: "START" });
  assert.equal(allowedActions(x.result().state, team).hit, false);
  assert.throws(() => x.press({ kind: "HIT" }), InvalidPress);

  x.press({ kind: "CHANGE_STATION", stationId: "S8" }, 10)
    .press({ kind: "HIT" }, 3)
    .press({ kind: "HIT" }, 3)
    .press({ kind: "HIT" }, 3);
  let { totals } = x.result();
  assert.equal(hitsOf(totals, "U1", "S8"), 3);
  assert.equal(hitsOf(totals, "U2", "S8"), 0);
  // Un HIT no tanca el tram: el temps d'U1 és de corrido.
  x.press({ kind: "SWITCH", participantId: "U2" }, 3);
  ({ totals } = x.result());
  assert.equal(sec(totals.participantStation.U1.S8), 12);
  assert.equal(sec(totals.total), 22);
  assert.equal(totals.total, sumOfSegments(totals));

  // U2 compta els seus; en tornar a U1, continua on era.
  x.press({ kind: "HIT" }, 2)
    .press({ kind: "HIT" }, 2)
    .press({ kind: "SWITCH", participantId: "U1" }, 2)
    .press({ kind: "HIT" }, 2);
  ({ totals } = x.result());
  assert.equal(hitsOf(totals, "U1", "S8"), 4);
  assert.equal(hitsOf(totals, "U2", "S8"), 2);
});

test("HIT: no durant la Roxzone, el Run ni la pausa; i un hit d'un altre es rebutja", () => {
  const x = session(team)
    .press({ kind: "START" })
    .press({ kind: "CHANGE_STATION", stationId: "S8" }, 10)
    .press({ kind: "PAUSE" }, 5);
  assert.throws(() => x.press({ kind: "HIT" }, 1), InvalidPress);
  x.press({ kind: "RESUME" }, 5).press({ kind: "TRANSITION" }, 5);
  assert.throws(() => x.press({ kind: "HIT" }, 1), InvalidPress);
  x.press({ kind: "RUN" }, 5);
  assert.throws(() => x.press({ kind: "HIT" }, 1), InvalidPress);

  // Una pulsació HIT amb un altre participant (no ve de buildPress).
  const y = session(team)
    .press({ kind: "START" })
    .press({ kind: "CHANGE_STATION", stationId: "S8" }, 10);
  const last = y.presses.at(-1)!;
  assert.throws(
    () =>
      replay(
        [
          ...y.presses,
          { seq: last.seq + 1, kind: "HIT", at: last.at + 1, participantId: "U2", stationId: "S8" },
        ],
        team,
      ),
    InvalidPress,
  );
});

test("HIT: tornar a l'última prova amb CHANGE STATION continua el recompte", () => {
  const { totals } = session(team)
    .press({ kind: "START" })
    .press({ kind: "CHANGE_STATION", stationId: "S8" }, 10)
    .press({ kind: "HIT" }, 2)
    .press({ kind: "HIT" }, 2)
    .press({ kind: "RUN" }, 2)
    .press({ kind: "CHANGE_STATION", stationId: "S2" }, 10)
    .press({ kind: "CHANGE_STATION", stationId: "S8" }, 10)
    .press({ kind: "HIT" }, 2)
    .result();
  assert.equal(hitsOf(totals, "U1", "S8"), 3);
});

test("HYROX FINISHED a mitja sessió: s'acaba a la prova on s'està", () => {
  const { state, totals } = session(team)
    .press({ kind: "START" })
    .press({ kind: "TRANSITION" }, 10)
    .press({ kind: "RUN" }, 2)
    .press({ kind: "FINISHED" }, 20)
    .result();
  assert.equal(state.phase, "finished");
  assert.equal(sec(totals.run.S1), 20);
  assert.equal(sec(totals.total), 32);
});

test("després de HYROX FINISHED no es pot prémer res", () => {
  const x = session(team)
    .press({ kind: "START" })
    .press({ kind: "FINISHED" }, 5);
  for (const action of [
    { kind: "START" },
    { kind: "SWITCH", participantId: "U2" },
    { kind: "FINISHED" },
  ] as Action[])
    assert.throws(() => x.press(action, 1), InvalidPress);
});

test("no es pot canviar al mateix participant ni durant una TRANSITION", () => {
  const x = session(team).press({ kind: "START" });
  assert.throws(
    () => x.press({ kind: "SWITCH", participantId: "U1" }),
    InvalidPress,
  );
  x.press({ kind: "TRANSITION" }, 5);
  assert.throws(
    () => x.press({ kind: "SWITCH", participantId: "U2" }),
    InvalidPress,
  );
});

test("pulsacions fora d'ordre o amb l'hora enrere es rebutgen", () => {
  const x = session(team).press({ kind: "START" });
  const [p] = x.presses;
  assert.throws(
    () => replay([p, { ...p, seq: 3, kind: "TRANSITION", at: p.at + 1 }], team),
    InvalidPress,
  );
  assert.throws(
    () => replay([p, { ...p, seq: 2, kind: "TRANSITION", at: p.at - 1 }], team),
    InvalidPress,
  );
});

test("cronòmetres en directe: el tram obert es compta fins a ara", () => {
  const x = session(team)
    .press({ kind: "START" })
    .press({ kind: "SWITCH", participantId: "U2" }, 10);
  const lastAt = x.presses.at(-1)!.at;
  const { totals } = x.result(lastAt + 7000);
  assert.equal(sec(totals.participantStation.U2.S1), 7);
  assert.equal(sec(totals.teamStation.S1), 17);
  assert.equal(sec(totals.total), 17);
  // Sense `now`, el tram obert no compta.
  assert.equal(x.result().totals.participantStation.U2, undefined);
});

test("invariant: total = proves + transicions + runs, en 500 sessions a l'atzar", () => {
  let seed = 42;
  const rand = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
  const pick = <T>(xs: T[]) => xs[Math.floor(rand() * xs.length)];

  for (let run = 0; run < 500; run++) {
    const ctx = run % 3 === 0 ? solo : team;
    const x = session(ctx).press({ kind: "START" });
    for (let step = 0; step < 60; step++) {
      const a = allowedActions(x.result().state, ctx);
      const options: Action[] = [
        ...a.switchTo.map(
          (p) => ({ kind: "SWITCH", participantId: p }) as Action,
        ),
        ...(a.transition ? [{ kind: "TRANSITION" } as Action] : []),
        ...(a.run ? [{ kind: "RUN" } as Action] : []),
        ...(a.next ? [{ kind: "NEXT_STATION" } as Action] : []),
        ...(a.change
          ? [{ kind: "CHANGE_STATION", stationId: pick(S) } as Action]
          : []),
        ...(a.pause && rand() < 0.2 ? [{ kind: "PAUSE" } as Action] : []),
        ...(a.resume ? [{ kind: "RESUME" } as Action] : []),
        ...(a.hit ? [{ kind: "HIT" } as Action] : []),
        ...(a.finish && rand() < 0.05 ? [{ kind: "FINISHED" } as Action] : []),
      ];
      if (options.length === 0) break;
      x.press(pick(options), Math.floor(rand() * 90));
    }
    const now = x.presses.at(-1)!.at + 12_345;
    for (const t of [x.result().totals, x.result(now).totals])
      assert.equal(t.total, sumOfSegments(t), `sessió ${run}`);
    // El temps d'equip a cada prova = suma dels seus participants.
    const t = x.result().totals;
    for (const st of Object.keys(t.teamStation)) {
      const parts = ctx.participants.reduce(
        (acc, p) => acc + (t.participantStation[p]?.[st] ?? 0),
        0,
      );
      assert.equal(t.teamStation[st], parts, `sessió ${run}, ${st}`);
    }
  }
});

test("PAUSA atura tots els comptadors, i CONTINUAR torna on era", () => {
  const x = session(team)
    .press({ kind: "START" })
    .press({ kind: "SWITCH", participantId: "U2" }, 10)
    .press({ kind: "PAUSE" }, 5) // U2 ha fet 5 s
    .press({ kind: "RESUME" }, 300); // 5 minuts de pausa: no compten
  const { state } = x.result();
  assert.equal(state.phase, "station");
  assert.equal(state.participantId, "U2", "continua el mateix participant");
  assert.equal(state.stationId, "S1");
  x.press({ kind: "TRANSITION" }, 7);
  const { totals } = x.result();
  assert.equal(sec(totals.participantStation.U2.S1), 5 + 7);
  assert.equal(sec(totals.teamStation.S1), 10 + 5 + 7);
  assert.equal(sec(totals.total), 22, "la pausa no compta al total");
});

test("PAUSA durant un RUN: en continuar, torna al RUN", () => {
  const x = session(team)
    .press({ kind: "START" })
    .press({ kind: "RUN" }, 10)
    .press({ kind: "PAUSE" }, 20)
    .press({ kind: "RESUME" }, 60)
    .press({ kind: "NEXT_STATION" }, 15);
  const { totals } = x.result();
  assert.equal(sec(totals.run.S1), 35);
  assert.equal(sec(totals.total), 45);
});

test("en pausa només es pot continuar o acabar; el rellotge en directe no avança", () => {
  const x = session(team).press({ kind: "START" }).press({ kind: "PAUSE" }, 10);
  const a = allowedActions(x.result().state, team);
  assert.deepEqual(
    [
      a.resume,
      a.finish,
      a.transition,
      a.run,
      a.next,
      a.change,
      a.pause,
      a.switchTo.length,
    ],
    [true, true, false, false, false, false, false, 0],
  );
  for (const action of [
    { kind: "SWITCH", participantId: "U2" },
    { kind: "TRANSITION" },
    { kind: "PAUSE" },
  ] as Action[])
    assert.throws(() => x.press(action, 1), InvalidPress);
  const lastAt = x.presses.at(-1)!.at;
  assert.equal(sec(x.result(lastAt + 60_000).totals.total), 10);
  // Acabar en pausa: completada, sense afegir el temps de pausa.
  x.press({ kind: "FINISHED" }, 30);
  assert.equal(x.result().state.phase, "finished");
  assert.equal(sec(x.result().totals.total), 10);
});

test("CONTINUAR sense pausa, o pausar abans de START, es rebutja", () => {
  const idle = session(team);
  assert.throws(() => idle.press({ kind: "PAUSE" }), InvalidPress);
  const x = session(team).press({ kind: "START" });
  assert.throws(() => x.press({ kind: "RESUME" }, 1), InvalidPress);
});

test("a l'última prova també es pot pausar", () => {
  const x = session(team)
    .press({ kind: "START" })
    .press({ kind: "CHANGE_STATION", stationId: "S8" }, 5);
  assert.equal(allowedActions(x.result().state, team).pause, true);
});
