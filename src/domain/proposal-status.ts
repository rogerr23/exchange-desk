export function proposalStatus(proposal: { acceptedAt: Date | string | null; expiresAt: Date | string }, now = Date.now()) {
  if (proposal.acceptedAt) return "ACCEPTED" as const;
  return new Date(proposal.expiresAt).getTime() <= now ? "EXPIRED" as const : "AWAITING_ACCEPTANCE" as const;
}

export const proposalStatusLabels = {
  AWAITING_ACCEPTANCE: "Aguardando aceite",
  ACCEPTED: "Aceita",
  EXPIRED: "Expirada",
};
