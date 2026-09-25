"use client";

import { useActionState } from "react";
import { buttonSecondary, errorText } from "@/components/ui";

type State = { message?: string; ok?: boolean } | undefined;

/**
 * Botó d'una fila (activar, desactivar, esborrar) que pot fallar i ha de
 * mostrar per què, per exemple una estació amb històric que no es pot esborrar.
 */
export function RowAction({
  action,
  fields,
  children,
  confirmText,
}: {
  action: (prev: State, formData: FormData) => Promise<State>;
  fields: Record<string, string>;
  children: React.ReactNode;
  confirmText?: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (confirmText && !window.confirm(confirmText)) e.preventDefault();
      }}
      className="flex flex-col items-end gap-1"
    >
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <button
        disabled={pending}
        className={`${buttonSecondary} h-9 px-3 text-sm`}
      >
        {children}
      </button>
      {state?.message && !state.ok && (
        <p className={`${errorText} max-w-56 text-right`}>{state.message}</p>
      )}
    </form>
  );
}
