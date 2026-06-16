"use server";

import { prisma } from "@/lib/prisma";

/**
 * Asegura que una empresa tenga los datos base mínimos necesarios
 * para que los módulos funcionen correctamente, incluso con BD vacía.
 *
 * Idempotente: puede llamarse múltiples veces sin duplicar datos.
 */
export async function asegurarDatosBaseEmpresa(empresaId: string) {
  // 1. Validar que la empresa existe
  const empresa = await prisma.empresa.findUnique({
    where: { id: empresaId },
    select: {
      id: true,
      nombre: true,
      cantidadTrabajadores: true,
      activa: true,
    },
  });

  if (!empresa) {
    throw new Error("Empresa no encontrada");
  }

  // 2. Asegurar que cantidadTrabajadores sea un número válido (no null)
  if (empresa.cantidadTrabajadores === null || empresa.cantidadTrabajadores === undefined) {
    await prisma.empresa.update({
      where: { id: empresaId },
      data: { cantidadTrabajadores: 0 },
    });
  }

  // 3. Asegurar que la empresa está activa
  if (!empresa.activa) {
    await prisma.empresa.update({
      where: { id: empresaId },
      data: { activa: true },
    });
  }

  // 4. Asegurar que existe al menos un CentroTrabajo
  const centrosCount = await prisma.centroTrabajo.count({
    where: { empresaId },
  });

  if (centrosCount === 0) {
    await prisma.centroTrabajo.create({
      data: {
        empresaId,
        nombre: "Casa matriz / Principal",
        tipo: "Casa Matriz",
        estado: "activo",
        direccion: "Por definir",
        comuna: "Por definir",
        region: "Por definir",
      },
    });
  }

  // 5. Asegurar que los módulos base están creados
  // (La lista de módulos está en COMPANY_MODULES)
  const { COMPANY_MODULES } = await import("@/lib/company-modules");
  for (const modulo of COMPANY_MODULES) {
    await prisma.empresaModulo.upsert({
      where: {
        empresaId_modulo: {
          empresaId,
          modulo,
        },
      },
      create: {
        empresaId,
        modulo,
        activo: true,
      },
      update: {
        activo: true,
      },
    });
  }
}
