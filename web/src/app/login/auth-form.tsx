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

type Mode = "login" | "register" | "forgot" | "reset";

const TEXT: Record<
  Mode,
  { subtitle: string; submit: string; pending: string }
> = {
  login: { subtitle: "Entrar", submit: "Entrar", pending: "Entrant…" },
  register: {
    subtitle: "Crear un compte",
    submit: "Crear compte",
    pending: "Creant…",
  },
  forgot: {
    subtitle: "Recuperar la contrasenya",
    submit: "Enviar l'enllaç",
    pending: "Enviant…",
  },
  reset: {
    subtitle: "Contrasenya nova",
    submit: "Desar la contrasenya",
    pending: "Desant…",
  },
};

/**
 * Formulari d'accés, compartit per /login, /register, /forgot (només email) i
 * /reset (només la contrasenya nova).
 */
export function AuthForm({
  mode,
  action,
}: {
  mode: Mode;
  action: (prev: LoginState, formData: FormData) => Promise<LoginState>;
}) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    action,
    undefined,
  );
  const text = TEXT[mode];
  const newPassword = mode === "register" || mode === "reset";

  return (
    <main className="flex flex-1 flex-col items-center justify-center p-5">
      <div className="w-full max-w-sm">
        <h1 className={`${largeTitle} mb-2 text-center`}>Hyrox Control</h1>
        <p className="mb-8 text-center text-[17px] text-muted">
          {text.subtitle}
        </p>
        <form action={formAction} className="flex flex-col gap-4">
          <div className={group}>
            {mode !== "reset" && (
              <label className={fieldRow}>
                <span className={rowLabel}>Email</span>
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete={mode === "login" ? "username" : "email"}
                  placeholder="nom@correu.cat"
                  className={inputBare}
                />
              </label>
            )}
            {mode !== "forgot" && (
              <label className={fieldRow}>
                <span className={rowLabel}>Contrasenya</span>
                <input
                  name="password"
                  type="password"
                  required
                  minLength={newPassword ? 6 : undefined}
                  autoComplete={
                    newPassword ? "new-password" : "current-password"
                  }
                  placeholder={newPassword ? "mínim 6 caràcters" : undefined}
                  className={inputBare}
                />
              </label>
            )}
          </div>
          {state?.error && (
            <p role="alert" className={`${errorText} px-4`}>
              {state.error}
            </p>
          )}
          {state?.message && (
            <p role="status" className="px-4 text-[15px] text-success">
              {state.message}
            </p>
          )}
          <button type="submit" disabled={pending} className={button}>
            {pending ? text.pending : text.submit}
          </button>
        </form>
        <div className="mt-6 flex flex-col gap-3 text-center text-[15px] text-muted">
          {mode === "login" && (
            <>
              <p>
                No tens compte?{" "}
                <Link href="/register" className="text-tint">
                  Registra&apos;t
                </Link>
              </p>
              <Link href="/forgot" className="text-tint">
                Has oblidat la contrasenya?
              </Link>
            </>
          )}
          {mode === "register" && (
            <p>
              Ja tens compte?{" "}
              <Link href="/login" className="text-tint">
                Entra
              </Link>
            </p>
          )}
          {(mode === "forgot" || mode === "reset") && (
            <Link href="/login" className="text-tint">
              Tornar a l&apos;inici de sessió
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
