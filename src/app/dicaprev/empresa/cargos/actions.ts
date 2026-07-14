"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/auth/permissions";

type CargoInput = {
  nombre: string;
  areaId?: string;
  descripcion?: string;
  perfilSST?: string;
  estado?: string;
  esCritico?: boolean;
};

export type CargoRelacionUso = {
  trabajadores: number;
  dotacion: number;
  documentos: number;
  actividades: number;
  registros: number;
};

export type EvaluacionEliminacionCargo = {
  puedeEliminarDefinitivo: boolean;
  uso: CargoRelacionUso;
  bloqueos: string[];
};

function normalizeText(value?: string) {
  return (value ?? "").trim();
}

async function validateAreaId(areaId: string | undefined, empresaId: string) {
  const normalized = normalizeText(areaId);
  if (!normalized) {
    return null;
  }

  const area = await prisma.area.findFirst({
    where: {
      id: normalized,
      empresaId,
    },
    select: { id: true },
  });

  if (!area) {
    throw new Error("El área seleccionada no existe para la empresa configurada");
  }

  return normalized;
}

async function validateCargo(data: CargoInput) {
  const nombre = normalizeText(data.nombre);
  const descripcion = normalizeText(data.descripcion);
  const perfilSST = normalizeText(data.perfilSST);
  const estado = normalizeText(data.estado) || "activo";
  const { empresaId } = await requirePermission("canManageEmpresa");
  const areaId = await validateAreaId(data.areaId, empresaId);

  if (!nombre) {
    throw new Error("El nombre del cargo es obligatorio");
  }

  return {
    nombre,
    areaId,
    descripcion: descripcion || null,
    perfilSST: perfilSST || null,
    estado,
    esCritico: Boolean(data.esCritico),
  };
}

export async function getCargos() {
  const { empresaId } = await requirePermission("canReadEmpresa");

  return prisma.cargo.findMany({
    where: { empresaId },
    include: {
      area: {
        select: {
          id: true,
          nombre: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

async function calcularUsoCargo(empresaId: string, cargoId: string): Promise<CargoRelacionUso> {
  const [trabajadores, dotacion, documentos, actividades, registros] = await Promise.all([
    prisma.trabajador.count({
      where: {
        empresaId,
        cargoId,
      },
    }),
    prisma.posicionDotacion.count({
      where: {
        empresaId,
        cargoId,
      },
    }),
    prisma.reglaDocumentoTrabajador.count({
      where: {
        empresaId,
        cargoId,
      },
    }),
    prisma.planCapacitacionItem.count({
      where: {
        cargoId,
        plan: {
          empresaId,
        },
      },
    }),
    prisma.reglaCapacitacionCargo.count({
      where: {
        empresaId,
        cargoId,
      },
    }),
  ]);

  return {
    trabajadores,
    dotacion,
    documentos,
    actividades,
    registros,
  };
}

function construirBloqueosCargo(uso: CargoRelacionUso): string[] {
  const bloqueos: string[] = [];
  if (uso.trabajadores > 0) bloqueos.push(`${uso.trabajadores} trabajador(es) asociado(s)`);
  if (uso.dotacion > 0) bloqueos.push(`${uso.dotacion} registro(s) de dotación`);
  if (uso.documentos > 0) bloqueos.push(`${uso.documentos} regla(s) documental(es)`);
  if (uso.actividades > 0) bloqueos.push(`${uso.actividades} actividad(es) asociada(s)`);
  if (uso.registros > 0) bloqueos.push(`${uso.registros} registro(s) asociado(s)`);
  return bloqueos;
}

export async function evaluarEliminacionCargo(id: string): Promise<EvaluacionEliminacionCargo> {
  const { empresaId } = await requirePermission("canManageEmpresa");

  const cargo = await prisma.cargo.findFirst({
    where: { id, empresaId },
    select: { id: true },
  });

  if (!cargo) {
    throw new Error("Cargo no encontrado en la empresa activa");
  }

  const uso = await calcularUsoCargo(empresaId, id);
  const bloqueos = construirBloqueosCargo(uso);

  return {
    puedeEliminarDefinitivo: bloqueos.length === 0,
    uso,
    bloqueos,
  };
}

export async function crearCargo(data: CargoInput) {
  const { empresaId } = await requirePermission("canManageEmpresa");
  const payload = await validateCargo(data);

  return prisma.cargo.create({
    data: {
      empresaId,
      nombre: payload.nombre,
      areaId: payload.areaId,
      descripcion: payload.descripcion,
      perfilSST: payload.perfilSST,
      estado: payload.estado,
      esCritico: payload.esCritico,
    },
    include: {
      area: {
        select: {
          id: true,
          nombre: true,
        },
      },
    },
  });
}

export async function actualizarCargo(id: string, data: CargoInput) {
  const { empresaId } = await requirePermission("canManageEmpresa");
  const payload = await validateCargo(data);

  const updated = await prisma.cargo.updateMany({
    where: { id, empresaId },
    data: {
      nombre: payload.nombre,
      areaId: payload.areaId,
      descripcion: payload.descripcion,
      perfilSST: payload.perfilSST,
      estado: payload.estado,
      esCritico: payload.esCritico,
    },
  });

  if (updated.count === 0) {
    throw new Error("Cargo no encontrado en la empresa activa");
  }

  return prisma.cargo.findFirstOrThrow({
    where: { id, empresaId },
    include: {
      area: {
        select: {
          id: true,
          nombre: true,
        },
      },
    },
  });
}

export async function desactivarCargo(id: string) {
  const { empresaId } = await requirePermission("canManageEmpresa");
  const updated = await prisma.cargo.updateMany({
    where: { id, empresaId },
    data: {
      estado: "inactivo",
    },
  });

  if (updated.count === 0) {
    throw new Error("Cargo no encontrado en la empresa activa");
  }

  return prisma.cargo.findFirstOrThrow({
    where: { id, empresaId },
    include: {
      area: {
        select: {
          id: true,
          nombre: true,
        },
      },
    },
  });
}

export async function eliminarCargoDefinitivo(id: string) {
  const { empresaId } = await requirePermission("canManageEmpresa");

  const evaluacion = await evaluarEliminacionCargo(id);
  if (!evaluacion.puedeEliminarDefinitivo) {
    throw new Error("No se puede eliminar definitivamente el cargo porque tiene relaciones activas.");
  }

  const deleted = await prisma.cargo.deleteMany({
    where: {
      id,
      empresaId,
    },
  });

  if (deleted.count === 0) {
    throw new Error("Cargo no encontrado en la empresa activa");
  }

  return { ok: true };
}
