import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ProposalSummary } from "@/components/proposals/proposal-summary";
import { Notice } from "@/components/notice";
import { dateTime } from "@/lib/format";
import { requirePagePermission } from "@/server/auth/page-access";
import { getExchangeRequest } from "@/server/services/proposals";
import { AppError } from "@/server/errors";

export const metadata: Metadata = { title: "Solicitação | ExchangeDesk" };
export default async function RequestPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ criada?: string }> }) {
  await requirePagePermission("requests:read");
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
      <h2 className="text-sm font-semibold">Aguardando análise</h2>
      <p className="text-sm leading-6 text-muted">Os valores foram preservados no aceite, registrado em {dateTime(request.createdAt)} · Brasília. O prazo original de aceite não limita a consulta desta solicitação.</p>
      <p className="text-sm leading-6 text-muted">A aprovação pelo analista será necessária para criar uma operação. A decisão de análise ainda não está disponível nesta etapa.</p>
      <Link href={`/propostas/${request.proposalId}`} className="text-sm font-semibold text-brand-ink underline">Ver proposta de origem</Link>
    </section>
    <div className="mt-6"><ProposalSummary proposal={request.proposal} /></div>
  </>;
}
