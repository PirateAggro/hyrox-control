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

type Initial = {
  name: string;
  sort_order: number;
  distance: string | null;
  weight: string | null;
};

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial?: Initial;
  suggestedOrder?: number;
  submitLabel: string;
};

export function StationForm({
  action,
  initial,
  suggestedOrder,
  submitLabel,
}: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);
  // Si hi ha hagut un error, els camps es tornen a omplir amb el que s'havia
  // escrit (React buida el formulari després de cada enviament).
  const v = state?.values;

  const fields = [
    {
      name: "name",
      text: "Nom",
      required: true,
      placeholder: "SkiErg",
      value: initial?.name,
    },
    {
      name: "sort_order",
      text: "Ordre",
      required: true,
      type: "number",
      value: initial?.sort_order ?? suggestedOrder,
    },
    {
      name: "distance",
      text: "Distància",
      placeholder: "1000 m",
      value: initial?.distance,
    },
    {
      name: "weight",
      text: "Pes",
      placeholder: "25 kg",
      value: initial?.weight,
    },
  ];
  const errors = fields
    .map((f) => state?.errors?.[f.name])
    .filter(Boolean) as string[];

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className={group}>
        {fields.map((f) => (
          <label key={f.name} className={fieldRow}>
            <span className={rowLabel}>{f.text}</span>
            <input
              name={f.name}
              type={f.type ?? "text"}
              inputMode={f.type === "number" ? "numeric" : undefined}
              min={f.type === "number" ? 1 : undefined}
              required={f.required}
              placeholder={f.placeholder}
              defaultValue={v?.[f.name] ?? f.value ?? ""}
              aria-invalid={Boolean(state?.errors?.[f.name])}
              className={inputBare}
            />
          </label>
        ))}
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
