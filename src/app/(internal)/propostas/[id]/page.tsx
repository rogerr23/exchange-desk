import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { can } from "@/domain/permissions";
import { ProposalSummary } from "@/components/proposals/proposal-summary";
import { AcceptanceForm } from "@/components/proposals/acceptance-form";
import { Notice } from "@/components/notice";
import { requirePagePermission } from "@/server/auth/page-access";
import { getProposal } from "@/server/services/proposals";
import { AppError } from "@/server/errors";

export const metadata: Metadata = { title: "Proposta | ExchangeDesk" };
export default async function ProposalPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ criada?: string }> }) {
  const actor = await requirePagePermission("proposals:read");
  let proposal;
  try { proposal = await getProposal((await params).id); } catch (error) {
    if (error instanceof AppError && error.status === 404) notFound();
    throw error;
  }
  const { criada } = await searchParams;
  return <>
    <Link href="/propostas" className="text-sm text-brand-ink underline">Voltar para propostas</Link>
    <div className="mt-6"><p className="eyebrow">Detalhes da proposta</p><h1 className="page-title break-words">{proposal.customer.name}</h1><p className="mt-3 break-all text-xs text-muted">Proposta {proposal.id}</p></div>
    {criada === "1" && <div className="mt-6"><Notice success>Proposta salva. Confira os dados e registre o aceite simulado antes do prazo original.</Notice></div>}
    <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1fr_340px]">
      <div className="min-w-0"><ProposalSummary proposal={proposal} /></div>
      <div className="min-w-0">
        {proposal.request ? <section className="surface-card space-y-4 p-6"><h2 className="text-sm font-semibold">Aceite simulado registrado</h2><p className="text-sm leading-6 text-muted">A solicitação preserva os valores para análise. Nenhuma operação foi criada no aceite.</p><Link href={`/solicitacoes/${proposal.request.id}`} className="button-secondary">Ver solicitação</Link></section> :
          can(actor.role, "proposals:accept") && actor.id === proposal.createdById ? <AcceptanceForm id={proposal.id} expiresAt={proposal.expiresAt.toISOString()} /> :
          <section className="surface-card p-6 text-sm leading-6 text-muted">O aceite simulado é registrado pelo consultor autor, enquanto a proposta está válida.</section>}
      </div>
    </div>
  </>;
}
