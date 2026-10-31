import { describe, expect, it } from "vitest";
import { can, ROLES, type Permission } from "@/domain/permissions";

describe("permissões da equipe", () => {
  it("reserva cadastro e consulta de funcionários ao administrador", () => {
    for (const permission of ["employees:create", "employees:read"] as const) {
      expect(can("ADMIN", permission)).toBe(true);
      for (const role of ROLES.filter((role) => role !== "ADMIN")) expect(can(role, permission)).toBe(false);
    }
  });

  it("separa atendimento, análise e supervisão sem herança operacional do administrador", () => {
    expect(can("CONSULTANT", "operations:read")).toBe(true);
    for (const role of ROLES) {
      expect(can(role, "operations:create")).toBe(role === "CONSULTANT");
      expect(can(role, "customers:create")).toBe(role === "CONSULTANT");
      expect(can(role, "quotes:simulate")).toBe(role === "CONSULTANT");
      expect(can(role, "simulations:read")).toBe(role === "CONSULTANT");
      expect(can(role, "operations:change-status")).toBe(role === "OPERATIONS_ANALYST");
    }
  });

  it("recusa todas as ações sem um perfil autenticado", () => {
    const actions: Permission[] = [
      "employees:create", "employees:read", "customers:read", "customers:create",
      "quotes:simulate", "simulations:read", "operations:read", "operations:create",
      "operations:change-status", "audit:read",
    ];
    for (const action of actions) {
      expect(can(null, action)).toBe(false);
      expect(can(undefined, action)).toBe(false);
    }
  });
});
