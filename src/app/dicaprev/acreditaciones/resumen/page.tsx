import { getAcreditacionesResumen, getMandantesAcreditacion } from "@/actions/acreditaciones";
import ResumenAcreditacionesClient from "./resumen-client";

export default async function AcreditacionesResumenPage() {
  const [resumen, mandantes] = await Promise.all([
    getAcreditacionesResumen(),
    getMandantesAcreditacion(),
  ]);

  const responsables = Array.from(
    new Map(
      resumen.rows
        .filter((row) => row.responsableId)
        .map((row) => [row.responsableId, { id: row.responsableId as string, nombre: row.responsable }]),
    ).values(),
  );

  return (
    <ResumenAcreditacionesClient
      kpis={resumen.kpis}
      rows={resumen.rows.map((row) => ({
        ...row,
        fechaVencimiento: row.fechaVencimiento ? row.fechaVencimiento.toISOString() : null,
        updatedAt: row.updatedAt.toISOString(),
      }))}
      colaPrioritaria={resumen.colaPrioritaria.map((row) => ({
        ...row,
        fechaVencimiento: row.fechaVencimiento ? row.fechaVencimiento.toISOString() : null,
        updatedAt: row.updatedAt.toISOString(),
      }))}
      mandantes={mandantes.map((m) => ({ id: m.id, nombre: m.nombre }))}
      responsables={responsables}
    />
  );
}
