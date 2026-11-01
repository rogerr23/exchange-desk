import type { IndicatorQuery } from "@/domain/indicator-period";
import { IndicatorFilterNotice } from "@/components/indicators/filter-notice";
import Link from "next/link";
import type { Metadata } from "next";
import { can } from "@/domain/permissions";
import { proposalStatusLabels } from "@/domain/proposal-status";
import { dateTime, money } from "@/lib/format";
import { requirePagePermission } from "@/server/auth/page-access";
import { listProposals } from "@/server/services/proposals";

export const metadata: Metadata = { title: "Propostas | ExchangeDesk" };
export default async function ProposalsPage({ searchParams }: { searchParams: Promise<IndicatorQuery> }) {
  const actor = await requirePagePermission("proposals:read");
  const query = await searchParams;
  const proposals = await listProposals(query);
  return <>
    <div className="page-heading"><div><p className="eyebrow">Atendimento e acompanhamento</p><h1 className="page-title">Propostas</h1>
      <p className="page-description">{actor.role === "CONSULTANT" ? "Suas propostas, com os valores e o prazo original da simulação." : actor.role === "OPERATIONS_ANALYST" ? "Propostas com solicitação gerada, disponíveis para conferência." : "Consulte as propostas da equipe e o histórico de aceite simulado."}</p></div>
      {can(actor.role, "proposals:create") && <Link href="/simulacoes" className="button-primary w-fit">Nova proposta</Link>}
    </div>
    <IndicatorFilterNotice query={query} path="/propostas" />
      <section className="surface-card mt-8 overflow-hidden" aria-label="Propostas registradas">
      <h2 className="border-b border-line p-6 text-sm font-semibold">{proposals.length} {proposals.length === 1 ? "proposta" : "propostas"} no seu escopo</h2>
      {!proposals.length ? <div className="p-6 text-sm text-muted">{query.indicador === "entradas" ? "Nenhuma proposta corresponde ao recorte dos indicadores." : "Nenhuma proposta disponível."}</div> : <div className="divide-y divide-line">{proposals.map((proposal) => <article key={proposal.id} className="flex flex-wrap items-center justify-between gap-4 p-6">
        <div className="min-w-0"><Link href={`/propostas/${proposal.id}`} className="break-words font-semibold text-brand-ink underline">{proposal.customer.name}</Link>
          <p className="mt-2 break-words text-sm tabular-nums">{money(proposal.sourceAmount, proposal.sourceCurrency)} → {money(proposal.targetAmount, proposal.targetCurrency)}</p>
          <p className="mt-2 text-xs text-muted">{dateTime(proposal.createdAt)} · Brasília{actor.role !== "CONSULTANT" && ` · ${proposal.createdBy.name}`}</p></div>
        <span className="rounded-full bg-canvas px-3 py-2 text-xs font-semibold">{proposalStatusLabels[proposal.status]}</span>
      </article>)}</div>}
    </section>
  </>;
}
