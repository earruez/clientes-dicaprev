import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Permisos | NextPrev",
  description: "Gestión de permisos de instalación",
};

export default function PermisosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
