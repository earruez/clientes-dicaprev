import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clientes DICAPREV",
  description: "Portal limpio con sidebar y topbar",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
