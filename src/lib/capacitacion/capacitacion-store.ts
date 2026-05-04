/**
 * capacitacion-store.ts
 *
 * Single source of truth for the Capacitaciones module.
 * Pattern: module-level singleton (same as vehiculos-store).
 * In production: replaced by Firestore / REST API calls.
 */

import { MOCK_WORKERS } from "@/components/trabajadores-v2/types";
import { CARGO_REFS, AREA_REFS } from "@/lib/empresa/domain";

// ─── Types ────────────────────────────────────────────────────────────────── //

export type ModalidadCap = "online" | "presencial" | "mixta";
export type CategoriaCap =
  | "induccion"
  | "sst"
  | "normativa"
  | "evacuacion"
  | "altura"
  | "herramientas"
  | "ergonomia"
  | "quimicos"
  | "otro";

export type EstadoAsignacion =
  | "pendiente"
  | "enviada"
  | "en_proceso"
  | "finalizada"
  | "aprobada"
  | "rechazada"
  | "vencida";

export type OrigenAsignacion = "automatica" | "manual";

export type EstadoSesion =
  | "programada"
  | "confirmada"
  | "realizada"
  | "suspendida"
  | "reprogramada"
  | "cerrada";

// ─── Capacitacion (catálogo maestro) ──────────────────────────────────────── //

export interface Capacitacion {
  id: string;
  nombre: string;
  codigo: string;
  categoria: CategoriaCap;
  descripcion: string;
  modalidad: ModalidadCap;
  duracionHoras: number;
  requiereEvaluacion: boolean;
  requiereFirma: boolean;
  generaCertificado: boolean;
  vigenciaMeses: number;
  aplicaCargos: string[];   // cargo ids
  aplicaAreas: string[];    // area ids
  aplicaCentros: string[];  // centro nombres
  esObligatoria: boolean;
  materialUrl?: string;
  videoUrl?: string;
  documentoUrl?: string;
  activa: boolean;
  createdAt: string;
}

// ─── AsignacionCapacitacion ────────────────────────────────────────────────── //

export interface AsignacionCapacitacion {
  id: string;
  trabajadorId: string;
  capacitacionId: string;
  origen: OrigenAsignacion;
  estado: EstadoAsignacion;
  fechaAsignacion: string;
  fechaEnvio?: string;
  fechaInicio?: string;
  fechaRespuesta?: string;
  fechaVencimiento?: string;
  token?: string;
  observacion?: string;
  nota?: number;
  aprobado?: boolean;
  evidenciaId?: string;
  certificadoId?: string;
  documentoId?: string;
}

// ─── SesionCapacitacion (calendario) ──────────────────────────────────────── //

export interface SesionCapacitacion {
  id: string;
  capacitacionId: string;
  titulo: string;
  fecha: string;
  horaInicio?: string;
  horaFin?: string;
  modalidad: ModalidadCap;
  ubicacion?: string;
  relator?: string;
  cupos?: number;
  estado: EstadoSesion;
  trabajadoresIds: string[];
  createdAt: string;
}

// ─── EvaluacionCapacitacion ────────────────────────────────────────────────── //

export interface EvaluacionCapacitacion {
  id: string;
  asignacionId: string;
  trabajadorId: string;
  asistencia: boolean;
  nota?: number;
  aprobado?: boolean;
  fechaEvaluacion: string;
  observacion?: string;
  evidenciaId?: string;
}

// ─── HistorialEntry (derived) ─────────────────────────────────────────────── //

export interface HistorialEntry {
  asignacionId: string;
  trabajadorId: string;
  trabajadorNombre: string;
  capacitacionId: string;
  capacitacionNombre: string;
  categoria: CategoriaCap;
  modalidad: ModalidadCap;
  fechaRealizacion: string;
  vigenciaHasta: string | null;
  vigente: boolean;
  estado: EstadoAsignacion;
  nota?: number;
  aprobado?: boolean;
  evidenciaId?: string;
}

// ─── Seed data ────────────────────────────────────────────────────────────── //

export const CATALOGO_INICIAL: Capacitacion[] = [
  {
    id: "cap-001",
    nombre: "Inducción General SST",
    codigo: "IND-001",
    categoria: "induccion",
    descripcion: "Introducción a la prevención de riesgos, reglamento interno y normas generales de seguridad. Obligatoria para todo ingreso.",
    modalidad: "presencial",
    duracionHoras: 4,
    requiereEvaluacion: true,
    requiereFirma: true,
    generaCertificado: true,
    vigenciaMeses: 12,
    aplicaCargos: ["c01", "c02", "c03", "c04"],
    aplicaAreas: ["a01", "a02"],
    aplicaCentros: [],
    esObligatoria: true,
    activa: true,
    createdAt: "2025-01-01",
  },
  {
    id: "cap-002",
    nombre: "Trabajo en Altura",
    codigo: "ALT-001",
    categoria: "altura",
    descripcion: "Normas de seguridad para trabajo en altura superior a 1.8m, uso de arnés, líneas de vida y andamios. DS76 Art. 41.",
    modalidad: "presencial",
    duracionHoras: 8,
    requiereEvaluacion: true,
    requiereFirma: true,
    generaCertificado: true,
    vigenciaMeses: 24,
    aplicaCargos: ["c01", "c02", "c03"],
    aplicaAreas: ["a01"],
    aplicaCentros: [],
    esObligatoria: true,
    activa: true,
    createdAt: "2025-01-01",
  },
  {
    id: "cap-003",
    nombre: "Uso y Mantención de EPP",
    codigo: "EPP-001",
    categoria: "sst",
    descripcion: "Selección, uso correcto y mantención de elementos de protección personal según el puesto de trabajo.",
    modalidad: "online",
    duracionHoras: 2,
    requiereEvaluacion: true,
    requiereFirma: false,
    generaCertificado: false,
    vigenciaMeses: 12,
    aplicaCargos: ["c01", "c02", "c03"],
    aplicaAreas: ["a01"],
    aplicaCentros: [],
    esObligatoria: true,
    activa: true,
    createdAt: "2025-01-15",
  },
  {
    id: "cap-004",
    nombre: "Ergonomía y Manejo Manual de Cargas",
    codigo: "ERG-001",
    categoria: "ergonomia",
    descripcion: "Prevención de lesiones musculoesqueléticas, técnicas de manipulación de cargas y configuración ergonómica del puesto.",
    modalidad: "online",
    duracionHoras: 2,
    requiereEvaluacion: false,
    requiereFirma: false,
    generaCertificado: false,
    vigenciaMeses: 24,
    aplicaCargos: ["c04"],
    aplicaAreas: ["a02"],
    aplicaCentros: [],
    esObligatoria: false,
    activa: true,
    createdAt: "2025-02-01",
  },
  {
    id: "cap-005",
    nombre: "Manejo de Herramientas Eléctricas",
    codigo: "HER-001",
    categoria: "herramientas",
    descripcion: "Seguridad en el uso de amoladoras, taladros, sierras y otras herramientas eléctricas. Identificación de riesgos.",
    modalidad: "presencial",
    duracionHoras: 4,
    requiereEvaluacion: true,
    requiereFirma: true,
    generaCertificado: true,
    vigenciaMeses: 18,
    aplicaCargos: ["c02", "c03"],
    aplicaAreas: ["a01"],
    aplicaCentros: [],
    esObligatoria: true,
    activa: true,
    createdAt: "2025-02-15",
  },
  {
    id: "cap-006",
    nombre: "Plan de Emergencia y Evacuación",
    codigo: "EVA-001",
    categoria: "evacuacion",
    descripcion: "Procedimientos ante emergencias: incendio, sismo, accidente grave. Uso de extintores y punto de encuentro.",
    modalidad: "presencial",
    duracionHoras: 3,
    requiereEvaluacion: false,
    requiereFirma: true,
    generaCertificado: false,
    vigenciaMeses: 12,
    aplicaCargos: ["c01", "c02", "c03", "c04"],
    aplicaAreas: ["a01", "a02"],
    aplicaCentros: [],
    esObligatoria: true,
    activa: true,
    createdAt: "2025-03-01",
  },
];

const HOY = "2026-04-10";

const ASIGNACIONES_INICIALES: AsignacionCapacitacion[] = [
  // w-001 Juan Muñoz - Supervisor
  { id: "as-001", trabajadorId: "w-001", capacitacionId: "cap-001", origen: "automatica", estado: "aprobada", fechaAsignacion: "2026-01-10", fechaEnvio: "2026-01-11", fechaRespuesta: "2026-01-15", fechaVencimiento: "2027-01-15", nota: 5.5, aprobado: true, token: "tok-001" },
  { id: "as-002", trabajadorId: "w-001", capacitacionId: "cap-002", origen: "automatica", estado: "aprobada", fechaAsignacion: "2026-01-10", fechaEnvio: "2026-01-12", fechaRespuesta: "2026-01-20", fechaVencimiento: "2028-01-20", nota: 6.2, aprobado: true, token: "tok-002" },
  { id: "as-003", trabajadorId: "w-001", capacitacionId: "cap-003", origen: "automatica", estado: "pendiente", fechaAsignacion: "2026-04-01", fechaVencimiento: "2027-04-01", token: "tok-003" },

  // w-003 Ricardo Flores - Maestro
  { id: "as-004", trabajadorId: "w-003", capacitacionId: "cap-001", origen: "automatica", estado: "aprobada", fechaAsignacion: "2026-01-15", fechaEnvio: "2026-01-16", fechaRespuesta: "2026-01-22", fechaVencimiento: "2027-01-22", nota: 4.8, aprobado: true, token: "tok-004" },
  { id: "as-005", trabajadorId: "w-003", capacitacionId: "cap-002", origen: "automatica", estado: "enviada", fechaAsignacion: "2026-03-01", fechaEnvio: "2026-04-05", fechaVencimiento: "2028-04-05", token: "tok-005" },
  { id: "as-006", trabajadorId: "w-003", capacitacionId: "cap-005", origen: "automatica", estado: "pendiente", fechaAsignacion: "2026-04-02", fechaVencimiento: "2027-10-02", token: "tok-006" },

  // w-004 Sebastián Vidal - Instalador
  { id: "as-007", trabajadorId: "w-004", capacitacionId: "cap-001", origen: "automatica", estado: "enviada", fechaAsignacion: "2026-03-20", fechaEnvio: "2026-04-01", fechaVencimiento: "2027-04-01", token: "tok-007" },
  { id: "as-008", trabajadorId: "w-004", capacitacionId: "cap-002", origen: "automatica", estado: "pendiente", fechaAsignacion: "2026-04-01", fechaVencimiento: "2028-04-01", token: "tok-008" },
  { id: "as-009", trabajadorId: "w-004", capacitacionId: "cap-003", origen: "automatica", estado: "pendiente", fechaAsignacion: "2026-04-01", fechaVencimiento: "2027-04-01", token: "tok-009" },
  { id: "as-010", trabajadorId: "w-004", capacitacionId: "cap-005", origen: "automatica", estado: "pendiente", fechaAsignacion: "2026-04-01", fechaVencimiento: "2027-10-01", token: "tok-010" },

  // w-002 Cristina Reyes - Administrativa
  { id: "as-011", trabajadorId: "w-002", capacitacionId: "cap-001", origen: "automatica", estado: "aprobada", fechaAsignacion: "2026-01-20", fechaEnvio: "2026-01-21", fechaRespuesta: "2026-01-25", fechaVencimiento: "2027-01-25", nota: 6.5, aprobado: true, token: "tok-011" },
  { id: "as-012", trabajadorId: "w-002", capacitacionId: "cap-004", origen: "automatica", estado: "aprobada", fechaAsignacion: "2026-02-01", fechaEnvio: "2026-02-02", fechaRespuesta: "2026-02-10", fechaVencimiento: "2028-02-10", aprobado: true, token: "tok-012" },
  { id: "as-013", trabajadorId: "w-002", capacitacionId: "cap-006", origen: "manual", estado: "pendiente", fechaAsignacion: "2026-04-05", fechaVencimiento: "2027-04-05", token: "tok-013" },

  // w-005 Carlos Espinoza - vencida
  { id: "as-014", trabajadorId: "w-005", capacitacionId: "cap-001", origen: "automatica", estado: "vencida", fechaAsignacion: "2025-01-01", fechaEnvio: "2025-01-05", fechaRespuesta: "2025-01-12", fechaVencimiento: "2026-01-12", nota: 5.0, aprobado: true, token: "tok-014" },
  { id: "as-015", trabajadorId: "w-005", capacitacionId: "cap-001", origen: "automatica", estado: "pendiente", fechaAsignacion: "2026-01-20", fechaVencimiento: "2027-01-20", token: "tok-015" },
  { id: "as-016", trabajadorId: "w-005", capacitacionId: "cap-002", origen: "automatica", estado: "aprobada", fechaAsignacion: "2025-06-01", fechaEnvio: "2025-06-05", fechaRespuesta: "2025-06-15", fechaVencimiento: "2027-06-15", nota: 5.8, aprobado: true, token: "tok-016" },
];

const SESIONES_INICIALES: SesionCapacitacion[] = [
  {
    id: "ses-001",
    capacitacionId: "cap-001",
    titulo: "Inducción SST — Nuevos ingresos Abril",
    fecha: "2026-04-15",
    horaInicio: "09:00",
    horaFin: "13:00",
    modalidad: "presencial",
    ubicacion: "Sala de Reuniones — Sede Central",
    relator: "Prevencionista NEXTPREV",
    cupos: 15,
    estado: "confirmada",
    trabajadoresIds: ["w-004", "w-003"],
    createdAt: HOY,
  },
  {
    id: "ses-002",
    capacitacionId: "cap-002",
    titulo: "Trabajo en Altura — Grupo Instaladores",
    fecha: "2026-04-22",
    horaInicio: "08:00",
    horaFin: "17:00",
    modalidad: "presencial",
    ubicacion: "Cancha Exterior — Sede Central",
    relator: "Experto externo — Mutual de Seguridad",
    cupos: 10,
    estado: "programada",
    trabajadoresIds: ["w-003", "w-004", "w-001"],
    createdAt: HOY,
  },
  {
    id: "ses-003",
    capacitacionId: "cap-006",
    titulo: "Simulacro Plan de Emergencia Q2-2026",
    fecha: "2026-05-05",
    horaInicio: "10:00",
    horaFin: "12:00",
    modalidad: "presencial",
    ubicacion: "Toda la planta",
    relator: "Prevencionista NEXTPREV",
    cupos: 50,
    estado: "programada",
    trabajadoresIds: ["w-001", "w-002", "w-003", "w-004", "w-005"],
    createdAt: HOY,
  },
  {
    id: "ses-004",
    capacitacionId: "cap-003",
    titulo: "EPP Online — Maestros y Técnicos",
    fecha: "2026-03-20",
    horaInicio: "09:00",
    horaFin: "11:00",
    modalidad: "online",
    relator: "Auto-dirigido",
    cupos: 20,
    estado: "realizada",
    trabajadoresIds: ["w-001", "w-005"],
    createdAt: "2026-03-01",
  },
];

const EVALUACIONES_INICIALES: EvaluacionCapacitacion[] = [
  { id: "ev-001", asignacionId: "as-001", trabajadorId: "w-001", asistencia: true, nota: 5.5, aprobado: true, fechaEvaluacion: "2026-01-15" },
  { id: "ev-002", asignacionId: "as-002", trabajadorId: "w-001", asistencia: true, nota: 6.2, aprobado: true, fechaEvaluacion: "2026-01-20" },
  { id: "ev-003", asignacionId: "as-004", trabajadorId: "w-003", asistencia: true, nota: 4.8, aprobado: true, fechaEvaluacion: "2026-01-22" },
  { id: "ev-004", asignacionId: "as-011", trabajadorId: "w-002", asistencia: true, nota: 6.5, aprobado: true, fechaEvaluacion: "2026-01-25" },
  { id: "ev-005", asignacionId: "as-014", trabajadorId: "w-005", asistencia: true, nota: 5.0, aprobado: true, fechaEvaluacion: "2025-01-12" },
  { id: "ev-006", asignacionId: "as-016", trabajadorId: "w-005", asistencia: true, nota: 5.8, aprobado: true, fechaEvaluacion: "2025-06-15" },
];

// ─── Module-level state ───────────────────────────────────────────────────── //

let _catalogo: Capacitacion[] = [...CATALOGO_INICIAL];
let _asignaciones: AsignacionCapacitacion[] = [...ASIGNACIONES_INICIALES];
let _sesiones: SesionCapacitacion[] = [...SESIONES_INICIALES];
let _evaluaciones: EvaluacionCapacitacion[] = [...EVALUACIONES_INICIALES];

type Listener = () => void;
const _listeners: Set<Listener> = new Set();
function notify() { _listeners.forEach((fn) => fn()); }

export function subscribe(fn: Listener): () => void {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

// ─── Catálogo CRUD ────────────────────────────────────────────────────────── //

export function getCatalogo(): Capacitacion[] { return _catalogo; }
export function getCapacitacionById(id: string): Capacitacion | undefined {
  return _catalogo.find((c) => c.id === id);
}
export function createCapacitacion(data: Omit<Capacitacion, "id" | "createdAt">): Capacitacion {
  const c: Capacitacion = { ...data, id: `cap-${Date.now()}`, createdAt: HOY };
  _catalogo = [..._catalogo, c];
  notify();
  return c;
}
export function updateCapacitacion(id: string, data: Partial<Omit<Capacitacion, "id" | "createdAt">>): void {
  _catalogo = _catalogo.map((c) => (c.id === id ? { ...c, ...data } : c));
  notify();
}

// ─── Asignaciones CRUD ────────────────────────────────────────────────────── //

export function getAsignaciones(): AsignacionCapacitacion[] { return _asignaciones; }
export function getAsignacionesByTrabajador(trabajadorId: string): AsignacionCapacitacion[] {
  return _asignaciones.filter((a) => a.trabajadorId === trabajadorId);
}
export function getAsignacionByToken(token: string): AsignacionCapacitacion | undefined {
  return _asignaciones.find((a) => a.token === token);
}
export function createAsignacion(data: Omit<AsignacionCapacitacion, "id">): AsignacionCapacitacion {
  const a: AsignacionCapacitacion = { ...data, id: `as-${Date.now()}` };
  _asignaciones = [a, ..._asignaciones];
  notify();
  return a;
}
export function updateAsignacion(id: string, patch: Partial<AsignacionCapacitacion>): void {
  _asignaciones = _asignaciones.map((a) => (a.id === id ? { ...a, ...patch } : a));
  notify();
}

// ─── Sesiones CRUD ────────────────────────────────────────────────────────── //

export function getSesiones(): SesionCapacitacion[] { return _sesiones; }
export function createSesion(data: Omit<SesionCapacitacion, "id" | "createdAt">): SesionCapacitacion {
  const s: SesionCapacitacion = { ...data, id: `ses-${Date.now()}`, createdAt: HOY };
  _sesiones = [s, ..._sesiones];
  notify();
  return s;
}
export function updateSesion(id: string, patch: Partial<Omit<SesionCapacitacion, "id" | "createdAt">>): void {
  _sesiones = _sesiones.map((s) => (s.id === id ? { ...s, ...patch } : s));
  notify();
}

// ─── Evaluaciones ──────────────────────────────────────────────────────────── //

export function getEvaluaciones(): EvaluacionCapacitacion[] { return _evaluaciones; }
export function createEvaluacion(data: Omit<EvaluacionCapacitacion, "id">): EvaluacionCapacitacion {
  const e: EvaluacionCapacitacion = { ...data, id: `ev-${Date.now()}` };
  _evaluaciones = [e, ..._evaluaciones];
  notify();
  return e;
}

// ─── Helpers ──────────────────────────────────────────────────────────────── //

/** Returns capacitaciones that apply to a given cargo id */
export function getCapacitacionesPorCargo(cargoId: string): Capacitacion[] {
  return _catalogo.filter((c) => c.activa && c.aplicaCargos.includes(cargoId));
}

/** Returns capacitaciones that apply to a given area id */
export function getCapacitacionesPorArea(areaId: string): Capacitacion[] {
  return _catalogo.filter((c) => c.activa && c.aplicaAreas.includes(areaId));
}

/** Generates automatic assignments for a worker based on their cargo and area */
export function generarAsignacionesAutomaticas(
  trabajador: { id: string; cargo: string; area: string }
): AsignacionCapacitacion[] {
  const cargoRef = CARGO_REFS.find((c) => c.nombre === trabajador.cargo);
  const areaRef = AREA_REFS.find((a) => a.nombre === trabajador.area);

  const capacitacionIds = new Set<string>();
  if (cargoRef) getCapacitacionesPorCargo(cargoRef.id).forEach((c) => capacitacionIds.add(c.id));
  if (areaRef) getCapacitacionesPorArea(areaRef.id).forEach((c) => capacitacionIds.add(c.id));

  const existentes = new Set(_asignaciones.filter((a) => a.trabajadorId === trabajador.id).map((a) => a.capacitacionId));
  const nuevas: AsignacionCapacitacion[] = [];

  for (const capId of capacitacionIds) {
    if (existentes.has(capId)) continue;
    const cap = getCapacitacionById(capId);
    if (!cap) continue;
    const vencimiento = new Date(HOY);
    vencimiento.setMonth(vencimiento.getMonth() + cap.vigenciaMeses);
    const a = createAsignacion({
      trabajadorId: trabajador.id,
      capacitacionId: capId,
      origen: "automatica",
      estado: "pendiente",
      fechaAsignacion: HOY,
      fechaVencimiento: vencimiento.toISOString().slice(0, 10),
      token: generarTokenCapacitacion(),
    });
    nuevas.push(a);
  }
  return nuevas;
}

/** Calculates vigencia from an assignment */
export function calcularVigenciaCapacitacion(
  asignacion: AsignacionCapacitacion,
  capacitacion: Capacitacion
): { vigente: boolean; vigenciaHasta: string | null } {
  if (!asignacion.fechaRespuesta || asignacion.estado !== "aprobada") {
    return { vigente: false, vigenciaHasta: null };
  }
  const hasta = new Date(asignacion.fechaRespuesta);
  hasta.setMonth(hasta.getMonth() + capacitacion.vigenciaMeses);
  const vigenciaHasta = hasta.toISOString().slice(0, 10);
  const vigente = vigenciaHasta >= HOY;
  return { vigente, vigenciaHasta };
}

/** Derives historial from all approved/completed assignments */
export function derivarHistorialCapacitaciones(): HistorialEntry[] {
  const workers = MOCK_WORKERS;
  const entries: HistorialEntry[] = [];

  for (const asig of _asignaciones) {
    if (!["aprobada", "finalizada", "rechazada", "vencida"].includes(asig.estado)) continue;
    const cap = getCapacitacionById(asig.capacitacionId);
    const worker = workers.find((w) => w.id === asig.trabajadorId);
    if (!cap || !worker) continue;

    const { vigente, vigenciaHasta } = calcularVigenciaCapacitacion(asig, cap);
    entries.push({
      asignacionId: asig.id,
      trabajadorId: asig.trabajadorId,
      trabajadorNombre: `${worker.nombre} ${worker.apellido}`,
      capacitacionId: asig.capacitacionId,
      capacitacionNombre: cap.nombre,
      categoria: cap.categoria,
      modalidad: cap.modalidad,
      fechaRealizacion: asig.fechaRespuesta ?? asig.fechaAsignacion,
      vigenciaHasta,
      vigente: asig.estado === "vencida" ? false : vigente,
      estado: asig.estado,
      nota: asig.nota,
      aprobado: asig.aprobado,
      evidenciaId: asig.evidenciaId,
    });
  }

  return entries.sort((a, b) => b.fechaRealizacion.localeCompare(a.fechaRealizacion));
}

/** Generates a random secure-looking token */
export function generarTokenCapacitacion(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 6)}`;
}

/** Sends the assignment link (mock: just marks as 'enviada') */
export function enviarEnlaceCapacitacion(asignacionId: string): void {
  updateAsignacion(asignacionId, {
    estado: "enviada",
    fechaEnvio: new Date().toISOString().slice(0, 10),
    token: generarTokenCapacitacion(),
  });
}

/** Re-assigns a rejected/expired capacitacion to the same worker as a new assignment */
export function reasignarCapacitacion(asignacionId: string): AsignacionCapacitacion {
  const original = _asignaciones.find((a) => a.id === asignacionId);
  if (!original) throw new Error("Asignación no encontrada");
  const cap = getCapacitacionById(original.capacitacionId);
  const fechaVenc = cap
    ? (() => { const d = new Date(); d.setMonth(d.getMonth() + cap.vigenciaMeses); return d.toISOString().slice(0, 10); })()
    : new Date().toISOString().slice(0, 10);
  return createAsignacion({
    trabajadorId: original.trabajadorId,
    capacitacionId: original.capacitacionId,
    origen: "manual",
    estado: "pendiente",
    fechaAsignacion: new Date().toISOString().slice(0, 10),
    fechaVencimiento: fechaVenc,
    token: generarTokenCapacitacion(),
  });
}

/** Extends the deadline of a vencida/pendiente assignment */
export function extenderPlazo(asignacionId: string, meses: number = 3): void {
  const asig = _asignaciones.find((a) => a.id === asignacionId);
  if (!asig) return;
  const base = asig.fechaVencimiento ?? new Date().toISOString().slice(0, 10);
  const nueva = new Date(base);
  nueva.setMonth(nueva.getMonth() + meses);
  updateAsignacion(asignacionId, {
    estado: "pendiente",
    fechaVencimiento: nueva.toISOString().slice(0, 10),
  });
}

/** Generates a mock certificate for an approved assignment */
export function generarCertificadoMock(asignacionId: string): string {
  const certId = `cert-${Date.now().toString(36)}`;
  updateAsignacion(asignacionId, {
    certificadoId: certId,
    documentoId: `doc-${certId}`,
  });
  return certId;
}

// ─── Display helpers ──────────────────────────────────────────────────────── //

export const CATEGORIA_CFG: Record<CategoriaCap, { label: string; cls: string }> = {
  induccion:   { label: "Inducción",     cls: "bg-blue-50 text-blue-700 border border-blue-200" },
  sst:         { label: "SST",           cls: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  normativa:   { label: "Normativa",     cls: "bg-violet-50 text-violet-700 border border-violet-200" },
  evacuacion:  { label: "Evacuación",    cls: "bg-orange-50 text-orange-700 border border-orange-200" },
  altura:      { label: "Altura",        cls: "bg-rose-50 text-rose-700 border border-rose-200" },
  herramientas:{ label: "Herramientas",  cls: "bg-amber-50 text-amber-700 border border-amber-200" },
  ergonomia:   { label: "Ergonomía",     cls: "bg-teal-50 text-teal-700 border border-teal-200" },
  quimicos:    { label: "Químicos",      cls: "bg-pink-50 text-pink-700 border border-pink-200" },
  otro:        { label: "Otro",          cls: "bg-slate-50 text-slate-600 border border-slate-200" },
};

export const ESTADO_ASIG_CFG: Record<
  EstadoAsignacion,
  { label: string; cls: string; dot: string }
> = {
  pendiente:  { label: "Pendiente",  cls: "bg-slate-50 text-slate-600 border border-slate-200",        dot: "bg-slate-400" },
  enviada:    { label: "Enviada",    cls: "bg-blue-50 text-blue-700 border border-blue-200",           dot: "bg-blue-500" },
  en_proceso: { label: "En proceso", cls: "bg-violet-50 text-violet-700 border border-violet-200",    dot: "bg-violet-500" },
  finalizada: { label: "Finalizada", cls: "bg-teal-50 text-teal-700 border border-teal-200",          dot: "bg-teal-500" },
  aprobada:   { label: "Aprobada",   cls: "bg-emerald-50 text-emerald-700 border border-emerald-200", dot: "bg-emerald-500" },
  rechazada:  { label: "Rechazada",  cls: "bg-rose-50 text-rose-700 border border-rose-200",          dot: "bg-rose-500" },
  vencida:    { label: "Vencida",    cls: "bg-amber-50 text-amber-700 border border-amber-200",       dot: "bg-amber-500" },
};

export const ESTADO_SESION_CFG: Record<EstadoSesion, { label: string; cls: string }> = {
  programada:    { label: "Programada",    cls: "bg-blue-50 text-blue-700 border border-blue-200" },
  confirmada:    { label: "Confirmada",    cls: "bg-violet-50 text-violet-700 border border-violet-200" },
  realizada:     { label: "Realizada",     cls: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  suspendida:    { label: "Suspendida",    cls: "bg-rose-50 text-rose-700 border border-rose-200" },
  reprogramada:  { label: "Reprogramada",  cls: "bg-amber-50 text-amber-700 border border-amber-200" },
  cerrada:       { label: "Cerrada",       cls: "bg-slate-50 text-slate-600 border border-slate-200" },
};

export const MODALIDAD_CFG: Record<ModalidadCap, { label: string; cls: string }> = {
  presencial: { label: "Presencial", cls: "bg-indigo-50 text-indigo-700 border border-indigo-200" },
  online:     { label: "Online",     cls: "bg-cyan-50 text-cyan-700 border border-cyan-200" },
  mixta:      { label: "Mixta",      cls: "bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200" },
};
