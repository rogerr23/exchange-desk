"use server";

import { AuthError } from "next-auth";
import { loginSchema } from "@/schemas/user";
import { signIn } from "@/server/auth/config";

export type LoginState = { error: string; email?: string };

export async function loginAction(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success)
    return { error: "Informe um e-mail válido e sua senha." };
  try {
    await signIn("credentials", { ...parsed.data, redirectTo: "/inicio" });
  } catch (error) {
    if (error instanceof AuthError)
      return {
        error:
          error.type === "CredentialsSignin"
            ? "E-mail ou senha incorretos. Confira seus dados e tente novamente."
            : "Não foi possível entrar agora. Tente novamente em instantes.",
        email: parsed.data.email,
      };
    throw error;
  }
  return { error: "" };
}
