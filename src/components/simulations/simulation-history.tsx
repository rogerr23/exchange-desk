import Link from "next/link";
import { dateTime, money, referenceDate } from "@/lib/format";
import type { listSimulations } from "@/server/services/simulations";

export function SimulationHistory({ simulations, isAdmin }: {
  simulations: Awaited<ReturnType<typeof listSimulations>>;
  isAdmin: boolean;
}) {
  return simulations.length === 0 ? (
    <div className="empty-state">
      <h3 className="font-semibold">Nenhuma simulação registrada ainda</h3>
      <p className="mt-2 text-sm text-muted">As novas simulações aparecerão aqui, mesmo sem confirmação. As anteriores à criação do histórico não foram salvas.</p>
      <Link href="/simulacoes" className="button-primary mt-5">Fazer uma simulação</Link>
    </div>
  ) : (
    <div className="divide-y divide-line">
      {simulations.map((simulation) => (
        <article key={simulation.id} className="grid gap-4 p-6 xl:grid-cols-[1fr_auto] xl:items-center">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold">{simulation.sourceCurrency} → {simulation.targetCurrency}</h3>
            <p className="mt-2 break-words text-sm tabular-nums">{money(simulation.sourceAmount, simulation.sourceCurrency)} → {money(simulation.targetAmount, simulation.targetCurrency)}</p>
            <p className="mt-2 text-xs text-muted">{dateTime(simulation.issuedAt)} · Brasília{isAdmin && ` · ${simulation.createdBy.name}`}</p>
          </div>
          <div className="min-w-0 text-xs leading-6 text-muted xl:col-start-1">
            <p className="break-words">1 {simulation.sourceCurrency} = {simulation.exchangeRate.replace(".", ",")} {simulation.targetCurrency}</p>
            <p>{simulation.quoteProvider} · Ref. {referenceDate(simulation.quoteReferenceDate)}</p>
            <details className="mt-1">
              <summary className="cursor-pointer text-brand-ink">Consulta e validade original</summary>
              <p>Consulta: {dateTime(simulation.quoteFetchedAt)} · Brasília</p>
              <p>Prazo original de aceite: {dateTime(simulation.expiresAt)} · Brasília</p>
            </details>
          </div>
          <div className="flex flex-wrap items-center gap-3 xl:col-start-2 xl:row-start-1 xl:row-span-2 xl:flex-col xl:items-end">
            {simulation.proposalId ? <Link href={`/propostas/${simulation.proposalId}`} className="text-sm font-semibold text-brand-ink underline">Ver proposta</Link> : simulation.operationId ? (
              <Link href={`/operacoes/${simulation.operationId}`} className="text-sm font-semibold text-brand-ink underline">Ver operação registrada</Link>
            ) : <span className="text-xs text-muted">Sem proposta registrada</span>}
            <Link href={`/simulacoes?${new URLSearchParams({ origem: simulation.sourceCurrency, destino: simulation.targetCurrency, valor: simulation.sourceAmount })}`} className="button-secondary">Simular novamente</Link>
          </div>
        </article>
      ))}
    </div>
  );
}
