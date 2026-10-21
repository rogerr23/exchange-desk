import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Brand, Icon } from "@/components/icon";
import { LoginForm } from "@/components/auth/login-form";
import { requirePermission } from "@/server/auth/authorize";
import { AppError } from "@/server/errors";

export const metadata: Metadata = { title: "Entrar | ExchangeDesk" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  try {
    await requirePermission("customers:read");
    redirect("/inicio");
  } catch (error) {
    if (!(error instanceof AppError && error.status === 401)) throw error;
  }
  const { error } = await searchParams;
  const initialError =
    error === "CredentialsSignin"
      ? "E-mail ou senha incorretos. Tente novamente."
      : error
        ? "Entre com suas credenciais para continuar."
        : "";
  return (
    <main className="login-shell">
      <section className="login-story">
        <Brand light />
        <div className="relative z-10 my-auto max-w-lg py-16 lg:py-20">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200/70">
            Seu espaço de operações
          </p>
          <p className="text-[clamp(2.4rem,4.1vw,4rem)] leading-[1.1] font-semibold tracking-[-0.045em] text-white">
            Uma visão clara de cada operação.
          </p>
          <p className="mt-6 max-w-sm text-base leading-7 text-emerald-50/65">
            Simule conversões, organize sua equipe e acompanhe cada etapa em um
            só lugar.
          </p>
          <div className="mt-12 rounded-2xl border border-white/15 bg-white/6 p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-emerald-100/60">
                  Moedas disponíveis
                </p>
                <div className="mt-3 flex items-center gap-3 text-sm font-semibold text-white">
                  <span>BRL</span>
                  <span className="h-4 w-px bg-white/20" />
                  <span>USD</span>
                  <span className="h-4 w-px bg-white/20" />
                  <span>EUR</span>
                </div>
              </div>
              <div className="grid size-12 place-items-center rounded-full border border-white/15 bg-white/5 text-emerald-200">
                <Icon name="arrow" width="24" height="24" />
              </div>
            </div>
            <div className="my-5 h-px bg-white/10" />
            <p className="flex items-center gap-2 text-xs text-emerald-50/70">
              <Icon name="check" width="16" height="16" />
              Da simulação ao histórico, tudo conectado.
            </p>
          </div>
        </div>
        <p className="relative z-10 flex items-center gap-2 text-xs text-emerald-100/55">
          <span className="size-1.5 rounded-full bg-emerald-300" />
          Projeto de estudo · Operações demonstrativas
        </p>
      </section>
      <section className="flex flex-col justify-between px-7 py-8 sm:px-12 lg:px-16 lg:py-10">
        <div className="flex items-center justify-between">
          <div className="lg:invisible">
            <Brand />
          </div>
          <span className="hidden rounded-full border border-line bg-white px-3 py-1.5 text-[11px] font-medium text-muted sm:inline-flex">
            Acesso da equipe
          </span>
        </div>
        <div className="mx-auto w-full max-w-sm py-14 lg:py-12">
          <div className="mb-7 grid size-11 place-items-center rounded-xl border border-line bg-white text-brand shadow-sm">
            <Icon name="lock" width="22" height="22" />
          </div>
          <p className="eyebrow mb-3">Bem-vindo ao ExchangeDesk</p>
          <h1 className="text-3xl font-semibold tracking-tight text-ink">
            Bom ter você de volta.
          </h1>
          <p className="mt-3 mb-8 text-sm leading-6 text-muted">
            Entre com o acesso fornecido pelo administrador da sua equipe.
          </p>
          <LoginForm initialError={initialError} />
          <div className="mt-8 border-t border-line pt-6 text-center text-xs leading-6 text-muted">
            Ainda não tem acesso?
            <br />
            <span className="font-medium text-ink">
              Solicite ao administrador da equipe.
            </span>
          </div>
        </div>
        <p className="text-center text-[11px] leading-5 text-muted">
          Somente dados fictícios. Nenhuma movimentação financeira real.
        </p>
      </section>
    </main>
  );
}
