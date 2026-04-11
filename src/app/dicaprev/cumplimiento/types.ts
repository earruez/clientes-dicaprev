// =========================================================
//  Módulo Cumplimiento (Gestión DS44) — Tipos compartidos
// =========================================================

import type { TamanoEmpresa } from "@/lib/cumplimiento/cumplimiento-engine";

export type { TamanoEmpresa };
export type TipoHallazgo =
  | "documental"
  | "capacitacion"
  | "seguridad"
  | "conducta"
  | "equipos"
  | "emergencias";

export type EstadoHallazgo =
  | "abierto"
  | "en_seguimiento"
  | "en_proceso"
  | "resuelto"
  | "cerrado";
export type PrioridadHallazgo = "critica" | "alta" | "media" | "baja";
export type EstadoObligacion =
  | "cumplida"
  | "con_brechas"
  | "no_cumplida"
  | "no_aplica";
export type TipoEvidencia =
  | "documento"
  | "fotografia"
  | "certificado"
  | "acta"
  | "registro"
  | "informe";

// ---- Obligación DS44 ----
export interface ObligacionCumplimiento {
  id: string;
  nombre: string;
  tipo: string;
  descripcion: string;
  frecuencia: string;
  responsable: string;
  /** centroId → estado local */
  estadosPorCentro: Record<string, EstadoObligacion>;
  /** Porcentaje global (0-100) calculado sobre centros activos */
  cumplimientoGlobal: number;
  vencimiento?: string;
  /**
   * Tamaños de empresa a los que aplica esta obligación.
   * Cuando está vacío o ausente la obligación aplica a todos los tamaños.
   */
  tamañosAplica?: TamanoEmpresa[];
}

// ---- Hallazgo ----
export interface HistorialHallazgo {
  fecha: string;
  usuario: string;
  accion: string;
  detalle?: string;
}

export interface Hallazgo {
  id: string;
  tipo: TipoHallazgo;
  descripcion: string;
  centroId: string;
  centroNombre: string;
  trabajadorNombre?: string;
  obligacionId?: string;
  obligacionNombre?: string;
  estado: EstadoHallazgo;
  prioridad: PrioridadHallazgo;
  fechaCompromiso: string;
  fechaCreacion: string;
  creadoPor: string;
  historial: HistorialHallazgo[];
  evidenciaIds: string[];
  fechaCierre?: string;
  comentarioCierre?: string;
}

// ---- Evidencia ----
export interface Evidencia {
  id: string;
  hallazgoId: string;
  hallazgoDescripcion: string;
  tipoDocumento: TipoEvidencia;
  nombre: string;
  fecha: string;
  usuario: string;
  centroNombre: string;
  /** Si esta evidencia cierra el hallazgo */
  cierraHallazgo: boolean;
}

// ---- AccionCumplimiento ----

export type EstadoAccionCumplimiento = "pendiente" | "en_proceso" | "cerrada";
export type OrigenAccion = "automatico" | "manual";

/**
 * Acción concreta dentro del Plan de Trabajo DS44.
 * Se deriva desde hallazgos automáticos (motor) o hallazgos manuales activos.
 */
export interface AccionCumplimiento {
  id: string;
  /** ID del hallazgo de origen (auto-{obId}-{entidadId} o id de Hallazgo manual) */
  hallazgoId: string;
  entidadId: string;
  entidadNombre: string;
  obligacionId?: string;
  obligacionNombre?: string;
  titulo: string;
  descripcion: string;
  prioridad: PrioridadHallazgo;
  responsable: string;
  fechaCompromiso: string;
  estado: EstadoAccionCumplimiento;
  evidenciaIds?: string[];
  origenTipo: OrigenAccion;
  generadaEl: string;
}

// ---- EvidenciaCumplimiento ----

export type EstadoEvidencia = "valida" | "pendiente" | "rechazada";

/**
 * Evidencia alineada con el motor de cumplimiento.
 * Puede estar vinculada a una obligación, hallazgo y/o acción.
 * Reemplaza el tipo Evidencia legacy en páginas nuevas.
 */
export interface EvidenciaCumplimiento {
  id: string;
  titulo: string;
  tipo: TipoEvidencia;
  fecha: string;
  obligacionId?: string;
  obligacionNombre?: string;
  hallazgoId?: string;
  hallazgoDescripcion?: string;
  accionId?: string;
  accionTitulo?: string;
  entidadId?: string;
  entidadNombre?: string;
  archivoUrl?: string;
  observacion?: string;
  subidaPor: string;
  estado: EstadoEvidencia;
  /** Si esta evidencia cierra el hallazgo vinculado */
  cierraHallazgo?: boolean;
}
