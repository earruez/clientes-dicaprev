// RUTA LEGACY – DEPRECADA
// Esta ruta ha sido reemplazada por la ruta canónica con persistencia Prisma:
//   /dicaprev/capacitacion/plan
// No agregar nuevas funcionalidades aquí.

import { redirect } from "next/navigation";

export default function PlanDeCapacitacionLegacyPage() {
  redirect("/dicaprev/capacitacion/plan");
}
