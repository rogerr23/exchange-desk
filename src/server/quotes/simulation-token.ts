import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { convertAmount } from "@/domain/conversion";
import { quoteSchema, simulationInputSchema } from "@/schemas/simulation";
import { AppError } from "@/server/errors";

export const SIMULATION_TTL_MS = 15 * 60 * 1000;
const tokenPayloadSchema = quoteSchema.extend({
  version: z.literal(1), actorId: z.string().min(1).max(128),
  sourceAmount: z.string(), targetAmount: z.string(),
  issuedAt: z.iso.datetime(), expiresAt: z.iso.datetime(),
});
type TokenPayload = z.infer<typeof tokenPayloadSchema>;

function signingKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("Configure AUTH_SECRET antes de simular.");
  return createHmac("sha256", secret).update("exchangedesk:simulation:v1").digest();
}

export function signSimulation(payload: TokenPayload): string {
  const content = Buffer.from(JSON.stringify(tokenPayloadSchema.parse(payload))).toString("base64url");
  const signature = createHmac("sha256", signingKey()).update(content).digest("base64url");
  return `${content}.${signature}`;
}

// A confirmação da operação (etapa 5) deve chamar este verificador após autenticar.
export function verifySimulation(token: string, actorId: string, now = Date.now()): TokenPayload {
  const key = signingKey();
  try {
    if (typeof token !== "string" || token.length > 4096) throw new Error();
    const parts = token.split(".");
    if (parts.length !== 2 || !parts.every((part) => /^[A-Za-z0-9_-]+$/.test(part))) throw new Error();
    const [content, signature] = parts;
    const expected = createHmac("sha256", key).update(content).digest();
    const received = Buffer.from(signature, "base64url");
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) throw new Error();
    const payload = tokenPayloadSchema.parse(JSON.parse(Buffer.from(content, "base64url").toString("utf8")));
    const issuedAt = Date.parse(payload.issuedAt);
    const expiresAt = Date.parse(payload.expiresAt);
    if (payload.actorId !== actorId || issuedAt > now || expiresAt <= now || expiresAt - issuedAt !== SIMULATION_TTL_MS) {
      throw new Error();
    }
    simulationInputSchema.parse({ sourceCurrency: payload.sourceCurrency, targetCurrency: payload.targetCurrency, sourceAmount: payload.sourceAmount });
    const values = convertAmount(payload.sourceAmount, payload.exchangeRate);
    if (values.sourceAmount !== payload.sourceAmount || values.exchangeRate !== payload.exchangeRate || values.targetAmount !== payload.targetAmount) {
      throw new Error();
    }
    return payload;
  } catch {
    throw new AppError(400, "INVALID_SIMULATION", "Esta simulação expirou ou é inválida. Faça uma nova simulação para continuar.");
  }
}
