const DAY_MS = 86_400_000;
const TIME_ZONE = "America/Sao_Paulo";
export type IndicatorQuery = Record<string, string | string[] | undefined>;
export type IndicatorPeriod = ReturnType<typeof indicatorPeriod>;

export function businessDay(date: Date) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function validDay(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function addDays(day: string, days: number) {
  return new Date(new Date(`${day}T12:00:00Z`).getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

export function indicatorPeriod(query: IndicatorQuery = {}, now = new Date()) {
  const today = businessDay(now);
  const preset = query.periodo === "7" ? 7 : query.periodo === "90" ? 90 : 30;
  const custom = query.de !== undefined || query.ate !== undefined;
  const span = validDay(query.de) && validDay(query.ate)
    ? Math.round((Date.parse(query.ate) - Date.parse(query.de)) / DAY_MS) + 1 : 0;
  const valid = custom && span >= 1 && span <= 90 && (query.ate as string) <= today;
  const fallbackDays = custom && !valid ? 30 : preset;
  const fromDay = valid ? query.de as string : addDays(today, 1 - fallbackDays);
  const toDay = valid ? query.ate as string : today;
  return {
    fromDay, toDay, today, days: valid ? span : fallbackDays,
    // Brasília permanece em UTC−03:00 para os períodos atuais do sistema.
    start: new Date(`${fromDay}T00:00:00-03:00`),
    end: new Date(`${addDays(toDay, 1)}T00:00:00-03:00`),
    invalid: custom && !valid,
  };
}

export function periodLabel(period: Pick<IndicatorPeriod, "fromDay" | "toDay">) {
  const format = (day: string) => day.split("-").reverse().join("/");
  return `${format(period.fromDay)} a ${format(period.toDay)}`;
}

export function indicatorLink(path: string, period: IndicatorPeriod, metric: string) {
  return `${path}?${new URLSearchParams({ de: period.fromDay, ate: period.toDay, indicador: metric })}`;
}

export function trendBuckets(period: IndicatorPeriod, entries: { day: string; count: number }[]) {
  const step = period.days <= 14 ? 1 : 7;
  const counts = new Map(entries.map(entry => [entry.day, entry.count]));
  const buckets = [];
  for (let offset = 0; offset < period.days; offset += step) {
    const fromDay = addDays(period.fromDay, offset);
    const toDay = addDays(period.fromDay, Math.min(offset + step, period.days) - 1);
    let count = 0;
    for (let index = offset; index < Math.min(offset + step, period.days); index++) {
      count += counts.get(addDays(period.fromDay, index)) ?? 0;
    }
    buckets.push({ fromDay, toDay, count });
  }
  return buckets;
}

export function waitDuration(milliseconds: number | null) {
  if (milliseconds === null) return "—";
  const minutes = Math.floor(Math.max(0, milliseconds) / 60_000);
  if (minutes < 1) return "Menos de 1 min";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h${minutes % 60 ? ` ${minutes % 60} min` : ""}`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? "dia" : "dias"}${hours % 24 ? ` ${hours % 24} h` : ""}`;
}
