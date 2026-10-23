import { redirect } from "next/navigation";

/** La vista anterior utilizaba almacenamiento local; redirigir al módulo Prisma. */
export default function CentrosTrabajoLegacyPage() {
  redirect("/dicaprev/empresa/centros");
}
