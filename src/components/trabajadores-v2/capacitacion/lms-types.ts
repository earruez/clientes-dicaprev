import type { Worker } from "../types";

export type TrainingStatus =
  | "pendiente"
  | "en_curso"
  | "completada"
  | "aprobada"
  | "reprobada"
  | "vencida"
  | "no_aplica";

export type TrainingCategory =
  | "SST Base"
  | "DS44"
  | "Riesgo Crítico"
  | "Operacional"
  | "Gestión";

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
}

export interface TrainingCatalogItem {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  categoria: TrainingCategory;
  duracionMin: number;
  vigenciaMeses: number | null;
  modalidad: "presencial" | "elearning" | "mixta";
  videoUrl: string;
  materiales: string[];
  requiereTest: boolean;
  requiereFirma: boolean;
  notaMinima: number;
  generaCertificado: boolean;
  criticaDs44: boolean;
  requiereRelator: boolean;
  quiz: QuizQuestion[];
}

export interface TrainingRequirementRule {
  id: string;
  activa: boolean;
  condicion: {
    cargoIncluye?: string;
    areaIncluye?: string;
    centroIncluye?: string;
    soloDs44?: boolean;
  };
  trainingIds: string[];
}

export interface TrainingProgressSeed {
  workerId: string;
  trainingId: string;
  status: TrainingStatus;
  attempts?: number;
  score?: number;
  startedAt?: string;
  completedAt?: string;
  signatureName?: string;
  signatureAt?: string;
  note?: string;
}

export interface WorkerTrainingAssignment {
  id: string;
  workerId: string;
  trainingId: string;
  status: TrainingStatus;
  attempts: number;
  score?: number;
  startedAt?: string;
  completedAt?: string;
  expiresAt?: string;
  signatureName?: string;
  signatureAt?: string;
  note?: string;
  certificateId?: string;
}

export interface WorkerTrainingSummary {
  requeridas: number;
  pendientes: number;
  aprobadas: number;
  reprobadas: number;
  vencidas: number;
  noAplica: number;
  pct: number;
}

export interface TrainingCertificate {
  id: string;
  workerId: string;
  trainingId: string;
  issueDate: string;
  score: number;
  validUntil?: string;
  signedBy: string;
  validationCode: string;
}

const DS44_KEYWORDS = [
  "prevencionista",
  "supervisor",
  "operario",
  "tecnico",
  "técnico",
  "conductor",
  "chofer",
  "maestro",
  "electric",
];

export function isWorkerDs44Critical(worker: Worker): boolean {
  const haystack = `${worker.cargo} ${worker.area}`.toLowerCase();
  return DS44_KEYWORDS.some((key) => haystack.includes(key));
}

export const CATALOGO_CAPACITACIONES: TrainingCatalogItem[] = [
  {
    id: "tr-001",
    codigo: "SST-IND-001",
    nombre: "Inducción General SST",
    descripcion: "Marco legal SST, obligaciones del trabajador, protocolos DS44 y reporte de incidentes.",
    categoria: "SST Base",
    duracionMin: 75,
    vigenciaMeses: 24,
    modalidad: "mixta",
    videoUrl: "https://example.com/video/induccion-sst",
    materiales: ["Manual de inducción SST", "Infografía DS44", "Checklist de riesgos iniciales"],
    requiereTest: true,
    requiereFirma: true,
    notaMinima: 70,
    generaCertificado: true,
    criticaDs44: true,
    requiereRelator: true,
    quiz: [
      {
        id: "q1",
        prompt: "¿Cuál es la acción inicial ante un incidente en faena?",
        options: ["Reportar y asegurar el área", "Esperar al supervisor", "Registrar al final del turno", "Suspender solo la tarea personal"],
        correctIndex: 0,
      },
      {
        id: "q2",
        prompt: "La ODI debe registrarse para:",
        options: ["Solo personal nuevo", "Todos los trabajadores expuestos a riesgo", "Solo contratistas", "Solo jefaturas"],
        correctIndex: 1,
      },
      {
        id: "q3",
        prompt: "DS44 se relaciona principalmente con:",
        options: ["Vacaciones", "Gestión de riesgos laborales", "Pagos previsionales", "Turnos nocturnos"],
        correctIndex: 1,
      },
    ],
  },
  {
    id: "tr-002",
    codigo: "SST-ALT-002",
    nombre: "Trabajo en Altura y Rescate",
    descripcion: "Uso de líneas de vida, inspección de arnés y respuesta inicial en caída de altura.",
    categoria: "Riesgo Crítico",
    duracionMin: 90,
    vigenciaMeses: 12,
    modalidad: "presencial",
    videoUrl: "https://example.com/video/altura-rescate",
    materiales: ["Guía de trabajo en altura", "Ficha de inspección EPP altura"],
    requiereTest: true,
    requiereFirma: true,
    notaMinima: 80,
    generaCertificado: true,
    criticaDs44: true,
    requiereRelator: true,
    quiz: [
      {
        id: "q1",
        prompt: "Antes de subir a altura, el arnés debe:",
        options: ["Ajustarse y revisarse visualmente", "Usarse sin inspección", "Cambiarse cada día", "Usarse solo sobre 3 metros"],
        correctIndex: 0,
      },
      {
        id: "q2",
        prompt: "Ante caída con detención, se debe:",
        options: ["Retomar trabajo", "Aplicar protocolo de rescate", "Esperar fin de turno", "Bajar por cuenta propia"],
        correctIndex: 1,
      },
      {
        id: "q3",
        prompt: "Punto de anclaje debe estar:",
        options: ["En cualquier estructura", "Certificado y validado", "En baranda liviana", "Solo en andamio"],
        correctIndex: 1,
      },
    ],
  },
  {
    id: "tr-003",
    codigo: "SST-LOT-003",
    nombre: "Bloqueo y Etiquetado (LOTO)",
    descripcion: "Aislamiento de energía para mantenimiento seguro de equipos y tableros.",
    categoria: "Riesgo Crítico",
    duracionMin: 60,
    vigenciaMeses: 12,
    modalidad: "elearning",
    videoUrl: "https://example.com/video/loto",
    materiales: ["Procedimiento LOTO", "Matriz de energías peligrosas"],
    requiereTest: true,
    requiereFirma: false,
    notaMinima: 75,
    generaCertificado: true,
    criticaDs44: true,
    requiereRelator: false,
    quiz: [
      {
        id: "q1",
        prompt: "Objetivo principal de LOTO:",
        options: ["Reducir tiempos", "Evitar energización inesperada", "Aumentar producción", "Eliminar capacitación"],
        correctIndex: 1,
      },
      {
        id: "q2",
        prompt: "La etiqueta LOTO debe incluir:",
        options: ["Solo fecha", "Nombre y motivo de bloqueo", "Color del casco", "Área de descanso"],
        correctIndex: 1,
      },
      {
        id: "q3",
        prompt: "¿Quién retira el candado?",
        options: ["Cualquier supervisor", "Quien instaló el bloqueo", "El guardia", "Cualquier operario"],
        correctIndex: 1,
      },
    ],
  },
  {
    id: "tr-004",
    codigo: "SST-ODI-004",
    nombre: "ODI y Control de Riesgos DS44",
    descripcion: "Aplicación práctica de obligación de informar y controles críticos por puesto.",
    categoria: "DS44",
    duracionMin: 45,
    vigenciaMeses: 24,
    modalidad: "elearning",
    videoUrl: "https://example.com/video/odi-ds44",
    materiales: ["Formato ODI", "Matriz de controles críticos"],
    requiereTest: false,
    requiereFirma: true,
    notaMinima: 0,
    generaCertificado: true,
    criticaDs44: true,
    requiereRelator: false,
    quiz: [],
  },
  {
    id: "tr-005",
    codigo: "SST-ERG-005",
    nombre: "Ergonomía y Pausas Activas",
    descripcion: "Prevención de trastornos musculoesqueléticos en oficina y terreno administrativo.",
    categoria: "Gestión",
    duracionMin: 35,
    vigenciaMeses: 36,
    modalidad: "elearning",
    videoUrl: "https://example.com/video/ergonomia",
    materiales: ["Pauta de pausas activas", "Checklist ergonómico"],
    requiereTest: true,
    requiereFirma: false,
    notaMinima: 60,
    generaCertificado: false,
    criticaDs44: false,
    requiereRelator: false,
    quiz: [
      {
        id: "q1",
        prompt: "Frecuencia sugerida de pausas activas:",
        options: ["Cada 2-3 horas", "Cada 45-60 minutos", "Una vez al día", "Solo cuando hay dolor"],
        correctIndex: 1,
      },
      {
        id: "q2",
        prompt: "Postura correcta en escritorio:",
        options: ["Espalda apoyada y monitor a la vista", "Cuello flexionado", "Piernas cruzadas", "Sin apoyo lumbar"],
        correctIndex: 0,
      },
      {
        id: "q3",
        prompt: "Señal de fatiga visual:",
        options: ["Enfoque borroso", "Mayor productividad", "Menor cansancio", "Más energía"],
        correctIndex: 0,
      },
    ],
  },
];

export const REGLAS_CAPACITACIONES: TrainingRequirementRule[] = [
  {
    id: "rule-01",
    activa: true,
    condicion: {},
    trainingIds: ["tr-001", "tr-004"],
  },
  {
    id: "rule-02",
    activa: true,
    condicion: { soloDs44: true },
    trainingIds: ["tr-002", "tr-003"],
  },
  {
    id: "rule-03",
    activa: true,
    condicion: { areaIncluye: "administr" },
    trainingIds: ["tr-005"],
  },
  {
    id: "rule-04",
    activa: true,
    condicion: { cargoIncluye: "supervisor" },
    trainingIds: ["tr-002"],
  },
];

export const SEED_PROGRESO_CAPACITACION: TrainingProgressSeed[] = [
  { workerId: "w-001", trainingId: "tr-001", status: "aprobada", score: 88, attempts: 1, completedAt: "2025-03-02", signatureName: "Carlos Méndez", signatureAt: "2025-03-02" },
  { workerId: "w-001", trainingId: "tr-002", status: "vencida", score: 82, attempts: 1, completedAt: "2024-01-10" },
  { workerId: "w-002", trainingId: "tr-001", status: "aprobada", score: 91, attempts: 1, completedAt: "2025-08-12", signatureName: "María González", signatureAt: "2025-08-12" },
  { workerId: "w-002", trainingId: "tr-005", status: "pendiente", attempts: 0 },
  { workerId: "w-003", trainingId: "tr-001", status: "en_curso", attempts: 0, startedAt: "2026-04-01" },
  { workerId: "w-003", trainingId: "tr-002", status: "reprobada", score: 55, attempts: 1, completedAt: "2026-03-20", note: "Debe reforzar módulo de rescate" },
  { workerId: "w-005", trainingId: "tr-001", status: "vencida", score: 73, attempts: 1, completedAt: "2023-07-18" },
  { workerId: "w-009", trainingId: "tr-003", status: "aprobada", score: 80, attempts: 1, completedAt: "2025-05-15" },
  { workerId: "w-010", trainingId: "tr-005", status: "no_aplica", attempts: 0, note: "Perfil temporal fuera de exposición" },
];

export function nowIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addMonths(isoDate: string, months: number): string {
  const dt = new Date(`${isoDate}T00:00:00`);
  dt.setMonth(dt.getMonth() + months);
  return dt.toISOString().slice(0, 10);
}

function matchText(actual: string, expected?: string): boolean {
  if (!expected) return true;
  return actual.toLowerCase().includes(expected.toLowerCase());
}

function ruleMatches(worker: Worker, rule: TrainingRequirementRule): boolean {
  if (rule.condicion.soloDs44 && !isWorkerDs44Critical(worker)) return false;
  if (!matchText(worker.cargo, rule.condicion.cargoIncluye)) return false;
  if (!matchText(worker.area, rule.condicion.areaIncluye)) return false;
  if (!matchText(worker.centroTrabajo, rule.condicion.centroIncluye)) return false;
  return true;
}

export function computeRequiredTrainingIds(worker: Worker, rules: TrainingRequirementRule[]): Set<string> {
  const ids = new Set<string>();
  for (const rule of rules) {
    if (!rule.activa) continue;
    if (!ruleMatches(worker, rule)) continue;
    rule.trainingIds.forEach((id) => ids.add(id));
  }
  return ids;
}

export function materializeStatusWithExpiry(
  assignment: WorkerTrainingAssignment,
  catalogItem: TrainingCatalogItem,
  refDate: string = nowIsoDate(),
): TrainingStatus {
  if (!catalogItem.vigenciaMeses) return assignment.status;
  const expiry = assignment.expiresAt;
  if (!expiry) return assignment.status;
  if ((assignment.status === "aprobada" || assignment.status === "completada") && expiry < refDate) {
    return "vencida";
  }
  return assignment.status;
}

export function buildAssignments(
  workers: Worker[],
  catalog: TrainingCatalogItem[],
  rules: TrainingRequirementRule[],
  seed: TrainingProgressSeed[],
): WorkerTrainingAssignment[] {
  const catalogById = new Map(catalog.map((c) => [c.id, c]));
  const seedByKey = new Map(seed.map((s) => [`${s.workerId}::${s.trainingId}`, s]));
  const out: WorkerTrainingAssignment[] = [];

  for (const worker of workers) {
    const requiredIds = computeRequiredTrainingIds(worker, rules);
    for (const trainingId of requiredIds) {
      const item = catalogById.get(trainingId);
      if (!item) continue;
      const key = `${worker.id}::${trainingId}`;
      const seeded = seedByKey.get(key);
      const completedAt = seeded?.completedAt;
      const expiresAt = completedAt && item.vigenciaMeses ? addMonths(completedAt, item.vigenciaMeses) : undefined;

      const base: WorkerTrainingAssignment = {
        id: `asg-${worker.id}-${trainingId}`,
        workerId: worker.id,
        trainingId,
        status: seeded?.status ?? "pendiente",
        attempts: seeded?.attempts ?? 0,
        score: seeded?.score,
        startedAt: seeded?.startedAt,
        completedAt,
        expiresAt,
        signatureName: seeded?.signatureName,
        signatureAt: seeded?.signatureAt,
        note: seeded?.note,
      };

      base.status = materializeStatusWithExpiry(base, item);
      out.push(base);
    }
  }

  return out;
}

export function summarizeAssignments(assignments: WorkerTrainingAssignment[]): WorkerTrainingSummary {
  const requeridas = assignments.filter((a) => a.status !== "no_aplica").length;
  const pendientes = assignments.filter((a) => a.status === "pendiente" || a.status === "en_curso" || a.status === "completada").length;
  const aprobadas = assignments.filter((a) => a.status === "aprobada").length;
  const reprobadas = assignments.filter((a) => a.status === "reprobada").length;
  const vencidas = assignments.filter((a) => a.status === "vencida").length;
  const noAplica = assignments.filter((a) => a.status === "no_aplica").length;
  const pct = requeridas > 0 ? Math.round((aprobadas / requeridas) * 100) : 0;

  return { requeridas, pendientes, aprobadas, reprobadas, vencidas, noAplica, pct };
}

export function ensureDefaultQuiz(item: TrainingCatalogItem): QuizQuestion[] {
  if (!item.requiereTest) return [];
  if (item.quiz.length >= 3) return item.quiz;
  return [
    {
      id: "auto-q1",
      prompt: `¿Cuál es el objetivo principal de ${item.nombre}?`,
      options: ["Prevenir incidentes y cumplir SST", "Reducir costos sin control", "Evitar documentación", "Delegar responsabilidad"],
      correctIndex: 0,
    },
    {
      id: "auto-q2",
      prompt: "Para aprobar esta capacitación, el trabajador debe:",
      options: ["Solo ver el video", "Cumplir nota mínima definida", "Firmar sin revisar", "Esperar validación manual"],
      correctIndex: 1,
    },
    {
      id: "auto-q3",
      prompt: "La evidencia de cumplimiento considera:",
      options: ["Resultado y trazabilidad", "Solo asistencia", "Solo encuesta", "Solo material descargado"],
      correctIndex: 0,
    },
  ];
}

// ─── Sesiones presenciales ─────────────────────────────────────────────────

export type TrainingSessionStatus = "programada" | "en_curso" | "finalizada" | "cancelada";

export interface SessionAttendeeRecord {
  workerId: string;
  asistio: boolean;
  nota?: number;
  firmado: boolean;
  firmaNombre?: string;
  resultado?: "aprobado" | "reprobado" | "no_asistio";
  certificateId?: string;
}

export interface TrainingSession {
  id: string;
  trainingId: string;
  fecha: string;
  hora: string;
  lugar: string;
  centroNombre: string;
  relator: string;
  status: TrainingSessionStatus;
  convocados: string[];
  attendance: SessionAttendeeRecord[];
}

// ─── Acceso e-learning sin cuenta formal ──────────────────────────────────

export interface ElearningAccessLink {
  id: string;
  token: string;
  workerId: string;
  trainingId: string;
  createdAt: string;
  expiresAt: string;
  usedAt?: string;
  link: string;
}

export function generateAccessToken(workerId: string, trainingId: string): ElearningAccessLink {
  const raw = `${workerId}${trainingId}${Date.now()}`;
  const token = raw.replace(/[^A-Za-z0-9]/g, "").slice(-20).toUpperCase();
  const created = nowIsoDate();
  return {
    id: `al-${workerId}-${trainingId}`,
    token,
    workerId,
    trainingId,
    createdAt: created,
    expiresAt: addMonths(created, 1),
    link: `https://lms.nextprev.cl/acceso/${token}`,
  };
}

export const MOCK_SESSIONS: TrainingSession[] = [
  {
    id: "ses-001",
    trainingId: "tr-002",
    fecha: "2026-04-15",
    hora: "09:00",
    lugar: "Sala de capacitación, piso 2",
    centroNombre: "Obra Norte",
    relator: "Ing. Roberto Saavedra",
    status: "programada",
    convocados: ["w-001", "w-003", "w-004", "w-007"],
    attendance: [],
  },
  {
    id: "ses-002",
    trainingId: "tr-001",
    fecha: "2026-03-20",
    hora: "14:00",
    lugar: "Sala SST, Casa Matriz",
    centroNombre: "Casa Matriz",
    relator: "Prevencionista María Tapia",
    status: "finalizada",
    convocados: ["w-002", "w-005", "w-006"],
    attendance: [
      { workerId: "w-002", asistio: true, nota: 92, firmado: true, firmaNombre: "María González", resultado: "aprobado" },
      { workerId: "w-005", asistio: true, nota: 65, firmado: true, firmaNombre: "Pedro Díaz", resultado: "reprobado" },
      { workerId: "w-006", asistio: false, firmado: false, resultado: "no_asistio" },
    ],
  },
];
