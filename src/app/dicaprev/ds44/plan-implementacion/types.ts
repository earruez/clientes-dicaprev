export const DS44_PLAN_ESTADOS = ["pendiente", "planificada", "en_proceso", "cerrada"] as const;

export type Ds44PlanEstado = (typeof DS44_PLAN_ESTADOS)[number];
export type Ds44PlanPrioridad = "critica" | "alta" | "media" | "baja";
export type Ds44PlanOrden = "inmediatas" | "altas" | "medias" | "seguimiento";
export type Ds44PlanGeneracion = "sin_diagnostico" | "sin_brechas" | "con_brechas";

export type Ds44PlanAccion = {
  id: string;
  preguntaClave: string;
  bloque: string;
  prioridad: Ds44PlanPrioridad;
  orden: Ds44PlanOrden;
  preguntaTexto: string;
  accionSugerida: string;
  recomendacion: string;
  evidenciaEsperada: string;
  rutaSugerida: string;
  frenteOperativo: string;
  responsableSugerido: string;
  responsableReal: string | null;
  responsableTrabajadorId: string | null;
  responsableTrabajadorNombre: string | null;
  responsableTrabajadorCargo: string | null;
  fechaCompromiso: string | null;
  estado: Ds44PlanEstado;
  observacionTecnica: string | null;
  planificada: boolean;
};

export type Ds44ResponsableDisponible = {
  id: string;
  nombreCompleto: string;
  rut: string | null;
  email: string | null;
  cargoNombre: string | null;
  areaNombre: string | null;
  recomendado: boolean;
  motivoRecomendacion: string | null;
};

export type Ds44PlanImplementacionData = {
  estadoGeneracion: Ds44PlanGeneracion;
  diagnosticoId: string | null;
  diagnosticoUpdatedAt: string | null;
  responsablesDisponibles: Ds44ResponsableDisponible[];
  totalBrechas: number;
  acciones: Ds44PlanAccion[];
  columnas: Record<Ds44PlanOrden, Ds44PlanAccion[]>;
  resumen: {
    totalAcciones: number;
    criticas: number;
    planificadas: number;
    plazosPorDefinir: number;
    vencidasReales: number;
    cerradas: number;
  };
};

export type GuardarDs44PlanAccionInput = {
  preguntaClave: string;
  responsableTrabajadorId: string;
  fechaCompromiso: string;
  estado: Ds44PlanEstado;
  observacionTecnica?: string;
};

export type GuardarDs44PlanAccionResult = {
  ok: boolean;
  mensaje: string;
  accion: Ds44PlanAccion;
};