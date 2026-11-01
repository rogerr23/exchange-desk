import Link from "next/link";

export default function RequestNotFound() {
  return <section className="surface-card p-8"><h1 className="text-2xl font-semibold">Solicitação não encontrada</h1><p className="mt-3 text-sm text-muted">Este registro não está disponível para consulta.</p><Link href="/solicitacoes" className="button-secondary mt-6">Voltar para solicitações</Link></section>;
}
