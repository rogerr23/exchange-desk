import { z } from "zod";
import { operationIdSchema } from "./operation";

export const createProposalSchema = z.strictObject({
  customerId: operationIdSchema,
  simulationToken: z.string().min(1).max(4096),
});

export const acceptProposalSchema = z.strictObject({
  confirmSimulatedAcceptance: z.literal(true, { error: "Confirme o aceite simulado para continuar." }),
});
