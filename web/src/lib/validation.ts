/**
 * Validació de formularis. Són les mateixes regles que imposa la base de dades
 * (migració 20260925000001_init.sql); aquí hi són per donar un missatge clar
 * abans d'arribar-hi.
 */

// Ha de coincidir amb el CHECK de `participants.email`.
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/i;

export type FieldErrors = Partial<Record<string, string>>;

export function parseParticipant(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const errors: FieldErrors = {};
  if (!name) errors.name = "Cal el nom.";
  if (!EMAIL_RE.test(email)) errors.email = "L'email no és correcte.";
  return { values: { name, email }, errors };
}

export function parseStation(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const orderRaw = String(formData.get("sort_order") ?? "").trim();
  const distance = String(formData.get("distance") ?? "").trim() || null;
  const weight = String(formData.get("weight") ?? "").trim() || null;
  const errors: FieldErrors = {};
  if (!name) errors.name = "Cal el nom.";
  const sort_order = Number(orderRaw);
  if (!Number.isInteger(sort_order) || sort_order < 1)
    errors.sort_order = "L'ordre ha de ser un número enter positiu.";
  return { values: { name, sort_order, distance, weight }, errors };
}

/** Codis d'error de Postgres que arriben a través de Supabase. */
export const PG = {
  uniqueViolation: "23505",
  foreignKeyViolation: "23503",
  checkViolation: "23514",
} as const;
