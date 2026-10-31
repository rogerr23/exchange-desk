import Link from "next/link";
export default function OperationNotFound() {
  return (
    <section className="surface-card p-10 text-center">
      <h1 className="text-xl font-semibold">Operação não encontrada.</h1>
      <p className="mt-3 text-sm text-muted">
        Confira o endereço ou volte para a lista da equipe.
      </p>
      <Link className="button-primary mt-6" href="/operacoes">
        Ver operações
      </Link>
    </section>
  );
}
