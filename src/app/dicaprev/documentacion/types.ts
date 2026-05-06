export type CategoriaDocumento =
  | "legales_empresa"
  | "laborales_previsionales"
  | "sst"
  | "mutualidad_ley_16744"
  | "protocolos"
  | "plantillas_formatos";

export type EstadoDocumento =
  | "vigente"
  | "por_vencer"
  | "vencido"
  | "pendiente_carga"
  | "en_revision"
  | "reemplazado"
  | "no_aplica"
  | "Vigente"
  | "Por vencer"
  | "Vencido"
  | "Pendiente de carga"
  | "En revisión"
  | "Reemplazado"
  | "No aplica";

export type HistorialDocumento = {
  id: string;
  fecha: string;
  usuario: string;
  usuarioEmail: string;
  accion: string;
  detalle: string;
  version?: string | null;
  archivoNombre?: string | null;
  archivoNombreOriginal?: string | null;
  archivoUrl?: string | null;
  archivoTipo?: string | null;
  archivoPeso?: number | null;
};

export type DocumentoEmpresa = {
  id: string;
  nombre: string;
  categoria: CategoriaDocumento;
  tipo: string;
  estado: EstadoDocumento;
  fechaEmision: string;
  fechaVencimiento: string | null;
  tieneVencimiento: boolean;
  archivoNombre: string | null;
  archivoNombreOriginal?: string | null;
  archivoUrl: string | null;
  archivoPeso: number | null;
  archivoTipo: string | null;
  version: string;
  subidoPor: string;
  subidoPorEmail: string;
  fechaSubida: string;
  actualizadoPor: string;
  fechaActualizacion: string;
  observaciones: string;
  historial: HistorialDocumento[];
};

export type DocumentoMatrizRow = {
  id: string;
  documentoRequeridoId: string | null;
  documentoEmpresaId: string | null;
  nombre: string;
  categoria: CategoriaDocumento;
  descripcion: string;
  obligatorio: boolean;
  estado: EstadoDocumento;
  vigencia: string;
  ultimoArchivo: string | null;
  version: string | null;
  subidoPor: string | null;
  subidoPorEmail: string | null;
  fechaSubida: string | null;
  fechaActualizacion: string | null;
  archivoNombre: string | null;
  archivoNombreOriginal?: string | null;
  archivoUrl: string | null;
  archivoTipo: string | null;
  archivoPeso: number | null;
  tipo: string;
  fechaEmision: string;
  fechaVencimiento: string | null;
  tieneVencimiento: boolean;
  observaciones: string;
  historial: HistorialDocumento[];
  esAdicional: boolean;
  aplicaDesdeTrabajadores: number | null;
  aplicaHastaTrabajadores: number | null;
  esAplicable: boolean;
};

export type TabDocumentacion = "todos" | CategoriaDocumento | "historial";

export type VigenciaFiltro = "todas" | "vigente" | "por_vencer" | "vencido" | "sin_vencimiento";

export type DocumentosFiltros = {
  categoria: CategoriaDocumento | "todas";
  estado: EstadoDocumento | "todos";
  vigencia: VigenciaFiltro;
  search: string;
  subidoPor: string;
  fechaSubida: string;
};

export type UsuarioSesionMock = {
  nombre: string;
  email: string;
};