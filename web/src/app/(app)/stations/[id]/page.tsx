import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOperator } from "@/lib/auth";
import { updateStation } from "../actions";
import { StationForm } from "../station-form";

export default async function EditStationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireOperator();
  const { data } = await supabase
    .from("stations")
    .select("name, sort_order, distance, weight")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();

  return (
    <div className="max-w-sm">
      <Link href="/stations" className="text-sm underline">
        ← Estacions
      </Link>
      <h1 className="mb-4 mt-3 text-xl font-semibold">Editar estació</h1>
      <StationForm
        action={updateStation.bind(null, id)}
        initial={data}
        submitLabel="Desar"
      />
    </div>
  );
}
