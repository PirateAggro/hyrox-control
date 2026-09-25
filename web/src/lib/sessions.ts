import type { SupabaseClient } from "@supabase/supabase-js";
import type { Press, PressKind, SessionContext } from "@/lib/timing/engine";

export type SessionStatus = "en curs" | "completada" | "interrompuda";

export type LoadedSession = {
  id: string;
  mode: "individual" | "team";
  startedAt: string;
  closedAt: string | null;
  ctx: SessionContext;
  participantNames: Record<string, string>;
  stationNames: Record<string, string>;
  presses: Press[];
  status: SessionStatus;
};

type PressRow = {
  seq: number;
  kind: PressKind;
  participant_id: string | null;
  station_id: string | null;
  pressed_at: string;
};

export function toPress(r: PressRow): Press {
  return {
    seq: r.seq,
    kind: r.kind,
    participantId: r.participant_id,
    stationId: r.station_id,
    at: Date.parse(r.pressed_at),
  };
}

/** 01 §1: completada si té FINISHED; interrompuda si s'ha tancat sense. */
export function statusOf(
  presses: Press[],
  closedAt: string | null,
): SessionStatus {
  if (presses.some((p) => p.kind === "FINISHED")) return "completada";
  if (closedAt) return "interrompuda";
  return "en curs";
}

export async function loadSession(
  supabase: SupabaseClient,
  id: string,
): Promise<LoadedSession | null> {
  const { data: s } = await supabase
    .from("sessions")
    .select("id, mode, started_at, closed_at, station_ids")
    .eq("id", id)
    .maybeSingle();
  if (!s) return null;

  const [{ data: sp }, { data: st }, { data: pr }] = await Promise.all([
    supabase
      .from("session_participants")
      .select("position, participants(id, name)")
      .eq("session_id", id)
      .order("position"),
    supabase.from("stations").select("id, name").in("id", s.station_ids),
    supabase
      .from("presses")
      .select("seq, kind, participant_id, station_id, pressed_at")
      .eq("session_id", id)
      .order("seq"),
  ]);

  const participants = (sp ?? []).map(
    (r) => r.participants as unknown as { id: string; name: string },
  );
  const presses = ((pr ?? []) as PressRow[]).map(toPress);

  return {
    id: s.id,
    mode: s.mode,
    startedAt: s.started_at,
    closedAt: s.closed_at,
    ctx: {
      participants: participants.map((p) => p.id),
      stations: s.station_ids,
    },
    participantNames: Object.fromEntries(
      participants.map((p) => [p.id, p.name]),
    ),
    stationNames: Object.fromEntries((st ?? []).map((x) => [x.id, x.name])),
    presses,
    status: statusOf(presses, s.closed_at),
  };
}
