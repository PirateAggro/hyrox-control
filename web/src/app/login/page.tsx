"use client";

import { useActionState } from "react";
import { signIn, type LoginState } from "./actions";
import {
  button,
  errorText,
  group,
  inputBare,
  largeTitle,
  fieldRow,
  rowLabel,
} from "@/components/ui";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    signIn,
    undefined,
  );

  return (
    <main className="flex flex-1 flex-col items-center justify-center p-5">
      <div className="w-full max-w-sm">
        <h1 className={`${largeTitle} mb-8 text-center`}>Hyrox Control</h1>
        <form action={formAction} className="flex flex-col gap-4">
          <div className={group}>
            <label className={fieldRow}>
              <span className={rowLabel}>Email</span>
              <input
                name="email"
                type="email"
                required
                autoComplete="username"
                placeholder="operador@correu.cat"
                className={inputBare}
              />
            </label>
            <label className={fieldRow}>
              <span className={rowLabel}>Contrasenya</span>
              <input
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className={inputBare}
              />
            </label>
          </div>
          {state?.error && (
            <p role="alert" className={`${errorText} px-4`}>
              {state.error}
            </p>
          )}
          <button type="submit" disabled={pending} className={button}>
            {pending ? "Entrant…" : "Entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}
