"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/auth/permissions";

type EstadoDocumento = "vigente" | "pendiente" | "vencido" | "por-vencer";

function getEstadoDocumento(fechaVencimiento?: Date | null): EstadoDocumento {
  if (!fechaVencimiento) return "vigente";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(fechaVencimiento);
  due.setHours(0, 0, 0, 0);

  const diffMs = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "vencido";
  if (diffDays <= 30) return "por-vencer";
  return "vigente";
}

export type ResumenEmpresaKpis = {
  totalCentros: number;
  totalAreas: number;
  totalCargos: number;
  totalTrabajadoresActivos: number;
  totalPosicionesDotacion: number;
  totalPosicionesCubiertas: number;
  totalVacantes: number;
  cumplimientoDocumentalEmpresa: number;
  documentosVigentes: number;
  documentosPendientes: number;
  documentosVencidos: number;
  documentosPorVencer: number;
};

export type ResumenEmpresaResponse = {
  empresa: {
    id: string;
    nombre: string;
    rut: string;
    razonSocial: string;
    direccion: string;
    giro: string;
    comuna: string;
    region: string;
  };
  kpis: ResumenEmpresaKpis;
};

export async function getResumenEmpresa(): Promise<ResumenEmpresaResponse> {
  const { empresaId } = await requirePermission("canReadCumplimiento");

  const empresa = await prisma.empresa.findUnique({
    where: { id: empresaId },
    select: {
      id: true,
      nombre: true,
      rut: true,
      razonSocial: true,
      direccion: true,
      giro: true,
    },
  });

  if (!empresa) {
    throw new Error("No existe empresa configurada para resumen");
  }

  const [
    totalCentros,
    totalAreas,
    totalCargos,
    totalTrabajadoresActivos,
    posiciones,
    trabajadoresActivosConPosicion,
    requeridos,
    documentosEmpresa,
  ] = await Promise.all([
    prisma.centroTrabajo.count({ where: { empresaId } }),
    prisma.area.count({ where: { empresaId } }),
    prisma.cargo.count({ where: { empresaId } }),
    prisma.trabajador.count({ where: { empresaId, estado: "activo" } }),
    prisma.posicionDotacion.findMany({
      where: { empresaId, estado: { not: "inactiva" } },
      select: { id: true, cantidad: true },
    }),
    prisma.trabajador.findMany({
      where: {
        empresaId,
        estado: "activo",
        posicionDotacionId: { not: null },
      },
      select: { posicionDotacionId: true },
    }),
    prisma.documentoRequeridoEmpresa.findMany({
      where: { activo: true },
      select: { id: true },
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

  const totalPosicionesDotacion = posiciones.reduce((acc, pos) => acc + pos.cantidad, 0);

  const activosAsignadosPorPosicion = trabajadoresActivosConPosicion.reduce(
    (acc, worker) => {
      const key = worker.posicionDotacionId;
      if (!key) return acc;
      acc.set(key, (acc.get(key) ?? 0) + 1);
      return acc;
    },
    new Map<string, number>(),
  );

  const totalPosicionesCubiertas = posiciones.reduce((acc, pos) => {
    const asignados = activosAsignadosPorPosicion.get(pos.id) ?? 0;
    return acc + Math.min(pos.cantidad, asignados);
  }, 0);

  const totalVacantes = Math.max(totalPosicionesDotacion - totalPosicionesCubiertas, 0);

  // Evaluacion documental por documento requerido activo.
  const latestByRequerido = new Map<string, (typeof documentosEmpresa)[number]>();
  for (const doc of documentosEmpresa) {
    if (!doc.documentoRequeridoId) continue;
    if (!latestByRequerido.has(doc.documentoRequeridoId)) {
      latestByRequerido.set(doc.documentoRequeridoId, doc);
    }
  }

  let documentosVigentes = 0;
  let documentosPendientes = 0;
  let documentosVencidos = 0;
  let documentosPorVencer = 0;

  for (const requerido of requeridos) {
    const doc = latestByRequerido.get(requerido.id);
    const hasFile = Boolean(doc && (doc.archivoNombre || doc.archivoUrl));

    if (!doc || !hasFile) {
      documentosPendientes += 1;
      continue;
    }

    const estado = getEstadoDocumento(doc.fechaVencimiento);
    if (estado === "vigente") documentosVigentes += 1;
    else if (estado === "vencido") documentosVencidos += 1;
    else if (estado === "por-vencer") documentosPorVencer += 1;
  }

  const totalRequeridos = requeridos.length;
  const cumplimientoDocumentalEmpresa =
    totalRequeridos > 0
      ? Math.round(((documentosVigentes + documentosPorVencer) / totalRequeridos) * 100)
      : 100;

  return {
    empresa: {
      id: empresa.id,
      nombre: empresa.nombre,
      rut: empresa.rut ?? "",
      razonSocial: empresa.razonSocial ?? empresa.nombre,
      direccion: empresa.direccion ?? "",
      giro: empresa.giro ?? "",
      comuna: "",
      region: "",
    },
    kpis: {
      totalCentros,
      totalAreas,
      totalCargos,
      totalTrabajadoresActivos,
      totalPosicionesDotacion,
      totalPosicionesCubiertas,
      totalVacantes,
      cumplimientoDocumentalEmpresa,
      documentosVigentes,
      documentosPendientes,
      documentosVencidos,
      documentosPorVencer,
    },
  };
}
