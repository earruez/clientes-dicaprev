import { redirect } from "next/navigation";

export default function DS44ResumenPage() {
  // Legacy route: /dicaprev/ds44/resumen has been removed.
  // DS44 data is no longer available as a dedicated view.
  // Users should visit /dicaprev/cumplimiento/ for compliance tracking.
  redirect("/dicaprev/cumplimiento/resumen");
}
