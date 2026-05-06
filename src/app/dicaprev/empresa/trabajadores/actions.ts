"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/auth/permissions";

type TrabajadorInput = {
  centroTrabajoId?: string;
  areaId?: string;
  cargoId?: string;
  posicionDotacionId?: string;
  nombres: string;
  apellidos: string;
  rut?: string;
  email?: string;
  telefono?: string;
  estado?: string;
  fechaIngreso?: string;
  tipoContrato?: string;
  jornada?: string;
};

function normalizeText(value?: string) {
  return (value ?? "").trim();
}

async function validateCentroTrabajoId(centroTrabajoId: string | undefined, empresaId: string) {
  const normalized = normalizeText(centroTrabajoId);
  if (!normalized) return null;

  const centro = await prisma.centroTrabajo.findFirst({
    where: {
      id: normalized,
      empresaId,
    },
    select: { id: true },
  });

  if (!centro) {
    throw new Error("El centro de trabajo seleccionado no existe para la empresa configurada");
  }

  return normalized;
}

async function validateAreaId(areaId: string | undefined, empresaId: string) {
  const normalized = normalizeText(areaId);
  if (!normalized) return null;

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

async function validateCargoId(cargoId: string | undefined, empresaId: string) {
  const normalized = normalizeText(cargoId);
  if (!normalized) return null;

  const cargo = await prisma.cargo.findFirst({
    where: {
      id: normalized,
      empresaId,
    },
    select: { id: true },
  });

  if (!cargo) {
    throw new Error("El cargo seleccionado no existe para la empresa configurada");
  }

  return normalized;
}

async function validatePosicionDotacionId(posicionDotacionId: string | undefined, empresaId: string) {
  const normalized = normalizeText(posicionDotacionId);
  if (!normalized) return null;

  const posicion = await prisma.posicionDotacion.findFirst({
    where: {
      id: normalized,
      empresaId,
    },
    select: {
      id: true,
      centroTrabajoId: true,
      cargoId: true,
    },
  });

  if (!posicion) {
    throw new Error("La posicion de dotacion seleccionada no existe para la empresa configurada");
  }

  return posicion;
}

async function validateTrabajador(data: TrabajadorInput) {
  const nombres = normalizeText(data.nombres);
  const apellidos = normalizeText(data.apellidos);
  const rut = normalizeText(data.rut);
  const email = normalizeText(data.email);
  const telefono = normalizeText(data.telefono);
  const estado = normalizeText(data.estado) || "activo";
  const tipoContrato = normalizeText(data.tipoContrato);
  const jornada = normalizeText(data.jornada);

  if (!nombres) {
    throw new Error("Los nombres del trabajador son obligatorios");
  }

  if (!apellidos) {
    throw new Error("Los apellidos del trabajador son obligatorios");
  }

  const { empresaId } = await requirePermission("canUpdateTrabajador");
  let centroTrabajoId = await validateCentroTrabajoId(data.centroTrabajoId, empresaId);
  const areaId = await validateAreaId(data.areaId, empresaId);
  let cargoId = await validateCargoId(data.cargoId, empresaId);
  const posicionDotacion = await validatePosicionDotacionId(data.posicionDotacionId, empresaId);

  if (posicionDotacion) {
    if (centroTrabajoId && centroTrabajoId !== posicionDotacion.centroTrabajoId) {
      throw new Error("El centro del trabajador no coincide con el centro de la posicion seleccionada");
    }
    if (cargoId && cargoId !== posicionDotacion.cargoId) {
      throw new Error("El cargo del trabajador no coincide con el cargo de la posicion seleccionada");
    }

    if (!centroTrabajoId) {
      centroTrabajoId = posicionDotacion.centroTrabajoId;
    }
    if (!cargoId) {
      cargoId = posicionDotacion.cargoId;
    }
  }

  let fechaIngreso: Date | null = null;
  const fechaIngresoText = normalizeText(data.fechaIngreso);
  if (fechaIngresoText) {
    const parsed = new Date(fechaIngresoText);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error("La fecha de ingreso no es valida");
    }
    fechaIngreso = parsed;
  }

  return {
    centroTrabajoId,
    areaId,
    cargoId,
    posicionDotacionId: posicionDotacion?.id ?? null,
    nombres,
    apellidos,
    rut: rut || null,
    email: email || null,
    telefono: telefono || null,
    estado,
    fechaIngreso,
    tipoContrato: tipoContrato || null,
    jornada: jornada || null,
  };
}

async function ensureTrabajadorEmpresa(id: string) {
  const { empresaId } = await requirePermission("canUpdateTrabajador");

  const trabajador = await prisma.trabajador.findFirst({
    where: {
      id,
      empresaId,
    },
    select: { id: true },
  });

  if (!trabajador) {
    throw new Error("El trabajador no pertenece a la empresa configurada");
  }
}

function includeRelations() {
  return {
    centroTrabajo: {
      select: {
        id: true,
        nombre: true,
      },
    },
    area: {
      select: {
        id: true,
        nombre: true,
      },
    },
    cargo: {
      select: {
        id: true,
        nombre: true,
        esCritico: true,
        perfilSST: true,
        descripcion: true,
      },
    },
    posicionDotacion: {
      select: {
        id: true,
        centroTrabajo: {
          select: {
            nombre: true,
          },
        },
        cargo: {
          select: {
            nombre: true,
          },
        },
      },
    },
  } as const;
}

export async function getTrabajadores() {
  const { empresaId } = await requirePermission("canReadTrabajadores");

  return prisma.trabajador.findMany({
    where: { empresaId },
    include: includeRelations(),
    orderBy: { createdAt: "desc" },
  });
}

export async function crearTrabajador(data: TrabajadorInput) {
  const { empresaId } = await requirePermission("canCreateTrabajador");
  const payload = await validateTrabajador(data);

  return prisma.trabajador.create({
    data: {
      empresaId,
      centroTrabajoId: payload.centroTrabajoId,
      areaId: payload.areaId,
      cargoId: payload.cargoId,
      posicionDotacionId: payload.posicionDotacionId,
      nombres: payload.nombres,
      apellidos: payload.apellidos,
      rut: payload.rut,
      email: payload.email,
      telefono: payload.telefono,
      estado: payload.estado,
      fechaIngreso: payload.fechaIngreso,
      tipoContrato: payload.tipoContrato,
      jornada: payload.jornada,
    },
    include: includeRelations(),
  });
}

export async function actualizarTrabajador(id: string, data: TrabajadorInput) {
  await requirePermission("canUpdateTrabajador");
  await ensureTrabajadorEmpresa(id);
  const payload = await validateTrabajador(data);

  return prisma.trabajador.update({
    where: { id },
    data: {
      centroTrabajoId: payload.centroTrabajoId,
      areaId: payload.areaId,
      cargoId: payload.cargoId,
      posicionDotacionId: payload.posicionDotacionId,
      nombres: payload.nombres,
      apellidos: payload.apellidos,
      rut: payload.rut,
      email: payload.email,
      telefono: payload.telefono,
      estado: payload.estado,
      fechaIngreso: payload.fechaIngreso,
      tipoContrato: payload.tipoContrato,
      jornada: payload.jornada,
    },
    include: includeRelations(),
  });
}

export async function desactivarTrabajador(id: string) {
  await requirePermission("canDeactivateTrabajador");
  await ensureTrabajadorEmpresa(id);

  return prisma.trabajador.update({
    where: { id },
    data: {
      estado: "inactivo",
    },
    include: includeRelations(),
  });
}
