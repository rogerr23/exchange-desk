"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { apiRequest, ApiError, errorMessage } from "@/lib/api-client";
import { Notice } from "@/components/notice";

export function AcceptanceForm({ id, expiresAt }: { id: string; expiresAt: string }) {
  const router = useRouter();
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [serverExpired, setServerExpired] = useState(false);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const remaining = Math.max(0, Math.ceil((Date.parse(expiresAt) - now) / 1000));
  const expired = serverExpired || remaining <= 0;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || !confirmed || expired) return;
    busy.current = true; setPending(true); setError("");
    try {
      const result = await apiRequest<{ request: { id: string } }>(`/api/propostas/${id}/aceite`, "POST", { confirmSimulatedAcceptance: true });
      router.push(`/solicitacoes/${result.request.id}?criada=1`); router.refresh();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) router.replace("/login?error=SessionRequired");
      if (error instanceof ApiError && error.code === "PROPOSAL_EXPIRED") setServerExpired(true);
      setError(error instanceof ApiError ? errorMessage(error) : "Não recebemos a confirmação. Tente novamente nesta proposta ou consulte suas solicitações para conferir o envio.");
      busy.current = false; setPending(false);
    }
  }
  return <form onSubmit={submit} className="surface-card space-y-5 p-6" aria-busy={pending}>
    <h2 className="text-sm font-semibold">Registrar aceite simulado</h2>
    <p className="text-sm leading-6 text-muted">O aceite gera uma solicitação para análise e preserva estes valores. A operação será criada somente após aprovação pelo analista.</p>
    {error && <Notice>{error}</Notice>}
    {expired ? <><Notice>Esta proposta expirou. Faça uma nova simulação e crie outra proposta.</Notice><Link href="/simulacoes" className="button-primary">Nova simulação</Link></> : <>
      <p className="text-sm font-semibold tabular-nums" aria-live="off">Prazo restante: {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}</p>
      <label className="flex items-start gap-3 text-sm leading-6">
        <input type="checkbox" className="mt-1 shrink-0" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} disabled={pending} required />
        Confirmo o registro de aceite simulado desta proposta. Este registro não representa assinatura do cliente nem executa pagamento.
      </label>
      <button className="button-primary w-full justify-center" disabled={pending || !confirmed}>{pending ? "Registrando…" : "Registrar aceite simulado"}</button>
    </>}
  </form>;
}
