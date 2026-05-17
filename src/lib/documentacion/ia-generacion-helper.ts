/**
 * Helper central: determina si un documento puede generarse automáticamente con IA.
 *
 * Criterios de elegibilidad:
 *  - El documento tiene una plantilla activa compatible (IRL, EPP, PTS, Política SST,
 *    Plan emergencia, Programa preventivo, Inducción SST, Notificación DS44).
 *  - El documento NO es un documento externo que debe ser obtenido por el trabajador o
 *    una entidad tercera (médico, SEREMI, mutualidad, Registro Civil).
 *
 * Documentos NO automatizables con IA (deben ser subidos manualmente):
 *  - Contrato de trabajo (requiere firma personalizada entre partes)
 *  - Cédula de identidad / RUT (documento oficial personal)
 *  - Examen preocupacional / periódico / médico (emitido por mutualidad o médico)
 *  - Licencias habilitantes (emitidas por organismos externos: SMA, Transporte, etc.)
 *  - Certificados externos de competencia (emitidos por SENCE, organismo certificador)
 *  - Resoluciones SEREMI / MINSAL
 *  - Mediciones ambientales (realizadas por laboratorio acreditado externo)
 *
 * @param doc - Objeto con id y nombre del tipo de documento.
 */

import {
  crearDocumentoEppEstructurado,
  crearDocumentoIrlEstructurado,
  serializarDocumentoEstructurado,
} from "./documento-estructurado";

// ── IDs conocidos en el mock documental (types.ts) ────────────────────────────

/**
 * Conjunto de IDs de TipoDocumento que tienen plantilla IA activa y
 * cuyo contenido puede ser generado automáticamente por el sistema.
 */
export const TIPOS_GENERABLES_IA = new Set([
  "td-03", // IRL / Información de Riesgos Laborales (antes ODI)
  "td-04", // Política de prevención SST
  "td-05", // Inducción SST
  "td-08", // Entrega de EPP
  "td-09", // Notificación DS44
  "td-12", // Descripción de cargo
]);

/**
 * IDs que explícitamente NO son generables con IA.
 * Documentos médicos, externos o que requieren obtención por terceros.
 */
export const TIPOS_NO_GENERABLES_IA = new Set([
  "td-01", // Contrato de trabajo
  "td-02", // Reglamento Interno (RIOHS) — documento externo en muchos casos
  "td-06", // Examen preocupacional (médico)
  "td-07", // Examen periódico (médico)
  "td-10", // Licencia de conducir
  "td-11", // Certificado de competencia (externo)
]);

// ── Palabras clave que identifican documentos NO generables ──────────────────

const KEYWORDS_NO_GENERABLES = [
  "contrato de trabajo",
  "cedula de identidad",
  "cedula identidad",
  "rut",
  "examen preocupacional",
  "examen ocupacional",
  "examen periodico",
  "examen medico",
  "licencia de conducir",
  "licencia conducir",
  "certificado de competencia",
  "competencia laboral",
  "resolucion seremi",
  "resolucion minsal",
  "medicion ambiental",
  "medicion higienica",
];

// ── Palabras clave que identifican documentos SÍ generables ─────────────────

const KEYWORDS_GENERABLES = [
  "irl",
  "informacion de riesgos laborales",
  "informacion riesgos laborales",
  "identificacion de riesgos",
  "obligacion de informar",
  "odi",
  "epp",
  "entrega de epp",
  "entrega epp",
  "politica",
  "politica sst",
  "politica de prevencion",
  "politica de seguridad",
  "induccion sst",
  "induccion seguridad",
  "descripcion de cargo",
  "notificacion ds44",
];

function normalizar(valor: string | null | undefined): string {
  return (valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function tipoDocumentoId(tipo: { id?: string } | null | undefined): string {
  return normalizar(tipo?.id ?? "");
}

function tipoDocumentoNombre(tipo: { nombre?: string } | null | undefined): string {
  return normalizar(tipo?.nombre ?? "");
}

/**
 * Indica si un tipo de documento puede generarse con IA.
 */
export function puedeGenerarseConIA(tipo: { id?: string; nombre?: string } | null | undefined): boolean {
  const id = tipoDocumentoId(tipo);
  const nombre = tipoDocumentoNombre(tipo);

  if (TIPOS_NO_GENERABLES_IA.has(id)) return false;
  if (TIPOS_GENERABLES_IA.has(id)) return true;

  if (KEYWORDS_NO_GENERABLES.some((keyword) => nombre.includes(keyword))) return false;
  return KEYWORDS_GENERABLES.some((keyword) => nombre.includes(keyword));
}

/**
 * Genera contenido base para documentos compatibles con IA.
 *
 * IRL y EPP pasan a emitirse como JSON estructurado para soportar edición
 * por secciones y renderizado especializado en PDF.
 */
export function generarPlantillaContenidoIA(params: {
  tipoNombre: string;
  trabajadorNombre: string;
  trabajadorRut: string;
  cargo: string;
  empresa?: string;
  fecha?: string;
}): string {
  const {
    tipoNombre,
    trabajadorNombre,
    trabajadorRut,
    cargo,
    empresa = "DICAPREV",
    fecha = new Date().toLocaleDateString("es-CL"),
  } = params;

  const nombreNorm = normalizar(tipoNombre);

  if (nombreNorm.includes("irl") || nombreNorm.includes("informacion de riesgos") || nombreNorm.includes("obligacion de informar")) {
    return serializarDocumentoEstructurado(
      crearDocumentoIrlEstructurado({
        tipoNombre,
        trabajadorNombre,
        trabajadorRut,
        cargo,
        empresa,
        fecha,
      }),
    );
  }

  if (nombreNorm.includes("epp") || nombreNorm.includes("entrega")) {
    return serializarDocumentoEstructurado(
      crearDocumentoEppEstructurado({
        tipoNombre,
        trabajadorNombre,
        trabajadorRut,
        cargo,
        empresa,
        fecha,
      }),
    );
  }

  if (nombreNorm.includes("politica") || nombreNorm.includes("prevencion")) {
    return `POLÍTICA DE PREVENCIÓN DE RIESGOS SST
Empresa: ${empresa}
Fecha: ${fecha}

Trabajador informado: ${trabajadorNombre} — ${cargo}

${empresa} declara su compromiso con la seguridad y salud de todos sus trabajadores, estableciendo como principio fundamental que ningún trabajo justifica arriesgar la integridad física de las personas.

COMPROMISOS:
1. Cumplir con la legislación vigente en materia de seguridad y salud laboral.
2. Identificar, evaluar y controlar los riesgos laborales.
3. Proporcionar condiciones de trabajo seguras y saludables.
4. Fomentar la participación activa de los trabajadores en materias de prevención.
5. Mejorar continuamente el desempeño en SST.

_____________________
${trabajadorNombre} — Recibido y conforme`;
  }

  if (nombreNorm.includes("induccion")) {
    return `INDUCCIÓN EN SEGURIDAD Y SALUD EN EL TRABAJO
Empresa: ${empresa}
Fecha: ${fecha}

Trabajador: ${trabajadorNombre} — ${cargo}

Temas tratados en la inducción:
1. Política de seguridad y salud de la empresa
2. Identificación de riesgos del puesto de trabajo
3. Uso correcto de EPP
4. Procedimientos de emergencia y evacuación
5. Reporte de accidentes e incidentes
6. Derechos y obligaciones del trabajador en materia de SST

El trabajador declara haber recibido y comprendido la inducción.

_____________________
${trabajadorNombre} — Firma`;
  }

  return `DOCUMENTO: ${tipoNombre.toUpperCase()}
Empresa: ${empresa}
Fecha: ${fecha}

Trabajador: ${trabajadorNombre}
RUT: ${trabajadorRut}
Cargo: ${cargo}

Contenido generado automáticamente. Por favor revise y edite según corresponda.

_____________________
${trabajadorNombre} — Firma`;
}

/**
 * Detecta si el contenido del documento es solo el placeholder automático.
 * Usado para determinar si se debe mostrar "Generar con IA" o "Revisar".
 *
 * @param observacion - Contenido del documento (observaciones)
 * @returns true si es placeholder, false si tiene contenido real
 */
export function esContenidoPlaceholder(observacion: string | null | undefined): boolean {
  if (!observacion?.trim()) return false;
  const normalizado = observacion.trim().toLowerCase();
  return normalizado.includes("generado automáticamente por regla documental");
}

export { parseDocumentoEstructurado, serializarDocumentoEstructurado } from "./documento-estructurado";
