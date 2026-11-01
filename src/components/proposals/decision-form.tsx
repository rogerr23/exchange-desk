"use client";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { apiRequest, ApiError, errorMessage } from "@/lib/api-client";
import { Notice } from "@/components/notice";

export function DecisionForm({ id }: { id: string }) {
  const router = useRouter();
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [decision, setDecision] = useState("APPROVED");
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || !confirmed) return;
    busy.current = true; setPending(true); setError("");
    try {
      await apiRequest(`/api/solicitacoes/${id}/decisao`, "POST", decision === "REJECTED" ? { decision, rejectionReason: reason } : { decision });
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) router.replace("/login?error=SessionRequired");
      setError(error instanceof ApiError ? errorMessage(error) : "Não recebemos a confirmação. Consulte a solicitação antes de tentar novamente.");
      if (error instanceof ApiError && error.code === "REQUEST_ALREADY_DECIDED") router.refresh();
      busy.current = false; setPending(false);
    }
  }
  return <form onSubmit={submit} className="surface-card mt-6 space-y-5 p-6" aria-busy={pending}>
    <h2 className="text-sm font-semibold">Decisão do analista</h2>
    {error && <Notice>{error}</Notice>}
    <label className="block text-sm font-semibold">Decisão
      <select className="field-input mt-2 w-full" value={decision} disabled={pending} onChange={(event) => { setDecision(event.target.value); setConfirmed(false); }}>
        <option value="APPROVED">Aprovar solicitação</option><option value="REJECTED">Rejeitar solicitação</option>
      </select>
    </label>
    {decision === "REJECTED" && <label className="block text-sm font-semibold">Motivo da rejeição
      <textarea className="field-input mt-2 w-full" value={reason} onChange={(event) => setReason(event.target.value)} required maxLength={1000} rows={4} disabled={pending} />
    </label>}
    <p className="text-sm leading-6 text-muted">{decision === "APPROVED" ? "A aprovação cria uma única operação com os valores aceitos. O analista poderá iniciar o processamento simulado nos detalhes da operação." : "A rejeição encerra esta solicitação sem criar operação. Para novo atendimento, será necessária uma nova proposta."} A decisão é definitiva e fica registrada no histórico.</p>
    <label className="flex items-start gap-3 text-sm leading-6"><input className="mt-1 shrink-0" type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} disabled={pending} required />Conferi os dados e confirmo esta decisão. Nenhum pagamento será executado.</label>
    <button className="button-primary" disabled={pending || !confirmed || (decision === "REJECTED" && !reason.trim())}>{pending ? "Registrando…" : decision === "APPROVED" ? "Confirmar aprovação" : "Confirmar rejeição"}</button>
  </form>;
}
