"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/(auth)/login/actions";
import { PasswordInput } from "@/components/password-input";
import { Icon } from "@/components/icon";

export function LoginForm({ initialError = "" }: { initialError?: string }) {
  const [state, action, pending] = useActionState(loginAction, {
    error: initialError,
  });
  return (
    <form action={action} className="space-y-5" aria-busy={pending}>
      {state.error && (
        <div role="alert" className="notice notice-error">
          <Icon name="info" className="mt-0.5 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}
      <div>
        <label htmlFor="email" className="field-label">
          E-mail
        </label>
        <input
          className="field-input"
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          placeholder="seu.nome@exemplo.com"
          defaultValue={state.email}
          maxLength={254}
          required
          disabled={pending}
        />
      </div>
      <div>
        <label htmlFor="password" className="field-label">
          Senha
        </label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          placeholder="Digite sua senha"
          maxLength={128}
          required
          disabled={pending}
        />
      </div>
      <button
        type="submit"
        className="button-primary w-full justify-between"
        disabled={pending}
      >
        {pending ? "Entrando…" : "Entrar no sistema"}
        <Icon name="arrow" />
      </button>
    </form>
  );
}
