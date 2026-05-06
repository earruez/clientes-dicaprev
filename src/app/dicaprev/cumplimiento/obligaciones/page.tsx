import ObligacionesClient from "./ObligacionesClient";
import { getObligacionesCumplimientoEmpresa } from "./actions";

export default async function ObligacionesPage() {
  const data = await getObligacionesCumplimientoEmpresa();
  return <ObligacionesClient data={data} />;
}
