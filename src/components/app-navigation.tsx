"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./icon";

export function AppNavigation({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const links = [
    { href: "/inicio", label: "Visão geral", icon: "grid" as const },
    ...(isAdmin
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
          className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${pathname.startsWith(href) ? "bg-brand-soft text-brand" : "text-muted hover:bg-white hover:text-ink"}`}
        >
          <Icon name={icon} width="17" height="17" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
