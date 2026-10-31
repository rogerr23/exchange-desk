import Link from "next/link";
import type { Metadata } from "next";
import { Icon } from "@/components/icon";
import { requirePagePermission } from "@/server/auth/page-access";
import { getOperationSummary } from "@/server/services/operations";

export const metadata: Metadata = { title: "Visão geral | ExchangeDesk" };
export default async function StartPage({
  searchParams,
}: {
  searchParams: Promise<{ acesso?: string }>;
}) {
  const actor = await requirePagePermission("operations:read");
  const counts = await getOperationSummary();
  const { acesso } = await searchParams;
  const metrics = [
    { label: "Pendentes", value: counts.PENDING },
    { label: "Em análise", value: counts.UNDER_REVIEW },
    { label: "Concluídas", value: counts.COMPLETED },
    { label: "Canceladas", value: counts.CANCELED },
  ];
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Seu espaço de trabalho</p>
          <h1 className="page-title sm:text-4xl">
            Olá, {actor.name.split(" ")[0]}.
          </h1>
          <p className="page-description">
            Acompanhe o andamento das operações da equipe.
          </p>
        </div>
        <Link href="/simulacoes" className="button-primary w-fit">
          Nova simulação
          <Icon name="arrow" width="17" height="17" />
        </Link>
      </div>
      {acesso === "negado" && (
        <div role="alert" className="notice notice-error mt-6">
          <Icon name="lock" />O gerenciamento de funcionários é exclusivo do
          administrador.
        </div>
      )}
      <section className="mt-9" aria-label="Quantidade de operações por status">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
          <h2 className="font-medium">Todas as operações da equipe</h2>
          <span>
            {total} {total === 1 ? "operação no total" : "operações no total"}
          </span>
        </div>
        <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {metrics.map((metric) => (
            <div key={metric.label} className="surface-card min-w-0 p-5 sm:p-6">
              <dt className="text-sm text-muted">{metric.label}</dt>
              <dd className="mt-4 text-4xl font-semibold tracking-tight tabular-nums">
                {metric.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>
      {total === 0 && (
        <p className="mt-5 text-sm leading-6 text-muted">
          Ainda não há operações registradas. Comece por uma simulação para
          criar a primeira.
        </p>
      )}
      <div className="mt-7 flex flex-wrap gap-x-6 gap-y-4">
        <Link
          href="/operacoes"
          className="inline-flex items-center gap-2 text-sm font-semibold text-brand-ink"
        >
          Ver operações
          <Icon name="arrow" width="16" height="16" />
        </Link>
        <Link
          href="/clientes/novo"
          className="inline-flex items-center gap-2 text-sm font-semibold text-brand-ink"
        >
          Cadastrar cliente
          <Icon name="plus" width="16" height="16" />
        </Link>
        {actor.role === "ADMIN" && (
          <Link
            href="/funcionarios"
            className="inline-flex items-center gap-2 text-sm font-semibold text-brand-ink"
          >
            Gerenciar funcionários
            <Icon name="users" width="16" height="16" />
          </Link>
        )}
      </div>
    </>
  );
}
