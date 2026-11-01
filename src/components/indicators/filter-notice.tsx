import Link from "next/link";
import { indicatorPeriod, periodLabel, type IndicatorQuery } from "@/domain/indicator-period";

export function IndicatorFilterNotice({ query, path }: { query: IndicatorQuery; path: "/propostas" | "/solicitacoes" | "/operacoes" }) {
  const metric = typeof query.indicador === "string" ? query.indicador : "";
  const labels: Record<string, string> = path === "/propostas" ? { entradas: "Propostas criadas no período" }
    : path === "/solicitacoes" ? { entradas: "Solicitações recebidas no período", pendentes: "Recebidas no período e ainda aguardando análise" }
    : { concluidas: "Conclusão registrada no período", falhas: "Falha registrada no período e ainda sem resolução" };
  if (!Object.hasOwn(labels, metric)) return null;
  const period = indicatorPeriod(query);
  const back = `/indicadores?${new URLSearchParams({ de: period.fromDay, ate: period.toDay })}`;
  return <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-brand-soft px-5 py-4">
    <div><p className="text-sm font-semibold">{labels[metric]}</p><p className="mt-1 text-xs text-muted">{periodLabel(period)} · Brasília{period.invalid ? " · Datas inválidas; exibindo os últimos 30 dias." : ""}</p></div>
    <div className="flex flex-wrap gap-5"><Link href={back} className="text-link">Voltar aos indicadores</Link><Link href={path} className="text-link">Limpar filtro</Link></div>
  </div>;
}
