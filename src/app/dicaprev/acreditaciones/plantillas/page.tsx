import { getPlantillasAcreditacion } from "@/actions/acreditaciones";
import PlantillasClient from "./plantillas-client";

export default async function PlantillasPage() {
  const plantillas = await getPlantillasAcreditacion();

  return (
    <PlantillasClient
      initialPlantillas={plantillas.map((p) => ({
        id: p.id,
        nombre: p.nombre,
        tipo: p.tipo,
        descripcion: p.descripcion,
        activa: p.activa,
        version: p.version,
        mandante: p.mandante?.nombre ?? "Plantilla transversal",
        requisitosCount: p._count.requisitos,
        categorias: Array.from(new Set(p.requisitos.map((r) => r.categoria))),
      }))}
    />
  );
}
