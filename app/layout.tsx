import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://blagopriyatny-den.smolyakalexey.chatgpt.site"),
  title: "Благоприятный день для важных дел",
  description: "Выберите дело, посмотрите ближайшие подходящие дни и сохраните лучший в календарь.",
  icons: { icon: "/figma/polune-mark.svg", shortcut: "/figma/polune-mark.svg" },
  robots: { index: false, follow: false },
  openGraph: {
    title: "Благоприятный день для важных дел",
    description: "Выберите дело и посмотрите ближайшие подходящие дни.",
    type: "website",
    locale: "ru_RU",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body>{children}</body></html>;
}
