"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/auth/permissions";

export type EstadoAccionCorrectivaInput =
  | "pendiente"
  | "en_proceso"
  | "completada"
  | "cancelada";

export type CrearAccidenteInvestigacionInput = {
  trabajadorId: string;
  centroTrabajoId: string;
  fechaAccidente: string;
  tipo: string;
  gravedad: string;
  descripcion: string;
  causaProbable?: string;
};

export type CrearAccionCorrectivaInput = {
  investigacionId: string;
  descripcion: string;
  responsableId: string;
  plazo: string;
};

export type AccidenteAccionCorrectivaRow = {
  id: string;
  descripcion: string;
  responsable: string;
  plazo: string;
  estado: EstadoAccionCorrectivaInput;
};

export type AccidenteInvestigacionRow = {
  id: string;
  fechaAccidente: string;
  tipo: string;
  gravedad: string;
  descripcion: string;
  causaProbable: string | null;
  estado: "abierta" | "en_investigacion" | "cerrada";
  trabajador: string;
  centroTrabajo: string;
  accionesPendientes: number;
  acciones: AccidenteAccionCorrectivaRow[];
};

function parseDate(value: string, field: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Fecha invalida en campo: ${field}`);
  }
  return date;
}

export async function getOpcionesAccidentes() {
  const { empresaId } = await requirePermission("canReadCumplimiento");

  const [trabajadores, centros, usuarios] = await Promise.all([
    prisma.trabajador.findMany({
      where: { empresaId, estado: { not: "inactivo" } },
      select: { id: true, nombres: true, apellidos: true, rut: true },
      orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
    }),
    prisma.centroTrabajo.findMany({
      where: { empresaId },
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
    prisma.usuario.findMany({
      where: { empresaId, activo: true },
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
  ]);

  return {
    trabajadores: trabajadores.map((t) => ({
      id: t.id,
      nombre: `${t.apellidos} ${t.nombres}`.trim(),
      rut: t.rut,
    })),
    centros,
    responsables: usuarios,
  };
}

export async function crearAccidenteInvestigacion(input: CrearAccidenteInvestigacionInput) {
  const { empresaId, usuarioId } = await requirePermission("canManageCumplimiento");

  const descripcion = input.descripcion.trim();
  if (!descripcion) throw new Error("La descripcion es obligatoria");

  const tipo = input.tipo.trim();
  if (!tipo) throw new Error("El tipo es obligatorio");

  const gravedad = input.gravedad.trim();
  if (!gravedad) throw new Error("La gravedad es obligatoria");

  const fechaAccidente = parseDate(input.fechaAccidente, "fechaAccidente");

  const [trabajador, centro] = await Promise.all([
    prisma.trabajador.findFirst({
      where: { id: input.trabajadorId, empresaId },
      select: { id: true },
    }),
    prisma.centroTrabajo.findFirst({
      where: { id: input.centroTrabajoId, empresaId },
      select: { id: true },
    }),
  ]);

  if (!trabajador) throw new Error("Trabajador no encontrado");
  if (!centro) throw new Error("Centro de trabajo no encontrado");

  const created = await prisma.accidenteInvestigacion.create({
    data: {
      empresaId,
      trabajadorId: input.trabajadorId,
      centroTrabajoId: input.centroTrabajoId,
      creadoPorId: usuarioId,
      fechaAccidente,
      tipo,
      gravedad,
      descripcion,
      causaProbable: input.causaProbable?.trim() || null,
      estado: "abierta",
    },
    select: { id: true },
  });

  return { id: created.id };
}

export async function crearAccionCorrectiva(input: CrearAccionCorrectivaInput) {
  const { empresaId } = await requirePermission("canManageCumplimiento");

  const descripcion = input.descripcion.trim();
  if (!descripcion) throw new Error("La descripcion de la accion es obligatoria");

  const plazo = parseDate(input.plazo, "plazo");

  const [investigacion, responsable] = await Promise.all([
    prisma.accidenteInvestigacion.findFirst({
      where: { id: input.investigacionId, empresaId },
      select: { id: true, estado: true },
    }),
    prisma.usuario.findFirst({
      where: { id: input.responsableId, empresaId, activo: true },
      select: { id: true },
    }),
  ]);

  if (!investigacion) throw new Error("Investigacion no encontrada");
  if (!responsable) throw new Error("Responsable no encontrado");
  if (investigacion.estado === "cerrada") {
    throw new Error("No puede agregar acciones en una investigacion cerrada");
  }

  const created = await prisma.accidenteAccionCorrectiva.create({
    data: {
      empresaId,
      investigacionId: input.investigacionId,
      descripcion,
      responsableId: input.responsableId,
      plazo,
      estado: "pendiente",
    },
    select: { id: true },
  });

  if (investigacion.estado === "abierta") {
    await prisma.accidenteInvestigacion.update({
      where: { id: investigacion.id },
      data: { estado: "en_investigacion" },
    });
  }

  return { id: created.id };
}

export async function actualizarEstadoAccionCorrectiva(
  accionId: string,
  estado: EstadoAccionCorrectivaInput,
) {
  const { empresaId } = await requirePermission("canManageCumplimiento");

  const accion = await prisma.accidenteAccionCorrectiva.findFirst({
    where: { id: accionId, empresaId },
    select: { id: true },
  });

  if (!accion) throw new Error("Accion correctiva no encontrada");

  await prisma.accidenteAccionCorrectiva.update({
    where: { id: accionId },
    data: {
      estado,
      fechaCierre: estado === "completada" ? new Date() : null,
    },
  });

  return { ok: true };
}

export async function cerrarInvestigacion(investigacionId: string) {
  const { empresaId } = await requirePermission("canManageCumplimiento");

  const investigacion = await prisma.accidenteInvestigacion.findFirst({
    where: { id: investigacionId, empresaId },
    select: {
      id: true,
      estado: true,
      acciones: {
        select: { estado: true },
      },
    },
  });

  if (!investigacion) throw new Error("Investigacion no encontrada");
  if (investigacion.estado === "cerrada") return { ok: true };

  const pendientes = investigacion.acciones.filter(
    (a) => a.estado === "pendiente" || a.estado === "en_proceso",
  ).length;

  if (pendientes > 0) {
    throw new Error("No puede cerrar la investigacion con acciones pendientes");
  }

  await prisma.accidenteInvestigacion.update({
    where: { id: investigacionId },
    data: {
      estado: "cerrada",
      fechaCierre: new Date(),
    },
  });

  return { ok: true };
}

export async function getAccidenteInvestigaciones(): Promise<AccidenteInvestigacionRow[]> {
  const { empresaId } = await requirePermission("canReadCumplimiento");

  const rows = await prisma.accidenteInvestigacion.findMany({
    where: { empresaId },
    orderBy: [{ fechaAccidente: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      fechaAccidente: true,
      tipo: true,
      gravedad: true,
      descripcion: true,
      causaProbable: true,
      estado: true,
      trabajador: { select: { nombres: true, apellidos: true } },
      centroTrabajo: { select: { nombre: true } },
      acciones: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          descripcion: true,
          plazo: true,
          estado: true,
          responsable: { select: { nombre: true } },
        },
      },
    },
  });

  return rows.map((r) => {
    const acciones = r.acciones.map((a) => ({
      id: a.id,
      descripcion: a.descripcion,
      responsable: a.responsable.nombre,
      plazo: a.plazo.toISOString(),
      estado: a.estado,
    }));

    const accionesPendientes = acciones.filter(
      (a) => a.estado === "pendiente" || a.estado === "en_proceso",
    ).length;

    return {
      id: r.id,
      fechaAccidente: r.fechaAccidente.toISOString(),
      tipo: r.tipo,
      gravedad: r.gravedad,
      descripcion: r.descripcion,
      causaProbable: r.causaProbable,
      estado: r.estado,
      trabajador: `${r.trabajador.apellidos} ${r.trabajador.nombres}`.trim(),
      centroTrabajo: r.centroTrabajo.nombre,
      accionesPendientes,
      acciones,
    };
  });
}
