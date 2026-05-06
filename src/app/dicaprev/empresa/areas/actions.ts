"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/auth/permissions";

type AreaInput = {
  nombre: string;
  descripcion?: string;
  estado?: string;
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
  await requirePermission("canManageEmpresa");
  const payload = validateArea(data);

  return prisma.area.update({
    where: { id },
    data: {
      nombre: payload.nombre,
      descripcion: payload.descripcion,
      estado: payload.estado,
    },
  });
}

export async function desactivarArea(id: string) {
  await requirePermission("canManageEmpresa");
  return prisma.area.update({
    where: { id },
    data: {
      estado: "inactiva",
    },
  });
}
