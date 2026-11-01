import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Icon } from "@/components/icon";
import { Notice } from "@/components/notice";
import { StatusBadge } from "@/components/operations/status-badge";
import { ProcessingActions } from "@/components/operations/processing-actions";
import { StatusActions } from "@/components/operations/status-actions";
import {
  cpf,
  dateTime,
  money,
  referenceDate,
  statusLabels,
} from "@/lib/format";
import { requirePagePermission } from "@/server/auth/page-access";
import { getOperation } from "@/server/services/operations";
import { AppError } from "@/server/errors";
import { can } from "@/domain/permissions";
export const metadata: Metadata = {
  title: "Detalhes da operação | ExchangeDesk",
};
export default async function OperationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ confirmada?: string }>;
}) {
  const actor = await requirePagePermission("operations:read");
  const { id } = await params;
  let operation;
  try {
    operation = await getOperation(id);
  } catch (error) {
    if (error instanceof AppError && error.status === 404) notFound();
    throw error;
  }
  const { confirmada } = await searchParams;
  return (
    <>
      <Link
        href="/operacoes"
        className="mb-7 inline-flex items-center gap-2 text-sm text-muted"
      >
        <Icon name="back" width="16" height="16" />
        Voltar para operações
      </Link>
      <div className="page-heading">
        <div className="min-w-0">
          <p className="eyebrow">Detalhes da operação</p>
          <h1 className="page-title break-words">{operation.customer.name}</h1>
          <p className="mt-3 break-all text-xs text-muted">
            Registro {operation.id}
          </p>
        </div>
        <StatusBadge status={operation.status} />
      </div>
      {confirmada === "1" && (
        <div className="mt-6">
          <Notice success>
            Operação registrada. Os valores e a referência da simulação foram
            preservados.
          </Notice>
        </div>
      )}
      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-6">
          <section className="surface-card p-6 sm:p-8">
            <h2 className="text-sm font-semibold">Valores registrados</h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <div>
                <p className="detail-label">
                  Origem · {operation.sourceCurrency}
                </p>
                <p className="mt-2 break-words text-2xl font-semibold tabular-nums">
                  {money(operation.sourceAmount, operation.sourceCurrency)}
                </p>
              </div>
              <div>
                <p className="detail-label">
                  Destino · {operation.targetCurrency}
                </p>
                <p className="mt-2 break-words text-2xl font-semibold tabular-nums">
                  {money(operation.targetAmount, operation.targetCurrency)}
                </p>
              </div>
            </div>
            <dl className="mt-7 grid gap-5 border-t border-line pt-6 sm:grid-cols-2">
              <div>
                <dt className="detail-label">Taxa aplicada</dt>
                <dd className="detail-value">
                  1 {operation.sourceCurrency} ={" "}
                  {operation.exchangeRate.replace(".", ",")}{" "}
                  {operation.targetCurrency}
                </dd>
              </div>
              <div>
                <dt className="detail-label">Fonte</dt>
                <dd className="detail-value">{operation.quoteProvider}</dd>
              </div>
              <div>
                <dt className="detail-label">Data de referência diária</dt>
                <dd className="detail-value">
                  {referenceDate(operation.quoteReferenceDate)}
                </dd>
              </div>
              <div>
                <dt className="detail-label">
                  Consulta realizada em · Brasília
                </dt>
                <dd className="detail-value">
                  {dateTime(operation.quoteFetchedAt)}
                </dd>
              </div>
            </dl>
          </section>
          {operation.request && <section className="surface-card p-6 sm:p-8">
            <h2 className="text-sm font-semibold">Tentativas de processamento simulado</h2>
            {!operation.processingAttempts.length ? <p className="mt-4 text-sm text-muted">Nenhuma tentativa iniciada.</p> : <ol className="mt-5 space-y-5">{operation.processingAttempts.map((attempt) => <li key={attempt.id} className="space-y-2 break-words text-sm">
              <p className="font-semibold">Tentativa {attempt.number} · {attempt.finishedAt ? attempt.failureReason ? "Falha simulada" : "Concluída" : "Processando"}</p>
              <p className="text-muted">Cenário: {attempt.scenario === "SUCCESS" ? "sucesso" : "falha"} · Iniciada por {attempt.startedBy.name}</p>
              <p className="text-xs text-muted">Início: {dateTime(attempt.startedAt)} · Brasília{attempt.finishedAt && ` · Resultado: ${dateTime(attempt.finishedAt)}`}</p>
              {attempt.failureReason && <p className="text-muted">{attempt.failureReason}</p>}
            </li>)}</ol>}
          </section>}
          <section className="surface-card p-6 sm:p-8">
            <div className="flex items-center gap-2">
              <Icon name="history" className="text-brand-ink" />
              <h2 className="text-sm font-semibold">Histórico e auditoria</h2>
            </div>
            <p className="mt-2 text-xs text-muted">
              Criação e alterações em ordem cronológica. Horário de Brasília.
            </p>
            <ol className="mt-6 space-y-6">
              {operation.auditEvents.map((event) => (
                <li key={event.id} className="flex gap-4">
                  <span className="mt-1 grid size-7 shrink-0 place-items-center rounded-full bg-brand-soft text-brand-ink">
                    <Icon
                      name={event.action === "CREATED" ? "plus" : "check"}
                      width="14"
                      height="14"
                    />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">
                      {event.action === "CREATED"
                        ? "Operação criada como Pendente"
                        : `${statusLabels[event.previousStatus!]} → ${statusLabels[event.newStatus]}`}
                    </p>
                    <p className="mt-1 break-words text-sm text-muted">
                      {event.actor.name}
                    </p>
                    <time
                      className="mt-1 block text-xs text-muted"
                      dateTime={event.occurredAt.toISOString()}
                    >
                      {dateTime(event.occurredAt)}
                    </time>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>
        <div className="min-w-0 space-y-6">
          {!operation.request && can(actor.role, "operations:change-status") && actor.id !== operation.createdById && <StatusActions id={operation.id} status={operation.status} />}
          {!operation.request && can(actor.role, "operations:change-status") && actor.id === operation.createdById && <Notice>Você não pode conduzir a análise de uma operação que criou.</Notice>}
          {operation.request && can(actor.role, "operations:process") && (actor.id === operation.createdById ? <Notice>Você não pode processar uma operação de sua autoria, mesmo após mudança de perfil.</Notice> : <ProcessingActions key={`${operation.status}:${operation.processingAttemptCount}`} id={operation.id} status={operation.status} attemptCount={operation.processingAttemptCount} attemptId={operation.processingAttempts[0]?.id ?? null} />)}
          {operation.request && <section className="surface-card space-y-4 p-6"><h2 className="text-sm font-semibold">Solicitação aprovada</h2><p className="text-sm leading-6 text-muted">Os valores aprovados são preservados durante o processamento simulado. Consulte as tentativas e seu resultado nesta página.</p><Link href={`/solicitacoes/${operation.request.id}`} className="text-sm font-semibold text-brand-ink underline">Ver decisão e proposta de origem</Link></section>}
          <section className="surface-card p-6">
            <h2 className="text-sm font-semibold">Dados do registro</h2>
            <dl className="mt-5 space-y-5">
              <div>
                <dt className="detail-label">Cliente</dt>
                <dd className="detail-value">{operation.customer.name}</dd>
                <dd className="mt-1 text-xs text-muted">
                  CPF {cpf(operation.customer.fictionalCpf)}
                </dd>
              </div>
              <div>
                <dt className="detail-label">Registrado por</dt>
                <dd className="detail-value">{operation.createdBy.name}</dd>
              </div>
              <div>
                <dt className="detail-label">Criado em · Brasília</dt>
                <dd className="detail-value">
                  {dateTime(operation.createdAt)}
                </dd>
              </div>
            </dl>
          </section>
        </div>
      </div>
    </>
  );
}
