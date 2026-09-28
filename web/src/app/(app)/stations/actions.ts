"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOperator } from "@/lib/auth";
import {
  PG,
  formValues,
  parseStation,
  type FieldErrors,
} from "@/lib/validation";

export type FormState =
  | {
      errors?: FieldErrors;
      message?: string;
      ok?: boolean;
      values?: Record<string, string>;
    }
  | undefined;

// Índex únic parcial: dues estacions actives no poden compartir ordre, perquè
// l'última prova és "la que té el número més alt" i ha de ser inequívoca.
const ORDER_TAKEN = "Ja hi ha una estació activa amb aquest número d'ordre.";

export async function createStation(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireOperator();
  const { values, errors } = parseStation(formData);
  if (Object.keys(errors).length)
    return { errors, values: formValues(formData) };

  const { error } = await supabase.from("stations").insert(values);
  if (error?.code === PG.uniqueViolation)
    return {
      errors: { sort_order: ORDER_TAKEN },
      values: formValues(formData),
    };
  if (error)
    return {
      message: "No s'ha pogut crear l'estació.",
      values: formValues(formData),
    };

  revalidatePath("/stations");
  return { ok: true, message: `Estació "${values.name}" creada.` };
}

export async function updateStation(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireOperator();
  const { values, errors } = parseStation(formData);
  if (Object.keys(errors).length)
    return { errors, values: formValues(formData) };

  const { error } = await supabase.from("stations").update(values).eq("id", id);
  if (error?.code === PG.uniqueViolation)
    return {
      errors: { sort_order: ORDER_TAKEN },
      values: formValues(formData),
    };
  if (error)
    return {
      message: "No s'ha pogut desar l'estació.",
      values: formValues(formData),
    };

  revalidatePath("/stations");
  redirect("/stations");
}

export async function setStationActive(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireOperator();
  const id = String(formData.get("id"));
  const active = formData.get("active") === "true";

  const { error } = await supabase
    .from("stations")
    .update({ active })
    .eq("id", id);
  if (error?.code === PG.uniqueViolation)
    return { message: `${ORDER_TAKEN} Canvia-li l'ordre abans d'activar-la.` };
  if (error) return { message: "No s'ha pogut canviar l'estat." };

  revalidatePath("/stations");
  revalidatePath(`/stations/${id}`);
  return { ok: true };
}

/**
 * §3.1 permet esborrar estacions. La base de dades ho impedeix si l'estació ja
 * té pulsacions (FK `on delete restrict`): esborrar-la trencaria l'històric.
 * En aquest cas l'única opció és desactivar-la.
 */
export async function deleteStation(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireOperator();
  const id = String(formData.get("id"));

  const { error } = await supabase.from("stations").delete().eq("id", id);
  if (error?.code === PG.foreignKeyViolation)
    return {
      message:
        "Aquesta estació té sessions guardades i no es pot esborrar. Desactiva-la.",
    };
  if (error) return { message: "No s'ha pogut esborrar l'estació." };

  revalidatePath("/stations");
  // S'esborra des de la pantalla d'edició: torna a la llista.
  redirect("/stations");
}
