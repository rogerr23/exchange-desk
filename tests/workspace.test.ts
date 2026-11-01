import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/auth/config", () => ({ auth: vi.fn() }));
vi.mock("@/server/db/client", () => ({ getDb: vi.fn() }));

import { auth } from "@/server/auth/config";
import { getDb } from "@/server/db/client";
import { getWorkspaceOverview } from "@/server/services/dashboard";

const findUser = vi.fn();
const requests = vi.fn();
const proposals = vi.fn();
const operations = vi.fn();

beforeEach(() => {
  vi.resetAllMocks();
  requests.mockResolvedValue([]);
  proposals.mockResolvedValue([]);
  operations.mockResolvedValue([]);
  vi.mocked(getDb).mockReturnValue({
    user: { findUnique: findUser },
    exchangeRequest: { findMany: requests },
    proposal: { findMany: proposals },
    exchangeOperation: { findMany: operations },
  } as unknown as ReturnType<typeof getDb>);
});

function signIn(role: string) {
  vi.mocked(auth).mockResolvedValue({ user: { id: "employee", sessionVersion: 0 } } as never);
  findUser.mockResolvedValue({ id: "employee", role, isActive: true, sessionVersion: 0 });
}

describe("filas da área de trabalho", () => {
  it("exige sessão antes de consultar os atendimentos", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    await expect(getWorkspaceOverview()).rejects.toMatchObject({ status: 401 });
    expect(requests).not.toHaveBeenCalled();
    expect(proposals).not.toHaveBeenCalled();
    expect(operations).not.toHaveBeenCalled();
  });

  it("limita todas as filas do consultor aos próprios registros", async () => {
    signIn("CONSULTANT");
    await getWorkspaceOverview();
    for (const query of [requests, proposals, operations]) {
      expect(query).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ createdById: "employee" }) }));
    }
    expect(proposals.mock.calls[0][0].where).toMatchObject({ acceptedAt: null, expiresAt: { gt: expect.any(Date) } });
  });

  it("não consulta propostas sem aceite para o analista e sinaliza a autoria própria", async () => {
    signIn("OPERATIONS_ANALYST");
    requests.mockResolvedValue([{
      id: "request", createdById: "employee", createdAt: new Date(),
      proposal: { customer: { name: "Cliente" }, sourceCurrency: "USD", targetCurrency: "BRL",
        sourceAmount: { toFixed: () => "100.00" }, targetAmount: { toFixed: () => "500.00" } },
    }]);
    const result = await getWorkspaceOverview();
    expect(proposals).not.toHaveBeenCalled();
    expect(result.requests[0]).toMatchObject({ selfReviewBlocked: true, sourceAmount: "100.00" });
  });
});
