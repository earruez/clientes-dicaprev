export type EstadoActividad = "realizada" | "pendiente" | "vencida" | "no_aplica";

export type MesShort =
  | "Ene"
  | "Feb"
  | "Mar"
  | "Abr"
  | "May"
  | "Jun"
  | "Jul"
  | "Ago"
  | "Sep"
  | "Oct"
  | "Nov"
  | "Dic";

export type ActividadPlan = {
  id: number;
  actividad: string;
  normativa: string;
  categoria: string;
  periodicidad: "Mensual" | "Trimestral" | "Semestral" | "Anual";
  responsable: string;
  centroContratista: string;
  requiereEvidencia: boolean;
  estado: EstadoActividad;
  evidencia: "cargada" | "pendiente" | "rechazada";
  critica?: boolean;
  meses: Record<MesShort, EstadoActividad>;
};

export const MESES_SHORT: MesShort[] = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

export const ACTIVIDADES_PLAN: ActividadPlan[] = [
  {
    id: 1,
    actividad: "Reunión mensual Comité Paritario",
    normativa: "Ley 16.744",
    categoria: "Comité Paritario",
    periodicidad: "Mensual",
    responsable: "Encargado de Prevención",
    centroContratista: "Casa Matriz",
    requiereEvidencia: true,
    estado: "realizada",
    evidencia: "cargada",
    meses: {
      Ene: "realizada",
      Feb: "realizada",
      Mar: "realizada",
      Abr: "pendiente",
      May: "pendiente",
      Jun: "pendiente",
      Jul: "no_aplica",
      Ago: "no_aplica",
      Sep: "no_aplica",
      Oct: "no_aplica",
      Nov: "no_aplica",
      Dic: "no_aplica",
    },
  },
  {
    id: 2,
    actividad: "Capacitación de inducción a trabajadores nuevos",
    normativa: "DS72",
    categoria: "Capacitación",
    periodicidad: "Mensual",
    responsable: "RRHH + Prevención",
    centroContratista: "Centro Norte",
    requiereEvidencia: true,
    estado: "pendiente",
    evidencia: "pendiente",
    critica: true,
    meses: {
      Ene: "realizada",
      Feb: "pendiente",
      Mar: "pendiente",
      Abr: "pendiente",
      May: "pendiente",
      Jun: "pendiente",
      Jul: "pendiente",
      Ago: "pendiente",
      Sep: "pendiente",
      Oct: "pendiente",
      Nov: "pendiente",
      Dic: "pendiente",
    },
  },
  {
    id: 3,
    actividad: "Inspección general de obra DS44",
    normativa: "DS44",
    categoria: "Inspección",
    periodicidad: "Trimestral",
    responsable: "Asesor Externo SST",
    centroContratista: "Contratista Alfa",
    requiereEvidencia: true,
    estado: "vencida",
    evidencia: "rechazada",
    critica: true,
    meses: {
      Ene: "no_aplica",
      Feb: "no_aplica",
      Mar: "vencida",
      Abr: "no_aplica",
      May: "no_aplica",
      Jun: "pendiente",
      Jul: "no_aplica",
      Ago: "no_aplica",
      Sep: "pendiente",
      Oct: "no_aplica",
      Nov: "no_aplica",
      Dic: "pendiente",
    },
  },
  {
    id: 4,
    actividad: "Actualización reglamento interno",
    normativa: "Codigo del Trabajo",
    categoria: "Documentación",
    periodicidad: "Anual",
    responsable: "Gerencia SST",
    centroContratista: "Casa Matriz",
    requiereEvidencia: true,
    estado: "pendiente",
    evidencia: "pendiente",
    meses: {
      Ene: "no_aplica",
      Feb: "no_aplica",
      Mar: "no_aplica",
      Abr: "pendiente",
      May: "no_aplica",
      Jun: "no_aplica",
      Jul: "no_aplica",
      Ago: "no_aplica",
      Sep: "no_aplica",
      Oct: "no_aplica",
      Nov: "no_aplica",
      Dic: "no_aplica",
    },
  },
  {
    id: 5,
    actividad: "Mantención anual extintores",
    normativa: "DS594",
    categoria: "Mantención",
    periodicidad: "Anual",
    responsable: "Proveedor Externo",
    centroContratista: "Todos los centros",
    requiereEvidencia: true,
    estado: "realizada",
    evidencia: "cargada",
    meses: {
      Ene: "no_aplica",
      Feb: "no_aplica",
      Mar: "no_aplica",
      Abr: "no_aplica",
      May: "realizada",
      Jun: "no_aplica",
      Jul: "no_aplica",
      Ago: "no_aplica",
      Sep: "no_aplica",
      Oct: "no_aplica",
      Nov: "no_aplica",
      Dic: "no_aplica",
    },
  },
  {
    id: 6,
    actividad: "Simulacro de evacuación",
    normativa: "Protocolos MINSAL",
    categoria: "Emergencia",
    periodicidad: "Semestral",
    responsable: "Comité de Emergencias",
    centroContratista: "Centro Sur",
    requiereEvidencia: true,
    estado: "pendiente",
    evidencia: "pendiente",
    meses: {
      Ene: "no_aplica",
      Feb: "no_aplica",
      Mar: "no_aplica",
      Abr: "no_aplica",
      May: "pendiente",
      Jun: "no_aplica",
      Jul: "no_aplica",
      Ago: "no_aplica",
      Sep: "no_aplica",
      Oct: "pendiente",
      Nov: "no_aplica",
      Dic: "no_aplica",
    },
  },
];

export const INDICADORES_NORMATIVA = [
  { nombre: "DS44", valor: 72 },
  { nombre: "DS594", valor: 81 },
  { nombre: "Ley 16.744", valor: 68 },
  { nombre: "Protocolos MINSAL", valor: 76 },
  { nombre: "Codigo del Trabajo", valor: 63 },
];

export const INDICADORES_TIPO = [
  { nombre: "Capacitación", valor: 66 },
  { nombre: "Inspección", valor: 58 },
  { nombre: "Documentación", valor: 70 },
  { nombre: "Mantención", valor: 86 },
  { nombre: "Emergencia", valor: 62 },
];

export const INDICADORES_CENTRO = [
  { nombre: "Casa Matriz", valor: 78 },
  { nombre: "Centro Norte", valor: 69 },
  { nombre: "Centro Sur", valor: 64 },
  { nombre: "Contratista Alfa", valor: 59 },
];

export const INDICADORES_RESPONSABLE = [
  { nombre: "Encargado de Prevención", valor: 81 },
  { nombre: "RRHH + Prevención", valor: 65 },
  { nombre: "Asesor Externo SST", valor: 54 },
  { nombre: "Gerencia SST", valor: 72 },
  { nombre: "Comité de Emergencias", valor: 61 },
];

export const EVIDENCIAS_MOCK = [
  {
    id: "ev-1",
    actividadId: 1,
    archivo: "acta-comite-enero.pdf",
    fecha: "2026-01-29",
    estado: "cargada" as const,
    observacion: "Acta validada por prevención",
  },
  {
    id: "ev-2",
    actividadId: 3,
    archivo: "checklist-inspeccion-q1.pdf",
    fecha: "2026-03-22",
    estado: "rechazada" as const,
    observacion: "Falta firma del responsable",
  },
  {
    id: "ev-3",
    actividadId: 5,
    archivo: "certificado-extintores.pdf",
    fecha: "2026-05-11",
    estado: "cargada" as const,
    observacion: "Certificación vigente",
  },
];
