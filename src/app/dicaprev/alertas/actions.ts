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

  const [totalTrabajadores, requeridos, documentos, documentosVehiculo] = await Promise.all([
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
    prisma.vehiculoDocumento.findMany({
      where: {
        empresaId,
        fechaVencimiento: { not: null },
        estado: { not: "no_aplica" },
      },
      select: {
        id: true,
        fechaVencimiento: true,
        tipo: true,
        tipoDocumento: { select: { nombre: true } },
        vehiculo: {
          select: {
            id: true,
            patente: true,
            marca: true,
            modelo: true,
            responsableTrabajador: {
              select: { nombres: true, apellidos: true },
            },
          },
        },
      },
    }),
  ]);

  const alertas = getAlertasCumplimiento(requeridos, documentos, totalTrabajadores);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  for (const documento of documentosVehiculo) {
    if (!documento.fechaVencimiento) continue;
    const vence = new Date(documento.fechaVencimiento);
    vence.setHours(0, 0, 0, 0);
    const dias = Math.ceil((vence.getTime() - hoy.getTime()) / 86_400_000);
    if (dias > 20) continue;

    const nombreDoc = documento.tipoDocumento?.nombre ?? documento.tipo;
    const vehiculoNombre = `${documento.vehiculo.marca} ${documento.vehiculo.modelo} (${documento.vehiculo.patente})`;
    const responsable = documento.vehiculo.responsableTrabajador
      ? `${documento.vehiculo.responsableTrabajador.nombres} ${documento.vehiculo.responsableTrabajador.apellidos}`.trim()
      : null;

    alertas.push({
      id: `vehiculo-${documento.id}`,
      tipo: dias < 0 ? "vencido" : "por_vencer",
      documento: `${nombreDoc} · ${vehiculoNombre}`,
      mensaje:
        dias < 0
          ? `${nombreDoc} venció hace ${Math.abs(dias)} día${Math.abs(dias) === 1 ? "" : "s"}.${responsable ? ` Responsable: ${responsable}.` : ""}`
          : `${nombreDoc} vence en ${dias} día${dias === 1 ? "" : "s"}.${responsable ? ` Responsable: ${responsable}.` : ""}`,
      prioridad: dias < 0 || dias <= 15 ? "alta" : "media",
      fecha: documento.fechaVencimiento.toISOString().slice(0, 10),
      href: `/dicaprev/empresa/vehiculos`,
    });
  }

  alertas.sort((a, b) => {
    const orden = { alta: 0, media: 1, baja: 2 } as const;
    const diff = orden[a.prioridad] - orden[b.prioridad];
    return diff !== 0 ? diff : a.fecha.localeCompare(b.fecha);
  });

  return {
    total: alertas.length,
    altas: alertas.filter((a) => a.prioridad === "alta").length,
    medias: alertas.filter((a) => a.prioridad === "media").length,
    bajas: alertas.filter((a) => a.prioridad === "baja").length,
    alertas,
  };
}
