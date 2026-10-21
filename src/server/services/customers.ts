import "server-only";
import { createCustomerSchema } from "@/schemas/customer";
import { requirePermission } from "@/server/auth/authorize";
import { getDb } from "@/server/db/client";
import { AppError } from "@/server/errors";

export async function listCustomers() {
  await requirePermission("customers:read");
  return getDb().customer.findMany({ orderBy: [{ createdAt: "desc" }, { id: "asc" }] });
}

export async function getCustomer(id: string) {
  await requirePermission("customers:read");
  const customer = await getDb().customer.findUnique({ where: { id } });
  if (!customer) throw new AppError(404, "NOT_FOUND", "Cliente não encontrado.");
  return customer;
}

export async function createCustomer(input: unknown) {
  await requirePermission("customers:create");
  const data = createCustomerSchema.parse(input);
  return getDb().customer.create({ data });
}
