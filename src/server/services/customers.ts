import "server-only";
import { createCustomerSchema } from "@/schemas/customer";
import { requirePermission } from "@/server/auth/authorize";
import { getDb } from "@/server/db/client";
import { AppError } from "@/server/errors";

export async function listCustomers() {
  const actor = await requirePermission("customers:read");
  return getDb().customer.findMany({
    where: actor.role === "ADMIN" ? { operations: { some: {} } } : {},
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
  });
}

export async function getCustomer(id: string) {
  const actor = await requirePermission("customers:read");
  const customer = await getDb().customer.findFirst({
    where: { id, ...(actor.role === "ADMIN" ? { operations: { some: {} } } : {}) },
  });
  if (!customer) throw new AppError(404, "NOT_FOUND", "Cliente não encontrado.");
  return customer;
}

export async function createCustomer(input: unknown) {
  await requirePermission("customers:create");
  const data = createCustomerSchema.parse(input);
  return getDb().customer.create({ data });
}
