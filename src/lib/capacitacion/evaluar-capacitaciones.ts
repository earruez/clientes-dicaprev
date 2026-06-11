import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

type EvaluarCapacitacionesInput = {
  trabajadorId: string;
  empresaId: string;
  cargoId: string | null;
  areaId: string | null;
  centroTrabajoId: string | null;
};

const ESTADOS_ACTIVOS = ["pendiente", "enviada", "en_progreso"] as const;

export async function evaluarCapacitacionesPorEvento(input: EvaluarCapacitacionesInput): Promise<number> {
  const { trabajadorId, empresaId, cargoId, areaId } = input;

  const reglas = await prisma.reglaCapacitacionCargo.findMany({
    where: {
      empresaId,
      activo: true,
      obligatorio: true,
      OR: [
        { cargoId: cargoId ?? undefined },
        { cargoId: null },
      ],
      AND: [
        {
          OR: [
            { areaId: areaId ?? undefined },
            { areaId: null },
          ],
        },
      ],
    },
    select: {
      capacitacionId: true,
    },
  });

  if (reglas.length === 0) return 0;

  const capacitacionIds = [...new Set(reglas.map((r: { capacitacionId: string }) => r.capacitacionId))];

  const asignacionesExistentes = await prisma.capacitacionAsignacion.findMany({
    where: {
      trabajadorId,
      empresaId,
      capacitacionId: { in: capacitacionIds },
      estado: { in: [...ESTADOS_ACTIVOS] },
    },
    select: { capacitacionId: true },
  });

  const yaAsignadas = new Set(asignacionesExistentes.map((a: { capacitacionId: string }) => a.capacitacionId));

  const pendientes = capacitacionIds.filter((id) => !yaAsignadas.has(id));

  if (pendientes.length === 0) return 0;

  const hoy = new Date();
  let creadas = 0;

  for (const capacitacionId of pendientes) {
    const token = randomBytes(24).toString("hex");

    const asignacion = await prisma.capacitacionAsignacion.create({
      data: {
        empresaId,
        trabajadorId,
        capacitacionId,
        origen: "automatico",
        estado: "pendiente",
        fechaAsignacion: hoy,
        token,
      },
      select: { id: true },
    });

    await prisma.capacitacionHistorial.create({
      data: {
        empresaId,
        trabajadorId,
        capacitacionId,
        asignacionId: asignacion.id,
        tipoEvento: "asignacion_automatica",
        detalle: "Asignación automática por cargo/área al ingresar o actualizar trabajador",
        estado: "pendiente",
        fechaEvento: hoy,
      },
    });

    creadas += 1;
  }

  return creadas;
}
