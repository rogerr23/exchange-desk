import { cpf, dateTime, money, referenceDate } from "@/lib/format";
import type { getProposal } from "@/server/services/proposals";
import { proposalStatusLabels } from "@/domain/proposal-status";

export function ProposalSummary({ proposal }: { proposal: Awaited<ReturnType<typeof getProposal>> }) {
  return <div className="space-y-6">
    <section className="surface-card p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Valores da proposta</h2>
        <span className="rounded-full bg-canvas px-3 py-2 text-xs font-semibold">{proposalStatusLabels[proposal.status]}</span>
      </div>
      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div><p className="detail-label">Origem · {proposal.sourceCurrency}</p><p className="mt-2 break-words text-2xl font-semibold tabular-nums">{money(proposal.sourceAmount, proposal.sourceCurrency)}</p></div>
        <div><p className="detail-label">Destino · {proposal.targetCurrency}</p><p className="mt-2 break-words text-2xl font-semibold tabular-nums">{money(proposal.targetAmount, proposal.targetCurrency)}</p></div>
      </div>
      <dl className="mt-7 grid gap-5 border-t border-line pt-6 sm:grid-cols-2">
        <div><dt className="detail-label">Cliente</dt><dd className="detail-value">{proposal.customer.name}</dd><dd className="mt-1 text-xs text-muted">CPF {cpf(proposal.customer.fictionalCpf)}</dd></div>
        <div><dt className="detail-label">Consultor responsável</dt><dd className="detail-value">{proposal.createdBy.name}</dd></div>
        <div><dt className="detail-label">Taxa aplicada</dt><dd className="detail-value">1 {proposal.sourceCurrency} = {proposal.exchangeRate.replace(".", ",")} {proposal.targetCurrency}</dd></div>
        <div><dt className="detail-label">Fonte</dt><dd className="detail-value">{proposal.quoteProvider}</dd></div>
        <div><dt className="detail-label">Data de referência diária</dt><dd className="detail-value">{referenceDate(proposal.quoteReferenceDate)}</dd></div>
        <div><dt className="detail-label">Consulta realizada em · Brasília</dt><dd className="detail-value">{dateTime(proposal.quoteFetchedAt)}</dd></div>
        <div><dt className="detail-label">Proposta criada em · Brasília</dt><dd className="detail-value">{dateTime(proposal.createdAt)}</dd></div>
        <div><dt className="detail-label">Prazo original para aceite · Brasília</dt><dd className="detail-value">{dateTime(proposal.expiresAt)}</dd></div>
      </dl>
      <p className="mt-6 border-t border-line pt-5 text-xs leading-6 text-muted">O prazo é de 15 minutos desde a simulação. Criar a proposta não renova a validade. Os valores não incluem tarifas, spread ou impostos.</p>
    </section>
    <section className="surface-card p-6 sm:p-8">
      <h2 className="text-sm font-semibold">Histórico da proposta</h2>
      <ol className="mt-5 space-y-5">
        {proposal.auditEvents.map((event) => <li key={event.id}>
          <p className="text-sm font-semibold">{event.action === "CREATED" ? "Proposta criada" : "Aceite simulado registrado e solicitação gerada"}</p>
          <p className="mt-1 text-sm text-muted">{event.actor.name}</p>
          <p className="mt-1 text-xs text-muted">{dateTime(event.occurredAt)} · Brasília</p>
        </li>)}
      </ol>
    </section>
  </div>;
}
