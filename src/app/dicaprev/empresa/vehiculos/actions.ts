"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/auth/permissions";
import {
  DOCS_REQUERIDOS,
  type TipoDocumento,
  type TipoVehiculo,
} from "./domain";

// ── Types ───────────────────────────────────────────────────────────────── //

export type VehiculoDTO = {
  id: string;
  patente: string;
  codigoInterno: string | null;
  tipo: string;
  marca: string;
  modelo: string;
  anio: number | null;
  estado: string;
  responsable: string | null;
  centroTrabajoId: string | null;
  centroNombre: string | null;
  proximaRevision: string | null;
  kilometraje: number | null;
  observaciones: string | null;
  createdAt: string;
  documentos: VehiculoDocumentoDTO[];
};

export type VehiculoDocumentoDTO = {
  tipo: TipoDocumento;
  subido: boolean;
  vencimiento: string | null;
  archivoNombre: string | null;
  archivoUrl: string | null;
};

export type MantencionEstado = "completada" | "pendiente" | "programada";

export type VehiculoMantencionDTO = {
  id: string;
  tipo: string;
  fecha: string;
  estado: MantencionEstado;
  observaciones: string | null;
  kilometraje: number | null;
};

export type CentroItem = {
  id: string;
  nombre: string;
};

export type VehiculoInput = {
  patente: string;
  codigoInterno: string;
  tipo: string;
  marca: string;
  modelo: string;
  anio: number;
  centroTrabajoId: string;
  responsable: string;
  estado: string;
  proximaRevision: string;
  kilometraje: number;
  observaciones: string;
};

export type DocumentoVehiculoInput = {
  tipo: TipoDocumento;
  subido: boolean;
  vencimiento: string;
  archivoNombre?: string;
  archivoUrl?: string;
};

export type MantencionVehiculoInput = {
  tipo: string;
  fecha: string;
  estado: MantencionEstado;
  observaciones: string;
  kilometraje: number;
};

// ── Helpers ─────────────────────────────────────────────────────────────── //

function toDTO(v: {
  id: string;
  patente: string;
  codigoInterno: string | null;
  tipo: string;
  marca: string;
  modelo: string;
  anio: number | null;
  estado: string;
  responsable: string | null;
  centroTrabajoId: string | null;
  centroTrabajo: { nombre: string } | null;
  proximaRevision: string | null;
  kilometraje: number | null;
  observaciones: string | null;
  createdAt: Date;
  documentos: {
    tipo: string;
    subido: boolean;
    vencimiento: string | null;
    archivoNombre: string | null;
    archivoUrl: string | null;
  }[];
}): VehiculoDTO {
  return {
    id: v.id,
    patente: v.patente,
    codigoInterno: v.codigoInterno,
    tipo: v.tipo,
    marca: v.marca,
    modelo: v.modelo,
    anio: v.anio,
    estado: v.estado,
    responsable: v.responsable,
    centroTrabajoId: v.centroTrabajoId,
    centroNombre: v.centroTrabajo?.nombre ?? null,
    proximaRevision: v.proximaRevision,
    kilometraje: v.kilometraje,
    observaciones: v.observaciones,
    createdAt: v.createdAt.toISOString(),
    documentos: v.documentos.map((d) => ({
      tipo: d.tipo as TipoDocumento,
      subido: d.subido,
      vencimiento: d.vencimiento,
      archivoNombre: d.archivoNombre,
      archivoUrl: d.archivoUrl,
    })),
  };
}

function getRequiredDocsForTipo(tipo: string): TipoDocumento[] {
  const key = tipo as TipoVehiculo;
  return DOCS_REQUERIDOS[key] ?? [];
}

async function ensureRequiredDocs(vehiculoId: string, tipo: string): Promise<void> {
  const required = getRequiredDocsForTipo(tipo);
  if (required.length === 0) return;

  const existing = await prisma.vehiculoDocumento.findMany({
    where: { vehiculoId },
    select: { tipo: true },
  });
  const existingSet = new Set(existing.map((d) => d.tipo));

  const missing = required.filter((doc) => !existingSet.has(doc));
  if (missing.length === 0) return;

  await prisma.vehiculoDocumento.createMany({
    data: missing.map((tipoDocumento) => ({
      vehiculoId,
      tipo: tipoDocumento,
      subido: false,
      vencimiento: null,
    })),
    skipDuplicates: true,
  });
}

const INCLUDE = {
  centroTrabajo: { select: { nombre: true } },
  documentos: {
    select: {
      tipo: true,
      subido: true,
      vencimiento: true,
      archivoNombre: true,
      archivoUrl: true,
    },
  },
} as const;

// ── Actions ─────────────────────────────────────────────────────────────── //

export async function getVehiculos(): Promise<VehiculoDTO[]> {
  const { empresaId } = await requirePermission("canReadEmpresa");

  const rows = await prisma.vehiculo.findMany({
    where: { empresaId },
    include: INCLUDE,
    orderBy: { createdAt: "asc" },
  });

  return rows.map(toDTO);
}

export async function getVehiculoById(id: string): Promise<VehiculoDTO | null> {
  const { empresaId } = await requirePermission("canReadEmpresa");

  const row = await prisma.vehiculo.findFirst({
    where: { id, empresaId },
    include: INCLUDE,
  });

  if (!row) return null;

  await ensureRequiredDocs(row.id, row.tipo);

  const refreshed = await prisma.vehiculo.findUniqueOrThrow({
    where: { id: row.id },
    include: INCLUDE,
  });

  return toDTO(refreshed);
}

export async function getCentrosList(): Promise<CentroItem[]> {
  const { empresaId } = await requirePermission("canReadEmpresa");

  const centros = await prisma.centroTrabajo.findMany({
    where: { empresaId },
    select: { id: true, nombre: true },
    orderBy: { nombre: "asc" },
  });

  return centros;
}

export async function crearVehiculo(data: VehiculoInput): Promise<VehiculoDTO> {
  const { empresaId } = await requirePermission("canManageEmpresa");

  const v = await prisma.vehiculo.create({
    data: {
      empresaId,
      patente: data.patente,
      codigoInterno: data.codigoInterno || null,
      tipo: data.tipo,
      marca: data.marca,
      modelo: data.modelo,
      anio: data.anio,
      centroTrabajoId: data.centroTrabajoId || null,
      responsable: data.responsable || null,
      estado: data.estado,
      proximaRevision: data.proximaRevision || null,
      kilometraje: data.kilometraje,
      observaciones: data.observaciones || null,
      documentos: {
        create: getRequiredDocsForTipo(data.tipo).map((doc) => ({
          tipo: doc,
          subido: false,
          vencimiento: null,
        })),
      },
    },
    include: INCLUDE,
  });

  return toDTO(v);
}

export async function actualizarVehiculo(
  id: string,
  data: VehiculoInput
): Promise<VehiculoDTO> {
  const { empresaId } = await requirePermission("canManageEmpresa");

  const v = await prisma.vehiculo.update({
    where: { id, empresaId },
    data: {
      patente: data.patente,
      codigoInterno: data.codigoInterno || null,
      tipo: data.tipo,
      marca: data.marca,
      modelo: data.modelo,
      anio: data.anio,
      centroTrabajoId: data.centroTrabajoId || null,
      responsable: data.responsable || null,
      estado: data.estado,
      proximaRevision: data.proximaRevision || null,
      kilometraje: data.kilometraje,
      observaciones: data.observaciones || null,
    },
    include: INCLUDE,
  });

  await ensureRequiredDocs(v.id, data.tipo);

  const refreshed = await prisma.vehiculo.findUniqueOrThrow({
    where: { id: v.id },
    include: INCLUDE,
  });

  return toDTO(refreshed);
}

export async function getVehiculoDetalle(id: string): Promise<{
  documentos: VehiculoDocumentoDTO[];
  mantenciones: VehiculoMantencionDTO[];
}> {
  const { empresaId } = await requirePermission("canReadEmpresa");

  const vehiculo = await prisma.vehiculo.findFirst({
    where: { id, empresaId },
    select: {
      id: true,
      tipo: true,
      documentos: {
        select: {
          tipo: true,
          subido: true,
          vencimiento: true,
          archivoNombre: true,
          archivoUrl: true,
        },
      },
      mantenciones: {
        select: {
          id: true,
          tipo: true,
          fecha: true,
          estado: true,
          observaciones: true,
          kilometraje: true,
        },
        orderBy: { fecha: "desc" },
      },
    },
  });

  if (!vehiculo) {
    throw new Error("Vehículo no encontrado");
  }

  await ensureRequiredDocs(vehiculo.id, vehiculo.tipo);

  const finalVehiculo = await prisma.vehiculo.findUniqueOrThrow({
    where: { id: vehiculo.id },
    select: {
      documentos: {
        select: {
          tipo: true,
          subido: true,
          vencimiento: true,
          archivoNombre: true,
          archivoUrl: true,
        },
      },
      mantenciones: {
        select: {
          id: true,
          tipo: true,
          fecha: true,
          estado: true,
          observaciones: true,
          kilometraje: true,
        },
        orderBy: { fecha: "desc" },
      },
    },
  });

  return {
    documentos: finalVehiculo.documentos.map((d) => ({
      tipo: d.tipo as TipoDocumento,
      subido: d.subido,
      vencimiento: d.vencimiento,
      archivoNombre: d.archivoNombre,
      archivoUrl: d.archivoUrl,
    })),
    mantenciones: finalVehiculo.mantenciones.map((m) => ({
      id: m.id,
      tipo: m.tipo,
      fecha: m.fecha,
      estado: m.estado as MantencionEstado,
      observaciones: m.observaciones,
      kilometraje: m.kilometraje,
    })),
  };
}

export async function getVehiculoDocumentos(id: string): Promise<VehiculoDocumentoDTO[]> {
  const detalle = await getVehiculoDetalle(id);
  return detalle.documentos;
}

export async function getVehiculoMantenciones(id: string): Promise<VehiculoMantencionDTO[]> {
  const detalle = await getVehiculoDetalle(id);
  return detalle.mantenciones;
}

export async function upsertVehiculoDocumento(
  vehiculoId: string,
  data: DocumentoVehiculoInput
): Promise<VehiculoDocumentoDTO> {
  const { empresaId } = await requirePermission("canManageEmpresa");

  const vehiculo = await prisma.vehiculo.findFirst({
    where: { id: vehiculoId, empresaId },
    select: { id: true },
  });
  if (!vehiculo) throw new Error("Vehículo no encontrado");

  const doc = await prisma.vehiculoDocumento.upsert({
    where: {
      vehiculoId_tipo: {
        vehiculoId,
        tipo: data.tipo,
      },
    },
    update: {
      subido: data.subido,
      vencimiento: data.vencimiento || null,
      archivoNombre: data.archivoNombre || null,
      archivoUrl: data.archivoUrl || null,
    },
    create: {
      vehiculoId,
      tipo: data.tipo,
      subido: data.subido,
      vencimiento: data.vencimiento || null,
      archivoNombre: data.archivoNombre || null,
      archivoUrl: data.archivoUrl || null,
    },
  });

  return {
    tipo: doc.tipo as TipoDocumento,
    subido: doc.subido,
    vencimiento: doc.vencimiento,
    archivoNombre: doc.archivoNombre,
    archivoUrl: doc.archivoUrl,
  };
}

export async function crearMantencionVehiculo(
  vehiculoId: string,
  data: MantencionVehiculoInput
): Promise<VehiculoMantencionDTO> {
  const { empresaId } = await requirePermission("canManageEmpresa");

  const vehiculo = await prisma.vehiculo.findFirst({
    where: { id: vehiculoId, empresaId },
    select: { id: true },
  });
  if (!vehiculo) throw new Error("Vehículo no encontrado");

  const mantencion = await prisma.vehiculoMantencion.create({
    data: {
      vehiculoId,
      tipo: data.tipo,
      fecha: data.fecha,
      estado: data.estado,
      observaciones: data.observaciones || null,
      kilometraje: data.kilometraje || null,
    },
  });

  if (data.kilometraje > 0) {
    await prisma.vehiculo.update({
      where: { id: vehiculoId },
      data: { kilometraje: data.kilometraje },
    });
  }

  return {
    id: mantencion.id,
    tipo: mantencion.tipo,
    fecha: mantencion.fecha,
    estado: mantencion.estado as MantencionEstado,
    observaciones: mantencion.observaciones,
    kilometraje: mantencion.kilometraje,
  };
}
