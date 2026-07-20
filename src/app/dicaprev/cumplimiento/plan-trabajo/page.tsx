import PlanTrabajoClient from "./PlanTrabajoClient";
import { getPlanTrabajoData } from "./actions";

export default async function PlanTrabajoPage() {
  const { acciones, centros } = await getPlanTrabajoData();

  return <PlanTrabajoClient initialAcciones={acciones} centros={centros} showDs44Notice />;
}
