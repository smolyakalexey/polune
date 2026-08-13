import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({ variable: "--font-manrope", subsets: ["cyrillic", "latin"] });

export const metadata: Metadata = {
  title: "Благоприятный день",
  description: "Выберите дело — узнайте ближайшие подходящие дни и запланируйте его за минуту.",
  other: { "codex-preview": "development" },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body className={manrope.variable}>{children}</body></html>;
}
