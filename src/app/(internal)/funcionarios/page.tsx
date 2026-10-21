import Link from "next/link";
import type { Metadata } from "next";
import { Icon } from "@/components/icon";
import { requirePagePermission } from "@/server/auth/page-access";
import { listEmployees } from "@/server/services/employees";

export const metadata: Metadata = { title: "Funcionários | ExchangeDesk" };

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ criado?: string }>;
}) {
  await requirePagePermission("employees:read");
  const employees = await listEmployees();
  const { criado } = await searchParams;
  return (
    <>
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Gestão da equipe</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            Funcionários
          </h1>
          <p className="mt-3 text-sm text-muted">
            Gerencie quem tem acesso ao seu espaço de trabalho.
          </p>
        </div>
        <Link href="/funcionarios/novo" className="button-primary w-fit">
          <Icon name="plus" width="18" height="18" />
          Novo funcionário
        </Link>
      </div>
      {criado === "1" && (
        <div role="status" className="notice notice-success mt-6">
          <Icon name="check" />
          <span>Funcionário cadastrado. O acesso já pode ser utilizado.</span>
        </div>
      )}
      <section className="surface-card mt-8 overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-6 py-5">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold">Todos os funcionários</h2>
            <span className="rounded-full bg-canvas px-2.5 py-1 text-xs font-medium text-muted">
              {employees.length}
            </span>
          </div>
          <span className="hidden items-center gap-1.5 text-xs text-muted sm:inline-flex">
            <Icon name="shield" width="15" height="15" />
            Acesso restrito ao administrador
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-canvas/60 text-xs text-muted">
              <tr>
                <th scope="col" className="px-6 py-4 font-medium">
                  Funcionário
                </th>
                <th scope="col" className="px-6 py-4 font-medium">
                  E-mail
                </th>
                <th scope="col" className="px-6 py-4 font-medium">
                  Perfil de acesso
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {employees.map((employee) => (
                <tr key={employee.id} className="hover:bg-canvas/40">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft text-sm font-semibold text-brand">
                        {employee.name.slice(0, 1).toUpperCase()}
                      </span>
                      <span className="font-medium whitespace-nowrap">
                        {employee.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-muted">{employee.email}</td>
                  <td className="px-6 py-5">
                    <span
                      className={`inline-flex rounded-md px-2.5 py-1 text-xs font-medium ${employee.role === "ADMIN" ? "bg-brand-soft text-brand" : "bg-canvas text-muted"}`}
                    >
                      {employee.role === "ADMIN" ? "Administrador" : "Operador"}
                    </span>
                  </td>
                </tr>
              ))}
              {employees.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-14 text-center text-muted">
                    Nenhum funcionário cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <p className="mt-5 flex items-center gap-2 text-xs leading-5 text-muted">
        <Icon name="info" width="15" height="15" className="shrink-0" />O
        administrador gerencia acessos. O operador trabalha com os clientes e as
        operações da equipe.
      </p>
    </>
  );
}
