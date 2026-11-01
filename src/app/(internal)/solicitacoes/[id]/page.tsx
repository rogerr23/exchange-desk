import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { can } from "@/domain/permissions";
import { requestStatusLabels } from "@/domain/proposal-status";
import { DecisionForm } from "@/components/proposals/decision-form";
import { ProposalSummary } from "@/components/proposals/proposal-summary";
import { Notice } from "@/components/notice";
import { dateTime } from "@/lib/format";
import { requirePagePermission } from "@/server/auth/page-access";
import { getExchangeRequest } from "@/server/services/proposals";
import { AppError } from "@/server/errors";

export const metadata: Metadata = { title: "Solicitação | ExchangeDesk" };
export default async function RequestPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ criada?: string }> }) {
  const actor = await requirePagePermission("requests:read");
  let request;
  try { request = await getExchangeRequest((await params).id); } catch (error) {
    if (error instanceof AppError && error.status === 404) notFound();
    throw error;
  }
  const { criada } = await searchParams;
  return <>
    <Link href="/solicitacoes" className="text-sm text-brand-ink underline">Voltar para solicitações</Link>
    <div className="mt-6"><p className="eyebrow">Solicitação para análise</p><h1 className="page-title break-words">{request.proposal.customer.name}</h1><p className="mt-3 break-all text-xs text-muted">Solicitação {request.id}</p></div>
    {criada === "1" && <div className="mt-6"><Notice success>Aceite simulado registrado. Uma única solicitação foi gerada para análise.</Notice></div>}
    <section className="surface-card mt-8 space-y-4 p-6">
      <h2 className="text-sm font-semibold">{requestStatusLabels[request.status]}</h2>
      <p className="text-sm leading-6 text-muted">Os valores foram preservados no aceite, registrado em {dateTime(request.createdAt)} · Brasília. O prazo original de aceite não limita a consulta desta solicitação.</p>
      {request.status === "PENDING_REVIEW" ? <p className="text-sm leading-6 text-muted">A aprovação pelo analista criará uma única operação. A rejeição encerrará esta solicitação sem operação.</p> : <>
        <p className="break-words text-sm leading-6 text-muted">Decisão registrada por {request.decidedBy?.name} em {dateTime(request.decidedAt!)} · Brasília.</p>
        {request.rejectionReason && <p className="whitespace-pre-wrap break-words text-sm leading-6">Motivo da rejeição: {request.rejectionReason}</p>}
        {request.operationId && <Link href={`/operacoes/${request.operationId}`} className="button-secondary">Ver operação gerada</Link>}
      </>}
      <Link href={`/propostas/${request.proposalId}`} className="block w-fit text-sm font-semibold text-brand-ink underline">Ver proposta de origem</Link>
    </section>
    {request.status === "PENDING_REVIEW" && can(actor.role, "requests:decide") && (actor.id === request.createdById ? <div className="mt-6"><Notice>Você não pode decidir sobre uma solicitação que criou, mesmo após mudança de perfil.</Notice></div> : <DecisionForm id={request.id} />)}
    <div className="mt-6"><ProposalSummary proposal={request.proposal} /></div>
  </>;
}
