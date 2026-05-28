import HallazgosClient from "./HallazgosClient";
import { getHallazgos, getOpcionesHallazgo } from "./actions";

export default async function HallazgosPage() {
  const [initialHallazgos, opciones] = await Promise.all([
    getHallazgos(),
    getOpcionesHallazgo(),
  ]);

  const iaConfigurada = Boolean(process.env.OPENAI_API_KEY);

  return <HallazgosClient initialHallazgos={initialHallazgos} opciones={opciones} iaConfigurada={iaConfigurada} />;
}
