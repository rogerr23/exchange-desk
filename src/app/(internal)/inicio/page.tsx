import Link from "next/link";
import type { Metadata } from "next";
import { Icon } from "@/components/icon";
import { StatusBadge } from "@/components/operations/status-badge";
import { SimulationHistory } from "@/components/simulations/simulation-history";
import { dateTime, money } from "@/lib/format";
import { can, ROLE_LABELS } from "@/domain/permissions";
import { requirePagePermission } from "@/server/auth/page-access";
import { getOperationSummary, listOperations } from "@/server/services/operations";
import { getSimulationCount, listSimulations } from "@/server/services/simulations";

export const metadata: Metadata = { title: "Painel | ExchangeDesk" };
export default async function StartPage({ searchParams }: { searchParams: Promise<{ acesso?: string }> }) {
  const actor = await requirePagePermission("operations:read");
  const [counts, operations, simulations, simulationCount, { acesso }] = await Promise.all([
    getOperationSummary(), listOperations(5),
    can(actor.role, "simulations:read") ? listSimulations(5) : Promise.resolve([]),
    can(actor.role, "simulations:read") ? getSimulationCount() : Promise.resolve(0), searchParams,
  ]);
  const isConsultant = actor.role === "CONSULTANT";
  const descriptions = {
    CONSULTANT: "Suas simulações, suas operações e o próximo passo de cada atendimento.",
    OPERATIONS_ANALYST: "Confira as operações da equipe e acompanhe sua análise.",
    MANAGER: "Supervisione as operações e os indicadores da equipe.",
    ADMIN: "Gerencie os acessos e consulte operações para suporte à equipe.",
  };
  const guidance = {
    CONSULTANT: ["Cadastre ou selecione um cliente para o atendimento.", "Simule a conversão e confira valores, fonte e referência.", "Revise e salve uma proposta. O prazo de aceite é o restante dos 15 minutos da simulação.", "Registre o aceite simulado para gerar uma solicitação e acompanhe a análise."],
    OPERATIONS_ANALYST: ["Consulte as solicitações da equipe e confira as propostas vinculadas.", "Confira o cliente, os valores e a referência registrada.", "Acompanhe a análise nos detalhes da operação. Toda alteração fica na auditoria."],
    MANAGER: ["Acompanhe os indicadores de toda a equipe.", "Consulte os detalhes e o histórico das operações para supervisão."],
    ADMIN: ["Cadastre funcionários com o perfil correspondente à sua função.", "Consulte os detalhes e a auditoria das operações para prestar suporte à equipe."],
  };
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  const metrics = [
    ...(can(actor.role, "simulations:read") ? [{ label: "Simulações salvas", value: simulationCount, note: "Desde a criação do histórico", href: "/simulacoes/historico" }] : []),
    { label: "Pendentes", value: counts.PENDING, note: "Registradas, aguardando análise", href: "/operacoes" },
    { label: "Em análise", value: counts.UNDER_REVIEW, note: "Em conferência de dados", href: "/operacoes" },
    { label: "Concluídas", value: counts.COMPLETED, note: "Fluxo encerrado", href: "/operacoes" },
    { label: "Canceladas", value: counts.CANCELED, note: "Encerradas sem conclusão", href: "/operacoes" },
  ];
  return <>
    <div className="page-heading">
      <div>
        <p className="eyebrow">{isConsultant ? "Meu painel" : "Visão da equipe"} · {ROLE_LABELS[actor.role]}</p>
        <h1 className="page-title sm:text-4xl">Olá, {actor.name.split(" ")[0]}.</h1>
        <p className="page-description">{descriptions[actor.role]}</p>
      </div>
      {can(actor.role, "quotes:simulate") && <Link href="/simulacoes" className="button-primary w-fit">Nova simulação<Icon name="arrow" width="17" height="17" /></Link>}
    </div>
    {acesso === "negado" && <div role="alert" className="notice notice-error mt-6"><Icon name="lock" />Seu perfil não tem permissão para acessar esta área.</div>}
    <section className="mt-8" aria-label="Resumo de atividades">
      <p className="mb-4 text-xs text-muted">{isConsultant ? "Somente registros criados por você" : "Toda a equipe"} · {total} {total === 1 ? "operação" : "operações"} no total</p>
      <dl className={`grid grid-cols-2 gap-4 ${isConsultant ? "lg:grid-cols-5" : "lg:grid-cols-4"}`}>
        {metrics.map((metric) => <div key={metric.label} className="surface-card min-w-0 p-5">
          <dt className="text-sm text-muted"><Link href={metric.href} className="hover:underline">{metric.label}</Link></dt>
          <dd className="mt-3 text-3xl font-semibold tabular-nums">{metric.value}</dd>
          <dd className="mt-3 text-xs leading-5 text-muted">{metric.note}</dd>
        </div>)}
      </dl>
    </section>
    <div className="mt-7 flex flex-wrap gap-3">
      <Link href="/propostas" className="button-secondary">Ver propostas</Link>
      <Link href="/solicitacoes" className="button-secondary">Acompanhar solicitações</Link>
      <Link href="/operacoes" className="button-secondary">{isConsultant ? "Minhas operações" : "Ver operações"}</Link>
      {can(actor.role, "simulations:read") && <Link href="/simulacoes/historico" className="button-secondary">Minhas simulações</Link>}
      {can(actor.role, "customers:create") && <Link href="/clientes/novo" className="button-secondary">Cadastrar cliente</Link>}
      {can(actor.role, "employees:read") && <Link href="/funcionarios" className="button-secondary">Gerenciar funcionários</Link>}
    </div>
    <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1fr_320px]">
      <div className="min-w-0 space-y-6">
        <section className="surface-card overflow-hidden">
          <div className="border-b border-line p-6"><h2 className="text-sm font-semibold">{isConsultant ? "Minhas operações recentes" : "Operações recentes da equipe"}</h2></div>
          {operations.length === 0 ? <div className="p-6 text-sm leading-6 text-muted">Nenhuma operação registrada neste escopo.</div> :
            <div className="divide-y divide-line">{operations.map((operation) => <article key={operation.id} className="flex flex-wrap items-center justify-between gap-4 p-6">
              <div className="min-w-0">
                <Link href={`/operacoes/${operation.id}`} className="break-words text-sm font-semibold text-brand-ink underline">{operation.customer.name}</Link>
                <p className="mt-2 break-words text-sm tabular-nums">{money(operation.sourceAmount, operation.sourceCurrency)} → {money(operation.targetAmount, operation.targetCurrency)}</p>
                <p className="mt-2 text-xs text-muted">{dateTime(operation.createdAt)} · Brasília{!isConsultant && ` · ${operation.createdBy.name}`}</p>
              </div>
              <StatusBadge status={operation.status} />
            </article>)}</div>}
        </section>
        {can(actor.role, "simulations:read") && <section className="surface-card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-6">
            <h2 className="text-sm font-semibold">Minhas simulações recentes</h2>
            <Link href="/simulacoes/historico" className="text-xs font-semibold text-brand-ink underline">Ver histórico</Link>
          </div>
          <SimulationHistory simulations={simulations} isAdmin={false} />
        </section>}
      </div>
      <aside className="space-y-6">
        <section className="surface-card p-6">
          <h2 className="text-sm font-semibold">O que fazer agora</h2>
          <ol className="mt-5 space-y-5 text-sm leading-6 text-muted">
            {guidance[actor.role].map((step) => <li key={step}>{step}</li>)}
          </ol>
        </section>
        <section className="surface-card p-6">
          <h2 className="text-sm font-semibold">Entenda os valores</h2>
          <p className="mt-4 text-sm leading-6 text-muted">Valor de destino = valor de origem × taxa. O resultado é arredondado para duas casas decimais.</p>
          <p className="mt-3 text-sm leading-6 text-muted">As cotações são referências diárias, sem atualização em tempo real. A simulação não calcula tarifas, spread ou impostos.</p>
          <p className="mt-3 text-sm leading-6 text-muted">O sistema registra o acompanhamento. Confirmar ou concluir uma operação não executa pagamento nem liquidação financeira.</p>
        </section>
      </aside>
    </div>
  </>;
}
