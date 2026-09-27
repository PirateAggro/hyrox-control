/**
 * Motor de temps de Hyrox Control (01 §5). Funcions pures: sense base de
 * dades, sense rellotge i sense React, perquè es puguin provar soles.
 *
 * MODEL
 * Només es guarden pulsacions. Cada pulsació tanca el tram que estava obert i
 * n'obre un de nou; tots els temps són sumes de trams:
 *
 *   tram d'ESTACIÓ (estació e, participant p) → "Usuari p – Prova e"
 *                                              i "Equip – Prova e"
 *   tram de TRANSITION després de l'estació e → "Equip – Transició e"
 *   tram de RUN després de l'estació e        → "Equip – Run e"
 *   de START a FINISHED                       → "Equip – Total Hyrox"
 *
 * Un tram dura fins a la pulsació següent. D'aquí surten dues regles del §5
 * sense codi especial:
 *  - NEXT/CHANGE STATION des d'una TRANSITION o un RUN: el temps fins a la
 *    pulsació (inclòs el de triar estació a CHANGE) queda a aquella TRANSITION
 *    o RUN. La pulsació CHANGE_STATION es guarda quan es tria l'estació.
 *  - NEXT/CHANGE STATION directament des de l'estació: el temps queda a
 *    l'estació.
 *
 * Tornar a una estació ja feta (CHANGE STATION enrere) acumula els temps sota
 * la mateixa clau.
 *
 * PAUSA atura tots els comptadors: tanca el tram obert i no n'obre cap fins a
 * RESUME, que en torna a obrir un de la mateixa fase, estació i participant. El
 * temps de pausa no compta enlloc, ni al total: el total és la suma de trams.
 *
 * Cada pulsació porta l'estació i el participant on comença el tram nou, així
 * que l'històric es pot recalcular encara que després es canviï l'ordre de les
 * estacions.
 */

export type PressKind =
  | "START"
  | "SWITCH"
  | "TRANSITION"
  | "RUN"
  | "NEXT_STATION"
  | "CHANGE_STATION"
  | "PAUSE"
  | "RESUME"
  | "FINISHED";

export type Press = {
  seq: number;
  kind: PressKind;
  /** Mil·lisegons (rellotge del servidor de la Pi). */
  at: number;
  participantId?: string | null;
  stationId?: string | null;
};

/** Context fix de la sessió. */
export type SessionContext = {
  /** Participants per ordre de posició (el primer és el "número 1"). */
  participants: string[];
  /** Estacions actives. L'ordre de la llista és l'ordre d'execució. */
  stations: string[];
};

export type Phase = "idle" | "station" | "transition" | "run" | "finished";

export type State = {
  phase: Phase;
  /** Estació actual, o l'estació a la qual pertany la transició/run. */
  stationId: string | null;
  /** Participant actiu (només té sentit a la fase "station"). */
  participantId: string | null;
  startedAt: number | null;
  segmentStart: number | null;
  finishedAt: number | null;
  /** En pausa: cap tram obert fins a RESUME. */
  paused: boolean;
  lastSeq: number;
  lastAt: number | null;
};

type ByKey = Record<string, number>;

export type Totals = {
  /** participant → estació → ms */
  participantStation: Record<string, ByKey>;
  teamStation: ByKey;
  transition: ByKey;
  run: ByKey;
  /** Estacions en l'ordre en què s'han visitat per primer cop. */
  stationOrder: string[];
  /** Temps total de la sessió: suma de tots els trams (sense pauses). */
  total: number;
};

export class InvalidPress extends Error {
  readonly seq: number;
  constructor(seq: number, message: string) {
    super(`Pulsació ${seq}: ${message}`);
    this.seq = seq;
  }
}

const INITIAL: State = {
  phase: "idle",
  stationId: null,
  participantId: null,
  startedAt: null,
  segmentStart: null,
  finishedAt: null,
  paused: false,
  lastSeq: 0,
  lastAt: null,
};

function emptyTotals(): Totals {
  return {
    participantStation: {},
    teamStation: {},
    transition: {},
    run: {},
    stationOrder: [],
    total: 0,
  };
}

function add(map: ByKey, key: string, ms: number) {
  map[key] = (map[key] ?? 0) + ms;
}

/** Suma el tram obert (de segmentStart fins a `until`) als totals. */
function closeSegment(state: State, totals: Totals, until: number) {
  if (state.segmentStart === null || state.stationId === null) return;
  const ms = until - state.segmentStart;
  const s = state.stationId;
  if (state.phase === "station" && state.participantId) {
    const perStation = (totals.participantStation[state.participantId] ??= {});
    add(perStation, s, ms);
    add(totals.teamStation, s, ms);
  } else if (state.phase === "transition") {
    add(totals.transition, s, ms);
  } else if (state.phase === "run") {
    add(totals.run, s, ms);
  }
}

function isLastStation(stationId: string | null, ctx: SessionContext) {
  return stationId !== null && stationId === ctx.stations.at(-1);
}

/** Què es pot prémer en cada moment. La pantalla i el servidor en depenen. */
export function allowedActions(state: State, ctx: SessionContext) {
  const none = {
    start: false,
    switchTo: [] as string[],
    transition: false,
    run: false,
    next: false,
    change: false,
    pause: false,
    resume: false,
    finish: false,
  };
  // En pausa només es pot continuar o acabar.
  if (state.paused) return { ...none, resume: true, finish: true };
  switch (state.phase) {
    case "idle":
      return {
        ...none,
        start: ctx.stations.length > 0 && ctx.participants.length > 0,
      };
    case "finished":
      return none;
    case "station": {
      const switchTo = ctx.participants.filter(
        (p) => p !== state.participantId,
      );
      // §5: a l'última prova només HYROX FINISHED (i, en equip, canviar de
      // participant).
      if (isLastStation(state.stationId, ctx))
        return { ...none, switchTo, pause: true, finish: true };
      const hasNext = nextStationAfter(state.stationId, ctx) !== null;
      return {
        ...none,
        switchTo,
        transition: true,
        run: true,
        next: hasNext,
        change: true,
        pause: true,
        finish: true,
      };
    }
    case "transition":
      return {
        ...none,
        run: true,
        next: nextStationAfter(state.stationId, ctx) !== null,
        change: true,
        pause: true,
        finish: true,
      };
    case "run":
      // §5: no es pot fer RUN → TRANSITION.
      return {
        ...none,
        next: nextStationAfter(state.stationId, ctx) !== null,
        change: true,
        pause: true,
        finish: true,
      };
  }
}

function nextStationAfter(stationId: string | null, ctx: SessionContext) {
  const i = stationId === null ? -1 : ctx.stations.indexOf(stationId);
  if (i < 0) return null;
  return ctx.stations[i + 1] ?? null;
}

/** Aplica una pulsació. Llança InvalidPress si no està permesa. */
export function applyPress(
  state: State,
  totals: Totals,
  press: Press,
  ctx: SessionContext,
): State {
  const fail = (msg: string) => {
    throw new InvalidPress(press.seq, msg);
  };
  if (press.seq !== state.lastSeq + 1)
    fail(`s'esperava el número ${state.lastSeq + 1}`);
  if (state.lastAt !== null && press.at < state.lastAt)
    fail("l'hora és anterior a la de la pulsació prèvia");

  const allowed = allowedActions(state, ctx);
  const base = { ...state, lastSeq: press.seq, lastAt: press.at };

  const enterStation = (stationId: string | null | undefined) => {
    if (!stationId || !ctx.stations.includes(stationId))
      fail("estació desconeguda");
    const participantId = press.participantId ?? ctx.participants[0];
    if (!ctx.participants.includes(participantId))
      fail("participant desconegut");
    if (!totals.stationOrder.includes(stationId!))
      totals.stationOrder.push(stationId!);
    return {
      ...base,
      phase: "station" as const,
      stationId: stationId!,
      participantId,
      segmentStart: press.at,
    };
  };

  switch (press.kind) {
    case "START":
      if (!allowed.start) fail("START no està permès ara");
      return {
        ...enterStation(press.stationId ?? ctx.stations[0]),
        startedAt: press.at,
      };

    case "SWITCH":
      if (
        !press.participantId ||
        !allowed.switchTo.includes(press.participantId)
      )
        fail("canvi de participant no permès");
      closeSegment(state, totals, press.at);
      return {
        ...base,
        participantId: press.participantId!,
        segmentStart: press.at,
      };

    case "TRANSITION":
      if (!allowed.transition) fail("TRANSITION no està permès ara");
      closeSegment(state, totals, press.at);
      return {
        ...base,
        phase: "transition",
        participantId: null,
        segmentStart: press.at,
      };

    case "RUN":
      if (!allowed.run) fail("RUN no està permès ara");
      closeSegment(state, totals, press.at);
      return {
        ...base,
        phase: "run",
        participantId: null,
        segmentStart: press.at,
      };

    case "NEXT_STATION": {
      if (!allowed.next) fail("NEXT STATION no està permès ara");
      const expected = nextStationAfter(state.stationId, ctx);
      if (press.stationId && press.stationId !== expected)
        fail("NEXT STATION ha d'anar a l'estació següent");
      closeSegment(state, totals, press.at);
      return enterStation(expected);
    }

    case "CHANGE_STATION":
      if (!allowed.change) fail("CHANGE STATION no està permès ara");
      closeSegment(state, totals, press.at);
      return enterStation(press.stationId);

    case "PAUSE":
      if (!allowed.pause) fail("PAUSA no està permès ara");
      closeSegment(state, totals, press.at);
      return { ...base, paused: true, segmentStart: null };

    case "RESUME":
      if (!allowed.resume) fail("CONTINUAR no està permès ara");
      // Torna a la mateixa fase, estació i participant d'abans de la pausa.
      return { ...base, paused: false, segmentStart: press.at };

    case "FINISHED":
      if (!allowed.finish) fail("HYROX FINISHED no està permès ara");
      closeSegment(state, totals, press.at);
      return {
        ...base,
        phase: "finished",
        participantId: null,
        paused: false,
        segmentStart: null,
        finishedAt: press.at,
      };
  }
}

/**
 * Reprodueix totes les pulsacions d'una sessió.
 *
 * Amb `now`, el tram obert es compta fins a `now` (cronòmetres en directe);
 * sense `now`, només compten els trams tancats.
 */
export function replay(presses: Press[], ctx: SessionContext, now?: number) {
  let state = INITIAL;
  const totals = emptyTotals();
  for (const p of [...presses].sort((a, b) => a.seq - b.seq))
    state = applyPress(state, totals, p, ctx);

  if (now !== undefined && state.phase !== "idle" && state.phase !== "finished")
    closeSegment(state, totals, Math.max(now, state.segmentStart ?? now));

  // Suma de trams: el temps en pausa no hi és.
  const sum = (m: ByKey) => Object.values(m).reduce((a, b) => a + b, 0);
  totals.total =
    sum(totals.teamStation) + sum(totals.transition) + sum(totals.run);

  return { state, totals };
}

/**
 * Construeix la pulsació següent a partir d'una acció de la pantalla, omplint
 * l'estació i el participant on comença el tram nou. La valida aplicant-la
 * sobre una còpia: si no és permesa, llança InvalidPress.
 */
export type Action =
  | { kind: "START" }
  | { kind: "SWITCH"; participantId: string }
  | { kind: "TRANSITION" }
  | { kind: "RUN" }
  | { kind: "NEXT_STATION" }
  | { kind: "CHANGE_STATION"; stationId: string }
  | { kind: "PAUSE" }
  | { kind: "RESUME" }
  | { kind: "FINISHED" };

export function buildPress(
  presses: Press[],
  ctx: SessionContext,
  action: Action,
  at: number,
): Press {
  const { state } = replay(presses, ctx);
  const press: Press = { seq: state.lastSeq + 1, kind: action.kind, at };

  switch (action.kind) {
    case "START":
      press.stationId = ctx.stations[0];
      press.participantId = ctx.participants[0];
      break;
    case "SWITCH":
      press.participantId = action.participantId;
      break;
    case "NEXT_STATION":
      // §5: segueix l'ordre de les estacions, i comença el participant 1.
      press.stationId = nextStationAfter(state.stationId, ctx);
      press.participantId = ctx.participants[0];
      break;
    case "CHANGE_STATION":
      press.stationId = action.stationId;
      press.participantId = ctx.participants[0];
      break;
  }

  // Valida sense tocar l'estat real.
  applyPress(state, emptyTotals(), press, ctx);
  return press;
}

/** Suma de temps d'estació d'un participant ("Usuari – Total proves"). */
export function participantTotal(totals: Totals, participantId: string) {
  return Object.values(totals.participantStation[participantId] ?? {}).reduce(
    (a, b) => a + b,
    0,
  );
}
