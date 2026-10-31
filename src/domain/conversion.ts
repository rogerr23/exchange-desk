import { Decimal } from "@prisma/client/runtime/client";

// Máximo de 18 algarismos em cada operando; preservar o produto antes de arredondar.
const Calculation = Decimal.clone({ precision: 48, rounding: Decimal.ROUND_HALF_UP });
const maxAmount = new Calculation("9999999999999999.99");
const maxRate = new Calculation("9999999999.99999999");

export function normalizeRate(value: string): string {
  const rate = new Calculation(value).toDecimalPlaces(8);
  if (!rate.isFinite() || rate.lte(0) || rate.gt(maxRate)) {
    throw new RangeError("A taxa está fora do limite suportado.");
  }
  return rate.toFixed(8);
}

export function convertAmount(sourceAmount: string, exchangeRate: string) {
  const amount = new Calculation(sourceAmount);
  const rate = normalizeRate(exchangeRate);
  if (!amount.isFinite() || amount.lte(0) || amount.gt(maxAmount) || amount.decimalPlaces() > 2) {
    throw new RangeError("Informe um valor positivo com até duas casas dentro do limite suportado.");
  }
  const result = amount.mul(rate).toDecimalPlaces(2);
  if (!result.isFinite() || result.lte(0) || result.gt(maxAmount)) {
    throw new RangeError("O resultado está fora do limite suportado. Ajuste o valor informado.");
  }
  return { sourceAmount: amount.toFixed(2), exchangeRate: rate, targetAmount: result.toFixed(2) };
}
