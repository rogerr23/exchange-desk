import Link from "next/link";
import type { Metadata } from "next";
import { Icon } from "@/components/icon";
import { ActivityChart } from "@/components/indicators/activity-chart";
import { indicatorLink, periodLabel, waitDuration, type IndicatorQuery } from "@/domain/indicator-period";
import { dateTime } from "@/lib/format";
import { requirePagePermission } from "@/server/auth/page-access";
import { getIndicators } from "@/server/services/indicators";

export const metadata: Metadata = { title: "Indicadores | ExchangeDesk" };

export default async function IndicatorsPage({ searchParams }: { searchParams: Promise<IndicatorQuery> }) {
  const actor = await requirePagePermission("operations:read");
  const data = await getIndicators(await searchParams);
  const { period } = data;
  const consultant = actor.role === "CONSULTANT";
  const entryLabel = data.analyst ? "Solicitações recebidas" : "Propostas criadas";
  const entryPath = data.analyst ? "/solicitacoes" : "/propostas";
  const pendingLink = indicatorLink("/solicitacoes", period, "pendentes");
  const metrics = [
    { label: entryLabel, value: data.entries, note: data.analyst ? "Encaminhadas para análise no período" : "Atendimentos com proposta criada no período", href: indicatorLink(entryPath, period, "entradas"), icon: "exchange" as const },
    { label: "Aguardando análise", value: data.pending, note: "Recebidas no período e ainda pendentes", href: pendingLink, icon: "history" as const },
    { label: "Operações concluídas", value: data.completed, note: "Conclusão registrada no período", href: indicatorLink("/operacoes", period, "concluidas"), icon: "check" as const },
    { label: "Falhas pendentes", value: data.failed, note: "Falha no período, ainda sem resolução", href: indicatorLink("/operacoes", period, "falhas"), icon: "operations" as const },
  ];
  return <>
    <div className="page-heading">
      <div><p className="eyebrow">Acompanhamento</p><h1 className="page-title">Indicadores</h1><p className="page-description">{consultant ? "Entenda o andamento dos seus atendimentos." : "Entenda o andamento dos atendimentos da equipe."} Consulte a evolução e identifique onde o trabalho precisa de atenção.</p></div>
      <Link href="/inicio" className="button-secondary w-fit shrink-0"><Icon name="back" width="17" height="17" />Voltar ao início</Link>
    </div>

    <section className="surface-card mt-7 p-5 sm:p-6" aria-label="Período dos indicadores">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><h2 className="text-sm font-semibold">Período de consulta</h2><p className="mt-1.5 text-xs leading-5 text-muted">{periodLabel(period)} · Brasília · {consultant ? "Somente seus registros" : "Toda a equipe"}</p></div>
        <div className="flex flex-wrap gap-2" aria-label="Períodos rápidos">{[7, 30, 90].map(days => {
          const active = !period.invalid && period.days === days && period.toDay === period.today;
          return <Link key={days} href={`/indicadores?periodo=${days}`} aria-current={active ? "true" : undefined} className={`period-preset ${active ? "period-preset-active" : ""}`}>{days} dias</Link>;
        })}</div>
      </div>
      <form action="/indicadores" className="mt-5 flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1 basis-40"><label htmlFor="indicator-from" className="field-label">De</label><input key={`from-${period.fromDay}`} id="indicator-from" name="de" type="date" required max={period.today} defaultValue={period.fromDay} className="field-input" /></div>
        <div className="min-w-0 flex-1 basis-40"><label htmlFor="indicator-to" className="field-label">Até</label><input key={`to-${period.toDay}`} id="indicator-to" name="ate" type="date" required max={period.today} defaultValue={period.toDay} className="field-input" /></div>
        <button type="submit" className="button-primary min-h-12">Aplicar período<Icon name="arrow" width="17" height="17" /></button>
      </form>
      <p className="mt-3 text-xs text-muted">Escolha até 90 dias. As datas inicial e final estão incluídas.</p>
      {period.invalid && <p role="alert" className="mt-4 text-sm text-negative">O intervalo informado é inválido. Use datas válidas, em ordem, sem dias futuros e com até 90 dias. Exibindo os últimos 30 dias.</p>}
    </section>

    <section className="indicator-metrics mt-6" aria-label="Resumo do período">
      {metrics.map(metric => <Link key={metric.label} href={metric.href} className="surface-card metric-link p-5">
        <div className="flex items-center justify-between gap-3"><h2 className="text-sm font-medium text-muted">{metric.label}</h2><Icon name={metric.icon} width="18" height="18" className="shrink-0 text-muted" /></div>
        <p className="mt-4 text-3xl font-semibold tracking-tight tabular-nums">{metric.value}</p>
        <p className="mt-3 text-xs leading-5 text-muted">{metric.note}</p>
        <span className="text-link mt-4">Ver registros<Icon name="arrow" width="15" height="15" /></span>
      </Link>)}
    </section>

    <div className="indicator-panels mt-7">
      <section className="surface-card min-w-0 p-5 sm:p-6" aria-labelledby="activity-title">
        <div className="mb-7 flex flex-wrap items-start justify-between gap-4"><div><h2 id="activity-title" className="font-semibold">Evolução dos atendimentos</h2><p className="mt-2 text-sm text-muted">{entryLabel} ao longo do período.</p></div><span className="rounded-full bg-brand-soft px-3 py-1.5 text-xs font-medium text-brand-ink">{period.days <= 14 ? "Por dia" : "Por semana"}</span></div>
        <ActivityChart buckets={data.trend} label={entryLabel} />
      </section>
      <section className="surface-card min-w-0 overflow-hidden" aria-labelledby="waiting-title">
        <div className="section-heading"><div><h2 id="waiting-title" className="font-semibold">Espera por análise</h2><p className="mt-2 text-sm text-muted">Solicitações recebidas no período que continuam pendentes.</p></div></div>
        {data.pending === 0 ? <div className="empty-state"><span className="mx-auto mb-4 grid size-10 place-items-center rounded-full bg-positive/10 text-positive"><Icon name="check" /></span><p className="text-sm font-semibold">Nenhuma solicitação aguardando análise neste recorte</p><p className="mt-2 text-xs leading-5 text-muted">Solicitações recebidas fora do período não entram nesta consulta.</p></div> : <>
          <dl className="grid grid-cols-2 gap-5 border-b border-line p-5 sm:p-6"><div><dt className="text-xs text-muted">Espera média atual</dt><dd className="mt-2 text-xl font-semibold tabular-nums">{waitDuration(data.averageWaitMs)}</dd></div><div><dt className="text-xs text-muted">Maior espera</dt><dd className="mt-2 text-xl font-semibold tabular-nums">{waitDuration(data.oldestWaitMs)}</dd></div></dl>
          <div className="px-5 pt-5 sm:px-6"><h3 className="text-xs font-semibold text-muted">Há mais tempo na fila</h3></div>
          <ul className="divide-y divide-line">{data.oldestRequests.map(request => <li key={request.id}><Link href={`/solicitacoes/${request.id}`} className="work-item"><span className="min-w-0"><span className="block truncate text-sm font-semibold">{request.customerName}</span><span className="mt-1 block text-xs text-muted">Enviada em {dateTime(request.createdAt)} · Brasília</span></span><span className="flex items-center gap-2 text-xs font-semibold text-brand-ink">{waitDuration(request.waitMs)}<Icon name="arrow" width="15" height="15" /></span></Link></li>)}</ul>
          <div className="border-t border-line p-5 sm:px-6"><Link href={pendingLink} className="text-link">Ver solicitações pendentes<Icon name="arrow" width="16" height="16" /></Link></div>
        </>}
      </section>
    </div>
    <details className="mt-6 rounded-xl border border-line px-5 py-4"><summary className="cursor-pointer text-sm font-semibold">Como interpretar esta consulta</summary><div className="mt-4 space-y-3 text-xs leading-6 text-muted"><p>Entradas são contadas pela criação da {data.analyst ? "solicitação" : "proposta"}. Conclusões são contadas pela data do evento de conclusão no histórico, mesmo que a operação tenha sido criada antes. Cada operação é contada uma única vez.</p><p>Falhas pendentes são operações ainda em falha, com um evento de falha no período. Tentativas repetidas da mesma operação não aumentam esse número.</p><p>A espera considera apenas solicitações ainda pendentes e recebidas no período. É medida do envio até o momento da consulta, incluindo noites e fins de semana. Não representa o tempo de análise das solicitações já decididas.</p><p>Os cartões medem etapas diferentes e podem incluir registros criados em outros períodos. Seus valores não devem ser somados ou usados como taxa de conversão. As contagens representam registros, sem execução financeira.</p><p>Consulta realizada em {dateTime(data.now)} · Brasília. As situações refletem o estado atual dos registros.</p></div></details>
  </>;
}
