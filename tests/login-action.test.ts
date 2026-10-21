import { beforeEach, expect, it, vi } from "vitest";
import { CredentialsSignin } from "next-auth";

vi.mock("@/server/auth/config", () => ({ signIn: vi.fn() }));
vi.mock("next-auth", async () => {
  const { AuthError, CredentialsSignin } = await import("@auth/core/errors");
  return { AuthError, CredentialsSignin };
});

import { signIn } from "@/server/auth/config";
import { loginAction } from "@/app/(auth)/login/actions";

beforeEach(() => {
  vi.resetAllMocks();
});

function credentials(
  email = "admin@example.test",
  password = "senha fictícia de estudo",
) {
  const form = new FormData();
  form.set("email", email);
  form.set("password", password);
  return form;
}

it("recusa dados inválidos antes de tentar autenticar", async () => {
  const result = await loginAction({ error: "" }, credentials("inválido"));
  expect(result.error).toContain("e-mail válido");
  expect(signIn).not.toHaveBeenCalled();
});

it("retorna erro compreensível sem guardar senha no estado do formulário", async () => {
  vi.mocked(signIn).mockRejectedValue(new CredentialsSignin());
  const result = await loginAction(
    { error: "" },
    credentials(" ADMIN@EXAMPLE.TEST "),
  );
  expect(result.error).toContain("E-mail ou senha incorretos");
  expect(result.email).toBe("admin@example.test");
  expect(JSON.stringify(result)).not.toContain("senha fictícia de estudo");
});

it("preserva o redirecionamento de sucesso do Next.js", async () => {
  const redirect = new Error("NEXT_REDIRECT");
  vi.mocked(signIn).mockRejectedValue(redirect);
  await expect(loginAction({ error: "" }, credentials())).rejects.toBe(
    redirect,
  );
  expect(signIn).toHaveBeenCalledWith(
    "credentials",
    expect.objectContaining({ redirectTo: "/inicio" }),
  );
});
