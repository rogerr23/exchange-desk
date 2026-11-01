import { z } from "zod";
import { OPERATION_STATUSES } from "@/domain/operation-status";

export const operationIdSchema = z.string().trim().min(1).max(128);
export const changeOperationStatusSchema = z.strictObject({
  expectedStatus: z.enum(OPERATION_STATUSES),
  status: z.enum(OPERATION_STATUSES),
});

export const startProcessingSchema = z.strictObject({
  expectedAttemptCount: z.number().int().min(0).max(2147483646),
  scenario: z.enum(["SUCCESS", "FAILURE"]),
});
export const finishProcessingSchema = z.strictObject({ attemptId: operationIdSchema });
