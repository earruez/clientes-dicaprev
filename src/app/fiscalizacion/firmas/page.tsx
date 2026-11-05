import { obtenerAccesoFiscalizacion } from "@/lib/firmas-sst/fiscalizacion";
import FiscalizacionFirmaClient from "./FiscalizacionFirmaClient";
export const dynamic = "force-dynamic";
export default async function FiscalizacionFirmasPage() {
  const acceso = await obtenerAccesoFiscalizacion();
  return <FiscalizacionFirmaClient autorizado={!!acceso} />;
}
