import Link from "next/link";
import type { Metadata } from "next";
import { Icon } from "@/components/icon";
import { StatusBadge } from "@/components/operations/status-badge";
import { dateTime, money } from "@/lib/format";
import { requirePagePermission } from "@/server/auth/page-access";
import { getWorkspaceOverview } from "@/server/services/dashboard";
import { listOperations } from "@/server/services/operations";

export const metadata: Metadata = { title: "Início | ExchangeDesk" };

export default async function StartPage({ searchParams }: { searchParams: Promise<{ acesso?: string }> }) {
  const actor = await requirePagePermission("operations:read");
  const [workspace, operations, { acesso }] = await Promise.all([
    getWorkspaceOverview(), listOperations(5), searchParams,
  ]);
  const consultant = actor.role === "CONSULTANT";
  const analyst = actor.role === "OPERATIONS_ANALYST";
  const admin = actor.role === "ADMIN";
  const primaryAction = consultant
    ? { href: "/simulacoes", label: "Nova simulação", icon: "plus" as const }
    : analyst ? { href: "/solicitacoes", label: "Analisar solicitações", icon: "operations" as const }
    : admin ? { href: "/funcionarios", label: "Gerenciar acessos", icon: "users" as const }
    : { href: "/operacoes", label: "Acompanhar operações", icon: "operations" as const };
  const description = consultant ? "Retome seus atendimentos e acompanhe os próximos passos."
    : analyst ? "Confira a fila de análise e dê continuidade às operações."
    : admin ? "Cuide dos acessos e acompanhe os atendimentos da equipe."
    : "Acompanhe as pendências e a atividade recente da equipe.";
  const hasPending = workspace.requests.length || workspace.proposals.length || workspace.operations.length;
  const shortcuts = [
    { href: "/clientes", label: "Clientes", description: "Consulte os cadastros da equipe.", icon: "users" as const },
    ...(consultant ? [{ href: "/simulacoes/historico", label: "Histórico de simulações", description: "Retome uma consulta anterior.", icon: "history" as const }]
      : [{ href: "/propostas", label: "Propostas", description: analyst ? "Consulte propostas encaminhadas à análise." : "Consulte os atendimentos registrados.", icon: "exchange" as const }]),
  ];
  return <>
    <div className="page-heading">
      <div><p className="eyebrow">Seu dia no ExchangeDesk</p><h1 className="page-title sm:text-4xl">Olá, {actor.name.split(" ")[0]}.</h1><p className="page-description">{description}</p></div>
      <Link href={primaryAction.href} className="button-primary w-fit shrink-0"><Icon name={primaryAction.icon} width="18" height="18" />{primaryAction.label}</Link>
    </div>
    {acesso === "negado" && <div role="alert" className="notice notice-error mt-6"><Icon name="lock" />Seu perfil não tem permissão para acessar esta área.</div>}
    <div className="workspace-grid mt-9">
      <div className="min-w-0 space-y-7">
        <section className="surface-card overflow-hidden" aria-labelledby="pending-title">
          <div className="section-heading"><div><h2 id="pending-title" className="font-semibold">{consultant ? "Seus próximos passos" : "No radar da equipe"}</h2><p className="mt-1.5 text-sm text-muted">{consultant ? "Propostas e atendimentos que ainda estão em andamento." : "Solicitações aguardando análise e operações em andamento."}</p></div><span className="section-icon"><Icon name="operations" /></span></div>
          {!hasPending ? <div className="empty-state"><span className="mx-auto mb-4 grid size-11 place-items-center rounded-full bg-positive/10 text-positive"><Icon name="check" /></span><h3 className="text-sm font-semibold">Tudo em dia por aqui</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted">Quando houver propostas pendentes, solicitações em análise ou operações em andamento, elas aparecerão aqui.</p></div> : <div>
            {consultant && workspace.proposals.length > 0 && <div className="workspace-group"><h3 className="workspace-group-title">Propostas aguardando aceite</h3>{workspace.proposals.map(proposal => <Link key={proposal.id} href={`/propostas/${proposal.id}`} className="work-item"><span className="min-w-0"><span className="block truncate text-sm font-semibold">{proposal.customer.name}</span><span className="mt-1 block text-sm text-muted tabular-nums">{money(proposal.sourceAmount, proposal.sourceCurrency)} → {money(proposal.targetAmount, proposal.targetCurrency)}</span><span className="mt-2 block text-xs text-muted">Validade até {dateTime(proposal.expiresAt)} · Brasília</span></span><span className="work-item-action">Revisar<Icon name="arrow" width="16" height="16" /></span></Link>)}</div>}
            {workspace.requests.length > 0 && <div className="workspace-group"><h3 className="workspace-group-title">{consultant ? "Aguardando análise da equipe" : "Solicitações para análise"}</h3>{workspace.requests.map(request => <Link key={request.id} href={`/solicitacoes/${request.id}`} className="work-item"><span className="min-w-0"><span className="block truncate text-sm font-semibold">{request.customerName}</span><span className="mt-1 block text-sm text-muted tabular-nums">{money(request.sourceAmount, request.sourceCurrency)} → {money(request.targetAmount, request.targetCurrency)}</span><span className="mt-2 block text-xs text-muted">Enviada em {dateTime(request.createdAt)} · Brasília</span>{request.selfReviewBlocked && <span className="mt-2 block text-xs text-warning">Autoria própria · decisão bloqueada</span>}</span><span className="work-item-action">{analyst && !request.selfReviewBlocked ? "Analisar" : "Acompanhar"}<Icon name="arrow" width="16" height="16" /></span></Link>)}</div>}
            {workspace.operations.length > 0 && <div className="workspace-group"><h3 className="workspace-group-title">Operações para acompanhar</h3>{workspace.operations.map(operation => <Link key={operation.id} href={`/operacoes/${operation.id}`} className="work-item"><span className="min-w-0"><span className="block truncate text-sm font-semibold">{operation.customer.name}</span><span className="mt-1 block text-sm text-muted tabular-nums">{money(operation.sourceAmount, operation.sourceCurrency)} → {money(operation.targetAmount, operation.targetCurrency)}</span></span><span className="flex shrink-0 items-center gap-3"><StatusBadge status={operation.status} /><Icon name="arrow" width="16" height="16" className="text-muted" /></span></Link>)}</div>}
            <p className="border-t border-line px-6 py-4 text-xs leading-5 text-muted">Até cinco registros por grupo. Propostas por validade; solicitações e operações com espera mais longa primeiro.</p>
          </div>}
        </section>
        <section className="surface-card overflow-hidden" aria-labelledby="recent-title">
          <div className="section-heading"><div><h2 id="recent-title" className="font-semibold">Operações recentes</h2><p className="mt-1.5 text-sm text-muted">{consultant ? "Os últimos registros dos seus atendimentos." : "Os últimos registros da equipe."}</p></div><Link href="/operacoes" className="text-link">Ver todas<Icon name="arrow" width="16" height="16" /></Link></div>
          {!operations.length ? <div className="px-6 py-8"><p className="text-sm text-muted">Nenhuma operação registrada por enquanto.</p><p className="mt-2 text-xs leading-5 text-muted">As operações aparecem aqui após a aprovação de uma solicitação.</p></div> : <div className="divide-y divide-line">{operations.map(operation => <Link key={operation.id} href={`/operacoes/${operation.id}`} className="work-item"><span className="min-w-0"><span className="block truncate text-sm font-semibold">{operation.customer.name}</span><span className="mt-1 block text-sm text-muted tabular-nums">{money(operation.sourceAmount, operation.sourceCurrency)} → {money(operation.targetAmount, operation.targetCurrency)}</span><span className="mt-2 block text-xs text-muted">{dateTime(operation.createdAt)} · Brasília{!consultant && ` · ${operation.createdBy.name}`}</span></span><StatusBadge status={operation.status} /></Link>)}</div>}
        </section>
      </div>
      <aside className="min-w-0 space-y-5" aria-label="Atalhos e ajuda">
        <section className="surface-card p-5"><p className="eyebrow mb-4">Acesso rápido</p><div className="space-y-1">{shortcuts.map(shortcut => <Link key={shortcut.href} href={shortcut.href} className="shortcut-link"><Icon name={shortcut.icon} className="mt-0.5 shrink-0 text-brand-ink" /><span><span className="block text-sm font-semibold">{shortcut.label}</span><span className="mt-1 block text-xs leading-5 text-muted">{shortcut.description}</span></span></Link>)}</div></section>
        <section className="insight-card"><span className="section-icon"><Icon name="chart" /></span><h2 className="mt-4 text-sm font-semibold">Os números, quando precisar</h2><p className="mt-2 text-sm leading-6 text-muted">O resumo de propostas, solicitações e operações tem um espaço próprio.</p><Link href="/indicadores" className="text-link mt-5">Consultar indicadores<Icon name="arrow" width="16" height="16" /></Link></section>
        <details className="surface-card p-5"><summary className="cursor-pointer text-sm font-semibold">Como funciona o atendimento</summary><ol className="mt-4 list-decimal space-y-3 pl-4 text-xs leading-5 text-muted"><li>O consultor simula os valores e cria a proposta.</li><li>O aceite simulado encaminha a solicitação para análise.</li><li>A aprovação cria a operação para processamento simulado.</li></ol><p className="mt-4 border-t border-line pt-4 text-xs leading-5 text-muted">As cotações são referências diárias. O sistema não executa pagamentos ou liquidação financeira.</p></details>
      </aside>
    </div>
  </>;
}
