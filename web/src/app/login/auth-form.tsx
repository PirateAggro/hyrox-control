"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { LoginState } from "./actions";
import {
  button,
  errorText,
  group,
  inputBare,
  largeTitle,
  fieldRow,
  rowLabel,
} from "@/components/ui";

/** Formulari d'email i contrasenya, compartit per /login i /register. */
export function AuthForm({
  mode,
  action,
}: {
  mode: "login" | "register";
  action: (prev: LoginState, formData: FormData) => Promise<LoginState>;
}) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    action,
    undefined,
  );
  const register = mode === "register";

  return (
    <main className="flex flex-1 flex-col items-center justify-center p-5">
      <div className="w-full max-w-sm">
        <h1 className={`${largeTitle} mb-2 text-center`}>Hyrox Control</h1>
        <p className="mb-8 text-center text-[17px] text-muted">
          {register ? "Crear un compte" : "Entrar"}
        </p>
        <form action={formAction} className="flex flex-col gap-4">
          <div className={group}>
            <label className={fieldRow}>
              <span className={rowLabel}>Email</span>
              <input
                name="email"
                type="email"
                required
                autoComplete={register ? "email" : "username"}
                placeholder="nom@correu.cat"
                className={inputBare}
              />
            </label>
            <label className={fieldRow}>
              <span className={rowLabel}>Contrasenya</span>
              <input
                name="password"
                type="password"
                required
                minLength={register ? 6 : undefined}
                autoComplete={register ? "new-password" : "current-password"}
                placeholder={register ? "mínim 6 caràcters" : undefined}
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
            {register
              ? pending
                ? "Creant…"
                : "Crear compte"
              : pending
                ? "Entrant…"
                : "Entrar"}
          </button>
        </form>
        <p className="mt-6 text-center text-[15px] text-muted">
          {register ? "Ja tens compte? " : "No tens compte? "}
          <Link href={register ? "/login" : "/register"} className="text-tint">
            {register ? "Entra" : "Registra't"}
          </Link>
        </p>
      </div>
    </main>
  );
}
