"use client";

import { useState, useTransition } from "react";
import { sendEmailTo } from "./actions";

type Recipient = {
  id: string;
  name: string;
  email: string;
  sentAt: string | null;
  error: string | null;
};

const when = (iso: string) =>
  new Date(iso).toLocaleString("ca-ES", {
    timeZone: "Europe/Madrid",
    dateStyle: "short",
    timeStyle: "short",
  });

/**
 * Enviament dels resultats, participant per participant. Res no s'envia sense
 * que l'operador ho confirmi a la pregunta de verificació.
 */
export function EmailPanel({
  sessionId,
  recipients,
}: {
  sessionId: string;
  recipients: Recipient[];
}) {
  const [confirming, setConfirming] = useState<Recipient | null>(null);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const send = (r: Recipient) =>
    startTransition(async () => {
      const res = await sendEmailTo(sessionId, r.id);
      setMessage(res.ok ? `Correu enviat a ${r.name}.` : res.message);
      setConfirming(null);
    });

  return (
    <section className="flex flex-col gap-2">
      <h2 className="px-4 text-[13px] uppercase tracking-wide text-muted">
        Enviar resultats per correu
      </h2>
      <ul className="divide-y divide-separator overflow-hidden rounded-xl bg-card">
        {recipients.map((r) => (
          <li key={r.id} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-[17px]">{r.name}</p>
              <p className="truncate text-sm text-muted">{r.email}</p>
              {r.sentAt ? (
                <p className="text-[13px] text-success">
                  ✓ Enviat {when(r.sentAt)}
                </p>
              ) : r.error ? (
                <p className="text-[13px] text-danger">
                  No s&apos;ha pogut enviar: {r.error}
                </p>
              ) : null}
            </div>
            <button
              onClick={() => setConfirming(r)}
              disabled={pending}
              className="h-9 shrink-0 rounded-full bg-tint px-4 text-[15px] font-semibold text-white disabled:opacity-50"
            >
              {r.sentAt ? "Reenviar" : "Enviar"}
            </button>
          </li>
        ))}
      </ul>
      {message && <p className="px-4 text-[13px]">{message}</p>}

      {confirming && (
        <div
          className="fixed inset-0 z-10 flex items-end justify-center bg-black/40 sm:items-center"
          onClick={() => !pending && setConfirming(null)}
        >
          <div
            role="dialog"
            aria-label="Confirmar l'enviament"
            className="w-full max-w-md rounded-t-3xl bg-card p-5 sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-2 text-lg font-semibold">
              Enviar els resultats a {confirming.name}?
            </h2>
            <p className="mb-4 break-all text-sm text-muted">
              {confirming.email}
              {confirming.sentAt && " · ja se li van enviar una vegada"}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setConfirming(null)}
                disabled={pending}
                className="h-12 rounded-full bg-black/5 text-base font-semibold dark:bg-white/10"
              >
                No
              </button>
              <button
                onClick={() => send(confirming)}
                disabled={pending}
                className="h-12 rounded-full bg-tint text-base font-semibold text-white disabled:opacity-50"
              >
                {pending ? "Enviant…" : "Sí, enviar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
