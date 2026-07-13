export type CapacitacionCatalogo = {
  id: string;
  nombre: string;
  codigo: string;
  categoria: string;
  descripcion: string;
  modalidad: string;
  duracionHoras: number;
  requiereEvaluacion: boolean;
  requiereFirma: boolean;
  generaCertificado: boolean;
  vigenciaMeses: number;
  aplicaCargos: string[];
  aplicaAreas: string[];
  aplicaCentros: string[];
  esObligatoria: boolean;
  materialUrl?: string;
  videoUrl?: string;
  documentoUrl?: string;
  activa: boolean;
  createdAt: string;
};

export type CreateCapacitacionInput = {
  codigo: string;
  nombre: string;
  categoria: string;
  descripcion?: string;
  modalidad: string;
  duracionHoras?: number | null;
  vigenciaMeses?: number | null;
  requiereEvaluacion?: boolean;
  requiereFirma?: boolean;
  generaCertificado?: boolean;
  esObligatoria?: boolean;
  activa?: boolean;
};

export type UpdateCapacitacionInput = Partial<CreateCapacitacionInput>;

export type TrabajadorAsignableCapacitacion = {
  id: string;
  nombre: string;
  apellido: string;
  rut: string;
  email: string;
  cargo: string;
  area: string;
  centroTrabajo: string;
  estado: string;
};

export type CapacitacionesRuntimeDiagnostic = {
  ok: boolean;
  usuarioId: string;
  email: string;
  rol: string;
  empresaId: string;
  empresasActivasSistema: number;
  metricas: {
    catalogo: number;
    asignaciones: number;
    sesiones: number;
    historial: number;
    trabajadoresActivos: number;
  };
};

export type EstadoCapacitacionAsignacion =
  | "pendiente"
  | "enviada"
  | "en_progreso"
  | "completada"
  | "vencida"
  | "cancelada";

export type AsignacionCapacitacion = {
  id: string;
  trabajadorId: string;
  trabajadorNombre: string;
  capacitacionId: string;
  capacitacionNombre: string;
  categoria: string;
  modalidad?: string;
  generaCertificado: boolean;
  sesionId?: string;
  origen: string;
  estado: EstadoCapacitacionAsignacion;
  fechaAsignacion: string;
  fechaEnvio?: string;
  fechaInicio?: string;
  fechaCompletada?: string;
  fechaRespuesta?: string;
  fechaVencimiento?: string;
  fechaCancelacion?: string;
  token?: string;
  observacion?: string;
  nota?: number;
  aprobado?: boolean;
  evidenciaDocumentoId?: string;
  certificadoDocumentoId?: string;
  evidenciaId?: string;
  certificadoId?: string;
  documentoId?: string;
  envioEstado?: "no_enviado" | "enviado" | "fallido" | "reenviado";
  fechaUltimoEnvio?: string;
  cantidadEnvios?: number;
  ultimoErrorEnvio?: string;
  fechaAperturaLink?: string;
  avanceEstado?: "pendiente" | "link_abierto" | "iniciada" | "completada" | "aprobada" | "reprobada";
  createdAt: string;
  updatedAt: string;
};

export type GetCapacitacionAsignacionesFilters = {
  trabajadorId?: string;
  capacitacionId?: string;
  estado?: EstadoCapacitacionAsignacion;
  includeCanceladas?: boolean;
};

export type CreateCapacitacionAsignacionInput = {
  trabajadorId: string;
  capacitacionId: string;
  sesionId?: string | null;
  origen?: string;
  estado?: EstadoCapacitacionAsignacion;
  fechaAsignacion?: string | Date;
  fechaEnvio?: string | Date | null;
  fechaInicio?: string | Date | null;
  fechaCompletada?: string | Date | null;
  fechaVencimiento?: string | Date | null;
  fechaCancelacion?: string | Date | null;
  token?: string | null;
  observacion?: string | null;
  nota?: number | null;
  aprobado?: boolean | null;
  evidenciaDocumentoId?: string | null;
  certificadoDocumentoId?: string | null;
  forceReasignar?: boolean;
};

export type UpdateCapacitacionAsignacionInput = {
  trabajadorId?: string;
  capacitacionId?: string;
  sesionId?: string | null;
  origen?: string;
  estado?: EstadoCapacitacionAsignacion;
  fechaAsignacion?: string | Date;
  fechaEnvio?: string | Date | null;
  fechaInicio?: string | Date | null;
  fechaCompletada?: string | Date | null;
  fechaVencimiento?: string | Date | null;
  fechaCancelacion?: string | Date | null;
  token?: string | null;
  observacion?: string | null;
  nota?: number | null;
  aprobado?: boolean | null;
  evidenciaDocumentoId?: string | null;
  certificadoDocumentoId?: string | null;
};

export type CambiarEstadoCapacitacionAsignacionInput = {
  estado: EstadoCapacitacionAsignacion;
  observacion?: string | null;
  nota?: number | null;
  aprobado?: boolean | null;
  fechaEvento?: string | Date;
};

export type EstadoCapacitacionSesion =
  | "programada"
  | "en_curso"
  | "finalizada"
  | "cancelada";

export type EstadoAsistencia =
  | "presente"
  | "ausente"
  | "justificado"
  | "parcial";

export type CapacitacionSesionPregunta = {
  id: string;
  texto: string;
  opciones: string[];
  correcta: number;
};

export type CapacitacionSesion = {
  id: string;
  empresaId: string;
  capacitacionId: string;
  capacitacionNombre: string;
  titulo: string;
  fecha: string;
  horaInicio?: string;
  horaFin?: string;
  modalidad: string;
  ubicacion?: string;
  relator?: string;
  cupos?: number;
  videoUrl?: string;
  videoDuracionSegundos?: number;
  minimoVisualizacionPct: number;
  evaluacionPreguntas: CapacitacionSesionPregunta[];
  evaluacionMinimoAprobacion: number;
  asistentesConfirmados?: number;
  estado: EstadoCapacitacionSesion;
  createdAt: string;
  updatedAt: string;
};

export type AsistenciaCapacitacion = {
  id: string;
  empresaId: string;
  sesionId: string;
  trabajadorId: string;
  trabajadorNombre: string;
  estadoAsistencia: EstadoAsistencia;
  observacion?: string;
  registradoEn: string;
};

export type CreateCapacitacionSesionInput = {
  capacitacionId: string;
  titulo: string;
  fecha: string | Date;
  horaInicio?: string | null;
  horaFin?: string | null;
  modalidad: string;
  ubicacion?: string | null;
  relator?: string | null;
  cupos?: number | null;
  videoUrl?: string | null;
  videoDuracionSegundos?: number | null;
  minimoVisualizacionPct?: number | null;
  evaluacionPreguntas?: CapacitacionSesionPregunta[] | null;
  evaluacionMinimoAprobacion?: number | null;
};

export type UpdateCapacitacionSesionInput = {
  titulo?: string;
  fecha?: string | Date;
  horaInicio?: string | null;
  horaFin?: string | null;
  modalidad?: string;
  ubicacion?: string | null;
  relator?: string | null;
  cupos?: number | null;
  videoUrl?: string | null;
  videoDuracionSegundos?: number | null;
  minimoVisualizacionPct?: number | null;
  evaluacionPreguntas?: CapacitacionSesionPregunta[] | null;
  evaluacionMinimoAprobacion?: number | null;
};

export type CambiarEstadoCapacitacionSesionInput = {
  estado: EstadoCapacitacionSesion;
  observacion?: string | null;
  fechaEvento?: string | Date;
};

export type CreateAsistenciaInput = {
  sesionId: string;
  trabajadorId: string;
  estadoAsistencia: EstadoAsistencia;
  observacion?: string | null;
};

export type CapacitacionEvaluacion = {
  id: string;
  empresaId: string;
  trabajadorId: string;
  trabajadorNombre: string;
  capacitacionId: string;
  capacitacionNombre: string;
  asignacionId: string | null;
  sesionId: string | null;
  estado: string;
  asistencia: boolean | null;
  nota: number | null;
  aprobado: boolean | null;
  fechaEvaluacion: string;
  observacion: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateCapacitacionEvaluacionInput = {
  trabajadorId: string;
  capacitacionId: string;
  asignacionId?: string | null;
  sesionId?: string | null;
  asistencia?: boolean | null;
  nota?: number | null;
  aprobado?: boolean | null;
  fechaEvaluacion: string | Date;
  observacion?: string | null;
};

export type UpdateCapacitacionEvaluacionInput = {
  asistencia?: boolean | null;
  nota?: number | null;
  aprobado?: boolean | null;
  fechaEvaluacion?: string | Date;
  observacion?: string | null;
};

export type CapacitacionHistorialEvento = {
  id: string;
  empresaId: string;
  trabajadorId: string;
  trabajadorNombre: string;
  trabajadorRut: string;
  trabajadorCargo: string;
  capacitacionId: string;
  capacitacionNombre: string;
  asignacionId: string | null;
  sesionId: string | null;
  evaluacionId: string | null;
  tipoEvento: string;
  detalle: string | null;
  estado: string | null;
  fechaEvento: string;
  vigenciaHasta: string | null;
};
