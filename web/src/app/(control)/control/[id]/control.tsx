"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  allowedActions,
  replay,
  type Action,
  type Press,
  type PressKind,
} from "@/lib/timing/engine";
import { formatDuration } from "@/lib/timing/summary";
import { clock } from "@/lib/clock";
import { beep } from "@/lib/beep";
import type { LoadedSession } from "@/lib/sessions";
import { SessionSummary } from "@/components/session-summary";
import { closeSession, press, type PressResult } from "./actions";

/**
 * Colors del sistema d'Apple per als cinc botons. `tint` és el fons suau que
 * pren la pantalla quan és l'últim botó premut.
 */
const COLORS = {
  TRANSITION: { solid: "#FF9500", text: "#fff" },
  RUN: { solid: "#34C759", text: "#fff" },
  NEXT_STATION: { solid: "#007AFF", text: "#fff" },
  CHANGE_STATION: { solid: "#5856D6", text: "#fff" },
  PAUSE: { solid: "#8E8E93", text: "#fff" },
  RESUME: { solid: "#FFCC00", text: "#000" },
} as const;

/**
 * Color de fons segons l'últim dels cinc botons premut. Els canvis de
 * participant no el canvien; CONTINUAR torna el color d'abans de la pausa.
 */
function backgroundKind(presses: Press[]) {
  let current: PressKind | null = null;
  let beforePause: PressKind | null = null;
  for (const p of presses) {
    if (p.kind === "PAUSE") {
      beforePause = current;
      current = "PAUSE";
    } else if (p.kind === "RESUME") current = beforePause;
    else if (p.kind in COLORS) current = p.kind;
  }
  return current as keyof typeof COLORS | null;
}

const PHASE_LABEL = {
  idle: "Preparats",
  station: "Estació",
  transition: "Roxzone",
  run: "Run",
  finished: "Acabat",
} as const;

const bigButton =
  "flex h-14 w-full items-center justify-center rounded-2xl text-lg font-semibold transition active:scale-[0.98] disabled:opacity-30";

export function Control({
  session,
  serverNow,
}: {
  session: LoadedSession;
  serverNow: number;
}) {
  const router = useRouter();
  const {
    ctx,
    participantNames: pName,
    stationNames: sName,
    stationDetails,
  } = session;

  const [presses, setPresses] = useState<Press[]>(session.presses);
  // Desfasament entre el rellotge del servidor (hora de les pulsacions) i el
  // del mòbil (cronòmetres en directe). Es corregeix a cada resposta.
  const [offset, setOffset] = useState(() => serverNow - Date.now());
  const [tick, setTick] = useState(() => Date.now());
  const [pending, setPending] = useState(false);
  const [offline, setOffline] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [modal, setModal] = useState<null | "change" | "finish">(null);

  // 01 §1: tornar a entrar a una sessió començada la tanca (interrompuda).
  const [reentered] = useState(() => session.presses.length > 0);
  useEffect(() => {
    if (!reentered) return;
    closeSession(session.id).finally(() => router.refresh());
  }, [reentered, session.id, router]);

  const { state, totals } = useMemo(
    () => replay(presses, ctx, tick + offset),
    [presses, ctx, tick, offset],
  );
  const running =
    !offline &&
    (state.phase === "station" ||
      state.phase === "transition" ||
      state.phase === "run");

  // Cronòmetres en directe.
  useEffect(() => {
    if (!running || state.paused) return;
    const t = setInterval(() => setTick(Date.now()), 250);
    return () => clearInterval(t);
  }, [running, state.paused]);

  // 01 §1: la pantalla es manté encesa durant la sessió (també en pausa).
  useEffect(() => {
    if (!running || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    const request = () =>
      navigator.wakeLock.request("screen").then(
        (l) => (lock = l),
        () => {},
      );
    request();
    // El navegador allibera el bloqueig si la pestanya passa a segon pla.
    const onVisible = () => document.visibilityState === "visible" && request();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      lock?.release().catch(() => {});
    };
  }, [running]);

  // El fons de tota la pantalla pren un to suau del color de l'últim botó.
  const bg = offline ? null : backgroundKind(presses);
  useEffect(() => {
    const body = document.body.style;
    body.transition = "background-color 300ms ease";
    body.backgroundColor = bg
      ? `color-mix(in srgb, ${COLORS[bg].solid} 14%, var(--background))`
      : "";
    return () => {
      body.backgroundColor = "";
    };
  }, [bg]);

  async function act(call: () => Promise<PressResult>) {
    if (pending || offline) return;
    setPending(true);
    setMessage(null);
    try {
      const r = await call();
      if (r.ok) {
        setPresses(r.presses);
        setOffset(r.serverNow - clock());
        setTick(clock());
        if (r.presses.at(-1)?.kind === "FINISHED") router.refresh();
      } else if (r.reason === "failed") {
        setOffline(true); // 01 §1: tall → la sessió es tanca.
      } else if (r.reason === "closed") {
        router.refresh();
      } else {
        setMessage(r.message);
      }
    } catch {
      setOffline(true); // Sense resposta: mòbil, Pi o Supabase.
    } finally {
      setPending(false);
      setModal(null);
    }
  }

  const send = (action: Action) => act(() => press(session.id, action));
  /** Els cinc botons i START fan un bip en prémer-los. */
  const sendWithBeep = (action: Action) => {
    if (pending) return;
    // El canvi de participant té un bip propi, diferent del dels botons.
    beep(action.kind === "SWITCH" ? "switch" : "action");
    send(action);
  };

  if (reentered)
    return <p className="py-10 text-center text-muted">Tancant la sessió…</p>;

  if (offline)
    return (
      <div className="flex flex-col gap-4">
        <div role="alert" className="rounded-2xl bg-danger p-4 text-white">
          <p className="text-lg font-semibold">Sense connexió</p>
          <p className="text-sm">
            L&apos;última pulsació no s&apos;ha pogut guardar i la sessió
            s&apos;ha tancat. Es conserven les pulsacions guardades fins ara.
          </p>
        </div>
        <SessionSummary session={{ ...session, presses }} />
        <Link href="/" className="text-center text-[#007AFF]">
          Tornar a l&apos;inici
        </Link>
      </div>
    );

  const allowed = allowedActions(state, ctx);
  const st = state.stationId;
  const stationIndex = st ? ctx.stations.indexOf(st) + 1 : 0;
  const phaseTime =
    st === null
      ? 0
      : state.phase === "station"
        ? totals.teamStation[st]
        : state.phase === "transition"
          ? totals.transition[st]
          : state.phase === "run"
            ? totals.run[st]
            : 0;

  if (state.phase === "idle")
    return (
      <div className="flex flex-col gap-6 pt-4">
        <div className="rounded-2xl bg-[#f2f2f7] p-4 dark:bg-[#1c1c1e]">
          <p className="text-sm text-muted">
            {session.mode === "team" ? "Mode Equip" : "Mode Individual"}
          </p>
          <ol className="mt-2 flex flex-col gap-1 text-lg">
            {ctx.participants.map((p, i) => (
              <li key={p}>
                <span className="mr-2 font-mono text-muted">{i + 1}</span>
                {pName[p]}
              </li>
            ))}
          </ol>
        </div>
        <p className="px-1">
          Primera prova: <strong>{sName[ctx.stations[0]]}</strong>
          {stationDetails[ctx.stations[0]] && (
            <span className="text-muted">
              {" "}
              · {stationDetails[ctx.stations[0]]}
            </span>
          )}
        </p>
        <button
          onClick={() => sendWithBeep({ kind: "START" })}
          disabled={pending || !allowed.start}
          className={`${bigButton} h-24 bg-[#FFCC00] text-3xl text-black`}
        >
          START
        </button>
        {message && <p className="text-sm text-danger">{message}</p>}
        <Link href="/" className="text-center text-sm text-[#007AFF]">
          Cancel·lar
        </Link>
      </div>
    );

  const coloredButtons: {
    kind: "TRANSITION" | "RUN" | "NEXT_STATION" | "CHANGE_STATION";
    label: string;
    enabled: boolean;
    onPress: () => void;
  }[] = [
    {
      kind: "TRANSITION",
      label: "ROXZONE",
      enabled: allowed.transition,
      onPress: () => sendWithBeep({ kind: "TRANSITION" }),
    },
    {
      kind: "RUN",
      label: "RUN",
      enabled: allowed.run,
      onPress: () => sendWithBeep({ kind: "RUN" }),
    },
    {
      kind: "NEXT_STATION",
      label: "NEXT STATION",
      enabled: allowed.next,
      onPress: () => sendWithBeep({ kind: "NEXT_STATION" }),
    },
    {
      kind: "CHANGE_STATION",
      label: "CHANGE STATION",
      enabled: allowed.change,
      onPress: () => {
        beep();
        setModal("change");
      },
    },
  ];
  const pauseKind = state.paused ? "RESUME" : "PAUSE";

  return (
    <div className="flex flex-col gap-3">
      {/* Cronòmetres: total i fase actual. */}
      <section className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-black/5 p-3 dark:bg-white/10">
          <p className="text-xs text-muted">Total</p>
          <p className="font-mono text-3xl font-semibold tabular-nums">
            {formatDuration(totals.total)}
          </p>
        </div>
        <div className="rounded-2xl bg-black/5 p-3 dark:bg-white/10">
          <p className="text-xs text-muted">
            {state.paused ? "En pausa" : PHASE_LABEL[state.phase]}
          </p>
          <p className="font-mono text-3xl font-semibold tabular-nums">
            {formatDuration(phaseTime ?? 0)}
          </p>
        </div>
      </section>

      {/* Estació, distància i pes en una sola línia. */}
      <p className="truncate px-1 text-lg">
        <span className="font-semibold">
          {stationIndex} · {st ? sName[st] : ""}
        </span>
        {st && stationDetails[st] && (
          <span className="text-muted"> · {stationDetails[st]}</span>
        )}
      </p>

      {/* Participants, un sota l'altre: tocar-ne un el fa actiu (§5). */}
      <section className="flex flex-col gap-1.5">
        {ctx.participants.map((p) => {
          const active = state.phase === "station" && state.participantId === p;
          const ms = st ? (totals.participantStation[p]?.[st] ?? 0) : 0;
          return (
            <button
              key={p}
              onClick={() =>
                sendWithBeep({ kind: "SWITCH", participantId: p })
              }
              disabled={pending || !allowed.switchTo.includes(p)}
              className={`flex h-12 items-center justify-between rounded-xl bg-white/80 px-4 text-lg dark:bg-white/10 ${
                active
                  ? "border-2 border-[#34C759] font-semibold disabled:opacity-100"
                  : "border border-black/10 disabled:opacity-50 dark:border-white/15"
              }`}
            >
              <span>{pName[p]}</span>
              <span className="font-mono tabular-nums">
                {formatDuration(ms)}
              </span>
            </button>
          );
        })}
      </section>

      {/* Els cinc botons, a tota l'amplada i cadascun d'un color. */}
      <section className="mt-1 flex flex-col gap-2">
        {coloredButtons.map((b) => (
          <button
            key={b.kind}
            onClick={b.onPress}
            disabled={pending || !b.enabled}
            className={bigButton}
            style={{
              backgroundColor: COLORS[b.kind].solid,
              color: COLORS[b.kind].text,
            }}
          >
            {b.label}
          </button>
        ))}
        <button
          onClick={() =>
            sendWithBeep({ kind: state.paused ? "RESUME" : "PAUSE" })
          }
          disabled={pending || !(allowed.pause || allowed.resume)}
          className={bigButton}
          style={{
            backgroundColor: COLORS[pauseKind].solid,
            color: COLORS[pauseKind].text,
          }}
        >
          {state.paused ? "▶  CONTINUAR" : "❚❚  PAUSA"}
        </button>
      </section>

      {message && <p className="text-sm text-danger">{message}</p>}

      <button
        onClick={() => setModal("finish")}
        disabled={pending || !allowed.finish}
        className="mt-2 h-12 w-full rounded-full bg-[#FF3B30] text-base font-semibold text-white transition active:scale-[0.98] disabled:opacity-30"
      >
        HYROX FINISHED
      </button>

      {modal === "change" && (
        <Modal title="Canviar d'estació" onClose={() => setModal(null)}>
          <p className="mb-3 text-sm text-muted">
            El temps continua comptant a{" "}
            {PHASE_LABEL[state.phase].toLowerCase()} fins que triïs.
          </p>
          <ul className="overflow-hidden rounded-xl bg-[#f2f2f7] dark:bg-[#1c1c1e]">
            {ctx.stations.map((s, i) => (
              <li
                key={s}
                className="border-b border-black/10 last:border-0 dark:border-white/10"
              >
                <button
                  onClick={() => send({ kind: "CHANGE_STATION", stationId: s })}
                  disabled={pending}
                  className="flex h-12 w-full items-center gap-3 px-4 text-left"
                >
                  <span className="w-5 font-mono text-muted">{i + 1}</span>
                  <span className={s === st ? "font-semibold" : ""}>
                    {sName[s]}
                  </span>
                  {stationDetails[s] && (
                    <span className="ml-auto text-sm text-muted">
                      {stationDetails[s]}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </Modal>
      )}

      {modal === "finish" && (
        <Modal title="Acabar el Hyrox?" onClose={() => setModal(null)}>
          <p className="mb-4 text-sm text-muted">
            S&apos;aturen tots els comptadors i la sessió queda completada.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setModal(null)}
              className="h-12 rounded-full bg-[#f2f2f7] text-base font-semibold dark:bg-[#2c2c2e]"
            >
              NO
            </button>
            <button
              onClick={() => send({ kind: "FINISHED" })}
              disabled={pending}
              className="h-12 rounded-full bg-[#FF3B30] text-base font-semibold text-white disabled:opacity-50"
            >
              YES
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-10 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label={title}
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-background p-5 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-2 text-lg font-semibold">{title}</h2>
        {children}
      </div>
    </div>
  );
}
