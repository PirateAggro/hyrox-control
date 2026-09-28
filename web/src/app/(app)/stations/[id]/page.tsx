import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOperator } from "@/lib/auth";
import { deleteStation, setStationActive, updateStation } from "../actions";
import { StationForm } from "../station-form";
import { RowAction } from "@/components/row-action";
import { group, groupFooter, largeTitle } from "@/components/ui";

export default async function EditStationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireOperator();
  const { data } = await supabase
    .from("stations")
    .select("name, sort_order, distance, weight, active")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const { active, ...initial } = data;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5">
      <div>
        <Link href="/stations" className="px-1 text-[17px] text-tint">
          ‹ Estacions
        </Link>
        <h1 className={`${largeTitle} mt-2`}>{data.name}</h1>
      </div>
      <StationForm
        action={updateStation.bind(null, id)}
        initial={initial}
        submitLabel="Desar"
      />

      <section>
        <div className={group}>
          <RowAction
            action={setStationActive}
            fields={{ id, active: String(!active) }}
            wide
          >
            {active ? "Desactivar estació" : "Activar estació"}
          </RowAction>
          <RowAction
            action={deleteStation}
            fields={{ id }}
            confirmText={`Esborrar l'estació "${data.name}"?`}
            danger
            wide
          >
            Esborrar estació
          </RowAction>
        </div>
        <p className={groupFooter}>
          {active
            ? "Una estació desactivada no surt a les sessions noves."
            : "Aquesta estació està desactivada."}{" "}
          Només es pot esborrar si no té sessions guardades.
        </p>
      </section>
    </div>
  );
}
