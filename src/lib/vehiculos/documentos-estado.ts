// Documentos base del control vehicular; los adicionales admiten No aplica.
export const DOCUMENTOS_BASE_VEHICULO = [
  "PADRON", "SOAP", "PERMISO_CIRCULACION", "REVISION_TECNICA", "GASES",
] as const;

export function esDocumentoBaseVehiculo(tipo: string): boolean {
  return DOCUMENTOS_BASE_VEHICULO.some((codigo) => codigo === tipo.trim().toUpperCase());
}

export function ordenarDocumentosVehiculo<T extends { tipo: string; tipoNombre?: string }>(docs: T[]): T[] {
  const orden = (tipo: string) => {
    const indice = DOCUMENTOS_BASE_VEHICULO.findIndex((codigo) => codigo === tipo.trim().toUpperCase());
    return indice < 0 ? DOCUMENTOS_BASE_VEHICULO.length : indice;
  };
  return [...docs].sort((a, b) => orden(a.tipo) - orden(b.tipo) ||
    (a.tipoNombre ?? a.tipo).localeCompare(b.tipoNombre ?? b.tipo, "es"));
}

type DocumentoEstado = {
  estado?: string;
  subido: boolean;
  fechaVencimiento?: string | null;
  vencimiento?: string | null;
};

export function isDocumentoVencido(doc: DocumentoEstado): boolean {
  if (doc.estado === "no_aplica") return false;
  if (doc.estado === "vencido") return true;
  const fecha = doc.fechaVencimiento ?? doc.vencimiento;
  return Boolean(fecha && new Date(fecha).getTime() < Date.now());
}

export function isDocumentoProximoVencer(doc: DocumentoEstado): boolean {
  if (doc.estado === "no_aplica") return false;
  const fecha = doc.fechaVencimiento ?? doc.vencimiento;
  if (!fecha) return false;
  const diff = new Date(fecha).getTime() - Date.now();
  return diff >= 0 && diff <= 30 * 86400000;
}

export function isDocumentoPendiente(doc: DocumentoEstado): boolean {
  if (doc.estado === "no_aplica") return false;
  return doc.estado === "pendiente" || doc.estado === "rechazado" || !doc.subido;
}

export function estadoDocumentalFromDocumentos(docs: DocumentoEstado[]):
  "en_regla" | "por_vencer" | "fuera_de_regla" | "en_revision" {
  const aplicables = docs.filter((doc) => doc.estado !== "no_aplica");
  if (aplicables.some((doc) => isDocumentoPendiente(doc) || isDocumentoVencido(doc))) return "fuera_de_regla";
  if (aplicables.some((doc) => doc.estado === "en_revision")) return "en_revision";
  if (aplicables.some(isDocumentoProximoVencer)) return "por_vencer";
  return "en_regla";
}
