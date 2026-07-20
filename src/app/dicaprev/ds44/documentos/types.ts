export type Ds44PlantillaCodigo =
  | "POLITICA_SST"
  | "DESIGNACION_RESPONSABLE_SST"
  | "PROGRAMA_TRABAJO_PREVENTIVO"
  | "REGISTRO_CAPACITACION_INFORMACION"
  | "ACTA_REVISION_GERENCIAL";

export type Ds44ClasificacionDocumento =
  | "base_inicial"
  | "exigible_segun_condicion"
  | "recomendado";

export type Ds44TipoResponsable =
  | "representante_legal"
  | "gerencia"
  | "jefatura"
  | "prevencionista"
  | "supervisor"
  | "otro_responsable";

export type Ds44CampoPlantilla = {
  key: string;
  label: string;
  type: "text" | "textarea" | "date" | "responsable";
  required: boolean;
  placeholder?: string;
  defaultValue?: string;
  filtroSugerido?: Ds44TipoResponsable[];
};

export type Ds44PlantillaDocumento = {
  codigo: Ds44PlantillaCodigo;
  nombre: string;
  descripcion: string;
  objetivo: string;
  categoria: string;
  clasificacion: Ds44ClasificacionDocumento;
  campos: Ds44CampoPlantilla[];
  accionesDs44Relacionadas?: string[];
};

export type Ds44ResponsableDisponible = {
  trabajadorId: string;
  nombre: string;
  cargoNombre: string;
  areaNombre?: string;
  centroNombre?: string;
  perfilSST?: string;
  recomendado: boolean;
  tipoResponsable: Ds44TipoResponsable;
};

export type Ds44ResponsableMetadata = {
  trabajadorId: string;
  nombre: string;
  cargoNombre: string;
  areaNombre?: string;
  tipoResponsable: Ds44TipoResponsable;
};

export type Ds44DocumentoGeneradoRow = {
  id: string;
  tipoDocumento: string;
  nombre: string;
  plantillaCodigo: Ds44PlantillaCodigo;
  createdAt: string;
  formato: string;
  estado: string;
  evidenciaId?: string;
};

export type Ds44DocumentoPdfSnapshot = {
  documentoId: string;
  empresaNombre: string;
  plantillaCodigo: Ds44PlantillaCodigo;
  plantillaNombre: string;
  contenidoTexto: string;
  contenidoHtml?: string;
  campos: Record<string, string>;
  generadoEn: string;
  usuarioNombre?: string;
  evidenciaId?: string;
};

export type Ds44AccionPlanDocumento = {
  id: string;
  accionSugerida: string;
  prioridad: string;
  responsable: string | null;
  evidenciaEsperada: string | null;
};

export type Ds44DocumentosData = {
  empresaNombre: string;
  plantillas: Ds44PlantillaDocumento[];
  responsablesDisponibles: Ds44ResponsableDisponible[];
  documentosGenerados: Ds44DocumentoGeneradoRow[];
  accionesPlan: Ds44AccionPlanDocumento[];
  resumen: {
    totalPlantillas: number;
    documentosGenerados: number;
    documentosMinimosGenerados: number;
    porcentajeAvance: number;
  };
  databaseUpdateRequired?: boolean;
};

export type GenerarDs44DocumentoInput = {
  plantillaCodigo: Ds44PlantillaCodigo;
  campos: Record<string, string>;
  responsables?: Record<string, string>;
  ds44PlanAccionId?: string;
};

export type GenerarDs44DocumentoResult = {
  documentoId: string;
  evidenciaId?: string;
};
