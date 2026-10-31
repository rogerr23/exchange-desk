import type { Metadata } from "next";
import { SimulationForm } from "@/components/simulations/simulation-form";
import { requirePagePermission } from "@/server/auth/page-access";
import { listCustomers } from "@/server/services/customers";
export const metadata: Metadata = { title: "Simulações | ExchangeDesk" };
export default async function SimulationsPage({
  searchParams,
}: {
  searchParams: Promise<{ cliente?: string }>;
}) {
  await requirePagePermission("quotes:simulate");
  const customers = await listCustomers();
  const { cliente } = await searchParams;
  return (
    <>
      <p className="eyebrow">Da referência à operação</p>
      <h1 className="page-title">Simular conversão</h1>
      <p className="page-description">
        Consulte a cotação, confira os valores e escolha como continuar.
      </p>
      <div className="mt-8">
        <SimulationForm
          customers={customers.map(({ id, name, fictionalCpf }) => ({
            id,
            name,
            fictionalCpf,
          }))}
          initialCustomerId={
            customers.some((item) => item.id === cliente) ? cliente! : ""
          }
        />
      </div>
    </>
  );
}
