"use client";

import { registrarDocumentoGenerado } from "@/actions/documentos-generados";
import {
  construirMetadataDocumentoPdf,
  type DocumentoGeneradoInput,
} from "./registro-documento-generado";

type UploadedGeneratedFile = {
  archivoNombre: string;
  archivoNombreOriginal: string;
  archivoUrl: string;
  archivoTipo: string | null;
  archivoPeso: number;
};

async function uploadGeneratedBlob(blob: Blob, filename: string): Promise<UploadedGeneratedFile> {
  const file = new File([blob], filename, { type: blob.type || "application/octet-stream" });
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/dicaprev/documentacion/upload", {
    method: "POST",
    body: formData,
  });

  const responseText = await response.text().catch(() => "");
  let payload: UploadedGeneratedFile | { error?: string };
  try {
    payload = JSON.parse(responseText) as UploadedGeneratedFile | { error?: string };
  } catch {
    throw new Error(
      !response.ok
        ? `Error al guardar el documento generado (HTTP ${response.status}).`
        : "Respuesta inválida del servidor al guardar el documento generado.",
    );
  }

  if (!response.ok) {
    throw new Error("error" in payload && payload.error ? payload.error : "No se pudo guardar el documento generado.");
  }

  return payload as UploadedGeneratedFile;
}

export type PersistirDocumentoGeneradoParams = Omit<DocumentoGeneradoInput, "formato" | "archivoNombre" | "archivoNombreOriginal" | "archivoUrl" | "archivoTipo" | "archivoPeso"> & {
  blob: Blob;
  filename: string;
};

export type GuardarDocumentoGeneradoPDFParams = Omit<PersistirDocumentoGeneradoParams, "blob"> & {
  blob: Blob;
  version?: string | number | null;
  estado?: string | null;
  historialDetalle?: string;
};

export async function guardarDocumentoGeneradoPDF(
  params: GuardarDocumentoGeneradoPDFParams,
): Promise<{ archivoUrl: string; archivoNombre: string }> {
  const archivoTipoPdf = "application/pdf";
  const blobPdf =
    params.blob.type === archivoTipoPdf
      ? params.blob
      : new Blob([params.blob], { type: archivoTipoPdf });

  return persistirDocumentoGenerado({
    ...params,
    blob: blobPdf,
    metadata: construirMetadataDocumentoPdf({
      metadata: params.metadata,
      version: params.version,
      estado: params.estado,
      usuarioId: params.usuarioId,
      historialDetalle: params.historialDetalle,
    }),
  });
}

export async function persistirDocumentoGenerado(params: PersistirDocumentoGeneradoParams): Promise<{ archivoUrl: string; archivoNombre: string }> {
  const uploaded = await uploadGeneratedBlob(params.blob, params.filename);

  await registrarDocumentoGenerado({
    empresaId: params.empresaId,
    usuarioId: params.usuarioId ?? null,
    modulo: params.modulo,
    tipoDocumento: params.tipoDocumento,
    entidadTipo: params.entidadTipo,
    entidadId: params.entidadId ?? null,
    nombre: params.nombre,
    formato: params.blob.type || uploaded.archivoTipo || "application/octet-stream",
    archivoNombre: uploaded.archivoNombre,
    archivoNombreOriginal: uploaded.archivoNombreOriginal,
    archivoUrl: uploaded.archivoUrl,
    archivoTipo: uploaded.archivoTipo,
    archivoPeso: uploaded.archivoPeso,
    metadata: params.metadata ?? undefined,
  });

  return {
    archivoUrl: uploaded.archivoUrl,
    archivoNombre: uploaded.archivoNombre,
  };
}

export type { DocumentoGeneradoModulo } from "./registro-documento-generado";
