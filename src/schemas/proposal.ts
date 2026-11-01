import { z } from "zod";
import { operationIdSchema } from "./operation";

export const createProposalSchema = z.strictObject({
  customerId: operationIdSchema,
  simulationToken: z.string().min(1).max(4096),
});

export const acceptProposalSchema = z.strictObject({
  confirmSimulatedAcceptance: z.literal(true, { error: "Confirme o aceite simulado para continuar." }),
});

export const decideRequestSchema = z.discriminatedUnion("decision", [
  z.strictObject({ decision: z.literal("APPROVED") }),
  z.strictObject({
    decision: z.literal("REJECTED"),
    rejectionReason: z.string().trim().min(1, "Informe o motivo da rejeição.").max(1000),
  }),
]);
