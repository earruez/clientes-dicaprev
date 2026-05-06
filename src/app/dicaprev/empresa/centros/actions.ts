"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/auth/permissions";

export type CentroTrabajoInput = {
  nombre: string;
  direccion: string;
  comuna: string;
  region: string;
  tipo: string;
  estado: string;
};

function normalizeText(value: string) {
  return value.trim();
}

function validateCentro(data: CentroTrabajoInput) {
  const nombre = normalizeText(data.nombre);
  const direccion = normalizeText(data.direccion);
  const comuna = normalizeText(data.comuna);
  const region = normalizeText(data.region);
  const tipo = normalizeText(data.tipo);
  const estado = normalizeText(data.estado);

  if (!nombre) throw new Error("El nombre es obligatorio");
  if (!comuna) throw new Error("La comuna es obligatoria");
  if (!region) throw new Error("La region es obligatoria");
  if (!tipo) throw new Error("El tipo es obligatorio");
  if (!estado) throw new Error("El estado es obligatorio");

  return {
    nombre,
    direccion,
    comuna,
    region,
    tipo,
    estado,
  };
}

export async function getCentrosTrabajo() {
  const { empresaId } = await requirePermission("canReadEmpresa");

  return prisma.centroTrabajo.findMany({
    where: { empresaId },
    orderBy: { createdAt: "desc" },
  });
}

export async function crearCentroTrabajo(data: CentroTrabajoInput) {
  const { empresaId } = await requirePermission("canManageEmpresa");
  const payload = validateCentro(data);

  return prisma.centroTrabajo.create({
    data: {
      empresaId,
      nombre: payload.nombre,
      direccion: payload.direccion,
      comuna: payload.comuna,
      region: payload.region,
      tipo: payload.tipo,
      estado: payload.estado,
    },
  });
}

export async function actualizarCentroTrabajo(id: string, data: CentroTrabajoInput) {
  await requirePermission("canManageEmpresa");
  const payload = validateCentro(data);

  return prisma.centroTrabajo.update({
    where: { id },
    data: {
      nombre: payload.nombre,
      direccion: payload.direccion,
      comuna: payload.comuna,
      region: payload.region,
      tipo: payload.tipo,
      estado: payload.estado,
    },
  });
}

export async function desactivarCentroTrabajo(id: string) {
  await requirePermission("canManageEmpresa");
  return prisma.centroTrabajo.update({
    where: { id },
    data: { estado: "inactivo" },
  });
}
