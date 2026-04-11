import type { Worker } from "../types";

// ─── Core types ──────────────────────────────────────────────────────────────

export type DocCategoria = "Contratación" | "SST" | "Capacitación" | "Médico" | "Técnico";
export type DocEstado    = "completo" | "pendiente" | "vencido" | "no_aplica" | "en_revision" | "rechazado";

export interface TipoDocumento {
  id: string;
  nombre: string;
  categoria: DocCategoria;
  descripcion: string;
  requiereVencimiento: boolean;
  vencimientoMeses: number | null;
  esCritico: boolean;
}

export interface PlantillaDocumental {
  id: string;
  nombre: string;
  descripcion: string;
  aplicaA: string[];
  tiposDocumentoIds: string[];
}

export interface ReglaDocumental {
  id: string;
  nombre: string;
  descripcion: string;
  condicion: {
    cargo?: string;
    area?: string;
    tipoContrato?: string;
    centroTrabajo?: string;
  };
  tiposDocumentoIds: string[];
  activa: boolean;
}

export interface DocumentoTrabajador {
  id: string;
  workerId: string;
  tipoDocumentoId: string;
  estado: DocEstado;
  fechaCarga?: string;
  fechaVencimiento?: string;
  cargadoPor?: string;
  observacion?: string;
}

export interface DocTrabajadorView {
  tipo: TipoDocumento;
  estado: DocEstado;
  fechaCarga?: string;
  fechaVencimiento?: string;
  diasParaVencer?: number;
  cargadoPor?: string;
  observacion?: string;
}

// ─── Visual config ───────────────────────────────────────────────────────────

export const CATEGORIA_CONFIG: Record<DocCategoria, { bg: string; text: string; ring: string }> = {
  "Contratación": { bg: "bg-blue-50",    text: "text-blue-700",    ring: "ring-1 ring-blue-200" },
  "SST":          { bg: "bg-red-50",     text: "text-red-700",     ring: "ring-1 ring-red-200" },
  "Capacitación": { bg: "bg-violet-50",  text: "text-violet-700",  ring: "ring-1 ring-violet-200" },
  "Médico":       { bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-1 ring-emerald-200" },
  "Técnico":      { bg: "bg-amber-50",   text: "text-amber-700",   ring: "ring-1 ring-amber-200" },
};

export const ESTADO_DOC_CONFIG: Record<DocEstado, { label: string; bg: string; text: string; ring: string; dot: string }> = {
  completo:    { label: "Completo",    bg: "bg-emerald-50",  text: "text-emerald-700",  ring: "ring-1 ring-emerald-200",  dot: "bg-emerald-500" },
  pendiente:   { label: "Pendiente",   bg: "bg-amber-50",    text: "text-amber-700",    ring: "ring-1 ring-amber-200",    dot: "bg-amber-400" },
  vencido:     { label: "Vencido",     bg: "bg-red-50",      text: "text-red-700",      ring: "ring-1 ring-red-200",      dot: "bg-red-500" },
  no_aplica:   { label: "No aplica",   bg: "bg-slate-100",   text: "text-slate-500",    ring: "ring-1 ring-slate-200",    dot: "bg-slate-300" },
  en_revision: { label: "En revisión", bg: "bg-blue-50",     text: "text-blue-700",     ring: "ring-1 ring-blue-200",     dot: "bg-blue-400" },
  rechazado:   { label: "Rechazado",   bg: "bg-rose-50",     text: "text-rose-700",     ring: "ring-1 ring-rose-200",     dot: "bg-rose-500" },
};

// ─── Mock: Tipos de documento ────────────────────────────────────────────────

export const TIPOS_DOCUMENTO: TipoDocumento[] = [
  { id: "td-01", nombre: "Contrato de trabajo",        categoria: "Contratación", descripcion: "Contrato firmado por ambas partes",                requiereVencimiento: false, vencimientoMeses: null, esCritico: true  },
  { id: "td-02", nombre: "Reglamento Interno (RIOHS)", categoria: "Contratación", descripcion: "Reglamento interno firmado por el trabajador",      requiereVencimiento: false, vencimientoMeses: null, esCritico: false },
  { id: "td-03", nombre: "ODI firmada",                categoria: "SST",          descripcion: "Obligación de informar sobre riesgos del puesto",  requiereVencimiento: false, vencimientoMeses: null, esCritico: true  },
  { id: "td-04", nombre: "Política de prevención",     categoria: "SST",          descripcion: "Política SST firmada por trabajador",               requiereVencimiento: false, vencimientoMeses: null, esCritico: false },
  { id: "td-05", nombre: "Inducción SST",              categoria: "Capacitación", descripcion: "Capacitación de inducción en seguridad y salud",    requiereVencimiento: true,  vencimientoMeses: 12,   esCritico: true  },
  { id: "td-06", nombre: "Examen preocupacional",      categoria: "Médico",       descripcion: "Examen médico previo al inicio de actividades",     requiereVencimiento: false, vencimientoMeses: null, esCritico: true  },
  { id: "td-07", nombre: "Examen periódico",           categoria: "Médico",       descripcion: "Control médico ocupacional anual",                  requiereVencimiento: true,  vencimientoMeses: 12,   esCritico: true  },
  { id: "td-08", nombre: "Entrega de EPP",             categoria: "SST",          descripcion: "Acta de recepción de equipos de protección",        requiereVencimiento: false, vencimientoMeses: null, esCritico: false },
  { id: "td-09", nombre: "Notificación DS44",          categoria: "SST",          descripcion: "Notificación formal de riesgos críticos DS44",       requiereVencimiento: false, vencimientoMeses: null, esCritico: true  },
  { id: "td-10", nombre: "Licencia de conducir",       categoria: "Técnico",      descripcion: "Licencia clase B o superior vigente",               requiereVencimiento: true,  vencimientoMeses: 60,   esCritico: true  },
  { id: "td-11", nombre: "Certificado de competencia", categoria: "Técnico",      descripcion: "Certificado de competencia laboral acreditada",     requiereVencimiento: false, vencimientoMeses: null, esCritico: false },
  { id: "td-12", nombre: "Descripción de cargo",       categoria: "Contratación", descripcion: "Funciones y responsabilidades firmadas",            requiereVencimiento: false, vencimientoMeses: null, esCritico: false },
];

// ─── Mock: Plantillas ────────────────────────────────────────────────────────

export const PLANTILLAS_DOCUMENTALES: PlantillaDocumental[] = [
  {
    id: "pl-01",
    nombre: "Base Corporativa",
    descripcion: "Documentación mínima obligatoria para todos los trabajadores sin excepción",
    aplicaA: ["Todos los trabajadores"],
    tiposDocumentoIds: ["td-01", "td-02", "td-03", "td-04", "td-05", "td-06", "td-08", "td-12"],
  },
  {
    id: "pl-02",
    nombre: "Producción e Instalación",
    descripcion: "Documentación adicional para personal en trabajos de terreno e instalación",
    aplicaA: ["Área: Producción e Instalación"],
    tiposDocumentoIds: ["td-07", "td-09", "td-11"],
  },
];

// ─── Mock: Reglas de asignación automática ───────────────────────────────────

export const REGLAS_DOCUMENTALES: ReglaDocumental[] = [
  {
    id: "rg-01",
    nombre: "Base universal",
    descripcion: "Aplica automáticamente a todos los trabajadores activos",
    condicion: {},
    tiposDocumentoIds: ["td-01", "td-02", "td-03", "td-04", "td-05", "td-06", "td-08", "td-12"],
    activa: true,
  },
  {
    id: "rg-02",
    nombre: "Área Producción e Instalación",
    descripcion: "Personal en terreno requiere examen periódico, DS44 y certificado de competencia",
    condicion: { area: "Producción e Instalación" },
    tiposDocumentoIds: ["td-07", "td-09", "td-11"],
    activa: true,
  },
  { id: "rg-03", nombre: "Inactiva", descripcion: "", condicion: {}, tiposDocumentoIds: [], activa: false },
  { id: "rg-04", nombre: "Inactiva", descripcion: "", condicion: {}, tiposDocumentoIds: [], activa: false },
  { id: "rg-05", nombre: "Inactiva", descripcion: "", condicion: {}, tiposDocumentoIds: [], activa: false },
  { id: "rg-06", nombre: "Inactiva", descripcion: "", condicion: {}, tiposDocumentoIds: [], activa: false },
  { id: "rg-07", nombre: "Inactiva", descripcion: "", condicion: {}, tiposDocumentoIds: [], activa: false },
];

// ─── Mock: Documentos subidos ────────────────────────────────────────────────

export const MOCK_DOCUMENTOS: DocumentoTrabajador[] = [
  // ── w-001: Juan Muñoz (Supervisor de Obra) — todos completos; inducción vence 2026-05-02 (alerta ~25 días) ──
  { id: "d-001-01", workerId: "w-001", tipoDocumentoId: "td-01", estado: "completo", fechaCarga: "2022-03-01", cargadoPor: "RRHH" },
  { id: "d-001-02", workerId: "w-001", tipoDocumentoId: "td-02", estado: "completo", fechaCarga: "2022-03-01", cargadoPor: "RRHH" },
  { id: "d-001-03", workerId: "w-001", tipoDocumentoId: "td-03", estado: "completo", fechaCarga: "2022-03-01", cargadoPor: "Juan Muñoz Carvajal" },
  { id: "d-001-04", workerId: "w-001", tipoDocumentoId: "td-04", estado: "completo", fechaCarga: "2022-03-01", cargadoPor: "Juan Muñoz Carvajal" },
  { id: "d-001-05", workerId: "w-001", tipoDocumentoId: "td-05", estado: "completo", fechaCarga: "2025-05-02", fechaVencimiento: "2026-05-02", cargadoPor: "Área SST" },
  { id: "d-001-06", workerId: "w-001", tipoDocumentoId: "td-06", estado: "completo", fechaCarga: "2022-02-28", cargadoPor: "Mutualidad" },
  { id: "d-001-07", workerId: "w-001", tipoDocumentoId: "td-07", estado: "completo", fechaCarga: "2025-08-10", fechaVencimiento: "2026-08-10", cargadoPor: "Mutualidad" },
  { id: "d-001-08", workerId: "w-001", tipoDocumentoId: "td-08", estado: "completo", fechaCarga: "2022-03-01", cargadoPor: "Área SST" },
  { id: "d-001-09", workerId: "w-001", tipoDocumentoId: "td-09", estado: "completo", fechaCarga: "2022-03-01", cargadoPor: "Área SST" },
  { id: "d-001-11", workerId: "w-001", tipoDocumentoId: "td-11", estado: "completo", fechaCarga: "2022-03-01", cargadoPor: "RRHH" },
  { id: "d-001-12", workerId: "w-001", tipoDocumentoId: "td-12", estado: "completo", fechaCarga: "2022-03-01", cargadoPor: "RRHH" },

  // ── w-002: Cristina Reyes (Administrativa) — base completa ──
  { id: "d-002-01", workerId: "w-002", tipoDocumentoId: "td-01", estado: "completo", fechaCarga: "2023-01-16", cargadoPor: "RRHH" },
  { id: "d-002-02", workerId: "w-002", tipoDocumentoId: "td-02", estado: "completo", fechaCarga: "2023-01-16", cargadoPor: "RRHH" },
  { id: "d-002-03", workerId: "w-002", tipoDocumentoId: "td-03", estado: "completo", fechaCarga: "2023-01-16", cargadoPor: "Cristina Reyes Soto" },
  { id: "d-002-04", workerId: "w-002", tipoDocumentoId: "td-04", estado: "completo", fechaCarga: "2023-01-16", cargadoPor: "Cristina Reyes Soto" },
  { id: "d-002-05", workerId: "w-002", tipoDocumentoId: "td-05", estado: "completo", fechaCarga: "2025-01-16", fechaVencimiento: "2026-01-16", cargadoPor: "Área SST" },
  { id: "d-002-06", workerId: "w-002", tipoDocumentoId: "td-06", estado: "completo", fechaCarga: "2023-01-10", cargadoPor: "Mutualidad" },
  { id: "d-002-08", workerId: "w-002", tipoDocumentoId: "td-08", estado: "completo", fechaCarga: "2023-01-16", cargadoPor: "Área SST" },
  { id: "d-002-12", workerId: "w-002", tipoDocumentoId: "td-12", estado: "completo", fechaCarga: "2023-01-16", cargadoPor: "RRHH" },

  // ── w-003: Ricardo Flores (Maestro PVC/Aluminio) — ODI rechazada + examen periódico vencido → sinDocCompleta ──
  { id: "d-003-01", workerId: "w-003", tipoDocumentoId: "td-01", estado: "completo",  fechaCarga: "2023-08-01", cargadoPor: "RRHH" },
  { id: "d-003-02", workerId: "w-003", tipoDocumentoId: "td-02", estado: "completo",  fechaCarga: "2023-08-01", cargadoPor: "RRHH" },
  { id: "d-003-03", workerId: "w-003", tipoDocumentoId: "td-03", estado: "rechazado", fechaCarga: "2024-08-01", cargadoPor: "Ricardo Flores Pavez", observacion: "Firma digital inválida — documento debe ser reenviado" },
  { id: "d-003-04", workerId: "w-003", tipoDocumentoId: "td-04", estado: "completo",  fechaCarga: "2023-08-01", cargadoPor: "Ricardo Flores Pavez" },
  { id: "d-003-05", workerId: "w-003", tipoDocumentoId: "td-05", estado: "completo",  fechaCarga: "2024-08-01", fechaVencimiento: "2025-08-01", cargadoPor: "Área SST", observacion: "Inducción SST vencida — programar renovación" },
  { id: "d-003-06", workerId: "w-003", tipoDocumentoId: "td-06", estado: "completo",  fechaCarga: "2023-07-28", cargadoPor: "Mutualidad" },
  { id: "d-003-07", workerId: "w-003", tipoDocumentoId: "td-07", estado: "completo",  fechaCarga: "2024-07-15", fechaVencimiento: "2025-07-15", cargadoPor: "Mutualidad", observacion: "Examen periódico vencido — agendar control" },
  { id: "d-003-08", workerId: "w-003", tipoDocumentoId: "td-08", estado: "completo",  fechaCarga: "2023-08-01", cargadoPor: "Área SST" },
  { id: "d-003-09", workerId: "w-003", tipoDocumentoId: "td-09", estado: "completo",  fechaCarga: "2023-08-01", cargadoPor: "Área SST" },
  { id: "d-003-11", workerId: "w-003", tipoDocumentoId: "td-11", estado: "completo",  fechaCarga: "2023-08-01", cargadoPor: "RRHH" },
  { id: "d-003-12", workerId: "w-003", tipoDocumentoId: "td-12", estado: "completo",  fechaCarga: "2023-08-01", cargadoPor: "RRHH" },

  // ── w-004: Sebastián Vidal (Instalador, Por Obra) — la mayoría pendiente → sinDocCompleta ──
  { id: "d-004-01", workerId: "w-004", tipoDocumentoId: "td-01", estado: "completo", fechaCarga: "2024-02-12", cargadoPor: "RRHH" },
  { id: "d-004-06", workerId: "w-004", tipoDocumentoId: "td-06", estado: "completo", fechaCarga: "2024-02-08", cargadoPor: "Mutualidad" },

  // ── w-005: Carlos Espinoza (Maestro PVC/Aluminio) — todos completos ──
  { id: "d-005-01", workerId: "w-005", tipoDocumentoId: "td-01", estado: "completo", fechaCarga: "2022-09-05", cargadoPor: "RRHH" },
  { id: "d-005-02", workerId: "w-005", tipoDocumentoId: "td-02", estado: "completo", fechaCarga: "2022-09-05", cargadoPor: "RRHH" },
  { id: "d-005-03", workerId: "w-005", tipoDocumentoId: "td-03", estado: "completo", fechaCarga: "2022-09-05", cargadoPor: "Carlos Espinoza Tapia" },
  { id: "d-005-04", workerId: "w-005", tipoDocumentoId: "td-04", estado: "completo", fechaCarga: "2022-09-05", cargadoPor: "Carlos Espinoza Tapia" },
  { id: "d-005-05", workerId: "w-005", tipoDocumentoId: "td-05", estado: "completo", fechaCarga: "2025-09-05", fechaVencimiento: "2026-09-05", cargadoPor: "Área SST" },
  { id: "d-005-06", workerId: "w-005", tipoDocumentoId: "td-06", estado: "completo", fechaCarga: "2022-09-01", cargadoPor: "Mutualidad" },
  { id: "d-005-07", workerId: "w-005", tipoDocumentoId: "td-07", estado: "completo", fechaCarga: "2025-09-01", fechaVencimiento: "2026-09-01", cargadoPor: "Mutualidad" },
  { id: "d-005-08", workerId: "w-005", tipoDocumentoId: "td-08", estado: "completo", fechaCarga: "2022-09-05", cargadoPor: "Área SST" },
  { id: "d-005-09", workerId: "w-005", tipoDocumentoId: "td-09", estado: "completo", fechaCarga: "2022-09-05", cargadoPor: "Área SST" },
  { id: "d-005-11", workerId: "w-005", tipoDocumentoId: "td-11", estado: "completo", fechaCarga: "2022-09-05", cargadoPor: "RRHH" },
  { id: "d-005-12", workerId: "w-005", tipoDocumentoId: "td-12", estado: "completo", fechaCarga: "2022-09-05", cargadoPor: "RRHH" },
];

// ─── Utility functions ────────────────────────────────────────────────────────

const REF_DATE = new Date("2026-04-07");

function matchesCondicion(worker: Worker, cond: ReglaDocumental["condicion"]): boolean {
  const entries = Object.entries(cond).filter(([, v]) => v !== undefined && v !== "");
  if (entries.length === 0) return true;
  return entries.every(([key, val]) => String(worker[key as keyof Worker]) === String(val));
}

export function getRequiredDocIds(worker: Worker, reglas: ReglaDocumental[]): Set<string> {
  const ids = new Set<string>();
  for (const r of reglas) {
    if (!r.activa) continue;
    if (matchesCondicion(worker, r.condicion)) {
      r.tiposDocumentoIds.forEach((id) => ids.add(id));
    }
  }
  return ids;
}

export function getWorkerDocs(
  worker: Worker,
  reglas: ReglaDocumental[],
  tipos: TipoDocumento[],
  docs: DocumentoTrabajador[]
): DocTrabajadorView[] {
  const required = getRequiredDocIds(worker, reglas);
  const uploaded = docs.filter((d) => d.workerId === worker.id);

  return Array.from(required)
    .map((tid) => {
      const tipo = tipos.find((t) => t.id === tid);
      if (!tipo) return null;
      const up = uploaded.find((d) => d.tipoDocumentoId === tid);
      let estado: DocEstado = "pendiente";
      let diasParaVencer: number | undefined;

      if (up) {
        if (up.estado === "rechazado" || up.estado === "en_revision") {
          // Respect explicit traceability states from stored document
          estado = up.estado;
        } else if (tipo.requiereVencimiento && up.fechaVencimiento) {
          const diff = Math.floor(
            (new Date(up.fechaVencimiento).getTime() - REF_DATE.getTime()) / 86400000
          );
          diasParaVencer = diff;
          estado = diff < 0 ? "vencido" : "completo";
        } else {
          estado = "completo";
        }
      }
      return {
        tipo,
        estado,
        fechaCarga:       up?.fechaCarga,
        fechaVencimiento: up?.fechaVencimiento,
        diasParaVencer,
        cargadoPor:  up?.cargadoPor,
        observacion: up?.observacion,
      } satisfies DocTrabajadorView;
    })
    .filter(Boolean) as DocTrabajadorView[];
}

export function getWorkerDocSummary(docs: DocTrabajadorView[]) {
  const cargados   = docs.filter((d) => d.estado === "completo").length;
  const pendientes = docs.filter((d) => d.estado === "pendiente").length;
  const vencidos   = docs.filter((d) => d.estado === "vencido").length;
  const rechazados = docs.filter((d) => d.estado === "rechazado").length;
  const enRevision = docs.filter((d) => d.estado === "en_revision").length;
  return {
    total: docs.length,
    cargados,
    pendientes,
    vencidos,
    rechazados,
    enRevision,
    pct: docs.length > 0 ? Math.round((cargados / docs.length) * 100) : 0,
  };
}
