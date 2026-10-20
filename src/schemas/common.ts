import { z } from "zod";

export const nameSchema = z.string().trim()
  .min(2, "Informe um nome com pelo menos 2 caracteres.")
  .max(100, "O nome deve ter no máximo 100 caracteres.");

export const emailSchema = z.string().trim().toLowerCase()
  .max(254, "O e-mail deve ter no máximo 254 caracteres.")
  .pipe(z.email("Informe um e-mail válido."));
