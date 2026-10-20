import { describe, expect, it } from "vitest";
import { createCustomerSchema } from "@/schemas/customer";
import { createUserSchema, loginSchema } from "@/schemas/user";

const customer = {
  name: " Cliente de Teste ",
  fictionalCpf: "000.000.000-00",
  email: " CLIENTE@EXAMPLE.TEST ",
  phone: "(11) 90000-0000",
};

describe("cadastros fictícios", () => {
  it("normaliza os contatos e preserva zeros do CPF sem exigir dígitos verificadores", () => {
    expect(createCustomerSchema.parse(customer)).toEqual({
      name: "Cliente de Teste",
      fictionalCpf: "00000000000",
      email: "cliente@example.test",
      phone: "11900000000",
    });
  });

  it.each([
    { fictionalCpf: "123" },
    { fictionalCpf: "0000000000a" },
    { phone: "123" },
    { email: "invalido" },
    { name: " " },
  ])("recusa campos inválidos: %o", (invalid) => {
    expect(createCustomerSchema.safeParse({ ...customer, ...invalid }).success).toBe(false);
  });

  it("recusa atributos extras que tentem fornecer informações internas", () => {
    expect(createCustomerSchema.safeParse({ ...customer, createdAt: "2026-01-01" }).success).toBe(false);
  });
});

describe("credenciais de funcionários", () => {
  const user = { name: "Operador Teste", email: " OPERADOR@EXAMPLE.TEST ", password: "uma senha de estudo" };

  it("usa operador como perfil padrão e normaliza o e-mail", () => {
    const result = createUserSchema.parse(user);
    expect(result.role).toBe("OPERATOR");
    expect(result.email).toBe("operador@example.test");
  });

  it("recusa perfil desconhecido e senha fora dos limites", () => {
    expect(createUserSchema.safeParse({ ...user, role: "SUPERUSER" }).success).toBe(false);
    expect(createUserSchema.safeParse({ ...user, password: "curta" }).success).toBe(false);
    expect(createUserSchema.safeParse({ ...user, password: "a".repeat(129) }).success).toBe(false);
  });

  it("preserva espaços da senha e recusa perfil enviado no login", () => {
    const password = "  senha com espaços  ";
    expect(loginSchema.parse({ email: user.email, password }).password).toBe(password);
    expect(loginSchema.safeParse({ email: user.email, password, role: "ADMIN" }).success).toBe(false);
  });
});
