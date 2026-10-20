import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ExchangeDesk",
  description: "Simulações e operações demonstrativas de câmbio.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
