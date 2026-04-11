import type {
  ObligacionCumplimiento,
  Hallazgo,
  Evidencia,
  EvidenciaCumplimiento,
} from "./types";

// =========================================================
//  Centros (IDs compartidos entre mocks)
// =========================================================
export const CENTROS_MOCK = [
  { id: "c1", nombre: "Sede Central MVP Chile" },
];

// =========================================================
//  Obligaciones DS44
// =========================================================
export const OBLIGACIONES_MOCK: ObligacionCumplimiento[] = [
  {
    id: "ob-01",
    nombre: "Plan de emergencia y evacuación actualizado",
    tipo: "Plan / Procedimiento",
    descripcion: "La empresa debe contar con un plan de emergencia vigente, difundido y practicado.",
    frecuencia: "Anual o ante cambios de condición",
    responsable: "Encargado de Prevención / Administración",
    estadosPorCentro: { c1: "con_brechas" },
    cumplimientoGlobal: 50,
    vencimiento: "2026-06-30",
    tamañosAplica: ["micro", "pequena", "mediana", "grande"],
  },
  {
    id: "ob-02",
    nombre: "Matriz de Identificación de Peligros y Evaluación de Riesgos (IPER)",
    tipo: "Matriz de riesgos",
    descripcion: "IPER vigente por área y proceso.",
    frecuencia: "Inicial y al menos anual",
    responsable: "Prevencionista / Encargado SST",
    estadosPorCentro: { c1: "no_cumplida" },
    cumplimientoGlobal: 0,
    vencimiento: "2026-03-31",
    tamañosAplica: ["micro", "pequena", "mediana", "grande"],
  },
  {
    id: "ob-03",
    nombre: "Reglamento Interno de Higiene y Seguridad",
    tipo: "Reglamento interno",
    descripcion: "Reglamento actualizado, firmado y distribuido a todos los trabajadores.",
    frecuencia: "Según cambios normativos u organizacionales",
    responsable: "RRHH / Representante legal",
    estadosPorCentro: { c1: "cumplida" },
    cumplimientoGlobal: 100,
    vencimiento: "2026-12-31",
    tamañosAplica: ["pequena", "mediana", "grande"],
  },
  {
    id: "ob-04",
    nombre: "Programa anual de trabajo en prevención",
    tipo: "Programa de gestión",
    descripcion: "Programa aprobado por la Dirección con indicadores y metas para el año en curso.",
    frecuencia: "Anual",
    responsable: "Prevención / Gerencia",
    estadosPorCentro: { c1: "con_brechas" },
    cumplimientoGlobal: 50,
    vencimiento: "2026-12-31",
    tamañosAplica: ["mediana", "grande"],
  },
  {
    id: "ob-05",
    nombre: "Registros de accidentes del trabajo y de trayecto",
    tipo: "Registro / Control",
    descripcion: "Registro actualizado de accidentes con tasas de siniestralidad.",
    frecuencia: "Continuo / mensual",
    responsable: "Prevención / RRHH",
    estadosPorCentro: { c1: "cumplida" },
    cumplimientoGlobal: 100,
    tamañosAplica: ["micro", "pequena", "mediana", "grande"],
  },
  {
    id: "ob-06",
    nombre: "Certificados de aptitud médica vigentes",
    tipo: "Certificados / Exámenes médicos",
    descripcion: "Todo trabajador debe contar con examen preocupacional vigente y controles periódicos al día.",
    frecuencia: "Al ingreso y periódicamente",
    responsable: "RRHH / Servicio de Salud",
    estadosPorCentro: { c1: "no_cumplida" },
    cumplimientoGlobal: 0,
    vencimiento: "2026-04-30",
    tamañosAplica: ["pequena", "mediana", "grande"],
  },
];

// =========================================================
//  Hallazgos
// =========================================================
export const HALLAZGOS_MOCK: Hallazgo[] = [
  {
    id: "h-001",
    tipo: "equipos",
    descripcion: "Extintor vencido en bodega de la sede central",
    centroId: "c1",
    centroNombre: "Sede Central MVP Chile",
    obligacionId: "ob-01",
    obligacionNombre: "Plan de emergencia y evacuación actualizado",
    estado: "abierto",
    prioridad: "critica",
    fechaCompromiso: "2026-04-20",
    fechaCreacion: "2026-03-15T10:00:00Z",
    creadoPor: "Jorge Mena Contreras",
    historial: [
      { fecha: "2026-03-15T10:00:00Z", usuario: "Jorge Mena Contreras", accion: "Creación de hallazgo" },
    ],
    evidenciaIds: [],
  },
  {
    id: "h-002",
    tipo: "documental",
    descripcion: "Documentación incompleta del trabajador Ricardo Flores Pavez (ODI rechazada)",
    centroId: "c1",
    centroNombre: "Sede Central MVP Chile",
    trabajadorNombre: "Ricardo Flores Pavez",
    obligacionId: "ob-06",
    obligacionNombre: "Certificados de aptitud médica vigentes",
    estado: "abierto",
    prioridad: "critica",
    fechaCompromiso: "2026-04-25",
    fechaCreacion: "2026-03-18T09:00:00Z",
    creadoPor: "Cristina Reyes Soto",
    historial: [
      { fecha: "2026-03-18T09:00:00Z", usuario: "Cristina Reyes Soto", accion: "Creación de hallazgo" },
    ],
    evidenciaIds: [],
  },
  {
    id: "h-003",
    tipo: "capacitacion",
    descripcion: "Inducción SST no completada — trabajadores Juan Muñoz (vencida) y Ricardo Flores (vencida)",
    centroId: "c1",
    centroNombre: "Sede Central MVP Chile",
    obligacionId: "ob-04",
    obligacionNombre: "Programa anual de trabajo en prevención",
    estado: "en_proceso",
    prioridad: "alta",
    fechaCompromiso: "2026-05-15",
    fechaCreacion: "2026-03-20T11:00:00Z",
    creadoPor: "Jorge Mena Contreras",
    historial: [
      { fecha: "2026-03-20T11:00:00Z", usuario: "Jorge Mena Contreras", accion: "Creación de hallazgo" },
      { fecha: "2026-04-01T09:00:00Z", usuario: "Cristina Reyes Soto", accion: "Actualización de estado", detalle: "Se contactó OTEC. Cupo disponible en abril." },
    ],
    evidenciaIds: ["ev-001"],
  },
  {
    id: "h-004",
    tipo: "documental",
    descripcion: "IPER no actualizada — no refleja proceso de corte de perfiles y trabajo en altura en fachadas",
    centroId: "c1",
    centroNombre: "Sede Central MVP Chile",
    obligacionId: "ob-02",
    obligacionNombre: "Matriz IPER",
    estado: "en_proceso",
    prioridad: "media",
    fechaCompromiso: "2026-05-01",
    fechaCreacion: "2026-03-10T15:00:00Z",
    creadoPor: "Jorge Mena Contreras",
    historial: [
      { fecha: "2026-03-10T15:00:00Z", usuario: "Jorge Mena Contreras", accion: "Creación de hallazgo" },
      { fecha: "2026-03-28T09:00:00Z", usuario: "Juan Muñoz Carvajal", accion: "Actualización de estado", detalle: "Se inició proceso de actualización con supervisor." },
    ],
    evidenciaIds: [],
  },
];

// =========================================================
//  Evidencias
// =========================================================
export const EVIDENCIAS_MOCK: Evidencia[] = [
  {
    id: "ev-001",
    hallazgoId: "h-003",
    hallazgoDescripcion: "Inducción SST no completada",
    tipoDocumento: "registro",
    nombre: "ConfirmacionCupoOTEC_Abr2026.pdf",
    fecha: "2026-04-01",
    usuario: "Cristina Reyes Soto",
    centroNombre: "Sede Central MVP Chile",
    cierraHallazgo: false,
  },
];

// =========================================================
//  Evidencias alineadas con el motor de cumplimiento
// =========================================================
export const EVIDENCIAS_CUMPLIMIENTO_MOCK: EvidenciaCumplimiento[] = [
  {
    id: "evc-001",
    titulo: "Confirmación cupo capacitación OTEC — Abril 2026",
    tipo: "registro",
    fecha: "2026-04-01",
    obligacionId: "ob-04",
    obligacionNombre: "Programa anual de trabajo en prevención",
    hallazgoId: "h-003",
    hallazgoDescripcion: "Inducción SST no completada",
    accionId: "accion-h-003",
    accionTitulo: "Inscribir trabajadores en inducción SST",
    entidadId: "c1",
    entidadNombre: "Sede Central MVP Chile",
    observacion: "Cupo confirmado para Juan Muñoz y Ricardo Flores. Fecha: 2026-04-22.",
    subidaPor: "Cristina Reyes Soto",
    estado: "valida",
    cierraHallazgo: false,
  },
];
