import { z } from "zod";
import { emailSchema, nameSchema } from "./common";

const fictionalCpfSchema = z.string().trim().max(20)
  .transform((value) => value.replace(/[.\-\s]/g, ""))
  .pipe(z.string().regex(/^\d{11}$/, "Informe um CPF fictício com 11 dígitos."));

const phoneSchema = z.string().trim().max(25)
  .transform((value) => value.replace(/[()\-\s]/g, ""))
  .pipe(z.string().regex(/^\d{10,11}$/, "Informe um telefone fictício com DDD e 10 ou 11 dígitos."));

export const createCustomerSchema = z.strictObject({
  name: nameSchema,
  fictionalCpf: fictionalCpfSchema,
  email: emailSchema,
  phone: phoneSchema,
});
