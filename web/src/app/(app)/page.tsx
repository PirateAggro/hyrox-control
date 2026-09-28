import Link from "next/link";
import { requireOperator } from "@/lib/auth";
import { statusOf, toPress } from "@/lib/sessions";
import { CloseStale } from "./close-stale";
import { chevron, group, groupHeader, row } from "@/components/ui";

const STATUS_STYLE = {
  completada: "text-success",
  interrompuda: "text-danger",
  "en curs": "text-tint",
} as const;

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
      return {
        id: s.id,
        startedAt: s.started_at,
        names,
        presses,
        status: statusOf(presses, s.closed_at),
      };
    })
    // Sessions creades però mai començades: no tenen res a mostrar.
    .filter((s) => s.presses.length > 0);

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
          <ul className={group}>
            {sessions.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/control/${s.id}`}
                  prefetch={false}
                  className={`${row} active:bg-black/5`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[17px]">
                      {s.names.join(", ")}
                    </span>
                    <span className="text-[13px] text-muted">
                      {new Date(s.startedAt).toLocaleString("ca-ES", {
                        dateStyle: "short",
                        timeStyle: "short",
                        timeZone: "Europe/Madrid",
                      })}
                    </span>
                  </span>
                  <span className={`text-[15px] ${STATUS_STYLE[s.status]}`}>
                    {s.status}
                  </span>
                  <span className={chevron}>›</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
