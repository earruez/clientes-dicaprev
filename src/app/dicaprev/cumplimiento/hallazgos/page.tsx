import HallazgosClient from "./HallazgosClient";
import { getHallazgos, getOpcionesHallazgo } from "./actions";

export default async function HallazgosPage() {
  const [initialHallazgos, opciones] = await Promise.all([
    getHallazgos(),
    getOpcionesHallazgo(),
  ]);

  return <HallazgosClient initialHallazgos={initialHallazgos} opciones={opciones} />;
}
