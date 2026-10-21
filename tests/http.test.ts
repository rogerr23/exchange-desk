import { describe, expect, it, vi } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import { createCustomerSchema } from "@/schemas/customer";
import { json, readJson, respond } from "@/server/http";

describe("entradas JSON", () => {
  it("bloqueia uma mutação enviada por outra origem", async () => {
    const request = new Request("http://localhost:3000/api/clientes", {
      method: "POST", headers: { origin: "https://other.example", "content-type": "application/json" }, body: "{}",
    });
    await expect(readJson(request)).rejects.toMatchObject({ status: 403 });
  });

  it("recusa formulários e JSON inválido", async () => {
    await expect(readJson(new Request("http://localhost:3000/api/clientes", {
      method: "POST", body: "email=teste",
    }))).rejects.toMatchObject({ status: 415 });
    await expect(readJson(new Request("http://localhost:3000/api/clientes", {
      method: "POST", headers: { "content-type": "application/json" }, body: "{",
    }))).rejects.toMatchObject({ status: 400 });
  });

  it("traduz duplicidade e validação sem devolver dados sensíveis", async () => {
    const conflict = await respond(async () => {
      throw new Prisma.PrismaClientKnownRequestError("SQL com dados privados", { code: "P2002", clientVersion: "7" });
    });
    expect(conflict.status).toBe(409);
    expect(await conflict.text()).not.toContain("privados");
    const invalid = await respond(async () => json(createCustomerSchema.parse({})));
    expect(invalid.status).toBe(400);
    expect((await invalid.json()).error.code).toBe("VALIDATION_ERROR");
  });

  it("não expõe detalhes de uma falha interna", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const response = await respond(async () => { throw new Error("senha-super-secreta"); });
      expect(response.status).toBe(500);
      expect(await response.text()).not.toContain("senha-super-secreta");
      expect(JSON.stringify(log.mock.calls)).not.toContain("senha-super-secreta");
    } finally {
      log.mockRestore();
    }
  });
});
