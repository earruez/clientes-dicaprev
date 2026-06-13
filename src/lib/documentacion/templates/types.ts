export const DOCUMENT_TEMPLATE_CODES = [
  "IRL",
  "ENTREGA_EPP",
  "RECEPCION_RI",
  "REGISTRO_INDUCCION",
  "PTS",
] as const;

export type DocumentTemplateCode = (typeof DOCUMENT_TEMPLATE_CODES)[number];

export type DocumentoIdentificacionTrabajador = {
  nombre: string;
  rut: string;
  cargo: string;
  area: string;
};

export type DocumentoFirma = {
  rol: string;
  nombre: string;
  rut?: string;
  fecha?: string;
  firmaDigital?: string;
};

export type DocumentoTrazabilidad = {
  generadoEn: string;
  generadoPor: string;
  fuente: "manual" | "ia" | "mixto";
  idReferencia?: string;
};

export type DocumentShellData = {
  titulo: string;
  codigoDocumento: string;
  version: string;
  fechaEmision: string;
  empresaPrincipal: string;
  empresaRut?: string;
  empresaContratista?: string;
  empresaMandante?: string;
  centroTrabajo?: string;
  trabajador: DocumentoIdentificacionTrabajador;
  declaracionFinal: string;
  firmas: DocumentoFirma[];
  trazabilidad: DocumentoTrazabilidad;
  pieDocumento?: string;
};

export type DocumentoCampo = {
  etiqueta: string;
  valor: string;
};

export type DocumentoFilaTabla = Record<string, string | number | boolean | null | undefined>;

export type DocumentoBloqueTexto = {
  tipo: "texto";
  texto: string;
};

export type DocumentoBloqueCampos = {
  tipo: "campos";
  campos: DocumentoCampo[];
};

export type DocumentoBloqueTabla = {
  tipo: "tabla";
  columnas: string[];
  filas: DocumentoFilaTabla[];
};

export type DocumentoBloqueLista = {
  tipo: "lista";
  items: string[];
  ordenada?: boolean;
};

export type DocumentoBloque =
  | DocumentoBloqueTexto
  | DocumentoBloqueCampos
  | DocumentoBloqueTabla
  | DocumentoBloqueLista;

export type DocumentoSeccion = {
  id: string;
  titulo: string;
  descripcion?: string;
  requerida: boolean;
  bloques: DocumentoBloque[];
};

export type DocumentoPlantillaRenderizada = {
  shell: DocumentShellData;
  secciones: DocumentoSeccion[];
};

export type DocumentoTemplateDefinition<TPayload> = {
  codigo: DocumentTemplateCode;
  nombre: string;
  descripcion: string;
  version: string;
  referenciaVisual?: string;
  seccionesRequeridas: Array<{
    id: string;
    titulo: string;
    descripcion: string;
  }>;
  baseNormativa: string[];
  construir: (payload: TPayload, shell: DocumentShellData) => DocumentoPlantillaRenderizada;
};
