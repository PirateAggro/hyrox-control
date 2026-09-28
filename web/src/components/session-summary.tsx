import { replay } from "@/lib/timing/engine";
import { formatDuration, summaryRows } from "@/lib/timing/summary";
import type { LoadedSession } from "@/lib/sessions";
import { group, groupHeader } from "@/components/ui";

const ROW_STYLE: Record<string, string> = {
  transition: "pl-8 text-muted",
  run: "pl-8 text-muted",
  team: "font-semibold",
  participantTotal: "font-semibold",
  total: "text-[20px] font-bold",
};

/** Resultats de la sessió, en l'ordre de l'exemple del §5. */
export function SessionSummary({ session }: { session: LoadedSession }) {
  const { totals } = replay(session.presses, session.ctx);
  const rows = summaryRows(
    totals,
    session.ctx,
    { participants: session.participantNames, stations: session.stationNames },
    session.mode,
  );
  const detail = rows.filter(
    (r) => r.kind !== "participantTotal" && r.kind !== "total",
  );
  const totalsRows = rows.filter(
    (r) => r.kind === "participantTotal" || r.kind === "total",
  );

  const list = (items: typeof rows) => (
    <ul className={group}>
      {items.map((r, i) => (
        <li
          key={i}
          className={`flex items-baseline justify-between gap-3 px-4 py-2.5 text-[17px] ${ROW_STYLE[r.kind] ?? ""}`}
        >
          <span className="min-w-0 truncate">{r.label}</span>
          <span className="font-mono tabular-nums">{formatDuration(r.ms)}</span>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="flex flex-col gap-5">
      {detail.length > 0 && (
        <section>
          <h2 className={groupHeader}>Detall</h2>
          {list(detail)}
        </section>
      )}
      <section>
        <h2 className={groupHeader}>Totals</h2>
        {list(totalsRows)}
      </section>
    </div>
  );
}
