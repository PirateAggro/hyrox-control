"use client";

import { useActionState } from "react";
import type { FormState } from "./actions";
import {
  button,
  errorText,
  fieldRow,
  group,
  inputBare,
  rowLabel,
} from "@/components/ui";

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial?: { name: string; email: string };
  submitLabel: string;
};

export function ParticipantForm({ action, initial, submitLabel }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);
  // React buida el formulari després de cada enviament. Si hi ha hagut un
  // error, `state.values` el torna a omplir amb el que s'havia escrit.
  const v = state?.values;
  const errors = [state?.errors?.name, state?.errors?.email].filter(Boolean);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className={group}>
        <label className={fieldRow}>
          <span className={rowLabel}>Nom</span>
          <input
            name="name"
            required
            placeholder="Nom i cognom"
            defaultValue={v?.name ?? initial?.name}
            aria-invalid={Boolean(state?.errors?.name)}
            className={inputBare}
          />
        </label>
        <label className={fieldRow}>
          <span className={rowLabel}>Email</span>
          <input
            name="email"
            type="email"
            required
            placeholder="nom@correu.cat"
            defaultValue={v?.email ?? initial?.email}
            aria-invalid={Boolean(state?.errors?.email)}
            className={inputBare}
          />
        </label>
      </div>
      {errors.map((e) => (
        <p key={e} className={`${errorText} -mt-2 px-4`}>
          {e}
        </p>
      ))}
      {state?.message && (
        <p
          role="status"
          className={`-mt-2 px-4 ${state.ok ? "text-[13px] text-success" : errorText}`}
        >
          {state.message}
        </p>
      )}
      <button type="submit" disabled={pending} className={button}>
        {pending ? "Desant…" : submitLabel}
      </button>
    </form>
  );
}
