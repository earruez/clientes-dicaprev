"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/auth/permissions";
import {
  getAlertasCumplimiento,
  type AlertaCumplimiento,
} from "@/lib/alertas/cumplimiento-alertas";

export type AlertasEmpresaResponse = {
  total: number;
  altas: number;
  medias: number;
  bajas: number;
  alertas: AlertaCumplimiento[];
};

export async function getAlertasEmpresa(): Promise<AlertasEmpresaResponse> {
  const { empresaId } = await requirePermission("canReadAlertas");

  const [totalTrabajadores, requeridos, documentos] = await Promise.all([
    prisma.trabajador.count({ where: { empresaId, estado: "activo" } }),
    prisma.documentoRequeridoEmpresa.findMany({
      where: { activo: true },
      select: {
        id: true,
        nombre: true,
        obligatorio: true,
        aplicaDesdeTrabajadores: true,
        aplicaHastaTrabajadores: true,
        activo: true,
      },
      orderBy: { orden: "asc" },
    }),
    prisma.documentoEmpresa.findMany({
      where: { empresaId },
      select: {
        id: true,
        documentoRequeridoId: true,
        archivoNombre: true,
        archivoUrl: true,
        fechaVencimiento: true,
        updatedAt: true,
      },
      orderBy: [{ updatedAt: "desc" }],
    }),
  ]);

  const alertas = getAlertasCumplimiento(requeridos, documentos, totalTrabajadores);

  return {
    total: alertas.length,
    altas: alertas.filter((a) => a.prioridad === "alta").length,
    medias: alertas.filter((a) => a.prioridad === "media").length,
    bajas: alertas.filter((a) => a.prioridad === "baja").length,
    alertas,
  };
}
