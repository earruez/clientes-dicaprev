import type { Prisma } from "@prisma/client";

export type DocumentoGeneradoModulo =
  | "documentacion"
  | "capacitacion"
  | "plandetrabajo"
  | "trabajadores"
  | "acreditaciones"
  | "ds44";

export type DocumentoGeneradoInput = {
  empresaId: string;
  usuarioId?: string | null;
  modulo: DocumentoGeneradoModulo;
  tipoDocumento: string;
  entidadTipo: string;
  entidadId?: string | null;
  nombre: string;
  formato: string;
  archivoNombre?: string | null;
  archivoNombreOriginal?: string | null;
  archivoUrl?: string | null;
  archivoTipo?: string | null;
  archivoPeso?: number | null;
  metadata?: Prisma.InputJsonValue;
};

export type ConstruirMetadataDocumentoPdfParams = {
  metadata?: Prisma.InputJsonValue;
  version?: string | number | null;
  estado?: string | null;
  usuarioId?: string | null;
  historialDetalle?: string;
  generatedAt?: Date;
};

export function construirMetadataDocumentoPdf(params: ConstruirMetadataDocumentoPdfParams): Prisma.InputJsonValue {
  const generatedAt = (params.generatedAt ?? new Date()).toISOString();
  const historialDetalle = params.historialDetalle?.trim() || "Documento generado automáticamente";

  const baseMetadata: Record<string, unknown> =
    params.metadata && typeof params.metadata === "object" && !Array.isArray(params.metadata)
      ? { ...(params.metadata as Record<string, unknown>) }
      : {};

  if (params.version !== undefined) {
    baseMetadata.version = params.version;
  }

  if (params.estado !== undefined) {
    baseMetadata.estado = params.estado;
  }

  const historialPrevio =
    Array.isArray(baseMetadata.historial) ? [...baseMetadata.historial] : [];

  historialPrevio.push({
    fecha: generatedAt,
    evento: "documento_generado_pdf",
    detalle: historialDetalle,
    usuarioId: params.usuarioId ?? null,
  });

  baseMetadata.historial = historialPrevio;
  baseMetadata.generatedAt = generatedAt;

  return baseMetadata as Prisma.InputJsonValue;
}

export function construirRegistroDocumentoGenerado(input: DocumentoGeneradoInput) {
  return {
    empresaId: input.empresaId,
    usuarioId: input.usuarioId ?? null,
    modulo: input.modulo,
    tipoDocumento: input.tipoDocumento.trim(),
    entidadTipo: input.entidadTipo.trim(),
    entidadId: input.entidadId?.trim() || null,
    nombre: input.nombre.trim(),
    formato: input.formato.trim().toLowerCase(),
    archivoNombre: input.archivoNombre?.trim() || null,
    archivoNombreOriginal: input.archivoNombreOriginal?.trim() || null,
    archivoUrl: input.archivoUrl?.trim() || null,
    archivoTipo: input.archivoTipo?.trim() || null,
    archivoPeso: input.archivoPeso ?? null,
    metadata: input.metadata ?? undefined,
  };
}
