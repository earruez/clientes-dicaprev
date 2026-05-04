import { redirect } from "next/navigation";

// Redirige a la ubicación canónica dentro del módulo Documentación
export default function DocumentosRedirectPage() {
  redirect("/dicaprev/documentacion");
}
