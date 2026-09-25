"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { resendEmail } from "./actions";
import { buttonSecondary } from "@/components/ui";

/**
 * Estat del correu d'una sessió completada. Just després de HYROX FINISHED el
 * correu encara s'està enviant (after()): la pàgina es refresca uns quants
 * cops fins que hi ha resultat.
 */
export function EmailStatus({
  sessionId,
  sentAt,
  error,
}: {
  sessionId: string;
  sentAt: string | null;
  error: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const waiting = !sentAt && !error;

  useEffect(() => {
    if (!waiting) return;
    let tries = 0;
    const t = setInterval(() => {
      if (++tries > 10) clearInterval(t);
      router.refresh();
    }, 3000);
    return () => clearInterval(t);
  }, [waiting, router]);

  const resend = () =>
    startTransition(async () => {
      const r = await resendEmail(sessionId);
      setMessage(r.message);
    });

  return (
    <div className="rounded-md border border-border p-3 text-sm">
      {sentAt ? (
        <p>
          ✉️ Resultats enviats per correu (
          {new Date(sentAt).toLocaleString("ca-ES", {
            timeZone: "Europe/Madrid",
            timeStyle: "short",
            dateStyle: "short",
          })}
          ).
        </p>
      ) : waiting ? (
        <p className="text-muted">✉️ Enviant els resultats per correu…</p>
      ) : (
        <p className="text-danger">
          ✉️ No s&apos;ha pogut enviar el correu: {error}
        </p>
      )}
      {!waiting && (
        <button
          onClick={resend}
          disabled={pending}
          className={`${buttonSecondary} mt-2 h-9 px-3 text-sm`}
        >
          {pending ? "Enviant…" : sentAt ? "Tornar a enviar" : "Reintentar"}
        </button>
      )}
      {message && <p className="mt-2">{message}</p>}
    </div>
  );
}
