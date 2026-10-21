import Link from "next/link";
import type { Metadata } from "next";
import { Icon } from "@/components/icon";
import { EmployeeForm } from "@/components/employees/employee-form";
import { requirePagePermission } from "@/server/auth/page-access";

export const metadata: Metadata = { title: "Novo funcionário | ExchangeDesk" };

export default async function NewEmployeePage() {
  await requirePagePermission("employees:create");
  return (
    <>
      <Link
        href="/funcionarios"
        className="mb-7 inline-flex items-center gap-2 text-sm text-muted hover:text-brand"
      >
        <Icon name="back" width="16" height="16" />
        Voltar para funcionários
      </Link>
      <p className="eyebrow">Um novo acesso para sua equipe</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">
        Novo funcionário
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted">
        Informe os dados e escolha o que essa pessoa poderá fazer.
      </p>
      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1fr_290px]">
        <EmployeeForm />
        <aside className="surface-card p-6">
          <div className="mb-4 grid size-10 place-items-center rounded-xl bg-brand-soft text-brand">
            <Icon name="shield" />
          </div>
          <h2 className="text-sm font-semibold">Cada acesso tem seu papel.</h2>
          <dl className="mt-5 space-y-5 text-sm">
            <div>
              <dt className="font-semibold">Operador</dt>
              <dd className="mt-1.5 text-sm leading-6 text-muted">
                Cadastra clientes, simula conversões e acompanha operações e
                histórico da equipe.
              </dd>
            </div>
            <div>
              <dt className="font-semibold">Administrador</dt>
              <dd className="mt-1.5 text-sm leading-6 text-muted">
                Tem as permissões do operador e também pode cadastrar e
                consultar funcionários.
              </dd>
            </div>
          </dl>
          <p className="mt-6 border-t border-line pt-5 text-xs leading-6 text-muted">
            Após o cadastro, entregue a senha diretamente ao funcionário. Use
            acessos de estudo e dados fictícios.
          </p>
        </aside>
      </div>
    </>
  );
}
