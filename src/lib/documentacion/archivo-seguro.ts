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

/** Devuelve el nombre de un archivo servido por el proxy privado de NextPrev. */
export function extraerNombreArchivoSeguro(archivoUrl: string | null | undefined): string | null {
  if (!archivoUrl) return null;
  const ruta = archivoUrl.trim().split("?")[0];
  if (!ruta.startsWith(DOCUMENTOS_API_PATH)) return null;
  const encoded = ruta.slice(DOCUMENTOS_API_PATH.length);
  if (!encoded || encoded.includes("/")) return null;
  try {
    const nombre = decodeURIComponent(encoded);
    if (!/^[a-zA-Z0-9._-]{1,255}$/.test(nombre) || nombre.includes("..") || !nombre.includes(".")) return null;
    return nombre;
  } catch {
    return null;
  }
}
