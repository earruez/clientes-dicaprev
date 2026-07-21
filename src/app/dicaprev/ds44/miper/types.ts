export const MIPER_ESTADOS = ["borrador", "vigente", "en_revision", "archivado"] as const;
export const MIPER_CONTROL_TIPOS = ["eliminacion", "sustitucion", "ingenieria", "administrativo", "epp"] as const;
export const MIPER_CONTROL_ESTADOS = ["pendiente", "implementado", "en_revision", "descartado"] as const;

export type MiperEstado = (typeof MIPER_ESTADOS)[number];
export type MiperControlTipo = (typeof MIPER_CONTROL_TIPOS)[number];
export type MiperControlEstado = (typeof MIPER_CONTROL_ESTADOS)[number];
export type MiperClasificacion = "bajo" | "medio" | "alto" | "critico" | "tolerable" | "moderado" | "importante" | "intolerable";
export type MiperCategoria = "seguridad" | "emergencia" | "higienico" | "psicosocial" | "musculoesqueletico";
export type MiperMetodologia = "legacy_5x5" | "vep_isp" | "evaluacion_especifica";
export type MiperTipoProceso = "operacional" | "apoyo";

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
  modoCreacion: string;
  asistentePaso: number;
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
  probabilidad: number | null;
  severidad: number | null;
  nivelRiesgo: number | null;
  clasificacionRiesgo: MiperClasificacion | null;
  categoriaRiesgo: MiperCategoria | null;
  metodologiaEvaluacion: MiperMetodologia;
  codigoIsp: string | null;
  requiereEvaluacionEspecifica: boolean;
  magnitudExposicion: string | null;
  nivelRiesgoEspecifico: string | null;
  protocoloAplicable: string | null;
  estadoEvaluacionEspecifica: "pendiente" | "en_evaluacion" | "evaluado" | null;
  observacionTecnica: string | null;
  responsableTrabajadorId: string | null;
  responsableNombre: string | null;
  observaciones: string | null;
  peligroGente: string | null;
  peligroEquipos: string | null;
  peligroMateriales: string | null;
  peligroAmbiente: string | null;
  peligroDescripcion: string | null;
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
    procesoNombre: string | null;
    procesoTipo: MiperTipoProceso | null;
    procesoResponsable: string | null;
    procesoResponsableId: string | null;
    creadoPor: string;
    actualizadoPor: string;
    aprobadoPor: string | null;
    responsableElaboracionId: string | null;
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
  procesoNombre?: string;
  procesoTipo?: MiperTipoProceso;
  procesoResponsableId?: string;
  fechaProximaRevision?: string;
  observaciones?: string;
  responsableElaboracionId?: string;
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
  categoriaRiesgo: MiperCategoria;
  probabilidad?: number;
  severidad?: number;
  magnitudExposicion?: string;
  nivelRiesgoEspecifico?: string;
  protocoloAplicable?: string;
  estadoEvaluacionEspecifica?: "pendiente" | "en_evaluacion" | "evaluado";
  observacionTecnica?: string;
  responsableTrabajadorId: string;
  observaciones?: string;
  peligroGente?: string;
  peligroEquipos?: string;
  peligroMateriales?: string;
  peligroAmbiente?: string;
  peligroDescripcion?: string;
};

export type DescargarMiperExcelResult = {
  nombre: string;
  base64: string;
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
