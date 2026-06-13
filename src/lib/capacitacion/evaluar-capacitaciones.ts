import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

type EvaluarCapacitacionesInput = {
  trabajadorId: string;
  empresaId: string;
  cargoId: string | null;
  areaId: string | null;
  centroTrabajoId: string | null;
};

export async function evaluarCapacitacionesPorEvento(input: EvaluarCapacitacionesInput): Promise<number> {
  const { trabajadorId, empresaId, cargoId, areaId } = input;

  const reglas = await prisma.reglaCapacitacionCargo.findMany({
    where: {
      empresaId,
      activo: true,
      obligatorio: true,
      AND: [
        { OR: [{ cargoId }, { cargoId: null }] },
        { OR: [{ areaId }, { areaId: null }] },
      ],
    },
    select: { id: true, capacitacionId: true },
  });

  if (reglas.length === 0) return 0;

  const capacitacionIds = [...new Set(reglas.map((r: { capacitacionId: string }) => r.capacitacionId))];

  const asignacionesExistentes = await prisma.capacitacionAsignacion.findMany({
    where: {
      empresaId,
      trabajadorId,
      capacitacionId: { in: capacitacionIds },
      estado: { in: ["pendiente", "enviada", "en_progreso"] },
    },
    select: { capacitacionId: true },
  });

  const asignadasIds = new Set(asignacionesExistentes.map((a: { capacitacionId: string }) => a.capacitacionId));
  const pendientes = capacitacionIds.filter((id) => !asignadasIds.has(id));

  if (pendientes.length === 0) return 0;

  const now = new Date();
  let creadas = 0;

  for (const capacitacionId of pendientes) {
    const asignacion = await prisma.capacitacionAsignacion.create({
      data: {
        empresaId,
        trabajadorId,
        capacitacionId,
        origen: "automatico",
        estado: "pendiente",
        fechaAsignacion: now,
        token: randomUUID(),
      },
      select: { id: true },
    });

    await prisma.capacitacionHistorial.create({
      data: {
        empresaId,
        trabajadorId,
        capacitacionId,
        asignacionId: asignacion.id,
        tipoEvento: "asignacion_creada",
        detalle: "Asignación automática por regla de cargo",
        estado: "pendiente",
        fechaEvento: now,
      },
    });

    creadas++;
  }

  return creadas;
}
