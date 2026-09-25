"use client";

import { useActionState, useEffect, useRef } from "react";
import type { FormState } from "./actions";
import { button, errorText, input, label } from "@/components/ui";

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
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok && !initial) formRef.current?.reset();
  }, [state, initial]);

  const fields = [
    { name: "name", text: "Nom", required: true, value: initial?.name },
    {
      name: "sort_order",
      text: "Ordre",
      required: true,
      type: "number",
      value: initial?.sort_order ?? suggestedOrder,
    },
    { name: "distance", text: "Distància", value: initial?.distance },
    { name: "weight", text: "Pes", value: initial?.weight },
  ];

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      {fields.map((f) => (
        <div key={f.name} className="flex flex-col gap-1.5">
          <label htmlFor={f.name} className={label}>
            {f.text}
          </label>
          <input
            id={f.name}
            name={f.name}
            type={f.type ?? "text"}
            min={f.type === "number" ? 1 : undefined}
            required={f.required}
            defaultValue={f.value ?? ""}
            className={input}
          />
          {state?.errors?.[f.name] && (
            <p className={errorText}>{state.errors[f.name]}</p>
          )}
        </div>
      ))}
      {state?.message && (
        <p role="status" className={state.ok ? "text-sm" : errorText}>
          {state.message}
        </p>
      )}
      <button type="submit" disabled={pending} className={button}>
        {pending ? "Desant…" : submitLabel}
      </button>
    </form>
  );
}
