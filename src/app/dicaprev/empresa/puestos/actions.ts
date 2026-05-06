"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/auth/permissions";
import type { Prisma } from "@prisma/client";

type PosicionInput = {
  centroTrabajoId: string;
  cargoId: string;
  cantidad?: number;
  estado?: string;
  esCritica?: boolean;
};

function normalizeText(value?: string) {
  return (value ?? "").trim();
}

async function validateCentroTrabajoId(centroTrabajoId: string, empresaId: string) {
  const normalized = normalizeText(centroTrabajoId);
  if (!normalized) {
    throw new Error("El centro de trabajo es obligatorio");
  }

  const centro = await prisma.centroTrabajo.findFirst({
    where: {
      id: normalized,
      empresaId,
    },
    select: { id: true },
  });

  if (!centro) {
    throw new Error("El centro de trabajo no pertenece a la empresa configurada");
  }

  return normalized;
}

async function validateCargoId(cargoId: string, empresaId: string) {
  const normalized = normalizeText(cargoId);
  if (!normalized) {
    throw new Error("El cargo es obligatorio");
  }

  const cargo = await prisma.cargo.findFirst({
    where: {
      id: normalized,
      empresaId,
    },
    select: { id: true },
  });

  if (!cargo) {
    throw new Error("El cargo no pertenece a la empresa configurada");
  }

  return normalized;
}

async function validatePosicion(
  data: PosicionInput,
  opts?: { currentId?: string }
) {
  const { empresaId } = await requirePermission("canManageEmpresa");
  const centroTrabajoId = await validateCentroTrabajoId(data.centroTrabajoId, empresaId);
  const cargoId = await validateCargoId(data.cargoId, empresaId);

  const cantidadRaw = data.cantidad ?? 1;
  const cantidad = Number.isFinite(cantidadRaw) ? Math.max(1, Math.floor(cantidadRaw)) : 1;

  const estado = normalizeText(data.estado) || "activa";
  const esCritica = Boolean(data.esCritica);

  const duplicated = await prisma.posicionDotacion.findFirst({
    where: {
      empresaId,
      centroTrabajoId,
      cargoId,
      id: opts?.currentId ? { not: opts.currentId } : undefined,
    },
    select: { id: true },
  });

  if (duplicated) {
    throw new Error("Ya existe una posicion para el mismo centro y cargo");
  }

  return {
    centroTrabajoId,
    cargoId,
    cantidad,
    estado,
    esCritica,
  };
}

async function ensurePosicionEmpresa(id: string) {
  const { empresaId } = await requirePermission("canManageEmpresa");

  const posicion = await prisma.posicionDotacion.findFirst({
    where: {
      id,
      empresaId,
    },
    select: { id: true },
  });

  if (!posicion) {
    throw new Error("La posicion no pertenece a la empresa configurada");
  }
}

const dotacionInclude = {
  centroTrabajo: {
    select: {
      id: true,
      nombre: true,
    },
  },
  cargo: {
    select: {
      id: true,
      nombre: true,
    },
  },
  trabajadores: {
    select: {
      id: true,
      nombres: true,
      apellidos: true,
      rut: true,
      estado: true,
    },
  },
} as const;

function includeRelations() {
  return dotacionInclude;
}

type DotacionRow = Prisma.PosicionDotacionGetPayload<{
  include: typeof dotacionInclude;
}>;

function mapDotacionWithMetrics(row: DotacionRow) {
  const trabajadoresAsignados = row.trabajadores;
  const asignados = trabajadoresAsignados.filter((trabajador) => trabajador.estado === "activo").length;
  const vacantes = row.cantidad - asignados;

  return {
    ...row,
    asignados,
    vacantes,
    trabajadoresAsignados,
  };
}

export async function getDotacion() {
  const { empresaId } = await requirePermission("canReadEmpresa");

  const rows = await prisma.posicionDotacion.findMany({
    where: { empresaId },
    include: includeRelations(),
    orderBy: { createdAt: "desc" },
  });

  return rows.map((row) => mapDotacionWithMetrics(row));
}

export async function crearPosicion(data: PosicionInput) {
  const { empresaId } = await requirePermission("canManageEmpresa");
  const payload = await validatePosicion(data);

  const created = await prisma.posicionDotacion.create({
    data: {
      empresaId,
      centroTrabajoId: payload.centroTrabajoId,
      cargoId: payload.cargoId,
      cantidad: payload.cantidad,
      estado: payload.estado,
      esCritica: payload.esCritica,
    },
    include: includeRelations(),
  });

  return mapDotacionWithMetrics(created);
}

export async function actualizarPosicion(id: string, data: PosicionInput) {
  await requirePermission("canManageEmpresa");
  await ensurePosicionEmpresa(id);
  const payload = await validatePosicion(data, { currentId: id });

  const updated = await prisma.posicionDotacion.update({
    where: { id },
    data: {
      centroTrabajoId: payload.centroTrabajoId,
      cargoId: payload.cargoId,
      cantidad: payload.cantidad,
      estado: payload.estado,
      esCritica: payload.esCritica,
    },
    include: includeRelations(),
  });

  return mapDotacionWithMetrics(updated);
}

export async function desactivarPosicion(id: string) {
  await requirePermission("canManageEmpresa");
  await ensurePosicionEmpresa(id);

  const updated = await prisma.posicionDotacion.update({
    where: { id },
    data: {
      estado: "inactiva",
    },
    include: includeRelations(),
  });

  return mapDotacionWithMetrics(updated);
}
