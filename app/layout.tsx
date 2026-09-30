import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Святые дня",
  description: "Список святых на дату богослужения. Редактирование и экспорт на одну страницу А4.",
  robots: { index: false, follow: false },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="antialiased">{children}</body>
    </html>
  );
}
