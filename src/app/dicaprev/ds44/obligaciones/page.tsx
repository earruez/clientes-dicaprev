import ObligacionesClient from "@/app/dicaprev/cumplimiento/obligaciones/ObligacionesClient";
import { getObligacionesCumplimientoEmpresa } from "@/app/dicaprev/cumplimiento/obligaciones/actions";

export default async function Ds44ObligacionesPage() {
  const data = await getObligacionesCumplimientoEmpresa();

  return <ObligacionesClient data={data} contexto="ds44" />;
}
