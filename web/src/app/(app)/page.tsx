import Link from "next/link";
import { requireOperator } from "@/lib/auth";
import { statusOf, toPress } from "@/lib/sessions";
import { CloseStale } from "./close-stale";
import { SessionList, type SessionItem } from "./session-list";
import { group, groupHeader } from "@/components/ui";

export default async function HomePage() {
  const { supabase } = await requireOperator();
  const { data } = await supabase
    .from("sessions")
    .select(
      "id, mode, started_at, closed_at, session_participants(position, participants(name)), presses(seq, kind, participant_id, station_id, pressed_at)",
    )
    .order("started_at", { ascending: false })
    .limit(20);

  const sessions = (data ?? [])
    .map((s) => {
      const presses = (s.presses as Parameters<typeof toPress>[0][]).map(
        toPress,
      );
      const names = (
        s.session_participants as unknown as {
          position: number;
          participants: { name: string };
        }[]
      )
        .sort((a, b) => a.position - b.position)
        .map((p) => p.participants.name);
      // Hora de START: l'inici real (started_at és quan es va crear).
      const start = presses.find((p) => p.kind === "START");
      return {
        id: s.id,
        startMs: start ? start.at : Date.parse(s.started_at),
        names,
        presses,
        status: statusOf(presses, s.closed_at),
      };
    })
    // Sessions creades però mai començades: no tenen res a mostrar.
    .filter((s) => s.presses.length > 0)
    // De la més nova a la més antiga.
    .sort((a, b) => b.startMs - a.startMs)
    .map((s): SessionItem => ({
      id: s.id,
      startedAt: new Date(s.startMs).toISOString(),
      names: s.names,
      status: s.status,
    }));

  return (
    <div className="flex flex-col gap-6">
      <CloseStale />
      <Link
        href="/sessions/new"
        className="flex h-16 items-center justify-center rounded-2xl bg-accent text-xl font-semibold text-black transition active:opacity-80"
      >
        Nova sessió
      </Link>

      <section>
        <h2 className={groupHeader}>Darreres sessions</h2>
        {sessions.length === 0 ? (
          <p className={`${group} px-4 py-3 text-muted`}>
            Encara no n&apos;hi ha cap.
          </p>
        ) : (
          <SessionList sessions={sessions} />
        )}
      </section>
    </div>
  );
}
