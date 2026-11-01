import type { Currency } from "@/schemas/simulation";
import type { OperationStatus } from "@/domain/operation-status";

export const statusLabels: Record<OperationStatus, string> = {
  PENDING: "Pendente",
  UNDER_REVIEW: "Em análise",
  COMPLETED: "Concluída",
  CANCELED: "Cancelada",
  PROCESSING: "Processando",
  FAILED: "Falha no processamento",
};
export const currencyLabels: Record<Currency, string> = {
  BRL: "BRL · Real",
  USD: "USD · Dólar",
  EUR: "EUR · Euro",
};
export function money(value: string, currency: Currency) {
  const [whole, fraction = "00"] = value.split(".");
  const symbol = { BRL: "R$", USD: "US$", EUR: "€" }[currency];
  // Formatar strings evita perder centavos em valores que excedem a precisão de Number.
  return `${symbol} ${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${fraction.padEnd(2, "0")}`;
}
export function dateTime(value: Date | string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}
export function referenceDate(value: string | null) {
  return value ? value.split("-").reverse().join("/") : "Não informada";
}
export function cpf(value: string) {
  return value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}
export function phone(value: string) {
  return value.replace(/^(\d{2})(\d{4,5})(\d{4})$/, "($1) $2-$3");
}
