export type Ds44EvidenciaEstado =
  | "sin_planificar"
  | "pendiente_evidencia"
  | "en_revision"
  | "valida"
  | "rechazada"
  | "vencida";

export type Ds44EvidenciaItem = {
  id: string;
  titulo: string;
  descripcion: string;
  estado: "pendiente" | "valida" | "rechazada" | "vencida";
  origen: string;
  archivoUrl: string | null;
  archivoNombre: string | null;
  fechaEvidencia: string;
  fechaValidacion: string | null;
  observacionRevision: string | null;
};

export type Ds44EvidenciaAccion = {
  id: string;
  preguntaClave: string;
  bloque: string | null;
  prioridad: string;
  accionSugerida: string;
  recomendacion: string;
  evidenciaEsperada: string | null;
  rutaSugerida: string | null;
  responsableReal: string | null;
  responsableTrabajadorNombre: string | null;
  responsableTrabajadorCargo: string | null;
  fechaCompromiso: string | null;
  estadoPlan: string;
  planificada: boolean;
  estadoEvidencia: Ds44EvidenciaEstado;
  evidencias: Ds44EvidenciaItem[];
};

export type Ds44EvidenciasData = {
  acciones: Ds44EvidenciaAccion[];
  resumen: {
    totalAcciones: number;
    planificadas: number;
    conEvidenciaValida: number;
    pendientesEvidencia: number;
    enRevision: number;
    rechazadasOVencidas: number;
    coberturaPorcentaje: number;
  };
  databaseUpdateRequired?: boolean;
};

export type CrearEvidenciaDs44Input = {
  ds44PlanAccionId: string;
  titulo: string;
  descripcion: string;
  archivoUrl?: string;
  archivoNombre?: string;
};

export type RevisarEvidenciaDs44Input = {
  evidenciaId: string;
  estado: "valida" | "rechazada";
  observacionRevision?: string;
};
