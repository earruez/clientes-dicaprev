export type DocumentStatus = "vigente" | "vencido" | "pendiente";

export type Documento = {
  id: string;
  nombre: string;
  tipo: string; // e.g., "contrato", "certificado", "manual"
  status: DocumentStatus;
  fechaVencimiento: string; // ISO date string
  responsable: string;
  obra?: string;
};

export type DocumentosFiltros = {
  status: DocumentStatus | "todos";
  search: string;
};