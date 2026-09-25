"use client";

import { useActionState } from "react";
import type { FormState } from "./actions";
import { button, errorText, input, label } from "@/components/ui";

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

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className={label}>
          Nom
        </label>
        <input
          id="name"
          name="name"
          required
          defaultValue={v?.name ?? initial?.name}
          className={input}
        />
        {state?.errors?.name && (
          <p className={errorText}>{state.errors.name}</p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className={label}>
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          defaultValue={v?.email ?? initial?.email}
          className={input}
        />
        {state?.errors?.email && (
          <p className={errorText}>{state.errors.email}</p>
        )}
      </div>
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
