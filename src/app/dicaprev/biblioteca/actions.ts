"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/auth/permissions";

/**
 * Unified document type for biblioteca that aggregates all document sources.
 * This is the single source of truth for displaying documents across the system.
 */
export interface DocumentoUnificado {
  id: string;
  nombre: string;
  categoria: "empresa" | "trabajador" | "sst" | "vehiculo" | "anexo";
  aplicaA: "empresa" | "trabajador" | "vehiculo";
  tipo: string;
  estado: "completo" | "vencido" | "faltante" | "vigente" | "por_vencer" | "pendiente_carga" | "no_aplica";
  fechaEmision?: string;
  fechaVencimiento?: string;
  tieneVencimiento: boolean;
  archivoUrl?: string;
  nombreArchivo?: string;
  observaciones?: string;
  titularNombre?: string;
  titularId?: string;
  vehiculoPatente?: string;
  vehiculoId?: string;
  creadoEl: string;
  reusableEnAcreditaciones: boolean;
  sistemaOrigen: "empresa_db" | "trabajador_db" | "vehiculo_db";
}

/**
 * Fetch all documents from the unified biblioteca, pulling from:
 * - DocumentoEmpresa (empresa documents)
 * - TrabajadorDocumento (worker documents)
 * - VehiculoDocumento (vehicle documents)
 *
 * Returns normalized DocumentoUnificado[] for consistent UI display.
 */
export async function obtenerLibriaDocumentalUnificada(): Promise<DocumentoUnificado[]> {
  const { empresaId } = await requirePermission("canReadEmpresa");

  const [docsEmpresa, docsTrabajadores, docsVehiculos] = await Promise.all([
    // Fetch company documents
    prisma.documentoEmpresa.findMany({
      where: { empresaId },
      select: {
        id: true,
        nombre: true,
        categoria: true,
        tipo: true,
        estado: true,
        fechaEmision: true,
        fechaVencimiento: true,
        tieneVencimiento: true,
        archivoUrl: true,
        archivoNombre: true,
        observaciones: true,
        createdAt: true,
      },
    }),

    // Fetch worker documents
    prisma.trabajadorDocumento.findMany({
      where: { empresaId },
      select: {
        id: true,
        nombre: true,
        categoria: true,
        tipo: true,
        estado: true,
        fechaEmision: true,
        fechaVencimiento: true,
        tieneVencimiento: true,
        archivoUrl: true,
        archivoNombre: true,
        observaciones: true,
        createdAt: true,
        trabajador: {
          select: {
            id: true,
            nombres: true,
            apellidos: true,
          },
        },
      },
    }),

    // Fetch vehicle documents (joined with vehicle data)
    prisma.vehiculoDocumento.findMany({
      where: {
        vehiculo: {
          empresaId,
        },
      },
      select: {
        id: true,
        tipo: true,
        subido: true,
        vencimiento: true,
        archivoUrl: true,
        archivoNombre: true,
        createdAt: true,
        vehiculo: {
          select: {
            id: true,
            patente: true,
          },
        },
      },
    }),
  ]);

  // Normalize estado labels across sources
  const normalizeEstado = (
    original: string,
    hasFile: boolean,
    vencimiento?: string
  ): DocumentoUnificado["estado"] => {
    const today = new Date("2026-05-06"); // Use consistent date
    const vcto = vencimiento ? new Date(vencimiento) : null;
    const isExpired = vcto && vcto < today;
    const daysUntilExpired = vcto ? Math.ceil((vcto.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;
    const expiringSoon = daysUntilExpired && daysUntilExpired <= 30;

    // Map original estados
    if (original === "completo") return "completo";
    if (original === "vigente") return "completo";
    if (original === "vencido") return "vencido";
    if (original === "faltante") return "faltante";
    if (isExpired) return "vencido";
    if (expiringSoon) return "por_vencer";
    if (original === "por_vencer") return "por_vencer";
    if (original === "pendiente_carga" || !hasFile) return "pendiente_carga";
    if (original === "no_aplica") return "no_aplica";
    return "completo";
  };

  const result: DocumentoUnificado[] = [];

  // Add empresa documents
  docsEmpresa.forEach((doc) => {
    result.push({
      id: doc.id,
      nombre: doc.nombre,
      categoria: (doc.categoria as "empresa" | "sst") || "empresa",
      aplicaA: "empresa",
      tipo: doc.tipo || "",
      estado: normalizeEstado(doc.estado, !!doc.archivoUrl, doc.fechaVencimiento?.toISOString()),
      fechaEmision: doc.fechaEmision?.toISOString(),
      fechaVencimiento: doc.fechaVencimiento?.toISOString(),
      tieneVencimiento: doc.tieneVencimiento,
      archivoUrl: doc.archivoUrl ?? undefined,
      nombreArchivo: doc.archivoNombre ?? undefined,
      observaciones: doc.observaciones ?? undefined,
      creadoEl: doc.createdAt.toISOString(),
      reusableEnAcreditaciones: true,
      sistemaOrigen: "empresa_db",
    });
  });

  // Add trabajador documents
  docsTrabajadores.forEach((doc) => {
    result.push({
      id: doc.id,
      nombre: doc.nombre,
      categoria: (doc.categoria as "trabajador") || "trabajador",
      aplicaA: "trabajador",
      tipo: doc.tipo,
      estado: normalizeEstado(doc.estado, !!doc.archivoUrl, doc.fechaVencimiento?.toISOString()),
      fechaEmision: doc.fechaEmision?.toISOString(),
      fechaVencimiento: doc.fechaVencimiento?.toISOString(),
      tieneVencimiento: doc.tieneVencimiento,
      archivoUrl: doc.archivoUrl ?? undefined,
      nombreArchivo: doc.archivoNombre ?? undefined,
      observaciones: doc.observaciones ?? undefined,
      titularNombre: `${doc.trabajador?.nombres} ${doc.trabajador?.apellidos}`,
      titularId: doc.trabajador?.id,
      creadoEl: doc.createdAt.toISOString(),
      reusableEnAcreditaciones: false,
      sistemaOrigen: "trabajador_db",
    });
  });

  // Add vehiculo documents
  docsVehiculos.forEach((doc) => {
    result.push({
      id: doc.id,
      nombre: `${doc.tipo} - ${doc.vehiculo?.patente}`,
      categoria: ("vehiculo" as const),
      aplicaA: "vehiculo",
      tipo: doc.tipo,
      estado: normalizeEstado(doc.subido ? "completo" : "faltante", doc.subido, doc.vencimiento ?? undefined),
      fechaVencimiento: doc.vencimiento ?? undefined,
      tieneVencimiento: !!doc.vencimiento,
      archivoUrl: doc.archivoUrl ?? undefined,
      nombreArchivo: doc.archivoNombre ?? undefined,
      vehiculoPatente: doc.vehiculo?.patente,
      vehiculoId: doc.vehiculo?.id,
      creadoEl: doc.createdAt.toISOString(),
      reusableEnAcreditaciones: false,
      sistemaOrigen: "vehiculo_db",
    });
  });

  return result;
}

/**
 * Get documents filtered by aplicaA (target type: empresa, trabajador, or vehiculo)
 */
export async function obtenerDocumentosPool(aplicaA?: "empresa" | "trabajador" | "vehiculo") {
  const docs = await obtenerLibriaDocumentalUnificada();
  return aplicaA ? docs.filter((d) => d.aplicaA === aplicaA) : docs;
}

/**
 * Get aggregated statistics for biblioteca display
 */
export async function obtenerEstadisticasBiblioteca() {
  const docs = await obtenerLibriaDocumentalUnificada();

  const total = docs.length;
  const completo = docs.filter((d) => d.estado === "completo" || d.estado === "vigente").length;
  const vencido = docs.filter((d) => d.estado === "vencido").length;
  const porVencer = docs.filter((d) => d.estado === "por_vencer").length;
  const faltante = docs.filter((d) => d.estado === "faltante" || d.estado === "pendiente_carga").length;

  return {
    total,
    completo,
    vencido,
    porVencer,
    faltante,
    byCategory: {
      empresa: docs.filter((d) => d.aplicaA === "empresa").length,
      trabajador: docs.filter((d) => d.aplicaA === "trabajador").length,
      vehiculo: docs.filter((d) => d.aplicaA === "vehiculo").length,
      sst: docs.filter((d) => d.categoria === "sst").length,
    },
  };
}
