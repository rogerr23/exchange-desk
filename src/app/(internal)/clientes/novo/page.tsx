import Link from "next/link";
import type { Metadata } from "next";
import { Icon } from "@/components/icon";
import { CustomerForm } from "@/components/customers/customer-form";
import { requirePagePermission } from "@/server/auth/page-access";
export const metadata: Metadata = { title: "Novo cliente | ExchangeDesk" };
export default async function NewCustomerPage() {
  await requirePagePermission("customers:create");
  return (
    <div className="max-w-3xl">
      <Link
        href="/clientes"
        className="mb-7 inline-flex items-center gap-2 text-sm text-muted"
      >
        <Icon name="back" width="16" height="16" />
        Voltar para clientes
      </Link>
      <p className="eyebrow">Organize sua carteira</p>
      <h1 className="page-title">Novo cliente</h1>
      <p className="page-description">
        Informe os dados de contato para identificar as operações.
      </p>
      <div className="mt-8">
        <CustomerForm />
      </div>
    </div>
  );
}
