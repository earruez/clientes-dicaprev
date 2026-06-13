import {
  construirDocumentoPlantilla,
  crearSeccionDocumento,
} from "@/lib/documentacion/templates/document-shell";
import type {
  DocumentShellData,
  DocumentoPlantillaRenderizada,
  DocumentoTemplateDefinition,
} from "@/lib/documentacion/templates/types";

type RiesgoItem = {
  peligro: string;
  consecuencia: string;
  medidaControl: string;
};

type EppEntregaItem = {
  elemento: string;
  cantidad: number;
  norma?: string;
  estado: string;
};

type ActividadPts = {
  actividad: string;
  peligro: string;
  control: string;
};

export type PayloadPlantillaIrl = {
  actividad: string;
  riesgos: RiesgoItem[];
  protocolosAplicables: string[];
};

export type PayloadPlantillaEntregaEpp = {
  elementosEntregados: EppEntregaItem[];
  instruccionesUso: string[];
};

export type PayloadPlantillaRecepcionRi = {
  versionReglamento: string;
  fechaRecepcion: string;
  resumenContenido: string[];
};

export type PayloadPlantillaRegistroInduccion = {
  fechaInduccion: string;
  duracion: string;
  temasTratados: string[];
  evaluacion?: string;
};

export type PayloadPlantillaPts = {
  nombreTarea: string;
  actividades: ActividadPts[];
  permisosRequeridos: string[];
};

function buildIrl(
  payload: PayloadPlantillaIrl,
  shell: DocumentShellData,
): DocumentoPlantillaRenderizada {
  const secciones = [
    crearSeccionDocumento({
      id: "actividad",
      titulo: "Actividad Evaluada",
      descripcion: "Resumen de la actividad y condiciones del puesto.",
      bloques: [{ tipo: "texto", texto: payload.actividad }],
    }),
    crearSeccionDocumento({
      id: "riesgos",
      titulo: "Identificacion de Riesgos",
      bloques: [
        {
          tipo: "tabla",
          columnas: ["peligro", "consecuencia", "medidaControl"],
          filas: payload.riesgos,
        },
      ],
    }),
    crearSeccionDocumento({
      id: "protocolos",
      titulo: "Protocolos Aplicables",
      requerida: false,
      bloques: [{ tipo: "lista", items: payload.protocolosAplicables }],
    }),
  ];

  return construirDocumentoPlantilla(shell, secciones);
}

function buildEntregaEpp(
  payload: PayloadPlantillaEntregaEpp,
  shell: DocumentShellData,
): DocumentoPlantillaRenderizada {
  const secciones = [
    crearSeccionDocumento({
      id: "entrega_epp",
      titulo: "EPP Entregado",
      bloques: [
        {
          tipo: "tabla",
          columnas: ["elemento", "cantidad", "norma", "estado"],
          filas: payload.elementosEntregados,
        },
      ],
    }),
    crearSeccionDocumento({
      id: "instrucciones_uso",
      titulo: "Instrucciones de Uso",
      bloques: [{ tipo: "lista", items: payload.instruccionesUso, ordenada: true }],
    }),
  ];

  return construirDocumentoPlantilla(shell, secciones);
}

function buildRecepcionRi(
  payload: PayloadPlantillaRecepcionRi,
  shell: DocumentShellData,
): DocumentoPlantillaRenderizada {
  const secciones = [
    crearSeccionDocumento({
      id: "recepcion_reglamento",
      titulo: "Recepcion del Reglamento Interno",
      bloques: [
        {
          tipo: "campos",
          campos: [
            { etiqueta: "Version reglamento", valor: payload.versionReglamento },
            { etiqueta: "Fecha recepcion", valor: payload.fechaRecepcion },
          ],
        },
      ],
    }),
    crearSeccionDocumento({
      id: "resumen_contenido",
      titulo: "Resumen de Contenido Informado",
      bloques: [{ tipo: "lista", items: payload.resumenContenido }],
    }),
  ];

  return construirDocumentoPlantilla(shell, secciones);
}

function buildRegistroInduccion(
  payload: PayloadPlantillaRegistroInduccion,
  shell: DocumentShellData,
): DocumentoPlantillaRenderizada {
  const secciones = [
    crearSeccionDocumento({
      id: "detalle_induccion",
      titulo: "Detalle de la Induccion",
      bloques: [
        {
          tipo: "campos",
          campos: [
            { etiqueta: "Fecha", valor: payload.fechaInduccion },
            { etiqueta: "Duracion", valor: payload.duracion },
          ],
        },
      ],
    }),
    crearSeccionDocumento({
      id: "temas",
      titulo: "Temas Tratados",
      bloques: [{ tipo: "lista", items: payload.temasTratados }],
    }),
    crearSeccionDocumento({
      id: "evaluacion",
      titulo: "Evaluacion",
      requerida: false,
      bloques: [{ tipo: "texto", texto: payload.evaluacion ?? "Sin observaciones" }],
    }),
  ];

  return construirDocumentoPlantilla(shell, secciones);
}

function buildPts(
  payload: PayloadPlantillaPts,
  shell: DocumentShellData,
): DocumentoPlantillaRenderizada {
  const secciones = [
    crearSeccionDocumento({
      id: "tarea",
      titulo: "Tarea y Alcance",
      bloques: [{ tipo: "texto", texto: payload.nombreTarea }],
    }),
    crearSeccionDocumento({
      id: "analisis",
      titulo: "Analisis de Trabajo Seguro",
      bloques: [
        {
          tipo: "tabla",
          columnas: ["actividad", "peligro", "control"],
          filas: payload.actividades,
        },
      ],
    }),
    crearSeccionDocumento({
      id: "permisos",
      titulo: "Permisos y Requisitos",
      requerida: false,
      bloques: [{ tipo: "lista", items: payload.permisosRequeridos }],
    }),
  ];

  return construirDocumentoPlantilla(shell, secciones);
}

export const buildPlantillaIrl: DocumentoTemplateDefinition<PayloadPlantillaIrl>["construir"] =
  (payload, shell) => buildIrl(payload, shell);

export const buildPlantillaEntregaEpp: DocumentoTemplateDefinition<PayloadPlantillaEntregaEpp>["construir"] =
  (payload, shell) => buildEntregaEpp(payload, shell);

export const buildPlantillaRecepcionRi: DocumentoTemplateDefinition<PayloadPlantillaRecepcionRi>["construir"] =
  (payload, shell) => buildRecepcionRi(payload, shell);

export const buildPlantillaRegistroInduccion: DocumentoTemplateDefinition<PayloadPlantillaRegistroInduccion>["construir"] =
  (payload, shell) => buildRegistroInduccion(payload, shell);

export const buildPlantillaPts: DocumentoTemplateDefinition<PayloadPlantillaPts>["construir"] =
  (payload, shell) => buildPts(payload, shell);
