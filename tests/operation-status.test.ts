import { expect, it } from "vitest";
import { canChangeStatus, OPERATION_STATUSES } from "@/domain/operation-status";
import { createOperationSchema } from "@/schemas/operation";

it("permite apenas as três transições definidas e bloqueia reabertura, saltos e repetições", () => {
  const allowed = new Set(["PENDING:UNDER_REVIEW", "UNDER_REVIEW:COMPLETED", "UNDER_REVIEW:CANCELED"]);
  for (const from of OPERATION_STATUSES) {
    for (const to of OPERATION_STATUSES) expect(canChangeStatus(from, to)).toBe(allowed.has(`${from}:${to}`));
  }
});

it("confirma apenas cliente e token, recusando valores ou autoria enviados pelo navegador", () => {
  const input = { customerId: "customer", simulationToken: "signed-token" };
  expect(createOperationSchema.safeParse(input).success).toBe(true);
  for (const extra of [{ sourceAmount: "1" }, { exchangeRate: "1" }, { createdById: "someone" }]) {
    expect(createOperationSchema.safeParse({ ...input, ...extra }).success).toBe(false);
  }
});
