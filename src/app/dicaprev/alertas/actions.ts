"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/auth/permissions";
import { estadoEfectivo, faltaMigracionContratistas } from "@/lib/contratistas/requisitos";
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

  const [totalTrabajadores, requeridos, documentos, documentosVehiculo, documentosContratistas] = await Promise.all([
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
    prisma.contratistaRequisito.findMany({
      where: { empresaId, solicitud: { estado: { not: "cerrada" } } },
      select: {
        id: true, nombre: true, estado: true, obligatorio: true,
        fechaVencimiento: true, archivoNombre: true,
        solicitud: { select: { nombre: true, contratista: { select: { nombre: true } } } },
      },
    }).catch((error: unknown) => {
      if (faltaMigracionContratistas(error)) return [];
      throw error;
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

  for (const documento of documentosContratistas) {
    const estado = estadoEfectivo(documento.estado, documento.fechaVencimiento);
    const vence = documento.fechaVencimiento ? new Date(documento.fechaVencimiento) : null;
    if (vence) vence.setHours(0, 0, 0, 0);
    const dias = vence ? Math.ceil((vence.getTime() - hoy.getTime()) / 86_400_000) : null;
    const requiereRevision = documento.estado === "en_revision";
    const requiereCorreccion = ["observado", "rechazado", "vencido"].includes(estado);
    const proximo = dias !== null && dias >= 0 && dias <= 30;
    if (!requiereRevision && !requiereCorreccion && !proximo) continue;
    const titulo = `${documento.nombre} · ${documento.solicitud.contratista.nombre}`;
    const mensaje = requiereRevision ? `Documento listo para revisión en ${documento.solicitud.nombre}.`
      : estado === "vencido" ? `Documento vencido en ${documento.solicitud.nombre}.`
      : requiereCorreccion ? `Documento ${estado} en ${documento.solicitud.nombre}.`
      : `Documento vence en ${dias} días (${documento.solicitud.nombre}).`;
    alertas.push({
      id: `contratista-${documento.id}`,
      tipo: requiereRevision ? "pendiente" : requiereCorreccion || (dias !== null && dias < 0) ? "vencido" : "por_vencer",
      documento: titulo,
      mensaje,
      prioridad: requiereCorreccion || requiereRevision || (dias !== null && dias <= 15) ? "alta" : "media",
      fecha: (documento.fechaVencimiento || new Date()).toISOString().slice(0, 10),
      href: "/dicaprev/contratistas/solicitudes",
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
