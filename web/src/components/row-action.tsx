"use client";

import { useActionState } from "react";
import { buttonDanger, buttonSecondary, errorText } from "@/components/ui";

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
  danger = false,
  wide = false,
}: {
  action: (prev: State, formData: FormData) => Promise<State>;
  fields: Record<string, string>;
  children: React.ReactNode;
  confirmText?: string;
  danger?: boolean;
  /** Fila sencera d'un grup (pantalla d'edició), en lloc d'una píndola. */
  wide?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (confirmText && !window.confirm(confirmText)) e.preventDefault();
      }}
      className={wide ? "flex flex-col" : "flex flex-col items-end gap-1"}
    >
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <button
        disabled={pending}
        className={
          wide
            ? `h-11 w-full px-4 text-left text-[17px] active:bg-black/5 disabled:opacity-40 ${danger ? "text-danger" : "text-tint"}`
            : danger
              ? buttonDanger
              : buttonSecondary
        }
      >
        {children}
      </button>
      {state?.message && !state.ok && (
        <p
          className={
            wide
              ? `${errorText} px-4 pb-2.5`
              : `${errorText} max-w-56 text-right`
          }
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
