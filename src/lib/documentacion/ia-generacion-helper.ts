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
  "induccion prevision",
  "notificacion ds44",
  "ds44",
  "plan de emergencia",
  "programa preventivo",
  "pts",
  "procedimiento de trabajo seguro",
  "descripcion de cargo",
  "perfil de cargo",
];

type DocRef = { id?: string | null; nombre?: string | null };

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Retorna `true` si el documento puede generarse automáticamente con IA.
 *
 * Orden de evaluación:
 * 1. Si el id está en TIPOS_NO_GENERABLES_IA → false
 * 2. Si el id está en TIPOS_GENERABLES_IA → true
 * 3. Fallback por nombre normalizado
 */
export function puedeGenerarseConIA(doc: DocRef): boolean {
  const id = doc.id ?? "";

  // Regla por ID explícito
  if (id && TIPOS_NO_GENERABLES_IA.has(id)) return false;
  if (id && TIPOS_GENERABLES_IA.has(id)) return true;

  // Fallback por nombre
  const nombre = normalizar(doc.nombre ?? "");
  if (!nombre) return false;

  if (KEYWORDS_NO_GENERABLES.some((kw) => nombre.includes(kw))) return false;
  if (KEYWORDS_GENERABLES.some((kw) => nombre.includes(kw))) return true;

  return false;
}

/**
 * Genera un contenido de plantilla simulado para un documento IA.
 * En producción, esto se reemplazará por una llamada a la API de IA.
 */
export function generarPlantillaContenidoIA(params: {
  tipoNombre: string;
  trabajadorNombre: string;
  trabajadorRut: string;
  cargo: string;
  empresa?: string;
  fecha?: string;
}): string {
  const { tipoNombre, trabajadorNombre, trabajadorRut, cargo, empresa = "DICAPREV", fecha = new Date().toLocaleDateString("es-CL") } = params;
  const nombreNorm = normalizar(tipoNombre);

  if (nombreNorm.includes("irl") || nombreNorm.includes("informacion de riesgos") || nombreNorm.includes("obligacion de informar")) {
    return `ACTA DE INFORMACIÓN DE RIESGOS LABORALES (IRL)
Empresa: ${empresa}
Fecha: ${fecha}

Trabajador: ${trabajadorNombre}
RUT: ${trabajadorRut}
Cargo: ${cargo}

Por medio del presente documento, se deja constancia que el trabajador individualizado ha recibido información sobre los riesgos laborales asociados a su puesto de trabajo, en cumplimiento del artículo 21 de la Ley N°16.744.

RIESGOS IDENTIFICADOS:
- Riesgo ergonómico por posturas mantenidas o movimientos repetitivos
- Riesgo de caída al mismo o distinto nivel
- Riesgo de contacto con materiales o sustancias peligrosas (si aplica)
- Riesgo de accidente por maquinaria o equipos (si aplica)

MEDIDAS PREVENTIVAS:
- Uso correcto de EPP según procedimiento vigente
- Cumplimiento de procedimientos de trabajo seguro (PTS)
- Participación en capacitaciones de seguridad y prevención

El trabajador declara haber recibido y comprendido la información contenida en este documento.

_____________________          _____________________
Firma Trabajador               Firma Empleador / Prevencioncista
${trabajadorNombre}`;
  }

  if (nombreNorm.includes("epp") || nombreNorm.includes("entrega")) {
    return `ACTA DE ENTREGA DE EQUIPOS DE PROTECCIÓN PERSONAL (EPP)
Empresa: ${empresa}
Fecha: ${fecha}

Trabajador: ${trabajadorNombre}
RUT: ${trabajadorRut}
Cargo: ${cargo}

El trabajador recibe los siguientes elementos de protección personal de acuerdo a los riesgos de su puesto:

- Casco de seguridad
- Zapatos de seguridad
- Guantes de protección
- Lentes de seguridad
- Protector auditivo (si aplica)
- Ropa de trabajo

El trabajador se compromete a utilizar correctamente los EPP entregados, mantenerlos en buen estado y reportar cualquier deterioro.

_____________________          _____________________
Firma Trabajador               Firma Empleador
${trabajadorNombre}`;
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

  // Plantilla genérica
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
