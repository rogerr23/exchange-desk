"use client";
import { useCallback, useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { OperationStatus } from "@/domain/operation-status";
import { apiRequest, ApiError, errorMessage } from "@/lib/api-client";
import { Notice } from "@/components/notice";

export function ProcessingActions({ id, status, attemptCount, attemptId }: {
  id: string; status: OperationStatus; attemptCount: number; attemptId: string | null;
}) {
  const router = useRouter();
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [refreshing, startTransition] = useTransition();
  const [scenario, setScenario] = useState("SUCCESS");
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  const send = useCallback(async (path: string, body: unknown) => {
    if (busy.current) return;
    busy.current = true; setPending(true); setError("");
    try {
      await apiRequest(`/api/operacoes/${id}/processamento${path}`, "POST", body);
      startTransition(() => router.refresh());
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) router.replace("/login?error=SessionRequired");
      setError(errorMessage(error));
      if (error instanceof ApiError && error.code === "PROCESSING_CONFLICT") startTransition(() => router.refresh());
    } finally {
      busy.current = false; setPending(false);
    }
  }, [id, router]);
  useEffect(() => {
    if (status !== "PROCESSING" || !attemptId) return;
    const timer = setTimeout(() => { void send("/resultado", { attemptId }); }, 2200);
    return () => clearTimeout(timer);
  }, [status, attemptId, send]);
  function start(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (confirmed) void send("", { expectedAttemptCount: attemptCount, scenario });
  }
  return <section className="surface-card space-y-5 p-6" aria-busy={pending || refreshing}>
    <h2 className="text-sm font-semibold">Processamento simulado</h2>
    {error && <Notice>{error}</Notice>}
    {status === "COMPLETED" ? <p className="text-sm leading-6 text-muted">Simulação concluída. Os valores e o histórico foram preservados. Nenhum pagamento ou liquidação foi executado.</p> : status === "PROCESSING" ? <>
      <p className="text-sm leading-6 text-muted">Tentativa {attemptCount} em andamento. O resultado será consultado automaticamente nesta tela. Se a conexão for interrompida, volte aqui para retomar a mesma tentativa.</p>
      <button className="button-secondary w-full justify-center whitespace-normal" disabled={pending || refreshing} onClick={() => void send("/resultado", { attemptId })}>{pending ? "Consultando…" : "Consultar ou retomar resultado"}</button>
    </> : (status === "PENDING" || status === "FAILED") ? <form onSubmit={start} className="space-y-5">
      <p className="text-sm leading-6 text-muted">{status === "FAILED" ? "A tentativa anterior falhou. Uma nova tentativa mantém o mesmo registro e todos os valores aprovados." : "Inicie o processamento dos valores aprovados."} Este fluxo é uma simulação e não executa pagamento nem liquidação.</p>
      <label className="block text-sm font-semibold">Cenário da simulação
        <select className="field-input mt-2 w-full" value={scenario} onChange={(event) => { setScenario(event.target.value); setConfirmed(false); }} disabled={pending || refreshing}>
          <option value="SUCCESS">Simular sucesso</option><option value="FAILURE">Simular falha</option>
        </select>
      </label>
      <p className="text-xs leading-6 text-muted">O cenário escolhido fica registrado nesta tentativa. A falha simulada permite exercitar uma nova tentativa.</p>
      <label className="flex items-start gap-3 text-sm leading-6"><input type="checkbox" className="mt-1 shrink-0" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} disabled={pending || refreshing} required />Confirmo o início desta tentativa de processamento simulado.</label>
      <button className="button-primary w-full justify-center whitespace-normal" disabled={!confirmed || pending || refreshing}>{pending ? "Iniciando…" : status === "FAILED" ? "Iniciar nova tentativa" : "Iniciar processamento simulado"}</button>
    </form> : <Notice>Esta operação não está disponível para processamento.</Notice>}
  </section>;
}
