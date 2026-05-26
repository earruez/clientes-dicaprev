export type TipoVehiculo = "camioneta" | "camion" | "equipo";

export type EstadoVehiculo = "operativo" | "mantencion" | "baja";

export type EstadoDocumental = "en_regla" | "por_vencer" | "fuera_de_regla";

export type TipoDocumento = string;

export const DOC_NOMBRE: Record<TipoDocumento, string> = {
  PERMISO_CIRCULACION: "Permiso de circulación",
  SOAP: "SOAP",
  REVISION_TECNICA: "Revisión técnica",
  GASES: "Certificado de gases",
  PADRON: "Padrón",
  CHECKLIST_VEHICULO: "Check list vehículo",
  SEGURO_VEHICULO: "Seguro vehículo",
  CERTIFICADO_MANTENCION: "Certificado de mantención",
  AUTORIZACION_USO_VEHICULO: "Autorización uso vehículo",
  LICENCIA_CONDUCTOR: "Licencia conductor",
};

export const DOCS_REQUERIDOS: Record<TipoVehiculo, TipoDocumento[]> = {
  camioneta: [
    "PERMISO_CIRCULACION",
    "SOAP",
    "REVISION_TECNICA",
    "GASES",
    "PADRON",
    "CHECKLIST_VEHICULO",
    "SEGURO_VEHICULO",
    "CERTIFICADO_MANTENCION",
    "AUTORIZACION_USO_VEHICULO",
  ],
  camion: [
    "PERMISO_CIRCULACION",
    "SOAP",
    "REVISION_TECNICA",
    "GASES",
    "PADRON",
    "CHECKLIST_VEHICULO",
    "SEGURO_VEHICULO",
    "CERTIFICADO_MANTENCION",
    "AUTORIZACION_USO_VEHICULO",
  ],
  equipo: [
    "PERMISO_CIRCULACION",
    "SOAP",
    "REVISION_TECNICA",
    "GASES",
    "PADRON",
    "CHECKLIST_VEHICULO",
    "SEGURO_VEHICULO",
    "CERTIFICADO_MANTENCION",
    "AUTORIZACION_USO_VEHICULO",
  ],
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

export function evaluarEstadoDocumental(v: Vehiculo): EstadoDocumental {
  const requeridos = DOCS_REQUERIDOS[v.tipo] ?? [];
  const hoy = Date.now();

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
  const today = Date.now();
  return Math.ceil((new Date(iso).getTime() - today) / MS_PER_DAY);
}
