import Link from "next/link";
import { isAdmin, requireOperator } from "@/lib/auth";
import { createStation } from "./actions";
import { StationForm } from "./station-form";
import {
  chevron,
  errorText,
  group,
  groupFooter,
  groupHeader,
  largeTitle,
  row,
} from "@/components/ui";

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
  // Les estacions són compartides: només l'administrador les modifica.
  const [admin, { data, error }] = await Promise.all([
    isAdmin(supabase),
    supabase
      .from("stations")
      .select("id, name, sort_order, distance, weight, active")
      .order("active", { ascending: false })
      .order("sort_order"),
  ]);
  const stations = (data ?? []) as Station[];
  const nextOrder =
    Math.max(0, ...stations.filter((s) => s.active).map((s) => s.sort_order)) +
    1;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <h1 className={largeTitle}>Estacions</h1>

      <section>
        {error && (
          <p className={`${errorText} px-4 pb-2`}>
            No s&apos;han pogut carregar.
          </p>
        )}
        <ul className={group}>
          {stations.map((s) => {
            const content = (
              <>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black/5 text-[15px] font-semibold tabular-nums dark:bg-white/10">
                  {s.sort_order}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[17px]">
                    {s.name}
                    {!s.active && (
                      <span className="ml-2 text-[13px] text-muted">
                        inactiva
                      </span>
                    )}
                  </span>
                  <span className="block text-[13px] text-muted">
                    {[s.distance, s.weight].filter(Boolean).join(" - ") ||
                      "Sense distància ni pes"}
                  </span>
                </span>
              </>
            );
            return (
              <li key={s.id} className={s.active ? "" : "opacity-50"}>
                {/* Tocar la fila obre l'edició, on hi ha desactivar i esborrar. */}
                {admin ? (
                  <Link
                    href={`/stations/${s.id}`}
                    className={`${row} active:bg-black/5`}
                  >
                    {content}
                    <span className={chevron}>›</span>
                  </Link>
                ) : (
                  <div className={row}>{content}</div>
                )}
              </li>
            );
          })}
        </ul>
        <p className={groupFooter}>
          S&apos;executen per ordre. L&apos;última prova és la de número més
          alt.
          {!admin && " Només l'administrador les pot modificar."}
        </p>
      </section>

      {admin && (
        <section>
          <h2 className={groupHeader}>Nova estació</h2>
          <StationForm
            action={createStation}
            suggestedOrder={nextOrder}
            submitLabel="Crear"
          />
        </section>
      )}
    </div>
  );
}
