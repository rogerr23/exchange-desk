import Link from "next/link";
import type { Metadata } from "next";
import { SimulationHistory } from "@/components/simulations/simulation-history";
import { requirePagePermission } from "@/server/auth/page-access";
import { listSimulations } from "@/server/services/simulations";

export const metadata: Metadata = { title: "Histórico de simulações | ExchangeDesk" };
export default async function SimulationHistoryPage() {
  await requirePagePermission("simulations:read");
  const simulations = await listSimulations();
  const isAdmin = false;
  return <>
    <div className="page-heading">
      <div>
        <p className="eyebrow">{isAdmin ? "Atividade da equipe" : "Seu histórico"}</p>
        <h1 className="page-title">{isAdmin ? "Histórico de simulações" : "Minhas simulações"}</h1>
        <p className="page-description">Confira os valores e a referência de cada consulta. Simule novamente para obter um novo resultado antes de confirmar.</p>
      </div>
      <Link href="/simulacoes" className="button-primary w-fit">Nova simulação</Link>
    </div>
    <section className="surface-card mt-8 overflow-hidden" aria-label="Simulações registradas">
      <div className="border-b border-line px-6 py-5">
        <h2 className="text-sm font-semibold">{isAdmin ? "Simulações da equipe" : "Simulações feitas por você"}</h2>
        <p className="mt-2 text-xs text-muted">Até 50 simulações mais recentes. O histórico não renova o prazo de confirmação de 15 minutos.</p>
      </div>
      <SimulationHistory simulations={simulations} isAdmin={isAdmin} />
    </section>
  </>;
}
