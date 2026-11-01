"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { Icon } from "./icon";
import { can, type Role } from "@/domain/permissions";

export function AppNavigation({ role }: { role: Role }) {
  const pathname = usePathname();
  const menu = useRef<HTMLDetailsElement>(null);
  const groups = [
    { label: "Seu espaço", links: [
      { href: "/inicio", label: "Início", icon: "grid" as const },
    ] },
    { label: "Atendimento", links: [
      ...(can(role, "customers:read") ? [{ href: "/clientes", label: "Clientes", icon: "users" as const }] : []),
      ...(can(role, "quotes:simulate") ? [{ href: "/simulacoes", label: "Simulações", icon: "exchange" as const }] : []),
      ...(can(role, "proposals:read") ? [{ href: "/propostas", label: "Propostas", icon: "exchange" as const }] : []),
    ] },
    { label: "Acompanhamento", links: [
      ...(can(role, "requests:read") ? [{ href: "/solicitacoes", label: "Solicitações", icon: "operations" as const }] : []),
      ...(can(role, "operations:read") ? [{ href: "/operacoes", label: "Operações", icon: "operations" as const },
        { href: "/indicadores", label: "Indicadores", icon: "chart" as const }] : []),
    ] },
    { label: "Administração", links: can(role, "employees:read") ? [
      { href: "/funcionarios", label: "Funcionários", icon: "users" as const },
    ] : [] },
  ];
  const navigation = (
      <nav aria-label="Navegação principal" className="app-navigation">
        {groups.filter(group => group.links.length).map(group => (
          <div key={group.label} className="navigation-group">
            <p className="navigation-label">{group.label}</p>
            {group.links.map(({ href, label, icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return <Link key={href} href={href} aria-current={active ? "page" : undefined}
                onClick={() => { if (menu.current) menu.current.open = false; }}
                className={`navigation-link ${active ? "navigation-link-active" : ""}`}>
                <Icon name={icon} width="18" height="18" />{label}
              </Link>;
            })}
          </div>
        ))}
      </nav>
  );
  return <>
    <div className="desktop-navigation">{navigation}</div>
    <details ref={menu} className="app-menu" onKeyDown={(event) => {
      if (event.key === "Escape" && menu.current?.open) {
        menu.current.open = false;
        menu.current.querySelector("summary")?.focus();
      }
    }}>
      <summary className="app-menu-toggle"><Icon name="menu" />Menu de navegação</summary>
      {navigation}
    </details>
  </>;
}
