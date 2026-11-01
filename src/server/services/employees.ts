import "server-only";
import { createUserSchema, changeEmployeeAccessSchema } from "@/schemas/user";
import { operationIdSchema } from "@/schemas/operation";
import { AppError } from "@/server/errors";
import { requirePermission } from "@/server/auth/authorize";
import { hashPassword } from "@/server/auth/password";
import { getDb } from "@/server/db/client";

const publicFields = { id: true, name: true, email: true, role: true, isActive: true, accessRevision: true } as const;

export async function listEmployees() {
  await requirePermission("employees:read");
  return getDb().user.findMany({ select: publicFields, orderBy: [{ createdAt: "desc" }, { id: "asc" }] });
}

export async function createEmployee(input: unknown) {
  await requirePermission("employees:create");
  const { password, ...data } = createUserSchema.parse(input);
  const passwordHash = await hashPassword(password);
  return getDb().user.create({ data: { ...data, passwordHash }, select: publicFields });
}

const detailFields = {
  ...publicFields,
  accessChanges: {
    orderBy: { revision: "desc" as const },
    select: { id: true, revision: true, previousRole: true, newRole: true, previousIsActive: true, newIsActive: true, occurredAt: true, actor: { select: { id: true, name: true } } },
  },
};

export async function getEmployee(inputId: string) {
  await requirePermission("employees:read");
  const id = operationIdSchema.parse(inputId);
  const employee = await getDb().user.findUnique({ where: { id }, select: detailFields });
  if (!employee) throw new AppError(404, "NOT_FOUND", "Funcionário não encontrado.");
  return employee;
}

export async function changeEmployeeAccess(inputId: string, input: unknown) {
  const actor = await requirePermission("employees:manage-access");
  const id = operationIdSchema.parse(inputId);
  const data = changeEmployeeAccessSchema.parse(input);
  return getDb().$transaction(async (tx) => {
    // Serializa mudanças de acesso, inclusive duas contas administrativas alterando uma à outra.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(78210402)`;
    const currentActor = await tx.user.findUnique({ where: { id: actor.id }, select: { role: true, isActive: true, sessionVersion: true } });
    if (!currentActor?.isActive || currentActor.sessionVersion !== actor.sessionVersion) throw new AppError(401, "UNAUTHENTICATED", "Entre no sistema para continuar.");
    if (currentActor.role !== "ADMIN") throw new AppError(403, "FORBIDDEN", "Você não tem permissão para esta ação.");
    if (id === actor.id) throw new AppError(403, "SELF_ACCESS_CHANGE_FORBIDDEN", "Peça a outro administrador para alterar seu acesso. Você não pode mudar o próprio perfil ou desativar a própria conta.");
    const employee = await tx.user.findUnique({ where: { id }, select: detailFields });
    if (!employee) throw new AppError(404, "NOT_FOUND", "Funcionário não encontrado.");
    const unchanged = employee.role === data.role && employee.isActive === data.isActive;
    if (employee.accessRevision !== data.expectedRevision) {
      if (employee.accessRevision === data.expectedRevision + 1 && unchanged) return employee;
      throw new AppError(409, "ACCESS_CONFLICT", "O acesso deste funcionário foi alterado. Atualize os dados antes de tentar novamente.");
    }
    if (unchanged) return employee;
    if (employee.isActive && employee.role === "ADMIN" && (!data.isActive || data.role !== "ADMIN")) {
      const activeAdmins = await tx.user.count({ where: { role: "ADMIN", isActive: true } });
      if (activeAdmins <= 1) throw new AppError(409, "LAST_ADMIN_REQUIRED", "Mantenha pelo menos um administrador ativo.");
    }
    const updated = await tx.user.updateMany({
      where: { id, accessRevision: data.expectedRevision, role: employee.role, isActive: employee.isActive },
      data: { role: data.role, isActive: data.isActive, accessRevision: { increment: 1 }, ...(!data.isActive && employee.isActive ? { sessionVersion: { increment: 1 } } : {}) },
    });
    if (!updated.count) throw new AppError(409, "ACCESS_CONFLICT", "O acesso deste funcionário foi alterado. Atualize os dados antes de tentar novamente.");
    await tx.employeeAccessEvent.create({ data: {
      employeeId: id, actorId: actor.id, revision: data.expectedRevision + 1,
      previousRole: employee.role, newRole: data.role, previousIsActive: employee.isActive, newIsActive: data.isActive,
    } });
    return tx.user.findUniqueOrThrow({ where: { id }, select: detailFields });
  });
}
