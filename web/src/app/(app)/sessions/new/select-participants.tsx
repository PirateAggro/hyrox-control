"use client";

import { useActionState, useState } from "react";
import { createSession, type NewSessionState } from "./actions";
import {
  button,
  errorText,
  group,
  groupFooter,
  groupHeader,
  row,
} from "@/components/ui";

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
      <section>
        <h2 className={groupHeader}>Participants</h2>
        <ul className={group}>
          {participants.map((p) => {
            const pos = order.indexOf(p.id);
            const selected = pos >= 0;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => toggle(p.id)}
                  aria-pressed={selected}
                  className={`${row} min-h-14 w-full text-left text-[17px] active:bg-black/5`}
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[15px] font-semibold ${
                      selected ? "bg-tint text-white" : "border-2 border-border"
                    }`}
                  >
                    {selected ? pos + 1 : ""}
                  </span>
                  <span className={selected ? "font-semibold" : ""}>
                    {p.name}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <p className={groupFooter}>
          {mode
            ? `Mode ${mode}. L'ordre és el de selecció.`
            : "Toca els participants en l'ordre en què faran les proves."}
        </p>
      </section>

      {order.map((id) => (
        <input key={id} type="hidden" name="participant" value={id} />
      ))}

      {state?.message && <p className={`${errorText} px-4`}>{state.message}</p>}
      <button
        type="submit"
        disabled={pending || order.length === 0}
        className={`${button} h-14`}
      >
        {pending ? "Preparant…" : "Continuar"}
      </button>
    </form>
  );
}
