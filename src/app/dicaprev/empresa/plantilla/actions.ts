"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { PLANTILLAS, type PlantillaModo, type TipoEmpresa } from "@/lib/empresa/plantillas";
import { requirePermission } from "@/server/auth/permissions";

type AplicarPlantillaResult = {
  areasCreadas: number;
  cargosCreados: number;
};

function getPlantilla(tipo: TipoEmpresa) {
  const plantilla = PLANTILLAS[tipo];

  if (!plantilla) {
    throw new Error("La plantilla seleccionada no existe");
  }

  return plantilla;
}

export async function aplicarPlantillaInicialEmpresa(
  tipo: TipoEmpresa,
  modo: PlantillaModo,
): Promise<AplicarPlantillaResult> {
  if (modo !== "agregar") {
    throw new Error("El modo reemplazar queda pendiente para evitar afectar áreas o cargos existentes");
  }

  const { empresaId } = await requirePermission("canManageEmpresa");
  const plantilla = getPlantilla(tipo);
  let areasCreadas = 0;
  let cargosCreados = 0;
  const areaIdByTemplateId = new Map<string, string>();

  for (const area of plantilla.areas) {
    const existing = await prisma.area.findFirst({
      where: {
        empresaId,
        nombre: area.nombre,
      },
      select: { id: true },
    });

    if (existing) {
      areaIdByTemplateId.set(area.id, existing.id);
      continue;
    }

    const created = await prisma.area.create({
      data: {
        empresaId,
        nombre: area.nombre,
        descripcion: area.descripcion || null,
        estado: "activa",
      },
      select: { id: true },
    });

    areasCreadas += 1;
    areaIdByTemplateId.set(area.id, created.id);
  }

  for (const cargo of plantilla.cargos) {
    const existing = await prisma.cargo.findFirst({
      where: {
        empresaId,
        nombre: cargo.nombre,
      },
      select: { id: true },
    });

    if (existing) {
      continue;
    }

    await prisma.cargo.create({
      data: {
        empresaId,
        nombre: cargo.nombre,
        areaId: areaIdByTemplateId.get(cargo.areaId) ?? null,
        descripcion: cargo.riesgosClave || null,
        perfilSST: cargo.riesgosClave || null,
        estado: "activo",
        esCritico: cargo.requiereDS44,
      },
    });

    cargosCreados += 1;
  }

  revalidatePath("/dicaprev/empresa");
  revalidatePath("/dicaprev/empresa/areas");
  revalidatePath("/dicaprev/empresa/cargos");
  revalidatePath("/dicaprev/empresa/puestos");
  revalidatePath("/dicaprev/trabajadores");

  return { areasCreadas, cargosCreados };
}
