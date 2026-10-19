/** Requisitos provenientes de una pauta de obra; no son obligaciones globales de NextPrev. */
export const PLANTILLA_ACREDITACION_TRABAJADORES = [
  {
    clave: "contrato-anexo", nombre: "Contrato de trabajo vigente y anexo de vinculación al proyecto",
    detalle: "Contrato vigente más anexo que acredite la asignación del trabajador a la obra.",
    obligatorio: true, condicional: false, vigenciaMeses: null,
  },
  {
    clave: "cedula-identidad", nombre: "Copia de cédula de identidad",
    detalle: "Presentar una copia legible del documento de identidad vigente.",
    obligatorio: true, condicional: false, vigenciaMeses: null,
  },
  {
    clave: "irl-ds44", nombre: "Información de riesgos laborales (IRL)",
    detalle: "Constancia de entrega de IRL (DS 44, art. 15), máximo 2 años según pauta del proyecto.",
    obligatorio: true, condicional: false, vigenciaMeses: 24,
  },
  {
    clave: "reglamento-interno", nombre: "Entrega de Reglamento Interno de la empresa",
    detalle: "Constancia de recepción de Reglamento Interno, máximo 2 años según pauta del proyecto.",
    obligatorio: true, condicional: false, vigenciaMeses: 24,
  },
  {
    clave: "epp", nombre: "Registro de entrega de elementos de protección personal",
    detalle: "Registro de entrega de EPP, si corresponde a la actividad, máximo 1 año.",
    obligatorio: false, condicional: true, vigenciaMeses: 12,
  },
  {
    clave: "extintores", nombre: "Capacitación de manejo y uso de extintores (DS 594, art. 48)",
    detalle: "Constancia de capacitación en manejo y uso de extintores.",
    obligatorio: true, condicional: false, vigenciaMeses: null,
  },
  {
    clave: "matriz-procedimientos", nombre: "Capacitación de matriz de riesgos y procedimientos de la actividad",
    detalle: "Capacitaciones relacionadas con la matriz de riesgos y los procedimientos de la faena.",
    obligatorio: true, condicional: false, vigenciaMeses: null,
  },
  {
    clave: "examen-oal", nombre: "Examen ocupacional emitido por OAL",
    detalle: "Evaluación ocupacional emitida por organismo administrador de la Ley 16.744, si corresponde al servicio.",
    obligatorio: false, condicional: true, vigenciaMeses: null,
  },
  {
    clave: "certificacion-cargo", nombre: "Certificación del personal según cargo (soldador, APR/SNS u otros)",
    detalle: "Certificaciones habilitantes exigibles para la especialidad o el cargo del trabajador.",
    obligatorio: false, condicional: true, vigenciaMeses: null,
  },
] as const;

export function describeRequisitoTrabajador(regla: {
  nombre: string; vigenciaMeses?: number | null; condicional?: boolean;
}) {
  const plazo = regla.vigenciaMeses
    ? ` · vigencia máxima ${regla.vigenciaMeses === 12 ? "1 año" : regla.vigenciaMeses === 24 ? "2 años" : `${regla.vigenciaMeses} meses`}`
    : "";
  return `${regla.nombre}${plazo}${regla.condicional ? " · si aplica" : ""}`;
}
