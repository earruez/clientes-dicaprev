"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/auth/permissions";

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
  updatedAt: string;
  documentos: VehiculoDocumentoDTO[];
};

export type EstadoDocumentoVehiculo =
  | "pendiente"
  | "en_revision"
  | "completo"
  | "vencido"
  | "rechazado"
  | "no_aplica";

export type VehiculoDocumentoDTO = {
  id: string;
  vehiculoId: string;
  tipo: string;
  tipoDocumentoId: string | null;
  tipoCodigo: string;
  tipoNombre: string;
  requiereVencimiento: boolean;
  requiereArchivo: boolean;
  estado: EstadoDocumentoVehiculo;
  subido: boolean;
  vencimiento: string | null;
  fechaEmision: string | null;
  fechaVencimiento: string | null;
  archivoNombre: string | null;
  archivoNombreOriginal: string | null;
  archivoUrl: string | null;
  archivoTipo: string | null;
  archivoPeso: number | null;
  observaciones: string | null;
  subidoPorId: string | null;
  createdAt: string;
  updatedAt: string;
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

export type VehiculoAcreditacionRelacionDTO = {
  id: string;
  mandante: string;
  proyecto: string;
  estado: string;
  updatedAt: string;
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
  documentoId?: string; // ID del VehiculoDocumento existente (lookup directo)
  vehiculoId?: string;
  tipoDocumentoId?: string;
  tipoCodigo?: string;
  tipo?: string;
  estado?: EstadoDocumentoVehiculo;
  subido?: boolean;
  vencimiento?: string;
  fechaEmision?: string;
  fechaVencimiento?: string;
  archivoNombre?: string;
  archivoNombreOriginal?: string;
  archivoUrl?: string;
  archivoTipo?: string;
  archivoPeso?: number;
  observaciones?: string;
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
  updatedAt: Date;
  documentos: {
    id: string;
    vehiculoId: string;
    tipo: string;
    tipoDocumentoId: string | null;
    tipoDocumento: {
      id: string;
      codigo: string;
      nombre: string;
      requiereVencimiento: boolean;
      requiereArchivo: boolean;
    } | null;
    estado: string;
    subido: boolean;
    vencimiento: string | null;
    fechaEmision: Date | null;
    fechaVencimiento: Date | null;
    archivoNombre: string | null;
    archivoNombreOriginal: string | null;
    archivoUrl: string | null;
    archivoTipo: string | null;
    archivoPeso: number | null;
    observaciones: string | null;
    subidoPorId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }[];
}): VehiculoDTO {
  const documentos = v.documentos.map((d) => {
    const tipoCodigo = d.tipoDocumento?.codigo ?? d.tipo;
    const tipoNombre = d.tipoDocumento?.nombre ?? d.tipo;
    return {
      id: d.id,
      vehiculoId: d.vehiculoId,
      tipo: d.tipo,
      tipoDocumentoId: d.tipoDocumentoId,
      tipoCodigo,
      tipoNombre,
      requiereVencimiento: d.tipoDocumento?.requiereVencimiento ?? true,
      requiereArchivo: d.tipoDocumento?.requiereArchivo ?? true,
      estado: normalizeEstadoDocumento(d.estado),
      subido: d.subido,
      vencimiento: d.vencimiento,
      fechaEmision: toDateString(d.fechaEmision),
      fechaVencimiento: toDateString(d.fechaVencimiento),
      archivoNombre: d.archivoNombre,
      archivoNombreOriginal: d.archivoNombreOriginal,
      archivoUrl: d.archivoUrl,
      archivoTipo: d.archivoTipo,
      archivoPeso: d.archivoPeso,
      observaciones: d.observaciones,
      subidoPorId: d.subidoPorId,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    };
  });

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
    updatedAt: v.updatedAt.toISOString(),
    documentos,
  };
}

function toDateString(date: Date | null | undefined) {
  return date ? date.toISOString().slice(0, 10) : null;
}

function parseOptionalDate(value?: string) {
  if (!value || !value.trim()) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Fecha invalida: ${value}`);
  }
  return parsed;
}

function normalizeCodigo(value: string | null | undefined) {
  return (value ?? "").trim().toUpperCase();
}

function normalizeEstadoDocumento(value: string | null | undefined): EstadoDocumentoVehiculo {
  const normalized = (value ?? "").trim().toLowerCase();
  if (normalized === "en_revision") return "en_revision";
  if (normalized === "completo" || normalized === "vigente" || normalized === "aprobado") return "completo";
  if (normalized === "vencido") return "vencido";
  if (normalized === "rechazado") return "rechazado";
  if (normalized === "no_aplica") return "no_aplica";
  return "pendiente";
}

function evaluarEstadoDocumento(args: {
  estadoActual?: string | null;
  subido?: boolean;
  fechaVencimiento?: Date | null;
  requiereVencimiento?: boolean;
  requiereArchivo?: boolean;
  archivoUrl?: string | null;
}) {
  const estado = normalizeEstadoDocumento(args.estadoActual);

  if (estado === "rechazado" || estado === "no_aplica" || estado === "en_revision") {
    return estado;
  }

  const hasFile = Boolean(args.archivoUrl);
  const requiereArchivo = args.requiereArchivo ?? true;
  if (requiereArchivo && !hasFile && !args.subido) {
    return "pendiente";
  }

  const requiereVencimiento = args.requiereVencimiento ?? true;
  if (requiereVencimiento) {
    if (!args.fechaVencimiento) {
      return hasFile || args.subido ? "completo" : "pendiente";
    }
    if (args.fechaVencimiento.getTime() < Date.now()) {
      return "vencido";
    }
  }

  return hasFile || args.subido ? "completo" : "pendiente";
}

export async function getTiposDocumentoVehiculo() {
  const { empresaId } = await requirePermission("canReadEmpresa");

  return prisma.documentoTipoVehiculo.findMany({
    where: { empresaId, activo: true },
    orderBy: { nombre: "asc" },
    select: {
      id: true,
      codigo: true,
      nombre: true,
      descripcion: true,
      requiereVencimiento: true,
      requiereArchivo: true,
      vigenciaDias: true,
      activo: true,
    },
  });
}

async function ensureRequiredDocs(vehiculoId: string, empresaId: string): Promise<void> {
  const tipos = await prisma.documentoTipoVehiculo.findMany({
    where: { empresaId, activo: true },
    select: {
      id: true,
      codigo: true,
    },
    orderBy: { nombre: "asc" },
  });

  if (tipos.length === 0) return;

  const existing = await prisma.vehiculoDocumento.findMany({
    where: { vehiculoId },
    select: { tipo: true, tipoDocumentoId: true },
  });

  const existingByTipoCodigo = new Set(existing.map((d) => normalizeCodigo(d.tipo)));
  const existingByTipoId = new Set(existing.map((d) => d.tipoDocumentoId).filter(Boolean));

  const missing = tipos.filter((tipo) => {
    if (existingByTipoId.has(tipo.id)) return false;
    if (existingByTipoCodigo.has(normalizeCodigo(tipo.codigo))) return false;
    return true;
  });

  if (missing.length === 0) return;

  await prisma.vehiculoDocumento.createMany({
    data: missing.map((tipoDocumento) => ({
      empresaId,
      vehiculoId,
      tipo: tipoDocumento.codigo,
      tipoDocumentoId: tipoDocumento.id,
      estado: "pendiente",
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
      id: true,
      vehiculoId: true,
      tipo: true,
      tipoDocumentoId: true,
      tipoDocumento: {
        select: {
          id: true,
          codigo: true,
          nombre: true,
          requiereVencimiento: true,
          requiereArchivo: true,
        },
      },
      estado: true,
      subido: true,
      vencimiento: true,
      fechaEmision: true,
      fechaVencimiento: true,
      archivoNombre: true,
      archivoNombreOriginal: true,
      archivoUrl: true,
      archivoTipo: true,
      archivoPeso: true,
      observaciones: true,
      subidoPorId: true,
      createdAt: true,
      updatedAt: true,
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

  await ensureRequiredDocs(row.id, empresaId);

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
    },
    include: INCLUDE,
  });

  await ensureRequiredDocs(v.id, empresaId);

  const refreshed = await prisma.vehiculo.findUniqueOrThrow({
    where: { id: v.id },
    include: INCLUDE,
  });

  return toDTO(refreshed);
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

  await ensureRequiredDocs(v.id, empresaId);

  const refreshed = await prisma.vehiculo.findUniqueOrThrow({
    where: { id: v.id },
    include: INCLUDE,
  });

  return toDTO(refreshed);
}

export async function eliminarVehiculo(id: string): Promise<void> {
  const { empresaId } = await requirePermission("canManageEmpresa");
  await prisma.vehiculo.delete({ where: { id, empresaId } });
}

export async function evaluarDocumentosVehiculo(vehiculoId: string) {
  const { empresaId } = await requirePermission("canManageEmpresa");

  const vehiculo = await prisma.vehiculo.findFirst({
    where: { id: vehiculoId, empresaId },
    select: { id: true },
  });

  if (!vehiculo) {
    throw new Error("Vehiculo no encontrado");
  }

  await ensureRequiredDocs(vehiculo.id, empresaId);

  const documentos = await prisma.vehiculoDocumento.findMany({
    where: { empresaId, vehiculoId },
    include: {
      tipoDocumento: {
        select: {
          id: true,
          codigo: true,
          nombre: true,
          requiereVencimiento: true,
          requiereArchivo: true,
        },
      },
    },
  });

  for (const doc of documentos) {
    const nextEstado = evaluarEstadoDocumento({
      estadoActual: doc.estado,
      subido: doc.subido,
      fechaVencimiento: doc.fechaVencimiento,
      requiereVencimiento: doc.tipoDocumento?.requiereVencimiento,
      requiereArchivo: doc.tipoDocumento?.requiereArchivo,
      archivoUrl: doc.archivoUrl,
    });

    if (nextEstado !== normalizeEstadoDocumento(doc.estado)) {
      await prisma.vehiculoDocumento.update({
        where: { id: doc.id },
        data: {
          estado: nextEstado,
        },
      });
    }
  }

  return getDocumentosVehiculo(vehiculoId);
}

export async function getVehiculoDetalle(id: string): Promise<{
  documentos: VehiculoDocumentoDTO[];
  mantenciones: VehiculoMantencionDTO[];
  acreditaciones: VehiculoAcreditacionRelacionDTO[];
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
      acreditacionesVehiculo: {
        select: {
          acreditacion: {
            select: {
              id: true,
              estado: true,
              updatedAt: true,
              nombreProyecto: true,
              obraFaena: true,
              mandante: {
                select: {
                  nombre: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!vehiculo) {
    throw new Error("Vehículo no encontrado");
  }

  await ensureRequiredDocs(vehiculo.id, empresaId);

  const finalVehiculo = await prisma.vehiculo.findUniqueOrThrow({
    where: { id: vehiculo.id },
    select: {
      documentos: {
        select: {
          id: true,
          vehiculoId: true,
          tipo: true,
          tipoDocumentoId: true,
          tipoDocumento: {
            select: {
              id: true,
              codigo: true,
              nombre: true,
              requiereVencimiento: true,
              requiereArchivo: true,
            },
          },
          estado: true,
          subido: true,
          vencimiento: true,
          fechaEmision: true,
          fechaVencimiento: true,
          archivoNombre: true,
          archivoNombreOriginal: true,
          archivoUrl: true,
          archivoTipo: true,
          archivoPeso: true,
          observaciones: true,
          subidoPorId: true,
          createdAt: true,
          updatedAt: true,
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
      acreditacionesVehiculo: {
        select: {
          acreditacion: {
            select: {
              id: true,
              estado: true,
              updatedAt: true,
              nombreProyecto: true,
              obraFaena: true,
              mandante: {
                select: {
                  nombre: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  return {
    documentos: finalVehiculo.documentos.map((d) => ({
      id: d.id,
      vehiculoId: d.vehiculoId,
      tipo: d.tipo,
      tipoDocumentoId: d.tipoDocumentoId,
      tipoCodigo: d.tipoDocumento?.codigo ?? d.tipo,
      tipoNombre: d.tipoDocumento?.nombre ?? d.tipo,
      requiereVencimiento: d.tipoDocumento?.requiereVencimiento ?? true,
      requiereArchivo: d.tipoDocumento?.requiereArchivo ?? true,
      estado: normalizeEstadoDocumento(d.estado),
      subido: d.subido,
      vencimiento: d.vencimiento,
      fechaEmision: toDateString(d.fechaEmision),
      fechaVencimiento: toDateString(d.fechaVencimiento),
      archivoNombre: d.archivoNombre,
      archivoNombreOriginal: d.archivoNombreOriginal,
      archivoUrl: d.archivoUrl,
      archivoTipo: d.archivoTipo,
      archivoPeso: d.archivoPeso,
      observaciones: d.observaciones,
      subidoPorId: d.subidoPorId,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    })),
    mantenciones: finalVehiculo.mantenciones.map((m) => ({
      id: m.id,
      tipo: m.tipo,
      fecha: m.fecha,
      estado: m.estado as MantencionEstado,
      observaciones: m.observaciones,
      kilometraje: m.kilometraje,
    })),
    acreditaciones: finalVehiculo.acreditacionesVehiculo.map((item) => ({
      id: item.acreditacion.id,
      mandante: item.acreditacion.mandante.nombre,
      proyecto: item.acreditacion.nombreProyecto ?? item.acreditacion.obraFaena ?? "Sin proyecto",
      estado: item.acreditacion.estado,
      updatedAt: item.acreditacion.updatedAt.toISOString(),
    })),
  };
}

export async function getVehiculoDocumentos(id: string): Promise<VehiculoDocumentoDTO[]> {
  const detalle = await getVehiculoDetalle(id);
  return detalle.documentos;
}

export async function getDocumentosVehiculo(vehiculoId: string): Promise<VehiculoDocumentoDTO[]> {
  return getVehiculoDocumentos(vehiculoId);
}

export async function getVehiculoMantenciones(id: string): Promise<VehiculoMantencionDTO[]> {
  const detalle = await getVehiculoDetalle(id);
  return detalle.mantenciones;
}

export async function upsertVehiculoDocumento(
  vehiculoId: string,
  data: DocumentoVehiculoInput
): Promise<VehiculoDocumentoDTO> {
  const payload: DocumentoVehiculoInput = {
    ...data,
    vehiculoId,
    tipo: data.tipo,
  };

  return crearOActualizarDocumentoVehiculo(payload);
}

export async function crearOActualizarDocumentoVehiculo(
  data: DocumentoVehiculoInput
): Promise<VehiculoDocumentoDTO> {
  const { empresaId, usuarioId } = await requirePermission("canManageEmpresa");

  const vehiculoId = data.vehiculoId;
  if (!vehiculoId) {
    throw new Error("vehiculoId es obligatorio");
  }

  const vehiculo = await prisma.vehiculo.findFirst({
    where: { id: vehiculoId, empresaId },
    select: { id: true },
  });
  if (!vehiculo) throw new Error("Vehículo no encontrado");

  let tipoDocumento = null as {
    id: string;
    codigo: string;
    nombre: string;
    requiereVencimiento: boolean;
    requiereArchivo: boolean;
  } | null;

  if (data.tipoDocumentoId) {
    tipoDocumento = await prisma.documentoTipoVehiculo.findFirst({
      where: { id: data.tipoDocumentoId, empresaId, activo: true },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        requiereVencimiento: true,
        requiereArchivo: true,
      },
    });
  } else if (data.tipoCodigo) {
    tipoDocumento = await prisma.documentoTipoVehiculo.findFirst({
      where: { empresaId, codigo: normalizeCodigo(data.tipoCodigo), activo: true },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        requiereVencimiento: true,
        requiereArchivo: true,
      },
    });
  }

  const tipo = normalizeCodigo(tipoDocumento?.codigo ?? data.tipo ?? data.tipoCodigo);
  if (!tipo) {
    throw new Error("Debes indicar un tipo de documento vehicular");
  }

  const fechaEmision = parseOptionalDate(data.fechaEmision);
  const fechaVencimiento = parseOptionalDate(data.fechaVencimiento ?? data.vencimiento);
  const subido = data.subido ?? Boolean(data.archivoUrl);

  const estado = evaluarEstadoDocumento({
    estadoActual: data.estado,
    subido,
    fechaVencimiento,
    requiereVencimiento: tipoDocumento?.requiereVencimiento,
    requiereArchivo: tipoDocumento?.requiereArchivo,
    archivoUrl: data.archivoUrl,
  });

  // Buscar registro existente: primero por documentoId explícito, luego por tipo
  let existing: { id: string; tipoDocumentoId: string | null } | null = null;

  if (data.documentoId) {
    existing = await prisma.vehiculoDocumento.findFirst({
      where: { id: data.documentoId, empresaId, vehiculoId },
      select: { id: true, tipoDocumentoId: true },
    });
  }

  if (!existing) {
    // Buscar por tipoDocumentoId resuelto (si lo tenemos) o por tipo (código)
    const whereConditions: Array<{ tipoDocumentoId?: string; tipo?: string }> = [];
    if (tipoDocumento?.id) {
      whereConditions.push({ tipoDocumentoId: tipoDocumento.id });
    }
    if (tipo) {
      whereConditions.push({ tipo });
    }
    if (whereConditions.length > 0) {
      existing = await prisma.vehiculoDocumento.findFirst({
        where: { empresaId, vehiculoId, OR: whereConditions },
        select: { id: true, tipoDocumentoId: true },
      });
    }
  }

  // El tipoDocumentoId a usar: el resuelto, o el que ya tenía el registro existente (nunca null si el existente ya tenía uno)
  const resolvedTipoDocumentoId = tipoDocumento?.id ?? existing?.tipoDocumentoId ?? null;

  // Guardia: no crear registros huérfanos sin tipoDocumentoId
  if (!existing && resolvedTipoDocumentoId === null) {
    throw new Error(
      "No se puede crear un documento vehicular sin tipoDocumentoId. Indica tipoDocumentoId, tipoCodigo o documenta el tipo correctamente."
    );
  }

  const doc = existing
    ? await prisma.vehiculoDocumento.update({
        where: { id: existing.id },
        data: {
          tipo,
          tipoDocumentoId: resolvedTipoDocumentoId,
          subido,
          estado,
          vencimiento: data.vencimiento || data.fechaVencimiento || null,
          fechaEmision,
          fechaVencimiento,
          archivoNombre: data.archivoNombre?.trim() || null,
          archivoNombreOriginal: data.archivoNombreOriginal?.trim() || null,
          archivoUrl: data.archivoUrl?.trim() || null,
          archivoTipo: data.archivoTipo?.trim() || null,
          archivoPeso: data.archivoPeso ?? null,
          observaciones: data.observaciones?.trim() || null,
          subidoPorId: subido ? usuarioId : null,
        },
      })
    : await prisma.vehiculoDocumento.create({
        data: {
          empresaId,
          vehiculoId,
          tipo,
          tipoDocumentoId: resolvedTipoDocumentoId,
          subido,
          estado,
          vencimiento: data.vencimiento || data.fechaVencimiento || null,
          fechaEmision,
          fechaVencimiento,
          archivoNombre: data.archivoNombre?.trim() || null,
          archivoNombreOriginal: data.archivoNombreOriginal?.trim() || null,
          archivoUrl: data.archivoUrl?.trim() || null,
          archivoTipo: data.archivoTipo?.trim() || null,
          archivoPeso: data.archivoPeso ?? null,
          observaciones: data.observaciones?.trim() || null,
          subidoPorId: subido ? usuarioId : null,
        },
      });

  const hydrated = await prisma.vehiculoDocumento.findUniqueOrThrow({
    where: { id: doc.id },
    include: {
      tipoDocumento: {
        select: {
          id: true,
          codigo: true,
          nombre: true,
          requiereVencimiento: true,
          requiereArchivo: true,
        },
      },
    },
  });

  return {
    id: hydrated.id,
    vehiculoId: hydrated.vehiculoId,
    tipo: hydrated.tipo,
    tipoDocumentoId: hydrated.tipoDocumentoId,
    tipoCodigo: hydrated.tipoDocumento?.codigo ?? hydrated.tipo,
    tipoNombre: hydrated.tipoDocumento?.nombre ?? hydrated.tipo,
    requiereVencimiento: hydrated.tipoDocumento?.requiereVencimiento ?? true,
    requiereArchivo: hydrated.tipoDocumento?.requiereArchivo ?? true,
    estado: normalizeEstadoDocumento(hydrated.estado),
    subido: hydrated.subido,
    vencimiento: hydrated.vencimiento,
    fechaEmision: toDateString(hydrated.fechaEmision),
    fechaVencimiento: toDateString(hydrated.fechaVencimiento),
    archivoNombre: hydrated.archivoNombre,
    archivoNombreOriginal: hydrated.archivoNombreOriginal,
    archivoUrl: hydrated.archivoUrl,
    archivoTipo: hydrated.archivoTipo,
    archivoPeso: hydrated.archivoPeso,
    observaciones: hydrated.observaciones,
    subidoPorId: hydrated.subidoPorId,
    createdAt: hydrated.createdAt.toISOString(),
    updatedAt: hydrated.updatedAt.toISOString(),
  };
}

export async function cambiarEstadoDocumentoVehiculo(
  id: string,
  estado: EstadoDocumentoVehiculo
): Promise<VehiculoDocumentoDTO> {
  const { empresaId } = await requirePermission("canManageEmpresa");

  const doc = await prisma.vehiculoDocumento.findFirst({
    where: { id, empresaId },
    select: { id: true, vehiculoId: true },
  });

  if (!doc) {
    throw new Error("Documento de vehiculo no encontrado");
  }

  await prisma.vehiculoDocumento.update({
    where: { id },
    data: { estado },
  });

  const docs = await getDocumentosVehiculo(doc.vehiculoId);
  const updated = docs.find((item) => item.id === id);
  if (!updated) {
    throw new Error("No se pudo recuperar el documento actualizado");
  }

  return updated;
}

export async function eliminarDocumentoVehiculo(id: string): Promise<void> {
  const { empresaId } = await requirePermission("canManageEmpresa");
  const doc = await prisma.vehiculoDocumento.findFirst({
    where: { id, empresaId },
    select: { id: true },
  });
  if (!doc) {
    throw new Error("Documento de vehiculo no encontrado");
  }

  await prisma.vehiculoDocumento.delete({ where: { id } });
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
