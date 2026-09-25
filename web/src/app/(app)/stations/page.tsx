import Link from "next/link";
import { requireOperator } from "@/lib/auth";
import { createStation, deleteStation, setStationActive } from "./actions";
import { StationForm } from "./station-form";
import { RowAction } from "@/components/row-action";
import { errorText } from "@/components/ui";

type Station = {
  id: string;
  name: string;
  sort_order: number;
  distance: string | null;
  weight: string | null;
  active: boolean;
};

export default async function StationsPage() {
  const { supabase } = await requireOperator();
  const { data, error } = await supabase
    .from("stations")
    .select("id, name, sort_order, distance, weight, active")
    .order("active", { ascending: false })
    .order("sort_order");
  const stations = (data ?? []) as Station[];
  const nextOrder =
    Math.max(0, ...stations.filter((s) => s.active).map((s) => s.sort_order)) +
    1;

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="mb-1 text-xl font-semibold">Estacions</h1>
        <p className="mb-4 text-sm text-muted">
          S&apos;executen per ordre. L&apos;última prova és la de número més
          alt.
        </p>
        {error && <p className={errorText}>No s&apos;han pogut carregar.</p>}
        <ul className="divide-y divide-border rounded-md border border-border">
          {stations.map((s) => (
            <li
              key={s.id}
              className={`flex flex-wrap items-start gap-x-3 gap-y-2 p-3 ${s.active ? "" : "opacity-50"}`}
            >
              {/* basis-48: en pantalles estretes els botons baixen a una segona línia. */}
              <div className="flex min-w-0 flex-1 basis-48 gap-3">
                <span className="w-6 pt-0.5 text-right font-mono text-muted">
                  {s.sort_order}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {s.name}
                    {!s.active && (
                      <span className="ml-2 text-xs text-muted">
                        (inactiva)
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-muted">
                    {[s.distance, s.weight].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
              </div>
              <div className="ml-auto flex items-start gap-2">
                <Link
                  href={`/stations/${s.id}`}
                  className="px-1 pt-2 text-sm underline"
                >
                  Editar
                </Link>
                <RowAction
                  action={setStationActive}
                  fields={{ id: s.id, active: String(!s.active) }}
                >
                  {s.active ? "Desactivar" : "Activar"}
                </RowAction>
                <RowAction
                  action={deleteStation}
                  fields={{ id: s.id }}
                  confirmText={`Esborrar l'estació "${s.name}"?`}
                >
                  Esborrar
                </RowAction>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="max-w-sm">
        <h2 className="mb-3 text-lg font-semibold">Nova estació</h2>
        <StationForm
          action={createStation}
          suggestedOrder={nextOrder}
          submitLabel="Crear"
        />
      </section>
    </div>
  );
}
