"use client";

import Link from "next/link";
import { useState } from "react";
import type { SessionStatus } from "@/lib/sessions";
import { deleteSession } from "./actions";
import { chevron, errorText, group, row } from "@/components/ui";

const STATUS_STYLE = {
  completada: "text-success",
  interrompuda: "text-danger",
  "en curs": "text-tint",
} as const;

export type SessionItem = {
  id: string;
  /** Hora de START (l'inici real de la prova). */
  startedAt: string;
  names: string[];
  status: SessionStatus;
};

const when = (iso: string) =>
  new Date(iso).toLocaleString("ca-ES", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Madrid",
  });

/** Llista de sessions, de la més nova a la més antiga, amb botó d'esborrar. */
export function SessionList({ sessions }: { sessions: SessionItem[] }) {
  const [toDelete, setToDelete] = useState<SessionItem | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmDelete() {
    if (!toDelete) return;
    setPending(true);
    setError(null);
    try {
      const r = await deleteSession(toDelete.id);
      if (r.ok) setToDelete(null);
      else setError("No s'ha pogut esborrar la sessió.");
    } catch {
      setError("No s'ha pogut esborrar la sessió.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <ul className={group}>
        {sessions.map((s) => (
          <li key={s.id} className="flex items-center">
            <Link
              href={`/control/${s.id}`}
              prefetch={false}
              className={`${row} min-w-0 flex-1 active:bg-black/5`}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[17px]">
                  {s.names.join(", ")}
                </span>
                <span className="text-[13px] text-muted">
                  {when(s.startedAt)}
                </span>
              </span>
              <span className={`text-[15px] ${STATUS_STYLE[s.status]}`}>
                {s.status}
              </span>
              <span className={chevron}>›</span>
            </Link>
            <button
              onClick={() => {
                setError(null);
                setToDelete(s);
              }}
              aria-label={`Esborrar la sessió de ${s.names.join(", ")}`}
              className="flex h-11 w-12 shrink-0 items-center justify-center text-danger active:opacity-60"
            >
              <TrashIcon />
            </button>
          </li>
        ))}
      </ul>

      {toDelete && (
        <div
          className="fixed inset-0 z-20 flex items-end justify-center bg-black/40 sm:items-center"
          onClick={() => !pending && setToDelete(null)}
        >
          <div
            role="alertdialog"
            aria-label="Esborrar la sessió"
            className="w-full max-w-md rounded-t-3xl bg-card p-5 sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-2 text-lg font-semibold">Esborrar la sessió?</h2>
            <p className="mb-1 text-[15px]">
              {toDelete.names.join(", ")} · {when(toDelete.startedAt)}
            </p>
            <p className="mb-4 text-[15px] text-muted">
              S&apos;esborrarà completament, amb tots els temps i resultats, i
              no es podrà recuperar.
            </p>
            {error && <p className={`${errorText} mb-3`}>{error}</p>}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setToDelete(null)}
                disabled={pending}
                className="h-12 rounded-full bg-black/5 text-base font-semibold disabled:opacity-50 dark:bg-white/10"
              >
                Cancel·lar
              </button>
              <button
                onClick={confirmDelete}
                disabled={pending}
                className="h-12 rounded-full bg-danger text-base font-semibold text-white disabled:opacity-50"
              >
                {pending ? "Esborrant…" : "Esborrar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function TrashIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}
