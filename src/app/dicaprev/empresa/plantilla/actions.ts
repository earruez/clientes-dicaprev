"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { PLANTILLAS, type PlantillaModo, type TipoEmpresa } from "@/lib/empresa/plantillas";
import { requirePermission } from "@/server/auth/permissions";

type AplicarPlantillaResult = {
  areasCreadas: number;
  cargosCreados: number;
};

async function eliminarCargosSinUso(empresaId: string) {
  const cargos = await prisma.cargo.findMany({
    where: { empresaId },
    select: {
      id: true,
      _count: {
        select: {
          trabajadores: true,
          posicionesDotacion: true,
          reglasDocumentoTrabajador: true,
          planCapacitacionItems: true,
          reglasCapacitacionCargo: true,
        },
      },
    },
  });

  const cargosEliminables = cargos
    .filter((cargo) => {
      const usoTotal =
        cargo._count.trabajadores +
        cargo._count.posicionesDotacion +
        cargo._count.reglasDocumentoTrabajador +
        cargo._count.planCapacitacionItems +
        cargo._count.reglasCapacitacionCargo;
      return usoTotal === 0;
    })
    .map((cargo) => cargo.id);

  if (cargosEliminables.length === 0) {
    return;
  }

  await prisma.cargo.deleteMany({
    where: {
      empresaId,
      id: { in: cargosEliminables },
    },
  });
}

async function eliminarAreasSinUso(empresaId: string) {
  const areas = await prisma.area.findMany({
    where: { empresaId },
    select: {
      id: true,
      _count: {
        select: {
          trabajadores: true,
          cargos: true,
          reglasDocumentoTrabajador: true,
          planCapacitacionItems: true,
          reglasCapacitacionCargo: true,
        },
      },
    },
  });

  const areasEliminables = areas
    .filter((area) => {
      const usoTotal =
        area._count.trabajadores +
        area._count.cargos +
        area._count.reglasDocumentoTrabajador +
        area._count.planCapacitacionItems +
        area._count.reglasCapacitacionCargo;
      return usoTotal === 0;
    })
    .map((area) => area.id);

  if (areasEliminables.length === 0) {
    return;
  }

  await prisma.area.deleteMany({
    where: {
      empresaId,
      id: { in: areasEliminables },
    },
  });
}

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
  const { empresaId } = await requirePermission("canManageEmpresa");
  const plantilla = getPlantilla(tipo);
  let areasCreadas = 0;
  let cargosCreados = 0;
  const areaIdByTemplateId = new Map<string, string>();

  if (modo === "reemplazar") {
    await eliminarCargosSinUso(empresaId);
    await eliminarAreasSinUso(empresaId);
  }

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
          perfilSstRequerido: cargo.riesgosClave || null,
          riesgosClave: cargo.riesgosClave
            ? cargo.riesgosClave
                .split(",")
                .map((item) => item.trim())
                .filter((item) => item.length > 0)
            : [],
          documentosBase: cargo.documentosBase,
          capacitacionesBase: cargo.capacitacionesBase,
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
