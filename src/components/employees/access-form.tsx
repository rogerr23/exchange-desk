"use client";
import { useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ROLES, ROLE_LABELS, type Role } from "@/domain/permissions";
import { apiRequest, ApiError, errorMessage } from "@/lib/api-client";
import { Notice } from "@/components/notice";

export function EmployeeAccessForm({ id, role, isActive, revision }: { id: string; role: Role; isActive: boolean; revision: number }) {
  const router = useRouter();
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [refreshing, startTransition] = useTransition();
  const [nextRole, setNextRole] = useState(role);
  const [nextActive, setNextActive] = useState(isActive);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const changed = nextRole !== role || nextActive !== isActive;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || !confirmed || !changed) return;
    busy.current = true; setPending(true); setError(""); setSuccess(false);
    try {
      await apiRequest(`/api/funcionarios/${id}`, "PATCH", { expectedRevision: revision, role: nextRole, isActive: nextActive });
      setSuccess(true); setConfirmed(false);
      startTransition(() => router.refresh());
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) router.replace("/login?error=SessionRequired");
      setError(errorMessage(error));
      if (error instanceof ApiError && error.code === "ACCESS_CONFLICT") startTransition(() => router.refresh());
    } finally {
      busy.current = false; setPending(false);
    }
  }
  return <form onSubmit={submit} className="surface-card space-y-5 p-6 sm:p-8" aria-busy={pending || refreshing}>
    <h2 className="text-sm font-semibold">Gerenciar acesso</h2>
    {error && <Notice>{error}</Notice>}
    {success && <Notice success>Acesso atualizado. A alteração foi registrada no histórico.</Notice>}
    <label className="block text-sm font-semibold">Perfil de acesso
      <select className="field-input mt-2 w-full" value={nextRole} onChange={(event) => { setNextRole(event.target.value as Role); setConfirmed(false); }} disabled={pending || refreshing}>
        {ROLES.map(role => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
      </select>
    </label>
    <label className="block text-sm font-semibold">Situação do acesso
      <select className="field-input mt-2 w-full" value={nextActive ? "active" : "inactive"} onChange={(event) => { setNextActive(event.target.value === "active"); setConfirmed(false); }} disabled={pending || refreshing}>
        <option value="active">Ativo</option><option value="inactive">Desativado</option>
      </select>
    </label>
    <p className="text-sm leading-6 text-muted">{!nextActive ? "A desativação bloqueia novos logins e as sessões já abertas. O funcionário e todos os seus registros continuam no histórico." : !isActive ? "A reativação permite novo login com a senha existente. As sessões anteriores à desativação continuam bloqueadas." : "A troca substitui o perfil atual. As permissões são atualizadas nas próximas requisições, inclusive em sessões abertas."}</p>
    {changed && <p className="break-words text-sm font-semibold">{ROLE_LABELS[role]} · {isActive ? "Ativo" : "Desativado"} → {ROLE_LABELS[nextRole]} · {nextActive ? "Ativo" : "Desativado"}</p>}
    <label className="flex items-start gap-3 text-sm leading-6"><input className="mt-1 shrink-0" type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} required disabled={pending || refreshing || !changed} />Confirmo a alteração de acesso deste funcionário, preservando sua autoria e histórico.</label>
    <button className="button-primary w-full justify-center sm:w-auto" disabled={!confirmed || !changed || pending || refreshing}>{pending ? "Salvando…" : "Confirmar alteração de acesso"}</button>
  </form>;
}
