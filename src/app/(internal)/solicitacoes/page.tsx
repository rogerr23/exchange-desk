import type { IndicatorQuery } from "@/domain/indicator-period";
import { IndicatorFilterNotice } from "@/components/indicators/filter-notice";
import Link from "next/link";
import type { Metadata } from "next";
import { requestStatusLabels } from "@/domain/proposal-status";
import { dateTime, money } from "@/lib/format";
import { requirePagePermission } from "@/server/auth/page-access";
import { listRequests } from "@/server/services/proposals";

export const metadata: Metadata = { title: "Solicitações | ExchangeDesk" };
export default async function RequestsPage({ searchParams }: { searchParams: Promise<IndicatorQuery> }) {
  const actor = await requirePagePermission("requests:read");
  const query = await searchParams;
  const requests = await listRequests(query);
  return <>
    <p className="eyebrow">Análise operacional</p><h1 className="page-title">Solicitações</h1>
    <p className="page-description">{actor.role === "CONSULTANT" ? "Acompanhe as solicitações geradas pelos seus aceites simulados." : "Consulte as solicitações da equipe e confira os valores aceitos."}</p>
    <IndicatorFilterNotice query={query} path="/solicitacoes" />
      <section className="surface-card mt-8 overflow-hidden" aria-label="Solicitações registradas">
      <h2 className="border-b border-line p-6 text-sm font-semibold">{requests.length} {requests.length === 1 ? "solicitação" : "solicitações"} no seu escopo</h2>
      {!requests.length ? <div className="p-6 text-sm text-muted">{query.indicador === "entradas" || query.indicador === "pendentes" ? "Nenhuma solicitação corresponde ao recorte dos indicadores." : "Nenhuma solicitação disponível. O registro é gerado após o aceite simulado de uma proposta."}</div> : <div className="divide-y divide-line">{requests.map((request) => <article key={request.id} className="flex flex-wrap items-center justify-between gap-4 p-6">
        <div className="min-w-0"><Link href={`/solicitacoes/${request.id}`} className="break-words font-semibold text-brand-ink underline">{request.proposal.customer.name}</Link>
          <p className="mt-2 break-words text-sm tabular-nums">{money(request.proposal.sourceAmount, request.proposal.sourceCurrency)} → {money(request.proposal.targetAmount, request.proposal.targetCurrency)}</p>
          <p className="mt-2 text-xs text-muted">{dateTime(request.createdAt)} · Brasília · {request.proposal.createdBy.name}</p></div>
        <span className="rounded-full bg-canvas px-3 py-2 text-xs font-semibold">{requestStatusLabels[request.status]}</span>
      </article>)}</div>}
    </section>
  </>;
}
