import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOperator } from "@/lib/auth";
import { setParticipantActive, updateParticipant } from "../actions";
import { ParticipantForm } from "../participant-form";
import { group, groupFooter, largeTitle } from "@/components/ui";

export default async function EditParticipantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireOperator();
  const { data } = await supabase
    .from("participants")
    .select("id, name, email, active")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5">
      <div>
        <Link href="/participants" className="px-1 text-[17px] text-tint">
          ‹ Participants
        </Link>
        <h1 className={`${largeTitle} mt-2`}>{data.name}</h1>
      </div>
      <ParticipantForm
        action={updateParticipant.bind(null, id)}
        initial={{ name: data.name, email: data.email }}
        submitLabel="Desar"
      />

      {/* §3: els participants no s'esborren; es desactiven per mantenir l'històric. */}
      <section>
        <form action={setParticipantActive} className={group}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="active" value={String(!data.active)} />
          <button
            className={`h-11 w-full px-4 text-left text-[17px] active:bg-black/5 ${
              data.active ? "text-danger" : "text-tint"
            }`}
          >
            {data.active ? "Desactivar participant" : "Activar participant"}
          </button>
        </form>
        <p className={groupFooter}>
          {data.active
            ? "Un participant desactivat no surt a les sessions noves, però es conserven els seus resultats."
            : "Aquest participant està desactivat."}
        </p>
      </section>
    </div>
  );
}
