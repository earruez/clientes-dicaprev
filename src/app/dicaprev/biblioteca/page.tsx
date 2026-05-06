import { obtenerEstadisticasBiblioteca, obtenerLibriaDocumentalUnificada } from "./actions";
import BibliotecaClient from "./BibliotecaClient";

export default async function BibliotecaPage() {
  const [initialDocs, initialStats] = await Promise.all([
    obtenerLibriaDocumentalUnificada(),
    obtenerEstadisticasBiblioteca(),
  ]);

  return <BibliotecaClient initialDocs={initialDocs} initialStats={initialStats} />;
}
