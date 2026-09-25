"use client";

import { useActionState } from "react";
import { signIn, type LoginState } from "./actions";
import { button, errorText, input, label } from "@/components/ui";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    signIn,
    undefined,
  );

  return (
    <main className="flex flex-1 flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="mb-8 text-center text-2xl font-semibold">
          Hyrox Control
        </h1>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className={label}>
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="username"
              className={input}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className={label}>
              Contrasenya
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className={input}
            />
          </div>
          {state?.error && (
            <p role="alert" className={errorText}>
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
