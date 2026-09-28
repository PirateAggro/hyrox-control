import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOperator } from "@/lib/auth";
import { loadSession } from "@/lib/sessions";
import { SessionSummary } from "@/components/session-summary";
import { Control } from "./control";
import { clock } from "@/lib/clock";
import { EmailPanel } from "./email-panel";
import { largeTitle } from "@/components/ui";

export default async function ControlPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireOperator();
  const session = await loadSession(supabase, id);
  if (!session) notFound();

  if (session.status !== "en curs") {
    let recipients: Parameters<typeof EmailPanel>[0]["recipients"] = [];
    if (session.status === "completada") {
      const { data } = await supabase
        .from("participants")
        .select("id, name, email")
        .in("id", session.ctx.participants);
      const byId = new Map((data ?? []).map((p) => [p.id, p]));
      recipients = session.ctx.participants.flatMap((pid) => {
        const p = byId.get(pid);
        if (!p) return [];
        const log = session.emailLog[pid];
        return [
          {
            ...p,
            // Sessions d'abans de la confirmació: s'enviava a tothom de cop.
            sentAt: log?.sentAt ?? (log ? null : session.emailSentAt),
            error: log?.error ?? null,
          },
        ];
      });
    }

    return (
      <div className="flex flex-col gap-5">
        <h1 className={largeTitle}>Sessió {session.status}</h1>
        <SessionSummary session={session} />
        {recipients.length > 0 && (
          <EmailPanel sessionId={session.id} recipients={recipients} />
        )}
        <Link href="/" className="py-2 text-center text-[17px] text-tint">
          Tornar a l&apos;inici
        </Link>
      </div>
    );
  }

  return <Control session={session} serverNow={clock()} />;
}
