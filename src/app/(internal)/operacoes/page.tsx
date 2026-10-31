import Link from "next/link";
import type { Metadata } from "next";
import { Icon } from "@/components/icon";
import { StatusBadge } from "@/components/operations/status-badge";
import { dateTime, money } from "@/lib/format";
import { requirePagePermission } from "@/server/auth/page-access";
import { listOperations } from "@/server/services/operations";
export const metadata: Metadata = { title: "Operações | ExchangeDesk" };
export default async function OperationsPage() {
  const actor = await requirePagePermission("operations:read");
  const operations = await listOperations();
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">{actor.role === "ADMIN" ? "Acompanhamento da equipe" : "Seu acompanhamento"}</p>
          <h1 className="page-title">{actor.role === "ADMIN" ? "Operações" : "Minhas operações"}</h1>
          <p className="page-description">
            {actor.role === "ADMIN" ? "Todas as conversões da equipe, do registro ao encerramento." : "Acompanhe as conversões que você registrou, do início ao encerramento."}
          </p>
        </div>
        <Link href="/simulacoes" className="button-primary w-fit">
          <Icon name="plus" width="18" height="18" />
          Nova simulação
        </Link>
      </div>
      <section className="surface-card mt-8 overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-line px-6 py-5">
          <h2 className="text-sm font-semibold">
            {actor.role === "ADMIN" ? "Todas as operações" : "Operações registradas por você"}{" "}
            <span className="ml-2 text-muted">{operations.length}</span>
          </h2>
          <span className="hidden text-xs text-muted sm:block">
            Mais recentes primeiro
          </span>
        </div>
        {operations.length === 0 ? (
          <div className="empty-state">
            <Icon
              name="exchange"
              width="32"
              height="32"
              className="mx-auto mb-4 text-muted"
            />
            <h2 className="font-semibold">
              Pronto para sua primeira operação?
            </h2>
            <p className="mt-2 text-sm text-muted">
              Comece por uma simulação e confirme os valores para registrar.
            </p>
            <Link href="/simulacoes" className="button-primary mt-6">
              Simular conversão
              <Icon name="arrow" width="17" height="17" />
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-line">
            {operations.map((operation) => (
              <article
                key={operation.id}
                className="grid gap-4 px-6 py-5 sm:grid-cols-[1fr_1fr_auto] sm:items-center"
              >
                <div className="min-w-0">
                  <Link
                    className="font-semibold hover:text-brand-ink hover:underline"
                    href={`/operacoes/${operation.id}`}
                  >
                    {operation.customer.name}
                    <span className="sr-only">
                      , ver operação {operation.id}
                    </span>
                  </Link>
                  <p className="mt-1 text-xs text-muted">
                    {dateTime(operation.createdAt)} · {actor.role === "ADMIN" && `${operation.createdBy.name} · `}{operation.sourceCurrency}{" "}
                    → {operation.targetCurrency}
                  </p>
                </div>
                <div className="min-w-0 text-sm">
                  <p className="break-words font-medium tabular-nums">
                    {money(operation.sourceAmount, operation.sourceCurrency)}
                  </p>
                  <p className="mt-1 break-words text-muted tabular-nums">
                    → {money(operation.targetAmount, operation.targetCurrency)}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <StatusBadge status={operation.status} />
                  <Link
                    href={`/operacoes/${operation.id}`}
                    className="rounded-md p-2 text-brand-ink"
                    aria-label={`Ver detalhes da operação de ${operation.customer.name}`}
                  >
                    <Icon name="arrow" width="18" height="18" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
