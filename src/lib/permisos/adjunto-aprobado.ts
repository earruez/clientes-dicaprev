import type { SendEmailAttachment } from "@/lib/email/send-email";
import { MAX_DOCUMENTO_FILE_SIZE } from "@/lib/documentacion/archivo-documento";

export type ArchivoPermisoAprobadoInput = {
  archivoNombre: string;
  archivoNombreOriginal: string;
  archivoTipo: string | null;
  archivoPeso: number;
};

const EXTENSIONES: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

/** Datos de un archivo cargado al almacenamiento privado de NextPrev. */
export function validarArchivoPermisoAprobado(archivo: ArchivoPermisoAprobadoInput): void {
  const nombre = archivo.archivoNombre.trim();
  const extension = nombre.split(".").pop()?.toLowerCase() ?? "";
  if (!/^[a-f0-9-]{36}\.(pdf|doc|docx|xlsx|jpg|jpeg|png)$/i.test(nombre) || !EXTENSIONES[extension]) {
    throw new Error("Adjunta un archivo válido desde NextPrev.");
  }
  if (!archivo.archivoNombreOriginal.trim() || archivo.archivoNombreOriginal.length > 255) {
    throw new Error("El archivo del permiso debe tener un nombre válido.");
  }
  if (!Number.isInteger(archivo.archivoPeso) || archivo.archivoPeso <= 0 || archivo.archivoPeso > MAX_DOCUMENTO_FILE_SIZE) {
    throw new Error("El documento supera el máximo permitido de 10 MB o está vacío.");
  }
}

/** Lee únicamente el archivo esperado desde el Blob privado de la empresa autorizada. */
export async function obtenerAdjuntoMunicipal(
  empresaId: string,
  archivo: ArchivoPermisoAprobadoInput,
): Promise<SendEmailAttachment> {
  validarArchivoPermisoAprobado(archivo);
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  const storeId = token?.split("_")[3];
  if (!token || !storeId) throw new Error("El almacenamiento privado no está configurado.");

  const blobUrl = `https://${storeId}.private.blob.vercel-storage.com/empresas/${encodeURIComponent(empresaId)}/documentos/${encodeURIComponent(archivo.archivoNombre)}`;
  const response = await fetch(blobUrl, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error("No se pudo recuperar el permiso aprobado adjunto. Comprueba que esté cargado.");
  const sizeDeclarado = Number(response.headers.get("content-length") || 0);
  if (sizeDeclarado > MAX_DOCUMENTO_FILE_SIZE) throw new Error("El adjunto supera el tamaño máximo de 10 MB.");
  const contenido = Buffer.from(await response.arrayBuffer());
  if (contenido.byteLength === 0 || contenido.byteLength > MAX_DOCUMENTO_FILE_SIZE) {
    throw new Error("El archivo adjunto está vacío o supera el tamaño permitido.");
  }
  const extension = archivo.archivoNombre.split(".").pop()!.toLowerCase();
  const nombreSeguro = archivo.archivoNombreOriginal.trim()
    .replace(/[\\/\x00-\x1f\x7f]/g, "_")
    .slice(0, 180);
  return {
    filename: nombreSeguro,
    content: contenido.toString("base64"),
    contentType: EXTENSIONES[extension],
  };
}
