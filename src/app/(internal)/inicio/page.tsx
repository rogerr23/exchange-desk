import Link from "next/link";
import { Icon } from "@/components/icon";
import { requirePagePermission } from "@/server/auth/page-access";

export default async function StartPage({
  searchParams,
}: {
  searchParams: Promise<{ acesso?: string }>;
}) {
  const actor = await requirePagePermission("customers:read");
  const { acesso } = await searchParams;
  return (
    <div className="max-w-4xl">
      <p className="eyebrow">Seu espaço de trabalho</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
        Olá, {actor.name.split(" ")[0]}.
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted">
        Você entrou no ExchangeDesk. Seu perfil é{" "}
        {actor.role === "ADMIN" ? "administrador" : "operador"}.
      </p>
      {acesso === "negado" && (
        <div role="alert" className="notice notice-error mt-6">
          <Icon name="lock" />O gerenciamento de funcionários é exclusivo do
          administrador.
        </div>
      )}
      <div className="mt-9 grid gap-5 sm:grid-cols-2">
        {actor.role === "ADMIN" && (
          <Link
            href="/funcionarios"
            className="surface-card group p-7 transition-colors hover:border-brand/40"
          >
            <div className="mb-7 grid size-11 place-items-center rounded-xl bg-brand-soft text-brand">
              <Icon name="users" />
            </div>
            <h2 className="text-lg font-semibold">Sua equipe, organizada.</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Consulte os funcionários e crie novos acessos para a equipe.
            </p>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brand">
              Gerenciar funcionários
              <Icon name="arrow" width="16" height="16" />
            </span>
          </Link>
        )}
        <section className="surface-card p-7">
          <div className="mb-7 grid size-11 place-items-center rounded-xl bg-canvas text-muted">
            <Icon name="grid" />
          </div>
          <h2 className="text-lg font-semibold">
            O projeto está ganhando forma.
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            As telas de clientes, simulações e operações serão disponibilizadas
            nas próximas etapas.
          </p>
          <p className="mt-6 text-xs text-muted">
            Nenhuma operação financeira real é realizada.
          </p>
        </section>
      </div>
    </div>
  );
}
