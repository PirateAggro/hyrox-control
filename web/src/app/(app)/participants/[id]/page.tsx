import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOperator } from "@/lib/auth";
import { updateParticipant } from "../actions";
import { ParticipantForm } from "../participant-form";

export default async function EditParticipantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireOperator();
  const { data } = await supabase
    .from("participants")
    .select("id, name, email")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();

  return (
    <div className="max-w-sm">
      <Link href="/participants" className="text-sm underline">
        ← Participants
      </Link>
      <h1 className="mb-4 mt-3 text-xl font-semibold">Editar participant</h1>
      <ParticipantForm
        action={updateParticipant.bind(null, id)}
        initial={{ name: data.name, email: data.email }}
        submitLabel="Desar"
      />
    </div>
  );
}
