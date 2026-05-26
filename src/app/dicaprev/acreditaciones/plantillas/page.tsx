import { getMandantesAcreditacion, getPlantillasAcreditacion } from "@/actions/acreditaciones";
import PlantillasClient from "./plantillas-client";

export default async function PlantillasPage() {
  const [plantillas, mandantes] = await Promise.all([
    getPlantillasAcreditacion(),
    getMandantesAcreditacion(),
  ]);

  return (
    <PlantillasClient
      initialPlantillas={plantillas.map((p) => ({
        id: p.id,
        nombre: p.nombre,
        tipo: p.tipo,
        descripcion: p.descripcion,
        activa: p.activa,
        version: p.version,
        mandanteId: p.mandanteId,
        mandante: p.mandante?.nombre ?? "Plantilla transversal",
        requisitosCount: p._count.requisitos,
        categorias: Array.from(new Set(p.requisitos.map((r) => r.categoria))),
        requisitos: p.requisitos.map((r) => ({
          id: r.id,
          nombreDocumento: r.nombreDocumento,
          codigoDocumento: r.codigoDocumento,
          categoria: r.categoria,
          aplicaA: r.aplicaA,
          obligatorio: r.obligatorio,
          documentoRequeridoEmpresaId: r.documentoRequeridoEmpresaId,
          documentoTipoTrabajadorId: r.documentoTipoTrabajadorId,
        })),
      }))}
      mandantes={mandantes.map((m) => ({ id: m.id, nombre: m.nombre }))}
    />
  );
}
