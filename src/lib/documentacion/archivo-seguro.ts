const DOCUMENTOS_PUBLIC_PATH = "/uploads/documentos/";
const DOCUMENTOS_API_PATH = "/api/dicaprev/documentacion/archivo/";

export function construirArchivoSeguroUrl(archivoNombre: string): string {
  return `${DOCUMENTOS_API_PATH}${encodeURIComponent(archivoNombre)}`;
}

export function normalizarArchivoSeguroUrl(archivoUrl: string | null | undefined): string | null {
  if (!archivoUrl) return null;

  const raw = archivoUrl.trim();
  if (!raw) return null;

  if (raw.startsWith(DOCUMENTOS_API_PATH) || /^https?:\/\//i.test(raw)) {
    return raw;
  }

  if (raw.startsWith(DOCUMENTOS_PUBLIC_PATH)) {
    const archivoNombre = raw.slice(DOCUMENTOS_PUBLIC_PATH.length);
    return construirArchivoSeguroUrl(archivoNombre);
  }

  if (!raw.includes("/") && /\.[a-z0-9]+$/i.test(raw)) {
    return construirArchivoSeguroUrl(raw);
  }

  return raw;
}
