import "server-only";
import { redirect } from "next/navigation";
import type { Permission } from "@/domain/permissions";
import { AppError } from "@/server/errors";
import { requireActor, requirePermission } from "./authorize";

export async function requirePageActor() {
  try {
    return await requireActor();
  } catch (error) {
    if (error instanceof AppError && error.status === 401) redirect("/login");
    throw error;
  }
}

export async function requirePagePermission(permission: Permission) {
  try {
    return await requirePermission(permission);
  } catch (error) {
    if (error instanceof AppError && error.status === 401) redirect("/login");
    if (error instanceof AppError && error.status === 403)
      redirect("/inicio?acesso=negado");
    throw error;
  }
}
