import { getHistorialAcreditaciones } from "@/actions/acreditaciones";
import HistorialAcreditacionesClient from "./historial-client";

export default async function HistorialGestionPage() {
  const historial = await getHistorialAcreditaciones();
  return <HistorialAcreditacionesClient data={historial} />;
}
