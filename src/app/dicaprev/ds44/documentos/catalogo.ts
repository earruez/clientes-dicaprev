import type { Ds44PlantillaCodigo, Ds44PlantillaDocumento } from "./types";

type Contexto = Record<string, string>;
type PlantillaInterna = Ds44PlantillaDocumento & {
  renderHtml: (contexto: Contexto) => string;
  renderTexto: (contexto: Contexto) => string;
};

function escapeHtml(value: string | undefined): string {
  return (value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function texto(value: string | undefined): string {
  return (value ?? "").trim();
}

function crearRender(nombre: string, secciones: Array<[string, string]>) {
  return {
    renderHtml: (contexto: Contexto) => `<article><header><p><strong>${escapeHtml(contexto.empresaNombre)}</strong></p><h1>${escapeHtml(nombre)}</h1></header>${secciones.map(([key, label]) => `<section><h2>${escapeHtml(label)}</h2><p>${escapeHtml(contexto[key]).replace(/\n/g, "<br>")}</p></section>`).join("")}<footer><p>Generado por NextPrev</p></footer></article>`,
    renderTexto: (contexto: Contexto) => `${contexto.empresaNombre}\n${nombre}\n\n${secciones.map(([key, label]) => `${label}:\n${texto(contexto[key])}`).join("\n\n")}\n\nGenerado por NextPrev`,
  };
}

export const DS44_PLANTILLAS: PlantillaInterna[] = [
  {
    codigo: "POLITICA_SST", nombre: "Política de Seguridad y Salud en el Trabajo", categoria: "Gobernanza SST",
    descripcion: "Declaración formal de los compromisos preventivos de la empresa.", objetivo: "Establecer los principios y compromisos que orientan el sistema de gestión SST.",
    campos: [
      { key: "representanteLegal", label: "Representante legal", type: "text", required: true },
      { key: "compromisoEmpresa", label: "Compromiso de la empresa", type: "textarea", required: true, placeholder: "Compromisos de protección, participación y mejora continua." },
      { key: "fechaEmision", label: "Fecha de emisión", type: "date", required: true },
    ],
    accionesDs44Relacionadas: ["politica", "liderazgo"],
    ...crearRender("Política de Seguridad y Salud en el Trabajo", [["representanteLegal", "Representante legal"], ["compromisoEmpresa", "Compromiso de la empresa"], ["fechaEmision", "Fecha de emisión"]]),
  },
  {
    codigo: "DESIGNACION_RESPONSABLE_SST", nombre: "Acta de Designación de Responsable SST", categoria: "Organización preventiva",
    descripcion: "Formaliza la designación y las funciones de la persona responsable de SST.", objetivo: "Dejar constancia de responsabilidades, funciones y fecha de designación.",
    campos: [
      { key: "responsableNombre", label: "Responsable", type: "text", required: true },
      { key: "responsableCargo", label: "Cargo", type: "text", required: true },
      { key: "funcionesAsignadas", label: "Funciones asignadas", type: "textarea", required: true },
      { key: "fechaDesignacion", label: "Fecha de designación", type: "date", required: true },
    ],
    accionesDs44Relacionadas: ["responsable", "organizacion"],
    ...crearRender("Acta de Designación de Responsable SST", [["responsableNombre", "Responsable designado"], ["responsableCargo", "Cargo"], ["funcionesAsignadas", "Funciones asignadas"], ["fechaDesignacion", "Fecha de designación"]]),
  },
  {
    codigo: "PROGRAMA_TRABAJO_PREVENTIVO", nombre: "Programa de Trabajo Preventivo DS44", categoria: "Planificación preventiva",
    descripcion: "Consolida objetivos, responsables y actividades preventivas del período.", objetivo: "Ordenar la ejecución y el seguimiento del trabajo preventivo DS44.",
    campos: [
      { key: "periodo", label: "Período", type: "text", required: true },
      { key: "objetivoGeneral", label: "Objetivo general", type: "textarea", required: true },
      { key: "responsablePrograma", label: "Responsable del programa", type: "text", required: true },
      { key: "actividadesPrincipales", label: "Actividades principales", type: "textarea", required: true },
    ],
    accionesDs44Relacionadas: ["programa", "plan"],
    ...crearRender("Programa de Trabajo Preventivo DS44", [["periodo", "Período"], ["objetivoGeneral", "Objetivo general"], ["responsablePrograma", "Responsable del programa"], ["actividadesPrincipales", "Actividades principales"]]),
  },
  {
    codigo: "REGISTRO_CAPACITACION_INFORMACION", nombre: "Registro de Información y Capacitación SST", categoria: "Información y capacitación",
    descripcion: "Registra una actividad de información o capacitación y sus participantes.", objetivo: "Acreditar la entrega de información preventiva y capacitación SST.",
    campos: [
      { key: "tema", label: "Tema", type: "text", required: true },
      { key: "relator", label: "Relator", type: "text", required: true },
      { key: "fechaActividad", label: "Fecha de la actividad", type: "date", required: true },
      { key: "participantesTexto", label: "Participantes", type: "textarea", required: true },
    ],
    accionesDs44Relacionadas: ["capacitacion", "informacion"],
    ...crearRender("Registro de Información y Capacitación SST", [["tema", "Tema"], ["relator", "Relator"], ["fechaActividad", "Fecha de la actividad"], ["participantesTexto", "Participantes"]]),
  },
  {
    codigo: "ACTA_REVISION_GERENCIAL", nombre: "Acta de Revisión Gerencial SST", categoria: "Seguimiento y mejora",
    descripcion: "Documenta la revisión de desempeño, acuerdos y responsables de seguimiento.", objetivo: "Dejar trazabilidad de la revisión ejecutiva y de los acuerdos de mejora SST.",
    campos: [
      { key: "fechaRevision", label: "Fecha de revisión", type: "date", required: true },
      { key: "asistentes", label: "Asistentes", type: "textarea", required: true },
      { key: "temasTratados", label: "Temas tratados", type: "textarea", required: true },
      { key: "acuerdos", label: "Acuerdos", type: "textarea", required: true },
      { key: "responsableSeguimiento", label: "Responsable de seguimiento", type: "text", required: true },
    ],
    accionesDs44Relacionadas: ["revision", "seguimiento"],
    ...crearRender("Acta de Revisión Gerencial SST", [["fechaRevision", "Fecha de revisión"], ["asistentes", "Asistentes"], ["temasTratados", "Temas tratados"], ["acuerdos", "Acuerdos"], ["responsableSeguimiento", "Responsable de seguimiento"]]),
  },
];

export function getPlantillaDs44(codigo: Ds44PlantillaCodigo): PlantillaInterna | undefined {
  return DS44_PLANTILLAS.find((plantilla) => plantilla.codigo === codigo);
}
