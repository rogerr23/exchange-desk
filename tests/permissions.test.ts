import { describe, expect, it } from "vitest";
import { can, type Permission } from "@/domain/permissions";

describe("permissões da equipe", () => {
  it("reserva cadastro e consulta de funcionários ao administrador", () => {
    for (const permission of ["employees:create", "employees:read"] as const) {
      expect(can("ADMIN", permission)).toBe(true);
      expect(can("OPERATOR", permission)).toBe(false);
    }
  });

  it("permite que o operador consulte operações da equipe, altere status e leia auditoria", () => {
    expect(can("OPERATOR", "operations:read")).toBe(true);
    expect(can("OPERATOR", "operations:change-status")).toBe(true);
    expect(can("OPERATOR", "audit:read")).toBe(true);
  });

  it("recusa todas as ações sem um perfil autenticado", () => {
    const actions: Permission[] = [
      "employees:create", "employees:read", "customers:read", "customers:create",
      "quotes:simulate", "operations:read", "operations:create",
      "operations:change-status", "audit:read",
    ];
    for (const action of actions) {
      expect(can(null, action)).toBe(false);
      expect(can(undefined, action)).toBe(false);
    }
  });
});
