import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/auth/config", () => ({ auth: vi.fn() }));
vi.mock("@/server/db/client", () => ({ getDb: vi.fn() }));

import { auth } from "@/server/auth/config";
import { getDb } from "@/server/db/client";
import { requirePermission } from "@/server/auth/authorize";
import { createEmployee } from "@/server/services/employees";
import { createCustomer } from "@/server/services/customers";

const findUnique = vi.fn();
const create = vi.fn();

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getDb).mockReturnValue({ user: { findUnique, create }, customer: { create } } as unknown as ReturnType<typeof getDb>);
});

describe("autorização no servidor", () => {
  it("recusa leitura e escrita sem sessão antes de acessar o banco", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    await expect(requirePermission("customers:read")).rejects.toMatchObject({ status: 401 });
    await expect(createEmployee({})).rejects.toMatchObject({ status: 401 });
    await expect(createCustomer({})).rejects.toMatchObject({ status: 401 });
    expect(findUnique).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it("usa o perfil atual do banco mesmo se o token indicar administrador", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "operator", role: "ADMIN" } } as never);
    findUnique.mockResolvedValue({ id: "operator", role: "OPERATOR" });
    await expect(createEmployee({ role: "ADMIN" })).rejects.toMatchObject({ status: 403 });
    expect(create).not.toHaveBeenCalled();
  });

  it("recusa uma sessão cujo funcionário não existe mais", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "missing" } } as never);
    findUnique.mockResolvedValue(null);
    await expect(requirePermission("customers:read")).rejects.toMatchObject({ status: 401 });
  });
});
