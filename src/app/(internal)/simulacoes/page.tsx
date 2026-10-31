import Link from "next/link";
import { simulationInputSchema } from "@/schemas/simulation";
import type { Metadata } from "next";
import { SimulationForm } from "@/components/simulations/simulation-form";
import { requirePagePermission } from "@/server/auth/page-access";
import { listCustomers } from "@/server/services/customers";
export const metadata: Metadata = { title: "Simulações | ExchangeDesk" };
export default async function SimulationsPage({
  searchParams,
}: {
  searchParams: Promise<{ cliente?: string; origem?: string; destino?: string; valor?: string }>;
}) {
  await requirePagePermission("quotes:simulate");
  const customers = await listCustomers();
  const { cliente, origem, destino, valor } = await searchParams;
  const initial = simulationInputSchema.safeParse({ sourceCurrency: origem, targetCurrency: destino, sourceAmount: valor });
  return (
    <>
      <p className="eyebrow">Da referência à operação</p>
      <h1 className="page-title">Simular conversão</h1>
      <p className="page-description">
        Consulte a cotação, confira os valores e escolha como continuar.
      </p>
      <Link href="/simulacoes/historico" className="button-secondary mt-5">Ver histórico de simulações</Link>
      {initial.success && <p className="mt-4 text-sm text-muted">Os valores anteriores foram preenchidos. Simule novamente para consultar a taxa e revisar o resultado atual.</p>}
      <div className="mt-8">
        <SimulationForm
          initialValues={initial.success ? initial.data : undefined}
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
