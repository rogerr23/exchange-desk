import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ROLE_LABELS } from "@/domain/permissions";
import { EmployeeAccessForm } from "@/components/employees/access-form";
import { Notice } from "@/components/notice";
import { dateTime } from "@/lib/format";
import { requirePagePermission } from "@/server/auth/page-access";
import { getEmployee } from "@/server/services/employees";
import { AppError } from "@/server/errors";
export const metadata: Metadata = { title: "Acesso do funcionário | ExchangeDesk" };
export default async function EmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePagePermission("employees:manage-access");
  let employee;
  try { employee = await getEmployee((await params).id); } catch (error) {
    if (error instanceof AppError && error.status === 404) notFound();
    throw error;
  }
  return <>
    <Link href="/funcionarios" className="text-sm text-brand-ink underline">Voltar para funcionários</Link>
    <div className="mt-6"><p className="eyebrow">Gestão de acessos</p><h1 className="page-title break-words">{employee.name}</h1><p className="mt-3 break-all text-sm text-muted">{employee.email}</p><p className="mt-3 text-sm font-semibold">{ROLE_LABELS[employee.role]} · {employee.isActive ? "Ativo" : "Desativado"}</p></div>
    <div className="mt-8 grid items-start gap-6 lg:grid-cols-2">
      {actor.id === employee.id ? <Notice>Peça a outro administrador para alterar seu acesso. Você não pode mudar o próprio perfil ou desativar a própria conta.</Notice> : <EmployeeAccessForm key={employee.accessRevision} id={employee.id} role={employee.role} isActive={employee.isActive} revision={employee.accessRevision} />}
      <section className="surface-card min-w-0 p-6 sm:p-8">
        <h2 className="text-sm font-semibold">Histórico de alterações de acesso</h2>
        {!employee.accessChanges.length ? <p className="mt-5 text-sm text-muted">Nenhuma alteração de acesso registrada.</p> : <ol className="mt-5 space-y-5">{employee.accessChanges.map(event => <li key={event.id} className="space-y-2 break-words text-sm">
          <p className="font-semibold">{ROLE_LABELS[event.previousRole]} · {event.previousIsActive ? "Ativo" : "Desativado"} → {ROLE_LABELS[event.newRole]} · {event.newIsActive ? "Ativo" : "Desativado"}</p>
          <p className="text-muted">{event.actor.name}</p><p className="text-xs text-muted">{dateTime(event.occurredAt)} · Brasília</p>
        </li>)}</ol>}
      </section>
    </div>
  </>;
}
