export const ROLES = ["ADMIN", "OPERATOR"] as const;
export type Role = (typeof ROLES)[number];

export type Permission =
  | "employees:read"
  | "employees:create"
  | "customers:read"
  | "customers:create"
  | "quotes:simulate"
  | "operations:read"
  | "operations:create"
  | "operations:change-status"
  | "audit:read";

const operationalPermissions: readonly Permission[] = [
  "customers:read",
  "customers:create",
  "quotes:simulate",
  "operations:read",
  "operations:create",
  "operations:change-status",
  "audit:read",
];

const permissionsByRole: Record<Role, readonly Permission[]> = {
  ADMIN: [...operationalPermissions, "employees:read", "employees:create"],
  OPERATOR: operationalPermissions,
};

// O perfil deve vir da sessão verificada no servidor, nunca do corpo da requisição.
export function can(
  role: Role | null | undefined,
  permission: Permission,
): boolean {
  if (role !== "ADMIN" && role !== "OPERATOR") return false;
  return permissionsByRole[role].includes(permission);
}
