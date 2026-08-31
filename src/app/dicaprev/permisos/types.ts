// Estados disponibles para Permisos de Instalación
export const PERMISO_ESTADOS = {
  SOLICITUD_RECIBIDA: "Solicitud recibida",
  PREPARANDO_ANTECEDENTES: "Preparando antecedentes",
  PENDIENTE_ANTECEDENTES: "Pendiente de antecedentes",
  LISTO_PARA_SOLICITAR: "Listo para solicitar",
  SOLICITADO: "Solicitado",
  EN_REVISION: "En revisión",
  OBSERVADO: "Observado",
  SUBSANACION_ENVIADA: "Subsanación enviada",
  APROBADO: "Aprobado",
  RECHAZADO: "Rechazado",
  CANCELADO: "Cancelado",
} as const;

export type PermisoEstado = keyof typeof PERMISO_ESTADOS;

// Niveles de riesgo
export const PERMISO_RIESGOS = {
  SIN_DATOS: "Sin datos",
  EN_PLAZO: "En plazo",
  ATENCION: "Atención",
  EN_RIESGO: "En riesgo",
} as const;

export type PermisoRiesgo = keyof typeof PERMISO_RIESGOS;

// Modalidades de trámite
export const PERMISO_MODALIDADES = {
  ONLINE: "Online",
  PRESENCIAL: "Presencial",
  ONLINE_PRESENCIAL: "Online / Presencial",
  NO_INFORMADO: "No informado",
} as const;

export type PermisoModalidad = keyof typeof PERMISO_MODALIDADES;

// Tipos de plazo
export const PERMISO_TIPOS_PLAZO = {
  HABILES: "Días hábiles",
  CORRIDOS: "Días corridos",
  NO_INFORMADO: "No informado",
} as const;

export type PermisoTipoPlazo = keyof typeof PERMISO_TIPOS_PLAZO;

// Colores para estados y riesgos
export const ESTADO_COLORS: Record<PermisoEstado, string> = {
  SOLICITUD_RECIBIDA: "bg-blue-100 text-blue-800 border-blue-300",
  PREPARANDO_ANTECEDENTES: "bg-cyan-100 text-cyan-800 border-cyan-300",
  PENDIENTE_ANTECEDENTES: "bg-yellow-100 text-yellow-800 border-yellow-300",
  LISTO_PARA_SOLICITAR: "bg-green-100 text-green-800 border-green-300",
  SOLICITADO: "bg-indigo-100 text-indigo-800 border-indigo-300",
  EN_REVISION: "bg-purple-100 text-purple-800 border-purple-300",
  OBSERVADO: "bg-orange-100 text-orange-800 border-orange-300",
  SUBSANACION_ENVIADA: "bg-amber-100 text-amber-800 border-amber-300",
  APROBADO: "bg-green-100 text-green-800 border-green-300",
  RECHAZADO: "bg-red-100 text-red-800 border-red-300",
  CANCELADO: "bg-gray-100 text-gray-800 border-gray-300",
};

export const RIESGO_COLORS: Record<PermisoRiesgo, string> = {
  SIN_DATOS: "bg-slate-100 text-slate-700 border-slate-300",
  EN_PLAZO: "bg-green-100 text-green-700 border-green-300",
  ATENCION: "bg-yellow-100 text-yellow-700 border-yellow-300",
  EN_RIESGO: "bg-red-100 text-red-700 border-red-300",
};

export const RIESGO_ICONS: Record<PermisoRiesgo, string> = {
  SIN_DATOS: "⚪",
  EN_PLAZO: "🟢",
  ATENCION: "🟡",
  EN_RIESGO: "🔴",
};

// Tipos para UI
export interface PermisoFormData {
  clienteId?: string;
  sucursalId?: string;
  direccion: string;
  fechaInstalacion: string;
  fechaRecepcionSolicitud: string;
  organismoId: string;
  responsableId: string;
  modalidad?: string;
  estado: PermisoEstado;
  observaciones?: string;
  fechaPresentacion?: string;
}

export interface PermisoResponsableFormData {
  nombre: string;
  cargo: string;
  email: string;
  telefono?: string;
}

export interface PermisoOrganismoFormData {
  nombre: string;
  codigoCUT?: string;
  region?: string;
  provincia?: string;
  comuna?: string;
  nombreOficial?: string;
  unidad?: string;
  tipoTramite?: string;
  descripcionTramite?: string;
  modalidad?: string;
  plazoDias?: number;
  tipoPlazo?: string;
  direccion?: string;
  horario?: string;
  urlTramite?: string;
  urlInstitucional?: string;
  documentosRequeridos?: string;
  costo?: string;
  fuente?: string;
  observaciones?: string;
}

// Transiciones de estado permitidas (para fase 1, permitimos todas)
export const ESTADO_TRANSICIONES: Record<PermisoEstado, PermisoEstado[]> = {
  SOLICITUD_RECIBIDA: ["PREPARANDO_ANTECEDENTES", "CANCELADO"],
  PREPARANDO_ANTECEDENTES: ["PENDIENTE_ANTECEDENTES", "LISTO_PARA_SOLICITAR", "CANCELADO"],
  PENDIENTE_ANTECEDENTES: ["PREPARANDO_ANTECEDENTES", "CANCELADO"],
  LISTO_PARA_SOLICITAR: ["SOLICITADO", "CANCELADO"],
  SOLICITADO: ["EN_REVISION", "CANCELADO"],
  EN_REVISION: ["OBSERVADO", "APROBADO", "RECHAZADO", "CANCELADO"],
  OBSERVADO: ["SUBSANACION_ENVIADA", "CANCELADO"],
  SUBSANACION_ENVIADA: ["EN_REVISION", "CANCELADO"],
  APROBADO: [],
  RECHAZADO: [],
  CANCELADO: [],
};

// Margen de días para considerar "ATENCION"
export const DIAS_ATENCION_INSTALACION = 3;
