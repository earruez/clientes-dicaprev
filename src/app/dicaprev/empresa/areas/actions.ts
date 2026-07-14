"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/auth/permissions";

type AreaInput = {
  nombre: string;
  descripcion?: string;
  estado?: string;
};

export type AreaRelacionUso = {
  trabajadores: number;
  cargos: number;
  dotacion: number;
  documentos: number;
  actividades: number;
  registros: number;
};

export type EvaluacionEliminacionArea = {
  puedeEliminarDefinitivo: boolean;
  uso: AreaRelacionUso;
  bloqueos: string[];
};

function normalizeText(value?: string) {
  return (value ?? "").trim();
}

function validateArea(data: AreaInput) {
  const nombre = normalizeText(data.nombre);
  const descripcion = normalizeText(data.descripcion);
  const estado = normalizeText(data.estado) || "activa";

  if (!nombre) {
    throw new Error("El nombre del área es obligatorio");
  }

  return {
    nombre,
    descripcion: descripcion || null,
    estado,
  };
}

export async function getAreas() {
  const { empresaId } = await requirePermission("canReadEmpresa");

  return prisma.area.findMany({
    where: { empresaId },
    orderBy: { createdAt: "desc" },
  });
}

async function calcularUsoArea(empresaId: string, areaId: string): Promise<AreaRelacionUso> {
  const [trabajadores, cargos, dotacion, documentos, actividades, registros] = await Promise.all([
    prisma.trabajador.count({
      where: {
        empresaId,
        areaId,
      },
    }),
    prisma.cargo.count({
      where: {
        empresaId,
        areaId,
      },
    }),
    prisma.posicionDotacion.count({
      where: {
        empresaId,
        cargo: {
          areaId,
        },
      },
    }),
    prisma.reglaDocumentoTrabajador.count({
      where: {
        empresaId,
        areaId,
      },
    }),
    prisma.planCapacitacionItem.count({
      where: {
        areaId,
        plan: {
          empresaId,
        },
      },
    }),
    prisma.reglaCapacitacionCargo.count({
      where: {
        empresaId,
        areaId,
      },
    }),
  ]);

  return {
    trabajadores,
    cargos,
    dotacion,
    documentos,
    actividades,
    registros,
  };
}

function construirBloqueosArea(uso: AreaRelacionUso): string[] {
  const bloqueos: string[] = [];
  if (uso.trabajadores > 0) bloqueos.push(`${uso.trabajadores} trabajador(es) asociado(s)`);
  if (uso.cargos > 0) bloqueos.push(`${uso.cargos} cargo(s) vinculado(s)`);
  if (uso.dotacion > 0) bloqueos.push(`${uso.dotacion} registro(s) de dotación`);
  if (uso.documentos > 0) bloqueos.push(`${uso.documentos} regla(s) documental(es)`);
  if (uso.actividades > 0) bloqueos.push(`${uso.actividades} actividad(es) asociada(s)`);
  if (uso.registros > 0) bloqueos.push(`${uso.registros} registro(s) asociado(s)`);
  return bloqueos;
}

export async function evaluarEliminacionArea(id: string): Promise<EvaluacionEliminacionArea> {
  const { empresaId } = await requirePermission("canManageEmpresa");

  const area = await prisma.area.findFirst({
    where: { id, empresaId },
    select: { id: true },
  });

  if (!area) {
    throw new Error("Área no encontrada en la empresa activa");
  }

  const uso = await calcularUsoArea(empresaId, id);
  const bloqueos = construirBloqueosArea(uso);

  return {
    puedeEliminarDefinitivo: bloqueos.length === 0,
    uso,
    bloqueos,
  };
}

export async function crearArea(data: AreaInput) {
  const { empresaId } = await requirePermission("canManageEmpresa");
  const payload = validateArea(data);

  return prisma.area.create({
    data: {
      empresaId,
      nombre: payload.nombre,
      descripcion: payload.descripcion,
      estado: payload.estado,
    },
  });
}

export async function actualizarArea(id: string, data: AreaInput) {
  const { empresaId } = await requirePermission("canManageEmpresa");
  const payload = validateArea(data);

  const updated = await prisma.area.updateMany({
    where: { id, empresaId },
    data: {
      nombre: payload.nombre,
      descripcion: payload.descripcion,
      estado: payload.estado,
    },
  });

  if (updated.count === 0) {
    throw new Error("Área no encontrada en la empresa activa");
  }

  return prisma.area.findFirstOrThrow({
    where: { id, empresaId },
  });
}

export async function desactivarArea(id: string) {
  const { empresaId } = await requirePermission("canManageEmpresa");
  const updated = await prisma.area.updateMany({
    where: { id, empresaId },
    data: {
      estado: "inactiva",
    },
  });

  if (updated.count === 0) {
    throw new Error("Área no encontrada en la empresa activa");
  }

  return prisma.area.findFirstOrThrow({
    where: { id, empresaId },
  });
}

export async function eliminarAreaDefinitiva(id: string) {
  const { empresaId } = await requirePermission("canManageEmpresa");

  const evaluacion = await evaluarEliminacionArea(id);
  if (!evaluacion.puedeEliminarDefinitivo) {
    throw new Error("No se puede eliminar definitivamente el área porque tiene relaciones activas.");
  }

  const deleted = await prisma.area.deleteMany({
    where: {
      id,
      empresaId,
    },
  });

  if (deleted.count === 0) {
    throw new Error("Área no encontrada en la empresa activa");
  }

  return { ok: true };
}
