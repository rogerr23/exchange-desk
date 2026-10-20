export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-4 px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-widest text-teal-700">Ambiente de desenvolvimento</p>
      <h1 className="text-4xl font-bold tracking-tight">ExchangeDesk</h1>
      <p className="text-lg text-slate-600">Base do projeto configurada. Os fluxos de servidor serão implementados nas próximas etapas.</p>
      <p className="text-sm text-slate-500">Sistema demonstrativo com clientes fictícios, sem movimentação de dinheiro ou execução de câmbio real.</p>
    </main>
  );
}
