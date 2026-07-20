export type Ds44PlantillaCodigo =
  | "POLITICA_SST"
  | "DESIGNACION_RESPONSABLE_SST"
  | "PROGRAMA_TRABAJO_PREVENTIVO"
  | "REGISTRO_CAPACITACION_INFORMACION"
  | "ACTA_REVISION_GERENCIAL";

export type Ds44CampoPlantilla = {
  key: string;
  label: string;
  type: "text" | "textarea" | "date";
  required: boolean;
  placeholder?: string;
  defaultValue?: string;
};

export type Ds44PlantillaDocumento = {
  codigo: Ds44PlantillaCodigo;
  nombre: string;
  descripcion: string;
  objetivo: string;
  categoria: string;
  campos: Ds44CampoPlantilla[];
  accionesDs44Relacionadas?: string[];
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
  ds44PlanAccionId?: string;
};

export type GenerarDs44DocumentoResult = {
  documentoId: string;
  evidenciaId?: string;
};
