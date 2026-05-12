export type TipoVehiculo = "camioneta" | "camion" | "equipo";

export type EstadoVehiculo = "operativo" | "mantencion" | "baja";

export type EstadoDocumental = "en_regla" | "por_vencer" | "fuera_de_regla";

export type TipoDocumento =
  | "permiso_circulacion"
  | "soap"
  | "revision_tecnica"
  | "padron"
  | "mantencion"
  | "certificacion"
  | "revision_vigente";

export const DOC_NOMBRE: Record<TipoDocumento, string> = {
  permiso_circulacion: "Permiso de circulación",
  soap: "SOAP",
  revision_tecnica: "Revisión técnica",
  padron: "Padrón",
  mantencion: "Mantención preventiva",
  certificacion: "Certificación de operación",
  revision_vigente: "Revisión vigente",
};

export const DOCS_REQUERIDOS: Record<TipoVehiculo, TipoDocumento[]> = {
  camioneta: ["permiso_circulacion", "soap", "revision_tecnica", "padron"],
  camion: ["permiso_circulacion", "soap", "revision_tecnica", "padron"],
  equipo: ["mantencion", "certificacion", "revision_vigente"],
};

export type DocumentoVehiculo = {
  tipo: TipoDocumento;
  vencimiento: string | null;
  subido: boolean;
};

export type Vehiculo = {
  id: string;
  patente: string;
  codigoInterno: string;
  marca: string;
  modelo: string;
  anio: number;
  tipo: TipoVehiculo;
  centro: string;
  responsable: string;
  estado: EstadoVehiculo;
  proximaRevision: string;
  kilometraje: number;
  observaciones: string;
  documentos: DocumentoVehiculo[];
  creadoEl: string;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DOC_WARNING_WINDOW_DAYS = 30;

function referenceToday(): number {
  // Keep parity with existing mock/date behavior used by this module.
  return new Date("2026-04-09").getTime();
}

export function evaluarEstadoDocumental(v: Vehiculo): EstadoDocumental {
  const requeridos = DOCS_REQUERIDOS[v.tipo];
  const hoy = referenceToday();

  for (const req of requeridos) {
    const doc = v.documentos.find((d) => d.tipo === req);
    if (!doc || !doc.subido) return "fuera_de_regla";
    if (doc.vencimiento && new Date(doc.vencimiento).getTime() < hoy) return "fuera_de_regla";
  }

  const porVencer = requeridos.some((req) => {
    const doc = v.documentos.find((d) => d.tipo === req);
    if (!doc?.vencimiento) return false;
    const diff = new Date(doc.vencimiento).getTime() - hoy;
    return diff >= 0 && diff <= DOC_WARNING_WINDOW_DAYS * MS_PER_DAY;
  });

  return porVencer ? "por_vencer" : "en_regla";
}

export function diasParaVencer(iso: string | null): number | null {
  if (!iso) return null;
  const today = referenceToday();
  return Math.ceil((new Date(iso).getTime() - today) / MS_PER_DAY);
}
