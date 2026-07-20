export type EstadoMiper = "borrador" | "en_revision" | "vigente" | "archivado";

const TRANSICIONES: Record<EstadoMiper, readonly EstadoMiper[]> = {
  borrador: ["en_revision"],
  en_revision: ["vigente"],
  vigente: ["archivado"],
  archivado: [],
};

export function puedeTransicionarMiper(desde: EstadoMiper, hacia: EstadoMiper): boolean {
  return TRANSICIONES[desde].includes(hacia);
}

export function validarAprobacionMiper(input: {
  estado: EstadoMiper;
  cantidadItems: number;
  rol: string;
  responsableRegistrado?: boolean;
  respuestasNoSePendientes?: number;
  riesgosPrioritariosSinControl?: number;
  evaluacionesEspecificasSinRespaldo?: number;
  itemsIncompletos?: number;
}): void {
  if (input.estado !== "en_revision") throw new Error("Solo una matriz en revisión puede declararse vigente.");
  if (input.cantidadItems < 1) throw new Error("La matriz debe tener al menos un ítem antes de declararse vigente.");
  if (!["SUPERADMIN", "ADMIN_EMPRESA", "PREVENCIONISTA"].includes(input.rol)) {
    throw new Error("Solo administración o prevención puede declarar vigente una matriz.");
  }
  if (input.responsableRegistrado === false) throw new Error("Registra un responsable de elaboración antes de aprobar la matriz.");
  if ((input.respuestasNoSePendientes ?? 0) > 0) throw new Error("Resuelve las respuestas ‘No sé’ pendientes antes de aprobar la matriz.");
  if ((input.itemsIncompletos ?? 0) > 0) throw new Error("Completa todos los ítems y sus responsables antes de aprobar la matriz.");
  if ((input.riesgosPrioritariosSinControl ?? 0) > 0) throw new Error("Todo riesgo importante o intolerable debe tener al menos una medida de control.");
  if ((input.evaluacionesEspecificasSinRespaldo ?? 0) > 0) throw new Error("Documenta una observación técnica para cada evaluación específica pendiente.");
}
