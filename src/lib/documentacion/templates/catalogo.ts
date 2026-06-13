import {
  buildPlantillaEntregaEpp,
  buildPlantillaIrl,
  buildPlantillaPts,
  buildPlantillaRecepcionRi,
  buildPlantillaRegistroInduccion,
  type PayloadPlantillaEntregaEpp,
  type PayloadPlantillaIrl,
  type PayloadPlantillaPts,
  type PayloadPlantillaRecepcionRi,
  type PayloadPlantillaRegistroInduccion,
} from "@/lib/documentacion/templates/builders";
import type {
  DocumentTemplateCode,
  DocumentoTemplateDefinition,
} from "@/lib/documentacion/templates/types";

export const PLANTILLA_IRL: DocumentoTemplateDefinition<PayloadPlantillaIrl> = {
  codigo: "IRL",
  nombre: "Informe de Riesgos Laborales",
  descripcion: "Plantilla para identificar riesgos, controles y protocolos asociados al puesto.",
  version: "1.0.0",
  referenciaVisual: "docs/referencias/formato_irl_nextprev_mvp.pdf",
  seccionesRequeridas: [
    {
      id: "actividad",
      titulo: "Actividad Evaluada",
      descripcion: "Resumen de tareas y contexto operativo del trabajador.",
    },
    {
      id: "riesgos",
      titulo: "Identificacion de Riesgos",
      descripcion: "Tabla de peligros, consecuencias y medidas de control.",
    },
  ],
  baseNormativa: ["Ley 16.744", "DS 44", "DS 54"],
  construir: buildPlantillaIrl,
};

export const PLANTILLA_ENTREGA_EPP: DocumentoTemplateDefinition<PayloadPlantillaEntregaEpp> = {
  codigo: "ENTREGA_EPP",
  nombre: "Acta de Entrega de EPP",
  descripcion: "Plantilla para dejar trazabilidad de EPP entregado al trabajador.",
  version: "1.0.0",
  seccionesRequeridas: [
    {
      id: "entrega_epp",
      titulo: "EPP Entregado",
      descripcion: "Listado de elementos, cantidad, norma y estado.",
    },
    {
      id: "instrucciones_uso",
      titulo: "Instrucciones de Uso",
      descripcion: "Uso correcto, mantenimiento y reposicion.",
    },
  ],
  baseNormativa: ["Ley 16.744", "DS 44"],
  construir: buildPlantillaEntregaEpp,
};

export const PLANTILLA_RECEPCION_RI: DocumentoTemplateDefinition<PayloadPlantillaRecepcionRi> = {
  codigo: "RECEPCION_RI",
  nombre: "Recepcion de Reglamento Interno",
  descripcion: "Plantilla para acreditar recepcion e informacion del reglamento interno.",
  version: "1.0.0",
  seccionesRequeridas: [
    {
      id: "recepcion_reglamento",
      titulo: "Recepcion del Reglamento Interno",
      descripcion: "Version informada y fecha de recepcion firmada.",
    },
    {
      id: "resumen_contenido",
      titulo: "Resumen de Contenido Informado",
      descripcion: "Puntos principales revisados con el trabajador.",
    },
  ],
  baseNormativa: ["Codigo del Trabajo", "Reglamento Interno de Orden, Higiene y Seguridad"],
  construir: buildPlantillaRecepcionRi,
};

export const PLANTILLA_REGISTRO_INDUCCION: DocumentoTemplateDefinition<PayloadPlantillaRegistroInduccion> = {
  codigo: "REGISTRO_INDUCCION",
  nombre: "Registro de Induccion",
  descripcion: "Plantilla para certificar induccion de seguridad y temas tratados.",
  version: "1.0.0",
  seccionesRequeridas: [
    {
      id: "detalle_induccion",
      titulo: "Detalle de la Induccion",
      descripcion: "Fecha, duracion y responsables de la induccion.",
    },
    {
      id: "temas",
      titulo: "Temas Tratados",
      descripcion: "Listado de materias revisadas en la induccion.",
    },
  ],
  baseNormativa: ["Ley 16.744", "DS 40"],
  construir: buildPlantillaRegistroInduccion,
};

export const PLANTILLA_PTS: DocumentoTemplateDefinition<PayloadPlantillaPts> = {
  codigo: "PTS",
  nombre: "Procedimiento de Trabajo Seguro",
  descripcion: "Plantilla para definir pasos seguros y controles de la tarea.",
  version: "1.0.0",
  seccionesRequeridas: [
    {
      id: "tarea",
      titulo: "Tarea y Alcance",
      descripcion: "Descripcion general del procedimiento.",
    },
    {
      id: "analisis",
      titulo: "Analisis de Trabajo Seguro",
      descripcion: "Matriz de actividad, peligro y control.",
    },
  ],
  baseNormativa: ["Ley 16.744", "DS 44", "DS 594"],
  construir: buildPlantillaPts,
};

export const CATALOGO_PLANTILLAS_DOCUMENTALES = [
  PLANTILLA_IRL,
  PLANTILLA_ENTREGA_EPP,
  PLANTILLA_RECEPCION_RI,
  PLANTILLA_REGISTRO_INDUCCION,
  PLANTILLA_PTS,
] as const;

export function getPlantillaDocumentalPorCodigo(codigo: DocumentTemplateCode) {
  return CATALOGO_PLANTILLAS_DOCUMENTALES.find((plantilla) => plantilla.codigo === codigo) ?? null;
}
