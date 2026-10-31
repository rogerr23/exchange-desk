import Link from "next/link";
import type { Metadata } from "next";
import { Icon } from "@/components/icon";
import { StatusBadge } from "@/components/operations/status-badge";
import { SimulationHistory } from "@/components/simulations/simulation-history";
import { dateTime, money } from "@/lib/format";
import { requirePagePermission } from "@/server/auth/page-access";
import { getOperationSummary, listOperations } from "@/server/services/operations";
import { getSimulationCount, listSimulations } from "@/server/services/simulations";

export const metadata: Metadata = { title: "Painel | ExchangeDesk" };
export default async function StartPage({ searchParams }: { searchParams: Promise<{ acesso?: string }> }) {
  const actor = await requirePagePermission("operations:read");
  const [counts, operations, simulations, simulationCount, { acesso }] = await Promise.all([
    getOperationSummary(), listOperations(5), listSimulations(5), getSimulationCount(), searchParams,
  ]);
  const isAdmin = actor.role === "ADMIN";
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  const metrics = [
    { label: "Simulações salvas", value: simulationCount, note: "Desde a criação do histórico", href: "/simulacoes/historico" },
    { label: "Pendentes", value: counts.PENDING, note: "Registradas, aguardando análise", href: "/operacoes" },
    { label: "Em análise", value: counts.UNDER_REVIEW, note: "Em conferência de dados", href: "/operacoes" },
    { label: "Concluídas", value: counts.COMPLETED, note: "Fluxo encerrado", href: "/operacoes" },
    { label: "Canceladas", value: counts.CANCELED, note: "Encerradas sem conclusão", href: "/operacoes" },
  ];
  return <>
    <div className="page-heading">
      <div>
        <p className="eyebrow">{isAdmin ? "Visão da equipe" : "Meu painel · Operador"}</p>
        <h1 className="page-title sm:text-4xl">Olá, {actor.name.split(" ")[0]}.</h1>
        <p className="page-description">{isAdmin ? "Acompanhe as simulações e operações de toda a equipe." : "Suas simulações, suas operações e o próximo passo de cada atendimento."}</p>
      </div>
      <Link href="/simulacoes" className="button-primary w-fit">Nova simulação<Icon name="arrow" width="17" height="17" /></Link>
    </div>
    {acesso === "negado" && <div role="alert" className="notice notice-error mt-6"><Icon name="lock" />O gerenciamento de funcionários é exclusivo do administrador.</div>}
    <section className="mt-8" aria-label="Resumo de atividades">
      <p className="mb-4 text-xs text-muted">{isAdmin ? "Toda a equipe" : "Somente registros criados por você"} · {total} {total === 1 ? "operação" : "operações"} no total</p>
      <dl className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {metrics.map((metric) => <div key={metric.label} className="surface-card min-w-0 p-5">
          <dt className="text-sm text-muted"><Link href={metric.href} className="hover:underline">{metric.label}</Link></dt>
          <dd className="mt-3 text-3xl font-semibold tabular-nums">{metric.value}</dd>
          <dd className="mt-3 text-xs leading-5 text-muted">{metric.note}</dd>
        </div>)}
      </dl>
    </section>
    <div className="mt-7 flex flex-wrap gap-3">
      <Link href="/operacoes" className="button-secondary">{isAdmin ? "Ver operações" : "Minhas operações"}</Link>
      <Link href="/simulacoes/historico" className="button-secondary">{isAdmin ? "Histórico de simulações" : "Minhas simulações"}</Link>
      <Link href="/clientes/novo" className="button-secondary">Cadastrar cliente</Link>
      {isAdmin && <Link href="/funcionarios" className="button-secondary">Gerenciar funcionários</Link>}
    </div>
    <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1fr_320px]">
      <div className="min-w-0 space-y-6">
        <section className="surface-card overflow-hidden">
          <div className="border-b border-line p-6"><h2 className="text-sm font-semibold">{isAdmin ? "Operações recentes da equipe" : "Minhas operações recentes"}</h2></div>
          {operations.length === 0 ? <div className="p-6 text-sm leading-6 text-muted">Nenhuma operação registrada ainda. Faça uma simulação, selecione o cliente e confirme os valores para começar.</div> :
            <div className="divide-y divide-line">{operations.map((operation) => <article key={operation.id} className="flex flex-wrap items-center justify-between gap-4 p-6">
              <div className="min-w-0">
                <Link href={`/operacoes/${operation.id}`} className="break-words text-sm font-semibold text-brand-ink underline">{operation.customer.name}</Link>
                <p className="mt-2 break-words text-sm tabular-nums">{money(operation.sourceAmount, operation.sourceCurrency)} → {money(operation.targetAmount, operation.targetCurrency)}</p>
                <p className="mt-2 text-xs text-muted">{dateTime(operation.createdAt)} · Brasília{isAdmin && ` · ${operation.createdBy.name}`}</p>
              </div>
              <StatusBadge status={operation.status} />
            </article>)}</div>}
        </section>
        <section className="surface-card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-6">
            <h2 className="text-sm font-semibold">{isAdmin ? "Simulações recentes da equipe" : "Minhas simulações recentes"}</h2>
            <Link href="/simulacoes/historico" className="text-xs font-semibold text-brand-ink underline">Ver histórico</Link>
          </div>
          <SimulationHistory simulations={simulations} isAdmin={isAdmin} />
        </section>
      </div>
      <aside className="space-y-6">
        <section className="surface-card p-6">
          <h2 className="text-sm font-semibold">O que fazer agora</h2>
          <ol className="mt-5 space-y-5 text-sm leading-6 text-muted">
            <li><strong className="text-ink">1. Simule a conversão.</strong> Escolha as moedas e o valor. Confira a taxa, a fonte e a data de referência.</li>
            <li><strong className="text-ink">2. Revise e registre.</strong> Selecione o cliente e confirme antes do prazo de 15 minutos. Isso cria uma operação Pendente.</li>
            <li><strong className="text-ink">3. Acompanhe a análise.</strong> Abra a operação e passe para Em análise após iniciar a conferência.</li>
            <li><strong className="text-ink">4. Encerre o registro.</strong> Depois da análise, marque Concluída ou Cancelada. Estados finais não podem ser reabertos.</li>
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
