import { expect, it } from "vitest";
import { money } from "@/lib/format";

it("exibe os centavos exatos mesmo no limite monetário suportado", () => {
  expect(money("9999999999999999.99", "BRL")).toBe(
    "R$ 9.999.999.999.999.999,99",
  );
  expect(money("0.01", "USD")).toBe("US$ 0,01");
});
