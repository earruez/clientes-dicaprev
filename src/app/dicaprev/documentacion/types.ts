export type CategoriaDocumento =
  | "legales_empresa"
  | "laborales_previsionales"
  | "sst"
  | "mutualidad_ley_16744"
  | "protocolos";

export type EstadoDocumento =
  | "vigente"
  | "por_vencer"
  | "vencido"
  | "pendiente_carga"
  | "en_revision"
  | "reemplazado"
  | "no_aplica";

export type HistorialDocumento = {
  id: string;
  fecha: string;
  usuario: string;
  usuarioEmail: string;
  accion: "Documento cargado" | "Documento reemplazado" | "Estado actualizado" | "Vencimiento actualizado" | "Observación agregada" | "Metadatos actualizados" | "Marcado como no aplica";
  detalle: string;
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