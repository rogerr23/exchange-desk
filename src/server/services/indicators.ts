import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { operationScope } from "@/domain/permissions";
import { indicatorPeriod, trendBuckets, type IndicatorQuery } from "@/domain/indicator-period";
import { requirePermission } from "@/server/auth/authorize";
import { getDb } from "@/server/db/client";
import { operationIndicatorWhere, periodDates } from "./indicator-filters";

export async function getIndicators(query: IndicatorQuery = {}, now = new Date()) {
  const actor = await requirePermission("operations:read");
  const period = indicatorPeriod(query, now);
  const scope = operationScope(actor);
  const analyst = actor.role === "OPERATIONS_ANALYST";
  const ownSql = actor.role === "CONSULTANT" ? Prisma.sql`AND "createdById" = ${actor.id}` : Prisma.empty;
  // Os nomes de tabela vêm de fragmentos fixos; os valores são parâmetros SQL.
  const source = analyst ? Prisma.sql`"ExchangeRequest"` : Prisma.sql`"Proposal"`;
  const data = await getDb().$transaction(async tx => {
    const trend = await tx.$queryRaw<{ day: string; count: number }[]>(Prisma.sql`
      SELECT to_char("createdAt" AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD') AS day,
             COUNT(*)::integer AS count
      FROM ${source}
      WHERE "createdAt" >= ${period.start} AND "createdAt" < ${period.end} ${ownSql}
      GROUP BY day ORDER BY day
    `);
    const [waiting] = await tx.$queryRaw<{ count: number; averageMs: number | null; oldestAt: Date | null }[]>(Prisma.sql`
      SELECT COUNT(*)::integer AS count,
             AVG(GREATEST(0, EXTRACT(EPOCH FROM (${now}::timestamptz - "createdAt"))) * 1000)::double precision AS "averageMs",
             MIN("createdAt") AS "oldestAt"
      FROM "ExchangeRequest"
      WHERE status = 'PENDING_REVIEW'
        AND "createdAt" >= ${period.start} AND "createdAt" < ${period.end} ${ownSql}
    `);
    const completed = await tx.exchangeOperation.count({ where: { ...scope, ...operationIndicatorWhere("concluidas", period) } });
    const failed = await tx.exchangeOperation.count({ where: { ...scope, ...operationIndicatorWhere("falhas", period) } });
    const oldestRequests = await tx.exchangeRequest.findMany({
      where: { ...scope, status: "PENDING_REVIEW", createdAt: periodDates(period) },
      take: 3, orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: { id: true, createdAt: true, proposal: { select: { customer: { select: { name: true } } } } },
    });
    return { trend, waiting, completed, failed, oldestRequests };
  }, { isolationLevel: "RepeatableRead" });
  return {
    period, analyst, now, entries: data.trend.reduce((total, item) => total + item.count, 0),
    pending: data.waiting.count, completed: data.completed, failed: data.failed,
    averageWaitMs: data.waiting.averageMs,
    oldestWaitMs: data.waiting.oldestAt ? Math.max(0, now.getTime() - data.waiting.oldestAt.getTime()) : null,
    oldestRequests: data.oldestRequests.map(request => ({ id: request.id, customerName: request.proposal.customer.name, createdAt: request.createdAt, waitMs: Math.max(0, now.getTime() - request.createdAt.getTime()) })),
    trend: trendBuckets(period, data.trend),
  };
}
