import { replay } from "@/lib/timing/engine";
import { formatDuration, summaryRows } from "@/lib/timing/summary";
import type { LoadedSession } from "@/lib/sessions";

const EMPHASIS: Record<string, string> = {
  team: "font-medium",
  participantTotal: "font-semibold border-t border-border",
  total: "font-bold text-lg border-t-2 border-foreground",
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

  return (
    <table className="w-full text-sm">
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className={EMPHASIS[r.kind] ?? ""}>
            <td
              className={`py-1.5 pr-3 ${r.kind === "transition" || r.kind === "run" ? "pl-3 text-muted" : ""}`}
            >
              {r.label}
            </td>
            <td className="py-1.5 text-right font-mono tabular-nums">
              {formatDuration(r.ms)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
