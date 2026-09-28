"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOperator } from "@/lib/auth";
import {
  PG,
  formValues,
  parseParticipant,
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

function uniqueNameMessage() {
  // L'índex únic inclou els inactius (§3: el nom continua a l'històric).
  return "Ja existeix un participant amb aquest nom (pot ser que estigui inactiu).";
}

export async function createParticipant(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireOperator();
  const { values, errors } = parseParticipant(formData);
  if (Object.keys(errors).length)
    return { errors, values: formValues(formData) };

  const { error } = await supabase.from("participants").insert(values);
  if (error?.code === PG.uniqueViolation)
    return {
      errors: { name: uniqueNameMessage() },
      values: formValues(formData),
    };
  if (error)
    return {
      message: "No s'ha pogut crear el participant.",
      values: formValues(formData),
    };

  revalidatePath("/participants");
  return { ok: true, message: `Participant "${values.name}" creat.` };
}

export async function updateParticipant(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireOperator();
  const { values, errors } = parseParticipant(formData);
  if (Object.keys(errors).length)
    return { errors, values: formValues(formData) };

  const { error } = await supabase
    .from("participants")
    .update(values)
    .eq("id", id);
  if (error?.code === PG.uniqueViolation)
    return {
      errors: { name: uniqueNameMessage() },
      values: formValues(formData),
    };
  if (error)
    return {
      message: "No s'ha pogut desar el participant.",
      values: formValues(formData),
    };

  revalidatePath("/participants");
  redirect("/participants");
}

/** §3: els participants no s'esborren, es desactiven per mantenir l'històric. */
export async function setParticipantActive(formData: FormData) {
  const { supabase } = await requireOperator();
  const id = String(formData.get("id"));
  const active = formData.get("active") === "true";
  await supabase.from("participants").update({ active }).eq("id", id);
  revalidatePath("/participants");
  revalidatePath(`/participants/${id}`);
}
