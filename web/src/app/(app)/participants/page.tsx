import Link from "next/link";
import { requireOperator } from "@/lib/auth";
import { createParticipant, setParticipantActive } from "./actions";
import { ParticipantForm } from "./participant-form";
import { buttonSecondary, errorText } from "@/components/ui";

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
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="mb-4 text-xl font-semibold">Participants</h1>
        {error && <p className={errorText}>No s&apos;han pogut carregar.</p>}
        {!error && participants.length === 0 && (
          <p className="text-muted">Encara no n&apos;hi ha cap.</p>
        )}
        <ul className="divide-y divide-border rounded-md border border-border">
          {participants.map((p) => (
            <li
              key={p.id}
              className={`flex items-center gap-3 p-3 ${p.active ? "" : "opacity-50"}`}
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {p.name}
                  {!p.active && (
                    <span className="ml-2 text-xs text-muted">(inactiu)</span>
                  )}
                </p>
                <p className="truncate text-sm text-muted">{p.email}</p>
              </div>
              <Link
                href={`/participants/${p.id}`}
                className="text-sm underline"
              >
                Editar
              </Link>
              <form action={setParticipantActive}>
                <input type="hidden" name="id" value={p.id} />
                <input
                  type="hidden"
                  name="active"
                  value={String(!p.active)}
                />
                <button className={`${buttonSecondary} h-9 px-3 text-sm`}>
                  {p.active ? "Desactivar" : "Activar"}
                </button>
              </form>
            </li>
          ))}
        </ul>
      </section>

      <section className="max-w-sm">
        <h2 className="mb-3 text-lg font-semibold">Nou participant</h2>
        <ParticipantForm action={createParticipant} submitLabel="Crear" />
      </section>
    </div>
  );
}
