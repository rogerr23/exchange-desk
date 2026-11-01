export const ROLES = ["CONSULTANT", "OPERATIONS_ANALYST", "MANAGER", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  CONSULTANT: "Consultor de Câmbio",
  OPERATIONS_ANALYST: "Analista de Operações",
  MANAGER: "Gerente",
  ADMIN: "Administrador",
};

export function isRole(value: unknown): value is Role {
  return ROLES.some((role) => role === value);
}

export type Permission =
  | "employees:read"
  | "employees:create"
  | "employees:manage-access"
  | "customers:read"
  | "customers:create"
  | "quotes:simulate"
  | "simulations:read"
  | "operations:read"
  | "proposals:create"
  | "proposals:read"
  | "proposals:accept"
  | "requests:read"
  | "requests:decide"
  | "operations:process"
  | "operations:change-status"
  | "audit:read";

const permissionsByRole: Record<Role, readonly Permission[]> = {
  CONSULTANT: ["customers:read", "customers:create", "quotes:simulate", "simulations:read", "operations:read", "proposals:create", "proposals:read", "proposals:accept", "requests:read", "audit:read"],
  OPERATIONS_ANALYST: ["customers:read", "operations:read", "operations:change-status", "operations:process", "requests:decide", "proposals:read", "requests:read", "audit:read"],
  MANAGER: ["customers:read", "operations:read", "proposals:read", "requests:read", "audit:read"],
  ADMIN: ["employees:read", "employees:create", "employees:manage-access", "customers:read", "operations:read", "proposals:read", "requests:read", "audit:read"],
};

// O perfil deve vir da sessão verificada no servidor, nunca do corpo da requisição.
export function can(
  role: Role | null | undefined,
  permission: Permission,
): boolean {
  if (!isRole(role)) return false;
  return permissionsByRole[role].includes(permission);
}

export function operationScope(actor: { id: string; role: Role }) {
  return actor.role === "CONSULTANT" ? { createdById: actor.id } : {};
}
