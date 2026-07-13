export type CrearInduccionTrabajadorInput = {
  empresaId: string;
  trabajadorId: string;
  observaciones?: string;
};

export type InduccionListItem = {
  id: string;
  token: string;
  estado: string;
  trabajador: {
    nombres: string;
    apellidos: string;
    rut: string | null;
    cargo: string | null;
  };
  firmasTotales: number;
  firmasFirmadas: number;
  fechaInicio: string | null;
  fechaTermino: string | null;
  createdAt: string;
};

export type InduccionPublicaView = {
  id: string;
  token: string;
  estado: string;
  nombreTrabajador: string;
  rutTrabajador: string | null;
  cargoTrabajador: string | null;
  fechaInicio: string | null;
  fechaTermino: string | null;
  documentosGenerados: {
    id: string;
    tipo: string;
    titulo: string;
    contenidoMarkdown: string;
    estado: string;
    firma: {
      token: string;
      estado: string;
      firmadoAt: string | null;
    } | null;
  }[];
  firmas: {
    id: string;
    token: string;
    tituloDocumento: string;
    descripcion: string | null;
    estado: string;
    firmadoAt: string | null;
    expiresAt: string | null;
  }[];
};

export type SincronizacionBackfillError = {
  induccionId: string;
  documentoId: string;
  mensaje: string;
};

export type SincronizacionBackfillResumen = {
  revisados: number;
  creados: number;
  actualizados: number;
  omitidos: number;
  errores: SincronizacionBackfillError[];
};