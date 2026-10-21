import Link from "next/link";
import { Brand, Icon } from "@/components/icon";
import { AppNavigation } from "@/components/app-navigation";
import { requirePagePermission } from "@/server/auth/page-access";
import { logoutAction } from "./actions";

export default async function InternalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const actor = await requirePagePermission("customers:read");
  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <Link href="/inicio" aria-label="ExchangeDesk, página inicial">
            <Brand />
          </Link>
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-ink">{actor.name}</p>
              <p className="mt-0.5 text-xs text-muted">
                {actor.role === "ADMIN" ? "Administrador" : "Operador"}
              </p>
            </div>
            <span
              className="grid size-9 place-items-center rounded-full bg-brand-soft text-sm font-semibold text-brand"
              aria-hidden="true"
            >
              {actor.name.slice(0, 1).toUpperCase()}
            </span>
            <form action={logoutAction}>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg p-2 text-sm text-muted hover:bg-canvas hover:text-ink focus-visible:outline-2 focus-visible:outline-brand"
              >
                <Icon name="logout" />
                <span className="hidden sm:inline">Sair</span>
                <span className="sr-only sm:hidden">Sair do sistema</span>
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-5 py-5 sm:px-8">
        <AppNavigation isAdmin={actor.role === "ADMIN"} />
      </div>
      <main id="conteudo" className="mx-auto max-w-6xl px-5 pt-5 pb-16 sm:px-8">
        {children}
      </main>
      <footer className="mx-auto max-w-6xl border-t border-line px-5 py-6 text-xs text-muted sm:px-8">
        ExchangeDesk · Ambiente de estudo com dados fictícios.
      </footer>
    </div>
  );
}
