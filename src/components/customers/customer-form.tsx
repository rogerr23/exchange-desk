"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { createCustomerSchema } from "@/schemas/customer";
import { apiRequest, ApiError, errorMessage } from "@/lib/api-client";
import { Notice } from "@/components/notice";
import { Icon } from "@/components/icon";

export function CustomerForm() {
  const router = useRouter();
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string[]>>({});
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    setError("");
    setFields({});
    const form = new FormData(event.currentTarget);
    const parsed = createCustomerSchema.safeParse(Object.fromEntries(form));
    if (!parsed.success) {
      const errors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues)
        (errors[String(issue.path[0])] ??= []).push(issue.message);
      setFields(errors);
      setError("Confira os campos destacados antes de continuar.");
      return;
    }
    busy.current = true;
    setPending(true);
    try {
      await apiRequest("/api/clientes", "POST", parsed.data);
      router.push("/clientes?criado=1");
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        router.replace("/login?error=SessionRequired");
        return;
      }
      setError(
        error instanceof ApiError && error.status === 409
          ? "Este CPF já está cadastrado. Confira a lista de clientes."
          : errorMessage(error),
      );
      if (error instanceof ApiError) setFields(error.fields);
      busy.current = false;
      setPending(false);
    }
  }
  const inputs = [
    {
      name: "name",
      label: "Nome completo",
      placeholder: "Nome do cliente",
      autoComplete: "name",
      maxLength: 100,
      type: "text",
    },
    {
      name: "fictionalCpf",
      label: "CPF",
      placeholder: "000.000.000-00",
      autoComplete: "off",
      maxLength: 20,
      type: "text",
    },
    {
      name: "email",
      label: "E-mail",
      placeholder: "cliente@exemplo.com",
      autoComplete: "email",
      maxLength: 254,
      type: "email",
    },
    {
      name: "phone",
      label: "Telefone com DDD",
      placeholder: "(11) 90000-0000",
      autoComplete: "tel",
      maxLength: 25,
      type: "tel",
    },
  ];
  return (
    <form
      onSubmit={submit}
      aria-busy={pending}
      className="surface-card overflow-hidden"
    >
      <div className="border-b border-line px-6 py-5">
        <h2 className="text-sm font-semibold">Dados do cliente</h2>
        <p className="mt-1 text-xs text-muted">
          Todos os campos são obrigatórios.
        </p>
      </div>
      <fieldset
        disabled={pending}
        className="grid gap-6 p-6 sm:grid-cols-2 sm:p-8"
      >
        {error && (
          <div className="sm:col-span-2">
            <Notice>{error}</Notice>
          </div>
        )}
        {inputs.map((input) => (
          <div
            key={input.name}
            className={input.name === "name" ? "sm:col-span-2" : ""}
          >
            <label htmlFor={`customer-${input.name}`} className="field-label">
              {input.label}
            </label>
            <input
              name={input.name}
              type={input.type}
              placeholder={input.placeholder}
              autoComplete={input.autoComplete}
              maxLength={input.maxLength}
              id={`customer-${input.name}`}
              className="field-input"
              required
              aria-invalid={!!fields[input.name]?.length}
              aria-describedby={
                fields[input.name]?.length ? `${input.name}-error` : undefined
              }
              inputMode={input.name === "fictionalCpf" ? "numeric" : undefined}
            />
            {fields[input.name]?.[0] && (
              <p id={`${input.name}-error`} className="field-error">
                {fields[input.name][0]}
              </p>
            )}
          </div>
        ))}
      </fieldset>
      <div className="flex flex-col-reverse gap-3 border-t border-line p-6 sm:flex-row sm:justify-end">
        <Link href="/clientes" className="button-secondary justify-center">
          Cancelar
        </Link>
        <button className="button-primary justify-center" disabled={pending}>
          {pending ? "Salvando…" : "Cadastrar cliente"}
          <Icon name="check" width="17" height="17" />
        </button>
      </div>
    </form>
  );
}
