"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/auth/permissions";

export type EstadoInvestigacion = "abierta" | "en_investigacion" | "cerrada";
export type EstadoAccionCorrectiva = "pendiente" | "en_progreso" | "completada";

export type CrearAccidenteInvestigacionInput = {
  trabajadorId?: string;
  centroTrabajoId?: string;
  fecha: string;
  tipo: string;
  gravedad: string;
  descripcion: string;
  causaProbable?: string;
};

export type CrearAccionCorrectivaInput = {
  investigacionId: string;
  descripcion: string;
  responsableId?: string;
  responsableNombre?: string;
  plazo: string;
};

export type InvestigacionAccionRow = {
  id: string;
  descripcion: string;
  responsableNombre: string | null;
  plazo: string;
  estado: EstadoAccionCorrectiva;
  completadaAt: string | null;
};

export type AccidenteInvestigacionRow = {
  id: string;
  fecha: string;
  tipo: string;
  gravedad: string;
  descripcion: string;
  causaProbable: string | null;
  estado: EstadoInvestigacion;
  cerradaAt: string | null;
  trabajador: { id: string; nombre: string } | null;
  centroTrabajo: { id: string; nombre: string } | null;
  acciones: InvestigacionAccionRow[];
  accionesPendientes: number;
};

function parseDate(value: string): Date {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new Error("Fecha inválida");
  }
  return d;
}

export async function crearAccidenteInvestigacion(input: CrearAccidenteInvestigacionInput) {
  const { empresaId } = await requirePermission("canManageCumplimiento");

  const fecha = parseDate(input.fecha);
  const tipo = input.tipo.trim();
  const gravedad = input.gravedad.trim();
  const descripcion = input.descripcion.trim();

  if (!tipo) throw new Error("El tipo es obligatorio");
  if (!gravedad) throw new Error("La gravedad es obligatoria");
  if (!descripcion) throw new Error("La descripción es obligatoria");

  if (input.trabajadorId) {
    const trabajador = await prisma.trabajador.findFirst({
      where: { id: input.trabajadorId, empresaId },
      select: { id: true },
    });
    if (!trabajador) throw new Error("Trabajador no encontrado");
  }

  if (input.centroTrabajoId) {
    const centro = await prisma.centroTrabajo.findFirst({
      where: { id: input.centroTrabajoId, empresaId },
      select: { id: true },
    });
    if (!centro) throw new Error("Centro no encontrado");
  }

  const created = await prisma.accidenteInvestigacion.create({
    data: {
      empresaId,
      trabajadorId: input.trabajadorId || null,
      centroTrabajoId: input.centroTrabajoId || null,
      fecha,
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

  const investigacion = await prisma.accidenteInvestigacion.findFirst({
    where: { id: input.investigacionId, empresaId },
    select: { id: true, estado: true },
  });

  if (!investigacion) throw new Error("Investigación no encontrada");
  if (investigacion.estado === "cerrada") throw new Error("No se pueden agregar acciones a una investigación cerrada");

  const descripcion = input.descripcion.trim();
  if (!descripcion) throw new Error("La descripción de la acción es obligatoria");

  const plazo = parseDate(input.plazo);

  let responsableId: string | null = null;
  if (input.responsableId) {
    const usuario = await prisma.usuario.findFirst({
      where: { id: input.responsableId, empresaId },
      select: { id: true, nombre: true },
    });
    if (!usuario) throw new Error("Responsable no encontrado");
    responsableId = usuario.id;
  }

  const created = await prisma.accidenteAccionCorrectiva.create({
    data: {
      empresaId,
      investigacionId: input.investigacionId,
      descripcion,
      responsableId,
      responsableNombre: input.responsableNombre?.trim() || null,
      plazo,
      estado: "pendiente",
    },
    select: { id: true },
  });

  await prisma.accidenteInvestigacion.update({
    where: { id: input.investigacionId },
    data: {
      estado: investigacion.estado === "abierta" ? "en_investigacion" : investigacion.estado,
    },
  });

  return { id: created.id };
}

export async function actualizarEstadoAccionCorrectiva(
  accionId: string,
  estado: EstadoAccionCorrectiva,
) {
  const { empresaId } = await requirePermission("canManageCumplimiento");

  const accion = await prisma.accidenteAccionCorrectiva.findFirst({
    where: { id: accionId, empresaId },
    select: { id: true },
  });

  if (!accion) throw new Error("Acción correctiva no encontrada");

  await prisma.accidenteAccionCorrectiva.update({
    where: { id: accionId },
    data: {
      estado,
      completadaAt: estado === "completada" ? new Date() : null,
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

  if (!investigacion) throw new Error("Investigación no encontrada");
  if (investigacion.estado === "cerrada") return { ok: true };

  const pendientes = investigacion.acciones.filter((a) => a.estado !== "completada").length;
  if (pendientes > 0) {
    throw new Error("No se puede cerrar la investigación con acciones pendientes");
  }

  await prisma.accidenteInvestigacion.update({
    where: { id: investigacionId },
    data: {
      estado: "cerrada",
      cerradaAt: new Date(),
    },
  });

  return { ok: true };
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
      select: { id: true, nombre: true, email: true },
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
    usuarios: usuarios.map((u) => ({
      id: u.id,
      nombre: u.nombre,
      email: u.email,
    })),
  };
}

export async function getAccidenteInvestigaciones(): Promise<AccidenteInvestigacionRow[]> {
  const { empresaId } = await requirePermission("canReadCumplimiento");

  const rows = await prisma.accidenteInvestigacion.findMany({
    where: { empresaId },
    orderBy: { fecha: "desc" },
    select: {
      id: true,
      fecha: true,
      tipo: true,
      gravedad: true,
      descripcion: true,
      causaProbable: true,
      estado: true,
      cerradaAt: true,
      trabajador: {
        select: {
          id: true,
          nombres: true,
          apellidos: true,
        },
      },
      centroTrabajo: {
        select: {
          id: true,
          nombre: true,
        },
      },
      acciones: {
        orderBy: { plazo: "asc" },
        select: {
          id: true,
          descripcion: true,
          responsable: { select: { nombre: true } },
          responsableNombre: true,
          plazo: true,
          estado: true,
          completadaAt: true,
        },
      },
    },
  });

  return rows.map((r) => {
    const acciones = r.acciones.map((a) => ({
      id: a.id,
      descripcion: a.descripcion,
      responsableNombre: a.responsable?.nombre ?? a.responsableNombre ?? null,
      plazo: a.plazo.toISOString(),
      estado: a.estado,
      completadaAt: a.completadaAt?.toISOString() ?? null,
    }));

    return {
      id: r.id,
      fecha: r.fecha.toISOString(),
      tipo: r.tipo,
      gravedad: r.gravedad,
      descripcion: r.descripcion,
      causaProbable: r.causaProbable,
      estado: r.estado,
      cerradaAt: r.cerradaAt?.toISOString() ?? null,
      trabajador: r.trabajador
        ? {
            id: r.trabajador.id,
            nombre: `${r.trabajador.nombres} ${r.trabajador.apellidos}`.trim(),
          }
        : null,
      centroTrabajo: r.centroTrabajo
        ? {
            id: r.centroTrabajo.id,
            nombre: r.centroTrabajo.nombre,
          }
        : null,
      acciones,
      accionesPendientes: acciones.filter((a) => a.estado !== "completada").length,
    };
  });
}
