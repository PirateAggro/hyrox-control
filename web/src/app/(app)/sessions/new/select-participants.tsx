"use client";

import { useActionState, useState } from "react";
import { createSession, type NewSessionState } from "./actions";
import { button, errorText } from "@/components/ui";

/**
 * §4: l'ordre és el de selecció. Tocar un participant l'afegeix al final;
 * tornar-lo a tocar el treu i els altres es renumeren.
 */
export function SelectParticipants({
  participants,
}: {
  participants: { id: string; name: string }[];
}) {
  const [order, setOrder] = useState<string[]>([]);
  const [state, formAction, pending] = useActionState<
    NewSessionState,
    FormData
  >(createSession, undefined);

  const toggle = (id: string) =>
    setOrder((o) => (o.includes(id) ? o.filter((x) => x !== id) : [...o, id]));

  const mode =
    order.length === 0 ? null : order.length === 1 ? "Individual" : "Equip";

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <ul className="flex flex-col gap-2">
        {participants.map((p) => {
          const pos = order.indexOf(p.id);
          const selected = pos >= 0;
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => toggle(p.id)}
                aria-pressed={selected}
                className={`flex h-14 w-full items-center gap-3 rounded-md border px-4 text-left text-lg ${
                  selected
                    ? "border-accent bg-accent/15 font-semibold"
                    : "border-border"
                }`}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-base ${
                    selected ? "bg-accent text-black" : "border border-border"
                  }`}
                >
                  {selected ? pos + 1 : ""}
                </span>
                {p.name}
              </button>
            </li>
          );
        })}
      </ul>

      {order.map((id) => (
        <input key={id} type="hidden" name="participant" value={id} />
      ))}

      <p className="text-sm text-muted">
        {mode
          ? `Mode ${mode}. L'ordre és el de selecció.`
          : "Toca els participants en l'ordre en què faran les proves."}
      </p>
      {state?.message && <p className={errorText}>{state.message}</p>}
      <button
        type="submit"
        disabled={pending || order.length === 0}
        className={`${button} h-14 text-lg`}
      >
        {pending ? "Preparant…" : "Continuar"}
      </button>
    </form>
  );
}
