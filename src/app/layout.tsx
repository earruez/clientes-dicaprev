import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "NEXTPREV",
  description: "Portal NEXTPREV — Gestión de Prevención de Riesgos",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
