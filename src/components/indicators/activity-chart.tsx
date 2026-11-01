import { periodLabel } from "@/domain/indicator-period";

type Bucket = { fromDay: string; toDay: string; count: number };
export function ActivityChart({ buckets, label }: { buckets: Bucket[]; label: string }) {
  const maximum = Math.max(1, ...buckets.map(bucket => bucket.count));
  const total = buckets.reduce((sum, bucket) => sum + bucket.count, 0);
  const shortDate = (day: string) => `${day.slice(8)}/${day.slice(5, 7)}`;
  return <figure>
    {total === 0 ? <div className="empty-state"><p className="text-sm font-semibold">Nenhuma entrada neste período</p><p className="mt-2 text-sm text-muted">Escolha outro intervalo para consultar a evolução.</p></div> : <div className="activity-chart" role="img" aria-label={`${label}: ${total} registros no período. Consulte os valores na tabela abaixo.`}>
      {buckets.map((bucket, index) => <div key={bucket.fromDay} className="activity-column" title={`${periodLabel(bucket)}: ${bucket.count} registros`}>
        <div className="activity-track"><span className="activity-bar" style={{ height: `${bucket.count / maximum * 100}%` }}><span className="activity-count">{bucket.count}</span></span></div>
        <span className="activity-label">{buckets.length <= 7 || index % 2 === 0 || index === buckets.length - 1 ? shortDate(bucket.fromDay) : ""}</span>
      </div>)}
    </div>}
    <figcaption className="mt-4 text-xs leading-5 text-muted">{buckets.length && buckets[0].fromDay === buckets[0].toDay ? "Cada coluna representa um dia." : "Cada coluna reúne até sete dias, a partir do início do período."} Contagem de {label.toLowerCase()} pela data de criação.</figcaption>
    <details className="mt-5 border-t border-line pt-4"><summary className="cursor-pointer text-xs font-semibold text-brand-ink">Ver dados do gráfico</summary><div className="mt-3 overflow-x-auto"><table className="w-full text-left text-xs"><caption className="sr-only">{label} por intervalo</caption><thead><tr className="border-b border-line"><th scope="col" className="py-2 font-medium text-muted">Intervalo</th><th scope="col" className="py-2 text-right font-medium text-muted">Registros</th></tr></thead><tbody>{buckets.map(bucket => <tr key={bucket.fromDay} className="border-b border-line"><th scope="row" className="py-2 font-normal">{periodLabel(bucket)}</th><td className="py-2 text-right tabular-nums">{bucket.count}</td></tr>)}</tbody></table></div></details>
  </figure>;
}
