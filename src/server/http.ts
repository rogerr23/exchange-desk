import "server-only";
import { ZodError, z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { AppError } from "./errors";

export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export async function readJson(request: Request): Promise<unknown> {
  const origin = request.headers.get("origin");
  const expectedOrigin = new URL(process.env.AUTH_URL || request.url).origin;
  if (origin && origin !== expectedOrigin) throw new AppError(403, "INVALID_ORIGIN", "Origem da requisição não permitida.");
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    throw new AppError(415, "UNSUPPORTED_MEDIA_TYPE", "Envie o conteúdo como application/json.");
  }
  try {
    return await request.json();
  } catch {
    throw new AppError(400, "INVALID_JSON", "O conteúdo JSON é inválido.");
  }
}

export async function respond(action: () => Promise<Response>): Promise<Response> {
  try {
    return await action();
  } catch (error) {
    if (error instanceof AppError) return json({ error: { code: error.code, message: error.message } }, error.status);
    if (error instanceof ZodError) return json({ error: {
      code: "VALIDATION_ERROR", message: "Confira os campos informados.", fields: z.flattenError(error).fieldErrors,
    } }, 400);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return json({ error: { code: "CONFLICT", message: "Já existe um cadastro com esse e-mail ou CPF fictício." } }, 409);
    }
    // Não registrar payloads ou mensagens do Prisma que possam conter credenciais.
    console.error("Falha ao processar requisição:", error instanceof Error ? error.name : "erro desconhecido");
    return json({ error: { code: "INTERNAL_ERROR", message: "Não foi possível concluir a solicitação. Tente novamente." } }, 500);
  }
}
