export function proposalStatus(proposal: { acceptedAt: Date | string | null; expiresAt: Date | string }, now = Date.now()) {
  if (proposal.acceptedAt) return "ACCEPTED" as const;
  return new Date(proposal.expiresAt).getTime() <= now ? "EXPIRED" as const : "AWAITING_ACCEPTANCE" as const;
}

export const proposalStatusLabels = {
  AWAITING_ACCEPTANCE: "Aguardando aceite",
  ACCEPTED: "Aceita",
  EXPIRED: "Expirada",
};

export const requestStatusLabels = {
  PENDING_REVIEW: "Aguardando análise",
  APPROVED: "Aprovada",
  REJECTED: "Rejeitada",
};
export const proposalAuditLabels = {
  CREATED: "Proposta criada",
  ACCEPTED: "Aceite simulado registrado e solicitação gerada",
  APPROVED: "Solicitação aprovada e operação criada",
  REJECTED: "Solicitação rejeitada",
};
