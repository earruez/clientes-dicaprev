export const MIPER_ESTADOS = ["borrador", "vigente", "en_revision", "archivado"] as const;
export const MIPER_CONTROL_TIPOS = ["eliminacion", "sustitucion", "ingenieria", "administrativo", "epp"] as const;
export const MIPER_CONTROL_ESTADOS = ["pendiente", "implementado", "en_revision", "descartado"] as const;

export type MiperEstado = (typeof MIPER_ESTADOS)[number];
export type MiperControlTipo = (typeof MIPER_CONTROL_TIPOS)[number];
export type MiperControlEstado = (typeof MIPER_CONTROL_ESTADOS)[number];
export type MiperClasificacion = "bajo" | "medio" | "alto" | "critico";

export type MiperCatalogoItem = { id: string; nombre: string; areaId?: string | null };
export type MiperResponsable = { id: string; nombre: string; cargo: string | null; area: string | null };

export type MiperListadoItem = {
  id: string;
  codigo: string;
  nombre: string;
  version: number;
  estado: MiperEstado;
  vigenteDesde: string | null;
  fechaProximaRevision: string | null;
  cantidadItems: number;
  riesgosCriticos: number;
};

export type MiperListadoData = {
  databaseUpdateRequired: boolean;
  resumen: { matrices: number; vigentes: number; itemsEvaluados: number; riesgosCriticos: number };
  matrices: MiperListadoItem[];
};

export type MiperControl = {
  id: string;
  tipoControl: MiperControlTipo;
  descripcion: string;
  responsableTrabajadorId: string | null;
  responsableNombre: string | null;
  fechaCompromiso: string | null;
  estado: MiperControlEstado;
  orden: number;
};

export type MiperItem = {
  id: string;
  centroTrabajoId: string | null;
  centroTrabajoNombre: string | null;
  areaId: string | null;
  areaNombre: string | null;
  cargoId: string | null;
  cargoNombre: string | null;
  actividad: string;
  peligro: string;
  riesgo: string;
  consecuencia: string;
  probabilidad: number;
  severidad: number;
  nivelRiesgo: number;
  clasificacionRiesgo: MiperClasificacion;
  responsableTrabajadorId: string | null;
  responsableNombre: string | null;
  observaciones: string | null;
  orden: number;
  controles: MiperControl[];
};

export type MiperDetalleData = {
  miper: {
    id: string;
    codigo: string;
    nombre: string;
    version: number;
    estado: MiperEstado;
    vigenteDesde: string | null;
    fechaProximaRevision: string | null;
    observaciones: string | null;
    creadoPor: string;
    actualizadoPor: string;
    aprobadoPor: string | null;
    createdAt: string;
    updatedAt: string;
  };
  editable: boolean;
  puedeAprobar: boolean;
  centros: MiperCatalogoItem[];
  areas: MiperCatalogoItem[];
  cargos: MiperCatalogoItem[];
  responsables: MiperResponsable[];
  items: MiperItem[];
};

export type CrearMiperInput = {
  codigo: string;
  nombre: string;
  fechaProximaRevision?: string;
  observaciones?: string;
};

export type GuardarMiperItemInput = {
  itemId?: string;
  miperId: string;
  centroTrabajoId: string;
  areaId: string;
  cargoId: string;
  actividad: string;
  peligro: string;
  riesgo: string;
  consecuencia: string;
  probabilidad: number;
  severidad: number;
  responsableTrabajadorId: string;
  observaciones?: string;
};

export type GuardarMiperControlInput = {
  controlId?: string;
  miperItemId: string;
  tipoControl: MiperControlTipo;
  descripcion: string;
  responsableTrabajadorId: string;
  fechaCompromiso?: string;
  estado?: MiperControlEstado;
};
