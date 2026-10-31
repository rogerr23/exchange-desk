import { z } from "zod";
import { OPERATION_STATUSES } from "@/domain/operation-status";

export const operationIdSchema = z.string().trim().min(1).max(128);
export const createOperationSchema = z.strictObject({
  customerId: operationIdSchema,
  simulationToken: z.string().min(1).max(4096),
});
export const changeOperationStatusSchema = z.strictObject({
  expectedStatus: z.enum(OPERATION_STATUSES),
  status: z.enum(OPERATION_STATUSES),
});
