"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./icon";
import { can, type Role } from "@/domain/permissions";

export function AppNavigation({ role }: { role: Role }) {
  const pathname = usePathname();
  const links = [
    { href: "/inicio", label: role === "CONSULTANT" ? "Meu painel" : "Visão geral", icon: "grid" as const },
    ...(can(role, "customers:read") ? [{ href: "/clientes", label: "Clientes", icon: "users" as const }] : []),
    ...(can(role, "quotes:simulate") ? [{ href: "/simulacoes", label: "Minhas simulações", icon: "exchange" as const }] : []),
    ...(can(role, "operations:read") ? [{ href: "/operacoes", label: role === "CONSULTANT" ? "Minhas operações" : "Operações", icon: "operations" as const }] : []),
    ...(can(role, "employees:read")
      ? [
          {
            href: "/funcionarios",
            label: "Funcionários",
            icon: "users" as const,
          },
        ]
      : []),
  ];
  return (
    <nav
      aria-label="Navegação principal"
      className="flex gap-1 overflow-x-auto"
    >
      {links.map(({ href, label, icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={pathname.startsWith(href) ? "page" : undefined}
          className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${pathname.startsWith(href) ? "bg-brand text-button-ink" : "text-muted hover:bg-surface hover:text-ink"}`}
        >
          <Icon name={icon} width="17" height="17" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
