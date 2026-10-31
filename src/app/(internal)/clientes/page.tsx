import Link from "next/link";
import type { Metadata } from "next";
import { Icon } from "@/components/icon";
import { Notice } from "@/components/notice";
import { cpf, phone } from "@/lib/format";
import { requirePagePermission } from "@/server/auth/page-access";
import { listCustomers } from "@/server/services/customers";
import { can } from "@/domain/permissions";
export const metadata: Metadata = { title: "Clientes | ExchangeDesk" };
export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ criado?: string }>;
}) {
  const actor = await requirePagePermission("customers:read");
  const customers = await listCustomers();
  const { criado } = await searchParams;
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Relacionamento com clientes</p>
          <h1 className="page-title">Clientes</h1>
          <p className="page-description">
            {actor.role === "ADMIN" ? "Clientes vinculados às operações, disponíveis para suporte." : "Consulte os contatos cadastrados da equipe."}
          </p>
        </div>
        {can(actor.role, "customers:create") && <Link href="/clientes/novo" className="button-primary w-fit">
          <Icon name="plus" width="18" height="18" />
          Novo cliente
        </Link>}
      </div>
      {criado === "1" && (
        <div className="mt-6">
          <Notice success>
            Cliente cadastrado. Você já pode vinculá-lo a uma operação.
          </Notice>
        </div>
      )}
      <section className="surface-card mt-8 overflow-hidden">
        <div className="border-b border-line px-6 py-5 text-sm font-semibold">
          {actor.role === "ADMIN" ? "Clientes com operações" : "Todos os clientes"}{" "}
          <span className="ml-2 text-muted">{customers.length}</span>
        </div>
        {customers.length === 0 ? (
          <div className="empty-state">
            <Icon
              name="users"
              className="mx-auto mb-4 text-muted"
              width="32"
              height="32"
            />
            <h2 className="font-semibold">Nenhum cliente disponível.</h2>
            <p className="mt-2 text-sm text-muted">
              {can(actor.role, "customers:create") ? "Cadastre um cliente para confirmar sua primeira operação." : "Os clientes aparecerão aqui conforme seu escopo de consulta."}
            </p>
            {can(actor.role, "customers:create") && <Link href="/clientes/novo" className="button-primary mt-6">
              Cadastrar cliente
              <Icon name="plus" width="17" height="17" />
            </Link>}
          </div>
        ) : (
          <div className="divide-y divide-line">
            {customers.map((customer) => (
              <article
                key={customer.id}
                className="flex flex-col gap-5 px-6 py-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <h2 className="font-semibold">{customer.name}</h2>
                  <p className="mt-1 text-xs text-muted">
                    CPF {cpf(customer.fictionalCpf)}
                  </p>
                  <div className="mt-3 flex flex-col gap-1 break-all text-sm text-muted sm:flex-row sm:gap-5">
                    <span>{customer.email}</span>
                    <span>{phone(customer.phone)}</span>
                  </div>
                </div>
                {can(actor.role, "quotes:simulate") && <Link
                  href={`/simulacoes?cliente=${customer.id}`}
                  className="button-secondary w-fit shrink-0"
                >
                  Simular conversão
                  <Icon name="arrow" width="16" height="16" />
                </Link>}
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
