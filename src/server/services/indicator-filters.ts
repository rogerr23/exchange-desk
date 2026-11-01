import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { indicatorPeriod, type IndicatorPeriod, type IndicatorQuery } from "@/domain/indicator-period";

export function periodDates(period: IndicatorPeriod) {
  return { gte: period.start, lt: period.end };
}

export function operationIndicatorWhere(metric: "concluidas" | "falhas", period: IndicatorPeriod): Prisma.ExchangeOperationWhereInput {
  const status = metric === "concluidas" ? "COMPLETED" : "FAILED";
  return {
    ...(metric === "falhas" ? { status: "FAILED" as const } : {}),
    auditEvents: { some: { newStatus: status, occurredAt: periodDates(period) } },
  };
}

export function readIndicatorFilter(query: IndicatorQuery) {
  const metric = typeof query.indicador === "string" ? query.indicador : undefined;
  if (!metric || !["entradas", "pendentes", "concluidas", "falhas"].includes(metric)) return null;
  return { metric, period: indicatorPeriod(query) };
}
