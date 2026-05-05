const MB = 1024 * 1024;

export const MAX_DOCUMENTO_FILE_SIZE = 10 * MB;

const EXTENSIONES_PERMITIDAS = new Set([".pdf", ".doc", ".docx", ".xlsx", ".jpg", ".jpeg", ".png"]);
const MIME_TYPES_PERMITIDOS = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
]);

export const DOCUMENTO_ACCEPT = ".pdf,.doc,.docx,.xlsx,.jpg,.jpeg,.png";
export const DOCUMENTO_TIPOS_LABEL = "PDF, DOC, DOCX, XLSX, JPG, PNG";

export function getDocumentoExtension(nombreArchivo: string) {
  const index = nombreArchivo.lastIndexOf(".");
  if (index === -1) return "";
  return nombreArchivo.slice(index).toLowerCase();
}

export function validarArchivoDocumento(file: { name: string; type: string; size: number }) {
  const extension = getDocumentoExtension(file.name);
  const mimeType = file.type.toLowerCase();

  if (!EXTENSIONES_PERMITIDAS.has(extension)) {
    return {
      ok: false,
      error: `Tipo de archivo no permitido. Usa ${DOCUMENTO_TIPOS_LABEL}.`,
    };
  }

  if (file.size > MAX_DOCUMENTO_FILE_SIZE) {
    return {
      ok: false,
      error: `El archivo supera el máximo permitido de ${Math.round(MAX_DOCUMENTO_FILE_SIZE / MB)} MB.`,
    };
  }

  if (mimeType && !MIME_TYPES_PERMITIDOS.has(mimeType)) {
    return {
      ok: false,
      error: `El tipo MIME ${mimeType} no está permitido para esta carga.`,
    };
  }

  return {
    ok: true,
    mimeType: mimeType || null,
    extension,
  };
}

export function formatDocumentoPeso(bytes: number | null) {
  if (!bytes || bytes <= 0) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < MB) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / MB).toFixed(1)} MB`;
}