import Link from "next/link";
import { Brand, Icon } from "@/components/icon";
import { AppNavigation } from "@/components/app-navigation";
import { requirePageActor } from "@/server/auth/page-access";
import { ROLE_LABELS } from "@/domain/permissions";
import { logoutAction } from "./actions";

export default async function InternalLayout({ children }: { children: React.ReactNode }) {
  const actor = await requirePageActor();
  return (
    <div className="app-shell">
      <a href="#conteudo" className="skip-link">Ir para o conteúdo</a>
      <aside className="app-sidebar" aria-label="Menu do sistema">
        <Link href="/inicio" aria-label="ExchangeDesk, página inicial" className="app-brand"><Brand light /></Link>
        <AppNavigation role={actor.role} />
        <div className="sidebar-caption"><Icon name="shield" width="17" height="17" /><span>Gestão de operações de câmbio</span></div>
      </aside>
      <div className="app-body">
        <header className="app-topbar">
          <p className="hidden text-sm text-muted sm:block">Seu espaço de trabalho</p>
          <div className="ml-auto flex min-w-0 items-center gap-3 sm:gap-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft text-sm font-semibold text-brand-ink" aria-hidden="true">{actor.name.slice(0, 1).toUpperCase()}</span>
            <div className="min-w-0"><p className="max-w-48 truncate text-sm font-semibold">{actor.name}</p><p className="mt-0.5 text-xs text-muted">{ROLE_LABELS[actor.role]}</p></div>
            <form action={logoutAction}><button type="submit" className="ml-2 inline-flex items-center gap-2 rounded-lg p-2 text-sm text-muted hover:bg-canvas hover:text-ink"><Icon name="logout" /><span className="hidden sm:inline">Sair</span><span className="sr-only sm:hidden">Sair do sistema</span></button></form>
          </div>
        </header>
        <main id="conteudo" tabIndex={-1} className="app-content">{children}</main>
        <footer className="app-footer">ExchangeDesk · Gestão de operações de câmbio.</footer>
      </div>
    </div>
  );
}
