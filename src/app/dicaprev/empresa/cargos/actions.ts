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
  await requirePermission("canManageEmpresa");
  const payload = await validateCargo(data);

  return prisma.cargo.update({
    where: { id },
    data: {
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

export async function desactivarCargo(id: string) {
  await requirePermission("canManageEmpresa");
  return prisma.cargo.update({
    where: { id },
    data: {
      estado: "inactivo",
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
