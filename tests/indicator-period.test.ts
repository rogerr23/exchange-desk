import { describe, expect, it } from "vitest";
import { indicatorPeriod, trendBuckets, waitDuration } from "@/domain/indicator-period";

const now = new Date("2026-11-01T02:30:00Z"); // Ainda é 31/10 em Brasília.

describe("períodos dos indicadores", () => {
  it("usa dias de Brasília, incluindo as duas datas com limite final exclusivo", () => {
    const period = indicatorPeriod({ periodo: "7" }, now);
    expect(period.fromDay).toBe("2026-10-25");
    expect(period.toDay).toBe("2026-10-31");
    expect(period.start.toISOString()).toBe("2026-10-25T03:00:00.000Z");
    expect(period.end.toISOString()).toBe("2026-11-01T03:00:00.000Z");
  });

  it.each([
    { de: "2026-02-30", ate: "2026-03-01" },
    { de: "2026-10-31", ate: "2026-10-30" },
    { de: "2026-10-31", ate: "2026-11-01" },
    { de: "2026-01-01", ate: "2026-10-31" },
    { de: ["2026-10-31"], ate: "2026-10-31" },
    { de: "2026-10-31" },
    { periodo: "7", de: "invalida", ate: "2026-10-31" },
  ])("recupera intervalo inválido sem falhar: %j", query => {
    expect(indicatorPeriod(query, now)).toMatchObject({ invalid: true, days: 30, fromDay: "2026-10-02" });
  });

  it("inclui dias sem movimento e preserva o último intervalo incompleto", () => {
    const period = indicatorPeriod({ de: "2026-10-17", ate: "2026-10-31" }, now);
    const buckets = trendBuckets(period, [{ day: "2026-10-17", count: 2 }, { day: "2026-10-31", count: 1 }]);
    expect(buckets).toEqual([
      { fromDay: "2026-10-17", toDay: "2026-10-23", count: 2 },
      { fromDay: "2026-10-24", toDay: "2026-10-30", count: 0 },
      { fromDay: "2026-10-31", toDay: "2026-10-31", count: 1 },
    ]);
  });

  it("distingue ausência de amostra de uma espera inferior a um minuto", () => {
    expect(waitDuration(null)).toBe("—");
    expect(waitDuration(20_000)).toBe("Menos de 1 min");
    expect(waitDuration(90 * 60_000)).toBe("1 h 30 min");
    expect(waitDuration(25 * 60 * 60_000)).toBe("1 dia 1 h");
  });
});
