// Estados disponibles para Permisos de Instalación
export const PERMISO_ESTADOS = {
  PERMISO_CREADO: "Permiso creado",
  PREPARANDO_DOCUMENTACION: "Preparando documentación",
  SOLICITADO: "Solicitado / en espera de respuesta",
  OBSERVADO: "Observado",
  APROBADO: "Aprobado",
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

// Tipos de organismo
export const PERMISO_ORGANISMO_TIPOS = {
  MUNICIPAL: "Municipal",
  PRIVADO: "Privado",
  OTRO: "Otro",
} as const;

export type PermisoOrganismoTipo = keyof typeof PERMISO_ORGANISMO_TIPOS;

// Colores para estados y riesgos
export const ESTADO_COLORS: Record<PermisoEstado, string> = {
  PERMISO_CREADO: "bg-blue-100 text-blue-800 border-blue-300",
  PREPARANDO_DOCUMENTACION: "bg-cyan-100 text-cyan-800 border-cyan-300",
  SOLICITADO: "bg-indigo-100 text-indigo-800 border-indigo-300",
  OBSERVADO: "bg-orange-100 text-orange-800 border-orange-300",
  APROBADO: "bg-green-100 text-green-800 border-green-300",
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

// Estados que requieren un comentario/observación obligatorio al seleccionarlos
export const ESTADOS_REQUIEREN_COMENTARIO: PermisoEstado[] = ["OBSERVADO", "CANCELADO"];

// Tipos para UI
export interface PermisoFormData {
  clienteId?: string;
  clienteNombre?: string;
  clienteContactoEmail?: string;
  clienteContactoTelefono?: string;
  sucursalId?: string;
  direccion: string;
  comuna?: string;
  region?: string;
  fechaInstalacion: string;
  fechaRecepcionSolicitud: string;
  organismoId: string;
  responsableId: string;
  responsableIds?: string[];
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

export interface PermisoClienteFormData {
  nombre: string;
  contactoEmail?: string;
  contactoTelefono?: string;
}

export interface PermisoOrganismoFormData {
  nombre: string;
  tipo?: string;
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

// Margen de días para considerar "ATENCION"
export const DIAS_ATENCION_INSTALACION = 3;
