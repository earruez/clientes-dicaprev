import type { Prisma } from "@prisma/client";

export type DocumentoGeneradoModulo =
  | "documentacion"
  | "capacitacion"
  | "plandetrabajo"
  | "trabajadores"
  | "acreditaciones";

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
