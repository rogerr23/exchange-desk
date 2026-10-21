"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createUserSchema } from "@/schemas/user";
import { PasswordInput } from "@/components/password-input";
import { Icon } from "@/components/icon";

export function EmployeeForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string[] | undefined>>(
    {},
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError("");
    setFields({});
    const form = new FormData(event.currentTarget);
    const parsed = createUserSchema.safeParse({
      name: form.get("name"),
      email: form.get("email"),
      password: form.get("password"),
      role: form.get("role"),
    });
    if (!parsed.success) {
      const errors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues)
        (errors[String(issue.path[0])] ??= []).push(issue.message);
      setFields(errors);
      setError("Confira os campos destacados antes de continuar.");
      return;
    }
    if (parsed.data.password !== form.get("confirmPassword")) {
      setFields({ confirmPassword: ["As senhas precisam ser iguais."] });
      setError("Confira a confirmação da senha.");
      return;
    }
    setPending(true);
    try {
      const response = await fetch("/api/funcionarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(parsed.data),
      });
      const result = await response.json();
      if (response.status === 401) {
        router.replace("/login?error=SessionRequired");
        return;
      }
      if (!response.ok) {
        setError(
          response.status === 409
            ? "Este e-mail já está cadastrado. Use outro e-mail para criar o acesso."
            : result.error?.message ||
                "Não foi possível cadastrar o funcionário.",
        );
        setFields(result.error?.fields || {});
        return;
      }
      router.push("/funcionarios?criado=1");
      router.refresh();
    } catch {
      setError(
        "Não foi possível conectar ao servidor. Confira sua conexão e tente novamente.",
      );
    } finally {
      setPending(false);
    }
  }

  const fieldError = (field: string) =>
    fields[field]?.[0] ? (
      <p id={`${field}-error`} className="field-error">
        {fields[field]![0]}
      </p>
    ) : null;
  const accessibility = (field: string) => ({
    "aria-invalid": !!fields[field]?.length,
    "aria-describedby": fields[field]?.length ? `${field}-error` : undefined,
  });

  return (
    <form
      onSubmit={submit}
      className="surface-card overflow-hidden"
      aria-busy={pending}
    >
      <div className="border-b border-line px-6 py-5 sm:px-8">
        <h2 className="text-sm font-semibold">Dados de acesso</h2>
        <p className="mt-1 text-xs text-muted">
          Todos os campos são obrigatórios.
        </p>
      </div>
      <fieldset disabled={pending} className="space-y-6 p-6 sm:p-8">
        {error && (
          <div role="alert" className="notice notice-error">
            <Icon name="info" className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <div>
          <label htmlFor="name" className="field-label">
            Nome completo
          </label>
          <input
            className="field-input"
            id="name"
            name="name"
            autoComplete="name"
            placeholder="Como a pessoa será identificada"
            minLength={2}
            maxLength={100}
            required
            {...accessibility("name")}
          />
          {fieldError("name")}
        </div>
        <div>
          <label htmlFor="employee-email" className="field-label">
            E-mail
          </label>
          <input
            className="field-input"
            id="employee-email"
            name="email"
            type="email"
            autoComplete="off"
            placeholder="nome@exemplo.com"
            maxLength={254}
            required
            {...accessibility("email")}
          />
          {fieldError("email")}
        </div>
        <div>
          <label htmlFor="role" className="field-label">
            Perfil de acesso
          </label>
          <select
            className="field-input"
            id="role"
            name="role"
            defaultValue="OPERATOR"
            {...accessibility("role")}
          >
            <option value="OPERATOR">Operador</option>
            <option value="ADMIN">Administrador</option>
          </select>
          <p className="mt-2 text-xs leading-5 text-muted">
            Operador é o perfil padrão para trabalhar com os fluxos da equipe.
          </p>
          {fieldError("role")}
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="new-password" className="field-label">
              Senha inicial
            </label>
            <PasswordInput
              id="new-password"
              name="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              placeholder="Crie uma senha"
              required
              {...accessibility("password")}
            />
            <p className="mt-2 text-xs text-muted">
              Entre 12 e 128 caracteres.
            </p>
            {fieldError("password")}
          </div>
          <div>
            <label htmlFor="confirm-password" className="field-label">
              Confirmar senha
            </label>
            <PasswordInput
              id="confirm-password"
              name="confirmPassword"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              placeholder="Repita a senha"
              required
              {...accessibility("confirmPassword")}
            />
            {fieldError("confirmPassword")}
          </div>
        </div>
      </fieldset>
      <div className="flex flex-col-reverse gap-3 border-t border-line bg-canvas/40 px-6 py-5 sm:flex-row sm:items-center sm:justify-end sm:px-8">
        <Link href="/funcionarios" className="button-secondary justify-center">
          Cancelar
        </Link>
        <button
          type="submit"
          className="button-primary justify-center"
          disabled={pending}
        >
          {pending ? "Criando acesso…" : "Criar funcionário"}
          <Icon name="arrow" width="17" height="17" />
        </button>
      </div>
    </form>
  );
}
