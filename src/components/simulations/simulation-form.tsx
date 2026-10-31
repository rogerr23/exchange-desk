"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  simulationInputSchema,
  type Currency,
  type Quote,
} from "@/schemas/simulation";
import { apiRequest, ApiError, errorMessage } from "@/lib/api-client";
import {
  cpf,
  currencyLabels,
  dateTime,
  money,
  referenceDate,
} from "@/lib/format";
import { Icon } from "@/components/icon";
import { Notice } from "@/components/notice";

type Simulation = Quote & {
  sourceAmount: string;
  targetAmount: string;
  issuedAt: string;
  expiresAt: string;
  simulationToken: string;
};
type Customer = { id: string; name: string; fictionalCpf: string };

export function SimulationForm({
  customers,
  initialCustomerId,
  initialValues,
}: {
  customers: Customer[];
  initialCustomerId: string;
  initialValues?: { sourceCurrency: Currency; targetCurrency: Currency; sourceAmount: string };
}) {
  const router = useRouter();
  const busy = useRef(false);
  const [pending, setPending] = useState<"simulate" | "confirm" | null>(null);
  const [source, setSource] = useState<Currency>(initialValues?.sourceCurrency ?? "BRL");
  const [target, setTarget] = useState<Currency>(initialValues?.targetCurrency ?? "USD");
  const [amount, setAmount] = useState(initialValues?.sourceAmount ?? "");
  const [customerId, setCustomerId] = useState(initialCustomerId);
  const [simulation, setSimulation] = useState<Simulation | null>(null);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string[]>>({});
  const [clock, setClock] = useState(() => Date.now());
  const [serverExpired, setServerExpired] = useState(false);
  const [confirmationAttempted, setConfirmationAttempted] = useState(false);

  useEffect(() => {
    if (!simulation) return;
    const timer = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [simulation]);

  const remaining = simulation
    ? Math.max(0, Math.ceil((Date.parse(simulation.expiresAt) - clock) / 1000))
    : 0;
  const expired = serverExpired || remaining <= 0;
  const customer = customers.find((item) => item.id === customerId);
  function resetError() {
    setError("");
    setFields({});
  }
  function back() {
    setSimulation(null);
    resetError();
    setServerExpired(false);
    setConfirmationAttempted(false);
  }
  function handleError(error: unknown) {
    if (error instanceof ApiError && error.status === 401) {
      router.replace("/login?error=SessionRequired");
      return;
    }
    setError(errorMessage(error));
    if (error instanceof ApiError) setFields(error.fields);
  }
  async function simulate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    resetError();
    const parsed = simulationInputSchema.safeParse({
      sourceCurrency: source,
      targetCurrency: target,
      sourceAmount: amount.trim().replace(",", "."),
    });
    if (!parsed.success) {
      const errors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues)
        (errors[String(issue.path[0])] ??= []).push(issue.message);
      setFields(errors);
      setError("Confira as moedas e o valor antes de continuar.");
      return;
    }
    busy.current = true;
    setPending("simulate");
    try {
      const result = await apiRequest<Simulation>(
        "/api/simulacoes",
        "POST",
        parsed.data,
      );
      setClock(Date.now());
      setServerExpired(false);
      setConfirmationAttempted(false);
      setSimulation(result);
      router.refresh();
    } catch (error) {
      handleError(error);
    } finally {
      busy.current = false;
      setPending(null);
    }
  }
  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || !simulation || expired) return;
    resetError();
    if (!customer) {
      setError("Selecione um cliente antes de confirmar.");
      return;
    }
    busy.current = true;
    setPending("confirm");
    setConfirmationAttempted(true);
    try {
      const operation = await apiRequest<{ id: string }>(
        "/api/operacoes",
        "POST",
        { customerId, simulationToken: simulation.simulationToken },
      );
      router.push(`/operacoes/${operation.id}?confirmada=1`);
      router.refresh();
      // Manter o envio bloqueado até a navegação concluir.
    } catch (error) {
      handleError(error);
      if (error instanceof ApiError && error.code === "INVALID_SIMULATION")
        setServerExpired(true);
      if (!(error instanceof ApiError))
        setError(
          "Não recebemos a confirmação do servidor. Tente confirmar novamente com esta mesma simulação ou consulte as operações antes de iniciar outra.",
        );
      busy.current = false;
      setPending(null);
    }
  }
  const fieldError = (name: string) =>
    fields[name]?.[0] ? (
      <p id={`${name}-error`} className="field-error">
        {fields[name][0]}
      </p>
    ) : null;
  const accessibility = (name: string) => ({
    "aria-invalid": !!fields[name]?.length,
    "aria-describedby": fields[name]?.length ? `${name}-error` : undefined,
  });

  if (!simulation)
    return (
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_300px]">
        <form
          onSubmit={simulate}
          className="surface-card overflow-hidden"
          aria-busy={!!pending}
        >
          <div className="border-b border-line px-6 py-5">
            <h2 className="text-sm font-semibold">Configure sua conversão</h2>
            <p className="mt-1 text-xs text-muted">
              A simulação ainda não cria uma operação.
            </p>
          </div>
          <fieldset disabled={!!pending} className="space-y-6 p-6 sm:p-8">
            {error && <Notice>{error}</Notice>}
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="sourceCurrency" className="field-label">
                  Moeda de origem
                </label>
                <select
                  id="sourceCurrency"
                  className="field-input"
                  value={source}
                  onChange={(event) => {
                    setSource(event.target.value as Currency);
                    resetError();
                  }}
                  {...accessibility("sourceCurrency")}
                >
                  {Object.entries(currencyLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                {fieldError("sourceCurrency")}
              </div>
              <div>
                <label htmlFor="targetCurrency" className="field-label">
                  Moeda de destino
                </label>
                <select
                  id="targetCurrency"
                  className="field-input"
                  value={target}
                  onChange={(event) => {
                    setTarget(event.target.value as Currency);
                    resetError();
                  }}
                  {...accessibility("targetCurrency")}
                >
                  {Object.entries(currencyLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                {fieldError("targetCurrency")}
              </div>
            </div>
            <div>
              <label htmlFor="sourceAmount" className="field-label">
                Valor de origem ({source})
              </label>
              <input
                id="sourceAmount"
                className="field-input"
                inputMode="decimal"
                placeholder="0,00"
                value={amount}
                onChange={(event) => {
                  setAmount(event.target.value);
                  resetError();
                }}
                maxLength={19}
                required
                {...accessibility("sourceAmount")}
              />
              <p className="mt-2 text-xs leading-5 text-muted">
                Use vírgula ou ponto para os centavos, sem separador de milhar.
              </p>
              {fieldError("sourceAmount")}
            </div>
          </fieldset>
          <div className="flex justify-end border-t border-line p-6">
            <button
              className="button-primary justify-center"
              disabled={!!pending}
            >
              {pending
                ? "Consultando cotação…"
                : error
                  ? "Tentar novamente"
                  : "Simular conversão"}
              <Icon name="arrow" width="17" height="17" />
            </button>
          </div>
        </form>
        <aside className="surface-card p-6">
          <div className="mb-4 grid size-10 place-items-center rounded-xl bg-brand-soft text-brand-ink">
            <Icon name="exchange" />
          </div>
          <h2 className="text-sm font-semibold">
            Uma referência para sua operação.
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            Consulte a conversão entre real, dólar e euro. O resultado mostra a
            taxa, a fonte e a data da referência diária.
          </p>
          <p className="mt-4 border-t border-line pt-4 text-xs leading-6 text-muted">
            Depois de simular, você poderá selecionar o cliente e revisar os
            dados antes de confirmar. Suas simulações ficam salvas no histórico,
            mesmo quando não viram uma operação.
          </p>
        </aside>
      </div>
    );

  return (
    <form
      onSubmit={confirm}
      className="surface-card overflow-hidden"
      aria-busy={pending === "confirm"}
    >
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-6 py-5 sm:px-8">
        <div>
          <p className="eyebrow">Revise antes de registrar</p>
          <h2 className="mt-2 text-lg font-semibold">Confirmar operação</h2>
        </div>
        <span
          className={`rounded-full px-3 py-2 text-xs font-semibold ${expired ? "bg-negative/10 text-negative" : "bg-brand-soft text-brand-ink"}`}
        >
          {expired
            ? "Simulação expirada"
            : `Válida por ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`}
        </span>
      </div>
      <div className="space-y-6 p-6 sm:p-8">
        {error && <Notice>{error}</Notice>}
        {expired && (
          <Notice>
            Esta simulação expirou. Faça uma nova simulação e confira o
            resultado antes de confirmar.
          </Notice>
        )}
        <div className="grid gap-6 rounded-xl bg-canvas p-5 sm:grid-cols-[1fr_auto_1fr]">
          <div>
            <p className="detail-label">
              Valor de origem · {simulation.sourceCurrency}
            </p>
            <p className="mt-2 break-words text-2xl font-semibold tabular-nums">
              {money(simulation.sourceAmount, simulation.sourceCurrency)}
            </p>
          </div>
          <Icon
            name="arrow"
            className="hidden self-center text-muted sm:block"
          />
          <div>
            <p className="detail-label">
              Valor de destino · {simulation.targetCurrency}
            </p>
            <p className="mt-2 break-words text-2xl font-semibold tabular-nums">
              {money(simulation.targetAmount, simulation.targetCurrency)}
            </p>
          </div>
        </div>
        <div>
          <label htmlFor="operation-customer" className="field-label">
            Cliente da operação
          </label>
          <select
            id="operation-customer"
            className="field-input"
            value={customerId}
            onChange={(event) => {
              setCustomerId(event.target.value);
              resetError();
            }}
            disabled={!!pending || confirmationAttempted}
            required
          >
            <option value="">Selecione um cliente</option>
            {customers.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · {cpf(item.fictionalCpf)}
              </option>
            ))}
          </select>
          {customer && (
            <p className="mt-2 text-xs text-muted">
              {customer.name} · CPF {cpf(customer.fictionalCpf)}
            </p>
          )}
          {customers.length === 0 && (
            <p className="mt-3 text-sm text-muted">
              Cadastre um cliente para confirmar.{" "}
              <Link
                href="/clientes/novo"
                className="font-semibold text-brand-ink underline"
              >
                Novo cliente
              </Link>
            </p>
          )}
        </div>
        <dl className="grid gap-5 sm:grid-cols-2">
          <div>
            <dt className="detail-label">Taxa aplicada</dt>
            <dd className="detail-value">
              1 {simulation.sourceCurrency} ={" "}
              {simulation.exchangeRate.replace(".", ",")}{" "}
              {simulation.targetCurrency}
            </dd>
          </div>
          <div>
            <dt className="detail-label">Fonte</dt>
            <dd className="detail-value">{simulation.quoteProvider}</dd>
          </div>
          <div>
            <dt className="detail-label">Data de referência diária</dt>
            <dd className="detail-value">
              {referenceDate(simulation.quoteReferenceDate)}
            </dd>
          </div>
          <div>
            <dt className="detail-label">Consulta realizada em · Brasília</dt>
            <dd className="detail-value">
              {dateTime(simulation.quoteFetchedAt)}
            </dd>
          </div>
        </dl>
        <div className="rounded-xl bg-canvas p-5 text-sm leading-6 text-muted">
          <h3 className="font-semibold text-ink">Como ler este resultado</h3>
          <p className="mt-2">O valor de origem multiplicado pela taxa resulta no valor de destino, arredondado para duas casas decimais.</p>
          <p className="mt-2">A taxa é uma referência diária, sem atualização em tempo real. A simulação aplica somente essa taxa; tarifas, spread e impostos não são calculados.</p>
          <p className="mt-2">O prazo de 15 minutos limita a confirmação desta simulação. Ao expirar, consulte novamente e revise os novos valores.</p>
        </div>
        <p className="border-t border-line pt-5 text-xs leading-6 text-muted">
          A confirmação registra a operação como Pendente, preservando a taxa e
          os valores acima. Nenhum pagamento ou liquidação é realizado pelo
          sistema.
        </p>
        {confirmationAttempted && (
          <p className="text-sm text-muted">
            Para conferir um envio anterior,{" "}
            <Link
              className="font-semibold text-brand-ink underline"
              href="/operacoes"
            >
              consulte as operações
            </Link>{" "}
            antes de iniciar uma nova simulação.
          </p>
        )}
      </div>
      <div className="flex flex-col-reverse gap-3 border-t border-line p-6 sm:flex-row sm:justify-end sm:px-8">
        <button
          type="button"
          className="button-secondary justify-center"
          disabled={!!pending}
          onClick={back}
        >
          {expired ? "Nova simulação" : "Voltar"}
        </button>
        <button
          className="button-primary justify-center"
          disabled={!!pending || expired || !customer}
        >
          {pending === "confirm" ? "Confirmando…" : "Confirmar operação"}
          <Icon name="check" width="17" height="17" />
        </button>
      </div>
    </form>
  );
}
