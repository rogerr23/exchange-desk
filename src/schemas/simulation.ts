import { z } from "zod";

export const currencySchema = z.enum(["BRL", "USD", "EUR"]);
export type Currency = z.infer<typeof currencySchema>;

export const sourceAmountSchema = z.string()
  .max(19, "O valor excede o limite suportado.")
  .regex(/^(?:0|[1-9]\d{0,15})(?:\.\d{1,2})?$/, "Informe um valor decimal com até duas casas, usando ponto.")
  .refine((value) => /[1-9]/.test(value), "Informe um valor maior que zero.");

export const simulationInputSchema = z.strictObject({
  sourceCurrency: currencySchema,
  targetCurrency: currencySchema,
  sourceAmount: sourceAmountSchema,
}).refine((value) => value.sourceCurrency !== value.targetCurrency, {
  path: ["targetCurrency"], message: "Escolha moedas diferentes.",
});

export const quoteSchema = z.strictObject({
  sourceCurrency: currencySchema,
  targetCurrency: currencySchema,
  exchangeRate: z.string().regex(/^(?:0|[1-9]\d{0,9})\.\d{8}$/),
  quoteProvider: z.literal("Frankfurter / ECB"),
  quoteReferenceDate: z.iso.date(),
  quoteTimestamp: z.iso.datetime(),
  quoteTimestampKind: z.literal("FETCHED_AT"),
  quoteFetchedAt: z.iso.datetime(),
});
export type Quote = z.infer<typeof quoteSchema>;
