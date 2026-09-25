"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  allowedActions,
  replay,
  type Action,
  type Press,
} from "@/lib/timing/engine";
import { formatDuration } from "@/lib/timing/summary";
import { clock } from "@/lib/clock";
import type { LoadedSession } from "@/lib/sessions";
import { SessionSummary } from "@/components/session-summary";
import { closeSession, press, undo, type PressResult } from "./actions";

const PHASE_LABEL = {
  idle: "Preparats",
  station: "Estació",
  transition: "Transició",
  run: "Run",
  finished: "Acabat",
} as const;

const big =
  "h-16 rounded-lg text-lg font-semibold disabled:opacity-30 active:scale-[0.98] transition";

export function Control({
  session,
  serverNow,
}: {
  session: LoadedSession;
  serverNow: number;
}) {
  const router = useRouter();
  const { ctx, participantNames: pName, stationNames: sName } = session;

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
    if (!running) return;
    const t = setInterval(() => setTick(Date.now()), 250);
    return () => clearInterval(t);
  }, [running]);

  // 01 §1: la pantalla es manté encesa durant la sessió.
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

  if (reentered)
    return <p className="py-10 text-center text-muted">Tancant la sessió…</p>;

  if (offline)
    return (
      <div className="flex flex-col gap-4">
        <div role="alert" className="rounded-lg bg-danger p-4 text-white">
          <p className="text-lg font-semibold">Sense connexió</p>
          <p className="text-sm">
            L&apos;última pulsació no s&apos;ha pogut guardar i la sessió
            s&apos;ha tancat. Es conserven les pulsacions guardades fins ara.
          </p>
        </div>
        <SessionSummary session={{ ...session, presses }} />
        <Link href="/" className="text-center underline">
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
        <div>
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
        <p>
          Primera prova: <strong>{sName[ctx.stations[0]]}</strong>
        </p>
        <button
          onClick={() => send({ kind: "START" })}
          disabled={pending || !allowed.start}
          className={`${big} h-24 bg-accent text-2xl text-black`}
        >
          START
        </button>
        {message && <p className="text-sm text-danger">{message}</p>}
        <Link href="/" className="text-center text-sm text-muted underline">
          Cancel·lar
        </Link>
      </div>
    );

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-baseline justify-between">
        <span className="text-sm text-muted">Total Hyrox</span>
        <span className="font-mono text-3xl font-bold tabular-nums">
          {formatDuration(totals.total)}
        </span>
      </header>

      <section className="rounded-lg border border-border p-4">
        <p className="text-sm text-muted">
          {stationIndex}/{ctx.stations.length} · {PHASE_LABEL[state.phase]}
        </p>
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="min-w-0 truncate text-2xl font-semibold">
            {st ? sName[st] : ""}
          </h1>
          <span className="font-mono text-4xl font-bold tabular-nums">
            {formatDuration(phaseTime ?? 0)}
          </span>
        </div>
      </section>

      {/* Participants: tocar-ne un el fa actiu a l'estació (§5). */}
      <section className="flex flex-col gap-2">
        {ctx.participants.map((p) => {
          const active = state.phase === "station" && state.participantId === p;
          const ms = st ? (totals.participantStation[p]?.[st] ?? 0) : 0;
          return (
            <button
              key={p}
              onClick={() => send({ kind: "SWITCH", participantId: p })}
              disabled={pending || !allowed.switchTo.includes(p)}
              className={`flex h-14 items-center justify-between rounded-lg border px-4 text-lg ${
                active
                  ? "border-accent bg-accent/20 font-semibold disabled:opacity-100"
                  : "border-border disabled:opacity-40"
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

      <section className="grid grid-cols-2 gap-2">
        <button
          onClick={() => send({ kind: "TRANSITION" })}
          disabled={pending || !allowed.transition}
          className={`${big} border border-border`}
        >
          TRANSITION
        </button>
        <button
          onClick={() => send({ kind: "RUN" })}
          disabled={pending || !allowed.run}
          className={`${big} border border-border`}
        >
          RUN
        </button>
        <button
          onClick={() => send({ kind: "NEXT_STATION" })}
          disabled={pending || !allowed.next}
          className={`${big} bg-foreground text-background`}
        >
          NEXT STATION
        </button>
        <button
          onClick={() => setModal("change")}
          disabled={pending || !allowed.change}
          className={`${big} border border-border`}
        >
          CHANGE STATION
        </button>
      </section>

      {message && <p className="text-sm text-danger">{message}</p>}

      <section className="mt-2 grid grid-cols-[1fr_2fr] gap-2">
        <button
          onClick={() => act(() => undo(session.id))}
          disabled={pending || presses.length === 0}
          className={`${big} h-12 border border-border text-base`}
        >
          ↶ Desfer
        </button>
        <button
          onClick={() => setModal("finish")}
          disabled={pending || !allowed.finish}
          className={`${big} h-12 bg-danger text-base text-white`}
        >
          HYROX FINISHED
        </button>
      </section>

      {modal === "change" && (
        <Modal title="Canviar d'estació" onClose={() => setModal(null)}>
          <p className="mb-3 text-sm text-muted">
            El temps continua comptant a{" "}
            {PHASE_LABEL[state.phase].toLowerCase()} fins que triïs.
          </p>
          <ul className="flex flex-col gap-2">
            {ctx.stations.map((s, i) => (
              <li key={s}>
                <button
                  onClick={() => send({ kind: "CHANGE_STATION", stationId: s })}
                  disabled={pending}
                  className={`flex h-12 w-full items-center gap-3 rounded-md border px-3 text-left ${
                    s === st ? "border-accent" : "border-border"
                  }`}
                >
                  <span className="w-5 font-mono text-muted">{i + 1}</span>
                  {sName[s]}
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
              className={`${big} border border-border`}
            >
              NO
            </button>
            <button
              onClick={() => send({ kind: "FINISHED" })}
              disabled={pending}
              className={`${big} bg-danger text-white`}
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
      className="fixed inset-0 z-10 flex items-end justify-center bg-black/50 sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label={title}
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-xl bg-background p-4 sm:rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-2 text-lg font-semibold">{title}</h2>
        {children}
      </div>
    </div>
  );
}
