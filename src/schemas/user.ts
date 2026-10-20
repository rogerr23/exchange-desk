import { z } from "zod";
import { ROLES } from "@/domain/permissions";
import { emailSchema, nameSchema } from "./common";

export const passwordSchema = z.string()
  .min(12, "A senha deve ter pelo menos 12 caracteres.")
  .max(128, "A senha deve ter no máximo 128 caracteres.");

export const createUserSchema = z.strictObject({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  role: z.enum(ROLES).default("OPERATOR"),
});

export const loginSchema = z.strictObject({
  email: emailSchema,
  password: z.string().min(1, "Informe a senha.").max(128),
});
