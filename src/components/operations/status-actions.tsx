"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  canChangeStatus,
  OPERATION_STATUSES,
  type OperationStatus,
} from "@/domain/operation-status";
import { statusLabels } from "@/lib/format";
import { apiRequest, ApiError, errorMessage } from "@/lib/api-client";
import { Notice } from "@/components/notice";
import { Icon } from "@/components/icon";

export function StatusActions({
  id,
  status,
}: {
  id: string;
  status: OperationStatus;
}) {
  const router = useRouter();
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [refreshing, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [chosen, setChosen] = useState<OperationStatus | null>(null);
  const [conflict, setConflict] = useState(false);
  const allowed = OPERATION_STATUSES.filter((next) =>
    canChangeStatus(status, next),
  );
  async function change(next: OperationStatus) {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError("");
    setSuccess("");
    try {
      await apiRequest(`/api/operacoes/${id}/status`, "PATCH", {
        expectedStatus: status,
        status: next,
      });
      setChosen(null);
      setSuccess(`Status atualizado para ${statusLabels[next]}.`);
      startTransition(() => router.refresh());
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        router.replace("/login?error=SessionRequired");
        return;
      }
      setError(errorMessage(error));
      if (error instanceof ApiError && error.status === 409) {
        setConflict(true);
        setChosen(null);
      }
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  return (
    <section className="surface-card p-6" aria-busy={pending || refreshing}>
      <h2 className="text-sm font-semibold">Próximo passo</h2>
      {success && (
        <div className="mt-4">
          <Notice success>{success}</Notice>
        </div>
      )}
      {error && (
        <div className="mt-4">
          <Notice>{error}</Notice>
        </div>
      )}
      {conflict ? (
        <button
          className="button-secondary mt-4"
          disabled={refreshing}
          onClick={() => {
            setConflict(false);
            setError("");
            startTransition(() => router.refresh());
          }}
        >
          Atualizar dados
        </button>
      ) : allowed.length === 0 ? (
        <p className="mt-3 text-sm leading-6 text-muted">
          Esta operação foi {status === "COMPLETED" ? "concluída" : "cancelada"}
          . O histórico permanece disponível para consulta.
        </p>
      ) : (
        <>
          <p className="mt-3 text-sm leading-6 text-muted">
            {status === "PENDING"
              ? "Encaminhe a operação para análise antes de concluir ou cancelar."
              : "Confira os dados antes de encerrar a operação. Estados finais não podem ser reabertos."}
          </p>
          {chosen && allowed.includes(chosen) ? (
            <div className="mt-5 border-t border-line pt-5">
              <p className="text-sm font-medium">
                {chosen === "CANCELED"
                  ? "Cancelar esta operação?"
                  : "Concluir esta operação?"}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  className="button-secondary"
                  disabled={pending || refreshing}
                  onClick={() => setChosen(null)}
                >
                  Voltar
                </button>
                <button
                  className="button-primary"
                  disabled={pending || refreshing}
                  onClick={() => change(chosen)}
                >
                  {pending ? "Salvando…" : "Confirmar alteração"}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-5 flex flex-wrap gap-3">
              {allowed.map((next) => (
                <button
                  key={next}
                  className={
                    next === "CANCELED" ? "button-secondary" : "button-primary"
                  }
                  disabled={pending || refreshing}
                  onClick={() =>
                    next === "UNDER_REVIEW" ? change(next) : setChosen(next)
                  }
                >
                  {pending
                    ? "Salvando…"
                    : next === "UNDER_REVIEW"
                      ? "Enviar para análise"
                      : next === "COMPLETED"
                        ? "Concluir operação"
                        : "Cancelar operação"}
                  {next !== "CANCELED" && (
                    <Icon name="arrow" width="16" height="16" />
                  )}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
