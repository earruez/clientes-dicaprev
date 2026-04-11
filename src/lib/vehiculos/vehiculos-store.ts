/**
 * vehiculos-store.ts
 *
 * Shared mock-state layer for Vehículos y Equipos.
 *
 * Architecture:
 *   vehiculos-store → single runtime state (CRUD)
 *   empresa/vehiculos/page.tsx → list + create/edit
 *   empresa/vehiculos/[id]/page.tsx → detail + document management
 *
 * No React — plain module singleton.
 * In production this will be replaced by Firestore listeners.
 */

// ─── Types ──────────────────────────────────────────────────────────────── //

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

/** Documents required per vehicle type */
export const DOCS_REQUERIDOS: Record<TipoVehiculo, TipoDocumento[]> = {
  camioneta: ["permiso_circulacion", "soap", "revision_tecnica", "padron"],
  camion:    ["permiso_circulacion", "soap", "revision_tecnica", "padron"],
  equipo:    ["mantencion", "certificacion", "revision_vigente"],
};

export interface DocumentoVehiculo {
  tipo: TipoDocumento;
  /** ISO date string or null = permanent / no expiry */
  vencimiento: string | null;
  subido: boolean;
}

export interface Vehiculo {
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
}

// ─── Document compliance evaluator ──────────────────────────────────────── //

const HOY = "2026-04-09";
const DIAS_30 = 30 * 24 * 60 * 60 * 1000;

export function evaluarEstadoDocumental(v: Vehiculo): EstadoDocumental {
  const requeridos = DOCS_REQUERIDOS[v.tipo];
  const hoy = new Date(HOY).getTime();

  for (const req of requeridos) {
    const doc = v.documentos.find((d) => d.tipo === req);
    if (!doc || !doc.subido) return "fuera_de_regla";
    if (doc.vencimiento && new Date(doc.vencimiento).getTime() < hoy) return "fuera_de_regla";
  }

  const porVencer = requeridos.some((req) => {
    const doc = v.documentos.find((d) => d.tipo === req);
    if (!doc?.vencimiento) return false;
    const diff = new Date(doc.vencimiento).getTime() - hoy;
    return diff >= 0 && diff <= DIAS_30;
  });

  return porVencer ? "por_vencer" : "en_regla";
}

export function diasParaVencer(iso: string | null): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - new Date(HOY).getTime()) / (1000 * 60 * 60 * 24));
}

// ─── Initial mock data ──────────────────────────────────────────────────── //

function docsVehiculo(
  entries: Array<{ tipo: TipoDocumento; vencimiento: string | null; subido: boolean }>
): DocumentoVehiculo[] {
  return entries;
}

const INITIAL: Vehiculo[] = [
  {
    id: "v-001",
    patente: "BBLF-45",
    codigoInterno: "FLT-001",
    marca: "Toyota",
    modelo: "Hilux 4x4",
    anio: 2022,
    tipo: "camioneta",
    centro: "Planta Norte",
    responsable: "Carlos Pérez",
    estado: "operativo",
    proximaRevision: "2026-08-15",
    kilometraje: 48200,
    observaciones: "Vehículo en buen estado general. Últimas revisiones sin observaciones.",
    creadoEl: "2022-06-01",
    documentos: docsVehiculo([
      { tipo: "permiso_circulacion", vencimiento: "2026-12-31", subido: true },
      { tipo: "soap",                vencimiento: "2026-09-30", subido: true },
      { tipo: "revision_tecnica",    vencimiento: "2026-08-15", subido: true },
      { tipo: "padron",              vencimiento: null,          subido: true },
    ]),
  },
  {
    id: "v-002",
    patente: "HJKM-12",
    codigoInterno: "FLT-002",
    marca: "Mitsubishi",
    modelo: "L200",
    anio: 2021,
    tipo: "camioneta",
    centro: "Centro Santiago Sur",
    responsable: "Ana Ruiz",
    estado: "operativo",
    proximaRevision: "2026-06-20",
    kilometraje: 63700,
    observaciones: "Permiso de circulación próximo a vencer. Gestionar renovación.",
    creadoEl: "2021-10-15",
    documentos: docsVehiculo([
      { tipo: "permiso_circulacion", vencimiento: "2026-04-25", subido: true }, // vence en 16 días
      { tipo: "soap",                vencimiento: "2026-08-30", subido: true },
      { tipo: "revision_tecnica",    vencimiento: "2026-06-20", subido: true },
      { tipo: "padron",              vencimiento: null,          subido: true },
    ]),
  },
  {
    id: "v-003",
    patente: "CDPQ-78",
    codigoInterno: "FLT-003",
    marca: "Mercedes-Benz",
    modelo: "Atego 1726",
    anio: 2019,
    tipo: "camion",
    centro: "Planta Norte",
    responsable: "Pedro Contreras",
    estado: "mantencion",
    proximaRevision: "2026-04-20",
    kilometraje: 182400,
    observaciones: "En mantención por falla en sistema de frenos. Permiso de circulación vencido pendiente renovación.",
    creadoEl: "2019-03-20",
    documentos: docsVehiculo([
      { tipo: "permiso_circulacion", vencimiento: "2026-03-31", subido: true }, // expirado
      { tipo: "soap",                vencimiento: "2026-09-30", subido: true },
      { tipo: "revision_tecnica",    vencimiento: "2026-05-01", subido: true },
      { tipo: "padron",              vencimiento: null,          subido: true },
    ]),
  },
  {
    id: "v-004",
    patente: "FFRT-90",
    codigoInterno: "EQP-001",
    marca: "Caterpillar",
    modelo: "Retroexcavadora 416F",
    anio: 2020,
    tipo: "equipo",
    centro: "Faena Sur",
    responsable: "Juan López",
    estado: "operativo",
    proximaRevision: "2026-07-01",
    kilometraje: 0,
    observaciones: "Certificación y mantención al día. Operador designado: Juan López (cert. vigente).",
    creadoEl: "2020-08-10",
    documentos: docsVehiculo([
      { tipo: "mantencion",       vencimiento: "2026-05-15", subido: true },
      { tipo: "certificacion",    vencimiento: "2026-12-31", subido: true },
      { tipo: "revision_vigente", vencimiento: "2026-07-01", subido: true },
    ]),
  },
  {
    id: "v-005",
    patente: "AABC-55",
    codigoInterno: "FLT-005",
    marca: "Ford",
    modelo: "Ranger XL",
    anio: 2018,
    tipo: "camioneta",
    centro: "Centro Santiago Sur",
    responsable: "Marcos Saavedra",
    estado: "baja",
    proximaRevision: "",
    kilometraje: 215000,
    observaciones: "Dado de baja por alto kilometraje y fallas mecánicas reiteradas.",
    creadoEl: "2018-01-15",
    documentos: docsVehiculo([
      { tipo: "permiso_circulacion", vencimiento: null, subido: false },
      { tipo: "soap",                vencimiento: null, subido: false },
      { tipo: "revision_tecnica",    vencimiento: null, subido: false },
      { tipo: "padron",              vencimiento: null, subido: true  },
    ]),
  },
];

// ─── Module-level state ─────────────────────────────────────────────────── //

let _state: Vehiculo[] = INITIAL.map((v) => ({ ...v, documentos: [...v.documentos] }));

type Listener = () => void;
const _listeners: Set<Listener> = new Set();

function notify() {
  _listeners.forEach((fn) => fn());
}

export function subscribe(fn: Listener): () => void {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

// ─── CRUD ────────────────────────────────────────────────────────────────── //

export function getVehiculos(): Vehiculo[] {
  return _state;
}

export function getVehiculoById(id: string): Vehiculo | undefined {
  return _state.find((v) => v.id === id);
}

export type VehiculoInput = Omit<Vehiculo, "id" | "creadoEl" | "documentos">;

export function createVehiculo(data: VehiculoInput): Vehiculo {
  const documentos: DocumentoVehiculo[] = DOCS_REQUERIDOS[data.tipo].map((tipo) => ({
    tipo,
    vencimiento: null,
    subido: false,
  }));
  const v: Vehiculo = {
    ...data,
    id: `v-${Date.now()}`,
    documentos,
    creadoEl: HOY,
  };
  _state = [..._state, v];
  notify();
  return v;
}

export function updateVehiculo(id: string, data: Partial<VehiculoInput>): void {
  _state = _state.map((v) => (v.id === id ? { ...v, ...data } : v));
  notify();
}

export function updateDocumento(
  vehiculoId: string,
  tipo: TipoDocumento,
  patch: Partial<DocumentoVehiculo>
): void {
  _state = _state.map((v) => {
    if (v.id !== vehiculoId) return v;
    return {
      ...v,
      documentos: v.documentos.map((d) => (d.tipo === tipo ? { ...d, ...patch } : d)),
    };
  });
  notify();
}
