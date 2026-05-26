"use server";

import { prisma } from "@/lib/prisma";
import { calcularCumplimientoEmpresa } from "@/lib/documentacion/cumplimiento-empresa";
import { requirePermission } from "@/server/auth/permissions";

type DashboardEstadoDocumento = {
  total: number;
  completos: number;
  pendientes: number;
  vencidos: number;
  porcentaje: number;
};

type DashboardAcreditacionReciente = {
  id: string;
  mandante: string;
  proyecto: string;
  estado: string;
  progreso: number;
  faltantes: number;
  updatedAt: string;
};

type DashboardHallazgoReciente = {
  id: string;
  descripcion: string;
  prioridad: string;
  estado: string;
  centroNombre: string;
  fechaCompromiso: string;
};

export type DashboardEjecutivoResponse = {
  empresa: {
    id: string;
    nombre: string;
  };
  actualizadoEl: string;
  kpis: {
    cumplimientoGeneral: number | null;
    totalTrabajadores: number;
    trabajadoresActivos: number;
    totalVehiculos: number;
    acreditacionesActivas: number;
    documentosPendientes: number;
    documentosVencidos: number;
  };
  documentos: {
    empresa: DashboardEstadoDocumento;
    trabajadores: DashboardEstadoDocumento;
    vehiculos: DashboardEstadoDocumento;
  };
  acreditaciones: {
    activas: number;
    enPreparacion: number;
    conFaltantes: number;
    recientes: DashboardAcreditacionReciente[];
  };
  hallazgos: {
    abiertos: number;
    criticos: number;
    recientes: DashboardHallazgoReciente[];
  } | null;
};

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function isExpired(fechaVencimiento?: Date | null) {
  if (!fechaVencimiento) return false;
  return fechaVencimiento.getTime() < startOfToday().getTime();
}

function porcentajeResumen(resumen: Omit<DashboardEstadoDocumento, "porcentaje">) {
  if (resumen.total === 0) return 0;
  return Math.round((resumen.completos / resumen.total) * 100);
}

function normalizeWorkerDocEstado(estado?: string | null) {
  const normalized = (estado ?? "").trim().toLowerCase();
  if (normalized === "aprobado") return "completo";
  if (normalized === "completo" || normalized === "vigente") return "completo";
  if (normalized === "firmado") return "completo";
  if (normalized === "validado") return "completo";
  if (normalized === "vencido") return "vencido";
  if (normalized === "no_aplica") return "no_aplica";
  if (normalized === "en_revision") return "pendiente";
  if (normalized === "rechazado") return "pendiente";
  return "pendiente";
}

function normalizeVehiculoDocEstado(estado?: string | null) {
  const normalized = (estado ?? "").trim().toLowerCase();
  if (normalized === "completo" || normalized === "vigente" || normalized === "aprobado") return "completo";
  if (normalized === "vencido") return "vencido";
  if (normalized === "no_aplica") return "no_aplica";
  return "pendiente";
}

function formatAcreditacionEstado(estado: string) {
  if (estado === "en_preparacion") return "En preparación";
  if (estado === "listo_para_enviar") return "Lista para enviar";
  if (estado === "enviado") return "Enviada";
  if (estado === "observada") return "Observada";
  if (estado === "aprobado") return "Aprobada";
  if (estado === "rechazado") return "Rechazada";
  if (estado === "cerrada") return "Cerrada";
  if (estado === "vencido") return "Vencida";
  return estado;
}

function formatHallazgoEstado(estado: string) {
  if (estado === "abierto") return "Abierto";
  if (estado === "en_seguimiento") return "En seguimiento";
  if (estado === "en_proceso") return "En proceso";
  if (estado === "resuelto") return "Resuelto";
  if (estado === "cerrado") return "Cerrado";
  return estado;
}

function formatPrioridad(prioridad: string) {
  if (prioridad === "critica") return "Crítica";
  if (prioridad === "alta") return "Alta";
  if (prioridad === "media") return "Media";
  if (prioridad === "baja") return "Baja";
  return prioridad;
}

export async function getDashboardEjecutivo(): Promise<DashboardEjecutivoResponse> {
  const { empresaId } = await requirePermission("canReadCumplimiento");

  const [
    empresa,
    cumplimiento,
    totalTrabajadores,
    trabajadoresActivos,
    totalVehiculos,
    requeridosEmpresa,
    documentosEmpresa,
    documentosTrabajadores,
    documentosVehiculos,
    acreditacionesActivas,
    acreditacionesEnPreparacion,
    acreditacionesConFaltantes,
    acreditacionesRecientes,
    hallazgosAbiertos,
    hallazgosCriticos,
    hallazgosRecientes,
  ] = await Promise.all([
    prisma.empresa.findUniqueOrThrow({
      where: { id: empresaId },
      select: { id: true, nombre: true },
    }),
    calcularCumplimientoEmpresa({ empresaId }).catch(() => null),
    prisma.trabajador.count({ where: { empresaId } }),
    prisma.trabajador.count({ where: { empresaId, estado: "activo" } }),
    prisma.vehiculo.count({ where: { empresaId } }),
    prisma.documentoRequeridoEmpresa.findMany({
      where: { activo: true },
      select: { id: true },
      orderBy: { orden: "asc" },
    }),
    prisma.documentoEmpresa.findMany({
      where: { empresaId },
      select: {
        documentoRequeridoId: true,
        archivoNombre: true,
        archivoUrl: true,
        fechaVencimiento: true,
        updatedAt: true,
      },
      orderBy: [{ updatedAt: "desc" }],
    }),
    prisma.trabajadorDocumento.findMany({
      where: { empresaId, esVigente: true },
      select: { estado: true, fechaVencimiento: true },
    }),
    prisma.vehiculoDocumento.findMany({
      where: { empresaId },
      select: { estado: true, fechaVencimiento: true },
    }),
    prisma.acreditacion.count({
      where: {
        empresaId,
        estado: { in: ["en_preparacion", "listo_para_enviar", "enviado", "observada", "aprobado"] },
      },
    }),
    prisma.acreditacion.count({ where: { empresaId, estado: "en_preparacion" } }),
    prisma.acreditacion.count({ where: { empresaId, documentos: { some: { estado: "faltante" } } } }),
    prisma.acreditacion.findMany({
      where: { empresaId },
      select: {
        id: true,
        estado: true,
        updatedAt: true,
        nombreProyecto: true,
        obraFaena: true,
        mandante: { select: { nombre: true } },
        documentos: { select: { estado: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    prisma.hallazgoCumplimiento.count({
      where: { empresaId, estado: { in: ["abierto", "en_seguimiento", "en_proceso"] } },
    }),
    prisma.hallazgoCumplimiento.count({
      where: {
        empresaId,
        estado: { in: ["abierto", "en_seguimiento", "en_proceso"] },
        prioridad: "critica",
      },
    }),
    prisma.hallazgoCumplimiento.findMany({
      where: { empresaId, estado: { in: ["abierto", "en_seguimiento", "en_proceso"] } },
      select: {
        id: true,
        descripcion: true,
        prioridad: true,
        estado: true,
        fechaCompromiso: true,
        centroTrabajo: { select: { nombre: true } },
      },
      orderBy: [{ prioridad: "asc" }, { fechaCompromiso: "asc" }, { createdAt: "desc" }],
      take: 5,
    }),
  ]);

  const latestEmpresaByRequerido = new Map<string, (typeof documentosEmpresa)[number]>();
  for (const doc of documentosEmpresa) {
    if (!doc.documentoRequeridoId) continue;
    if (!latestEmpresaByRequerido.has(doc.documentoRequeridoId)) {
      latestEmpresaByRequerido.set(doc.documentoRequeridoId, doc);
    }
  }

  let empresaCompletos = 0;
  let empresaPendientes = 0;
  let empresaVencidos = 0;
  for (const requerido of requeridosEmpresa) {
    const doc = latestEmpresaByRequerido.get(requerido.id);
    const hasFile = Boolean(doc && (doc.archivoNombre || doc.archivoUrl));
    if (!doc || !hasFile) {
      empresaPendientes += 1;
      continue;
    }
    if (isExpired(doc.fechaVencimiento)) {
      empresaVencidos += 1;
      continue;
    }
    empresaCompletos += 1;
  }

  const empresaResumenBase = {
    total: requeridosEmpresa.length,
    completos: empresaCompletos,
    pendientes: empresaPendientes,
    vencidos: empresaVencidos,
  };

  let trabajadoresCompletos = 0;
  let trabajadoresPendientes = 0;
  let trabajadoresVencidos = 0;
  for (const doc of documentosTrabajadores) {
    const estado = normalizeWorkerDocEstado(doc.estado);
    if (estado === "no_aplica") continue;
    if (isExpired(doc.fechaVencimiento) || estado === "vencido") {
      trabajadoresVencidos += 1;
      continue;
    }
    if (estado === "completo") {
      trabajadoresCompletos += 1;
      continue;
    }
    trabajadoresPendientes += 1;
  }

  const trabajadoresResumenBase = {
    total: trabajadoresCompletos + trabajadoresPendientes + trabajadoresVencidos,
    completos: trabajadoresCompletos,
    pendientes: trabajadoresPendientes,
    vencidos: trabajadoresVencidos,
  };

  let vehiculosCompletos = 0;
  let vehiculosPendientes = 0;
  let vehiculosVencidos = 0;
  for (const doc of documentosVehiculos) {
    const estado = normalizeVehiculoDocEstado(doc.estado);
    if (estado === "no_aplica") continue;
    if (isExpired(doc.fechaVencimiento) || estado === "vencido") {
      vehiculosVencidos += 1;
      continue;
    }
    if (estado === "completo") {
      vehiculosCompletos += 1;
      continue;
    }
    vehiculosPendientes += 1;
  }

  const vehiculosResumenBase = {
    total: vehiculosCompletos + vehiculosPendientes + vehiculosVencidos,
    completos: vehiculosCompletos,
    pendientes: vehiculosPendientes,
    vencidos: vehiculosVencidos,
  };

  return {
    empresa: {
      id: empresa.id,
      nombre: empresa.nombre,
    },
    actualizadoEl: new Date().toISOString(),
    kpis: {
      cumplimientoGeneral: cumplimiento?.porcentajeCumplimiento ?? null,
      totalTrabajadores,
      trabajadoresActivos,
      totalVehiculos,
      acreditacionesActivas,
      documentosPendientes:
        empresaResumenBase.pendientes + trabajadoresResumenBase.pendientes + vehiculosResumenBase.pendientes,
      documentosVencidos:
        empresaResumenBase.vencidos + trabajadoresResumenBase.vencidos + vehiculosResumenBase.vencidos,
    },
    documentos: {
      empresa: { ...empresaResumenBase, porcentaje: porcentajeResumen(empresaResumenBase) },
      trabajadores: { ...trabajadoresResumenBase, porcentaje: porcentajeResumen(trabajadoresResumenBase) },
      vehiculos: { ...vehiculosResumenBase, porcentaje: porcentajeResumen(vehiculosResumenBase) },
    },
    acreditaciones: {
      activas: acreditacionesActivas,
      enPreparacion: acreditacionesEnPreparacion,
      conFaltantes: acreditacionesConFaltantes,
      recientes: acreditacionesRecientes.map((item) => {
        const totalDocs = item.documentos.length;
        const completos = item.documentos.filter((doc) => doc.estado === "completo").length;
        const faltantes = item.documentos.filter((doc) => doc.estado === "faltante").length;
        const progreso = totalDocs > 0 ? Math.round((completos / totalDocs) * 100) : 0;

        return {
          id: item.id,
          mandante: item.mandante.nombre,
          proyecto: item.nombreProyecto ?? item.obraFaena ?? "Sin proyecto",
          estado: formatAcreditacionEstado(item.estado),
          progreso,
          faltantes,
          updatedAt: item.updatedAt.toISOString(),
        };
      }),
    },
    hallazgos: {
      abiertos: hallazgosAbiertos,
      criticos: hallazgosCriticos,
      recientes: hallazgosRecientes.map((item) => ({
        id: item.id,
        descripcion: item.descripcion,
        prioridad: formatPrioridad(item.prioridad),
        estado: formatHallazgoEstado(item.estado),
        centroNombre: item.centroTrabajo?.nombre ?? "Sin centro",
        fechaCompromiso: item.fechaCompromiso.toISOString(),
      })),
    },
  };
}