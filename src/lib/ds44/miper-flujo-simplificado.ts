export const ESTADOS_SUGERENCIA_MIPER = [
  "sugerido",
  "confirmado",
  "no_aplica",
  "revision_tecnica",
] as const;

export type EstadoSugerenciaMiper = (typeof ESTADOS_SUGERENCIA_MIPER)[number];

export type ContextoLevantamientoMiper = {
  fechaLevantamiento: string;
  accidentesEnfermedades: string;
  programasVigilancia: string;
  personasEspecialmenteSensibles: boolean;
  antecedentesSensibilidad: string;
  participantes: string;
  participacionLaboral: string;
  motivo: "creacion" | "revision_anual" | "cambio_condiciones" | "accidente_enfermedad" | "riesgo_grave";
  difusionPosterior: string;
  conexionProgramaPreventivo: string;
};

export function calcularPasoSimplificado(
  ultimoPasoCompletado: number,
  modoCreacion: string,
): number {
  if (!Number.isInteger(ultimoPasoCompletado)) return 1;
  if (modoCreacion === "asistente_simplificado") {
    return Math.min(Math.max(ultimoPasoCompletado + 1, 1), 4);
  }
  if (ultimoPasoCompletado <= 0) return 1;
  if (ultimoPasoCompletado <= 3) return 2;
  if (ultimoPasoCompletado <= 5) return 3;
  return 4;
}

export function esRespuestaNuevaValida(value: string): value is "aplica" | "no_aplica" {
  return value === "aplica" || value === "no_aplica";
}

export function presentarRespuestaHistorica(value: string): {
  valorOriginal: string;
  revisionTecnicaPendiente: boolean;
  etiqueta: string;
} {
  return value === "no_se"
    ? {
        valorOriginal: value,
        revisionTecnicaPendiente: true,
        etiqueta: "Revisión técnica pendiente",
      }
    : {
        valorOriginal: value,
        revisionTecnicaPendiente: false,
        etiqueta: value === "aplica" ? "Aplica" : "No aplica",
      };
}

export function riesgoEstaConfirmado(item: {
  estadoSugerencia?: string | null;
  confirmadoPorUsuario: boolean;
}): boolean {
  return item.estadoSugerencia === "confirmado"
    || (!item.estadoSugerencia && item.confirmadoPorUsuario);
}

export function riesgosConfirmados<T extends {
  estadoSugerencia?: string | null;
  confirmadoPorUsuario: boolean;
}>(items: T[]): T[] {
  return items.filter(riesgoEstaConfirmado);
}

export function crearPendienteEvaluacionEspecifica(input: {
  metodologiaEvaluacion: string;
  protocoloAplicable: string | null;
}): {
  requiereEvaluacionEspecifica: boolean;
  estadoEvaluacionEspecifica: "pendiente" | null;
  observacionTecnica: string | null;
} {
  if (input.metodologiaEvaluacion !== "evaluacion_especifica") {
    return {
      requiereEvaluacionEspecifica: false,
      estadoEvaluacionEspecifica: null,
      observacionTecnica: null,
    };
  }
  return {
    requiereEvaluacionEspecifica: true,
    estadoEvaluacionEspecifica: "pendiente",
    observacionTecnica: `Evaluación técnica pendiente${input.protocoloAplicable ? ` según ${input.protocoloAplicable}` : ""}.`,
  };
}

export function heredarDatosTarea(input: {
  lugar: string;
  personasExpuestasTotal: number;
  distribucionSexogenerica: Record<string, number>;
}) {
  return {
    lugarEspecifico: input.lugar,
    personasExpuestasTotal: input.personasExpuestasTotal,
    distribucionSexogenerica: input.distribucionSexogenerica,
  };
}
