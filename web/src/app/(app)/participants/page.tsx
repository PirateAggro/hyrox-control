import Link from "next/link";
import { requireOperator } from "@/lib/auth";
import { createParticipant } from "./actions";
import { ParticipantForm } from "./participant-form";
import {
  chevron,
  errorText,
  group,
  groupHeader,
  largeTitle,
  row,
} from "@/components/ui";

type Participant = { id: string; name: string; email: string; active: boolean };

export default async function ParticipantsPage() {
  const { supabase } = await requireOperator();
  const { data, error } = await supabase
    .from("participants")
    .select("id, name, email, active")
    .order("active", { ascending: false })
    .order("name");
  const participants = (data ?? []) as Participant[];

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <h1 className={largeTitle}>Participants</h1>

      <section>
        {error && (
          <p className={`${errorText} px-4 pb-2`}>
            No s&apos;han pogut carregar.
          </p>
        )}
        {!error && participants.length === 0 ? (
          <p className={`${group} px-4 py-3 text-muted`}>
            Encara no n&apos;hi ha cap.
          </p>
        ) : (
          <ul className={group}>
            {participants.map((p) => (
              <li key={p.id} className={p.active ? "" : "opacity-50"}>
                {/* Tocar la fila obre l'edició, on es pot desactivar. */}
                <Link
                  href={`/participants/${p.id}`}
                  className={`${row} active:bg-black/5`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[17px]">
                      {p.name}
                      {!p.active && (
                        <span className="ml-2 text-[13px] text-muted">
                          inactiu
                        </span>
                      )}
                    </span>
                    <span className="block truncate text-[13px] text-muted">
                      {p.email}
                    </span>
                  </span>
                  <span className={chevron}>›</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className={groupHeader}>Nou participant</h2>
        <ParticipantForm action={createParticipant} submitLabel="Crear" />
      </section>
    </div>
  );
}
