/**
 * audit-store.ts
 *
 * Shared runtime audit log for NEXTPREV.
 * Architecture: module-level singleton (same pattern as vehiculos-store).
 * In production this will be replaced by a Firestore/API write.
 *
 * Usage:
 *   import { registrarAccion } from "@/lib/auditoria/audit-store";
 *   registrarAccion({ accion: "crear", modulo: "trabajadores", ... });
 */

// ─── Types ────────────────────────────────────────────────────────────────── //

export type AccionAudit =
  | "crear"
  | "editar"
  | "eliminar"
  | "aprobar"
  | "rechazar"
  | "enviar"
  | "subir_documento"
  | "cambiar_estado"
  | "ver";

export type ModuloAudit =
  | "trabajadores"
  | "documentos"
  | "cumplimiento"
  | "acreditaciones"
  | "vehiculos"
  | "capacitacion"
  | "empresa";

export interface AuditLog {
  id: string;
  usuarioId: string;
  usuarioNombre: string;
  accion: AccionAudit;
  modulo: ModuloAudit;
  /** Human-readable entity label, e.g. "Trabajador", "Hallazgo", "Vehículo" */
  entidadTipo: string;
  entidadId: string;
  descripcion: string;
  /** ISO 8601 datetime string */
  fecha: string;
  /** Snapshot before the change (optional) */
  antes?: Record<string, unknown>;
  /** Snapshot after the change (optional) */
  despues?: Record<string, unknown>;
}

export type AuditLogInput = Omit<AuditLog, "id" | "fecha" | "usuarioId" | "usuarioNombre"> & {
  fecha?: string;
  usuarioId?: string;
  usuarioNombre?: string;
};

// ─── Seed data ────────────────────────────────────────────────────────────── //

const SEED: AuditLog[] = [
  {
    id: "al-001",
    usuarioId: "usr-admin",
    usuarioNombre: "Prevencionista NEXTPREV",
    accion: "crear",
    modulo: "trabajadores",
    entidadTipo: "Trabajador",
    entidadId: "w-001",
    descripcion: "Creó al trabajador Juan Pérez Rojas",
    fecha: "2026-04-01T09:15:00.000Z",
  },
  {
    id: "al-002",
    usuarioId: "usr-admin",
    usuarioNombre: "Prevencionista NEXTPREV",
    accion: "crear",
    modulo: "cumplimiento",
    entidadTipo: "Hallazgo",
    entidadId: "h-1001",
    descripcion: "Registró hallazgo: Falta de señalética en bodega norte",
    fecha: "2026-04-02T10:30:00.000Z",
  },
  {
    id: "al-003",
    usuarioId: "usr-admin",
    usuarioNombre: "Prevencionista NEXTPREV",
    accion: "subir_documento",
    modulo: "cumplimiento",
    entidadTipo: "Evidencia",
    entidadId: "evc-1002",
    descripcion: "Subió evidencia fotográfica para hallazgo h-1001",
    fecha: "2026-04-03T14:00:00.000Z",
  },
  {
    id: "al-004",
    usuarioId: "usr-admin",
    usuarioNombre: "Prevencionista NEXTPREV",
    accion: "cambiar_estado",
    modulo: "acreditaciones",
    entidadTipo: "Acreditación",
    entidadId: "ac-1003",
    descripcion: "Cambió estado de acreditación a 'Enviada'",
    fecha: "2026-04-04T08:45:00.000Z",
  },
  {
    id: "al-005",
    usuarioId: "usr-admin",
    usuarioNombre: "Prevencionista NEXTPREV",
    accion: "editar",
    modulo: "vehiculos",
    entidadTipo: "Vehículo",
    entidadId: "v-001",
    descripcion: "Actualizó datos del vehículo BBLF-45 (Toyota Hilux)",
    fecha: "2026-04-05T11:20:00.000Z",
  },
  {
    id: "al-006",
    usuarioId: "usr-admin",
    usuarioNombre: "Prevencionista NEXTPREV",
    accion: "cambiar_estado",
    modulo: "cumplimiento",
    entidadTipo: "Hallazgo",
    entidadId: "h-1001",
    descripcion: "Cerró hallazgo: Falta de señalética — marcado como resuelto",
    fecha: "2026-04-07T16:00:00.000Z",
  },
  {
    id: "al-007",
    usuarioId: "usr-admin",
    usuarioNombre: "Prevencionista NEXTPREV",
    accion: "crear",
    modulo: "vehiculos",
    entidadTipo: "Vehículo",
    entidadId: "v-006",
    descripcion: "Registró nuevo vehículo: Ford Ranger XLT (CDMN-12)",
    fecha: "2026-04-08T09:00:00.000Z",
  },
  {
    id: "al-008",
    usuarioId: "usr-admin",
    usuarioNombre: "Prevencionista NEXTPREV",
    accion: "editar",
    modulo: "trabajadores",
    entidadTipo: "Trabajador",
    entidadId: "w-002",
    descripcion: "Editó los datos del trabajador María González",
    fecha: "2026-04-09T13:10:00.000Z",
  },
];

// ─── Module-level state ───────────────────────────────────────────────────── //

let _logs: AuditLog[] = [...SEED];

type Listener = () => void;
const _listeners: Set<Listener> = new Set();

function notify() {
  _listeners.forEach((fn) => fn());
}

export function subscribe(fn: Listener): () => void {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

// ─── Public API ───────────────────────────────────────────────────────────── //

/** Register a new audit event. Returns the created log entry. */
export function registrarAccion(input: AuditLogInput): AuditLog {
  const log: AuditLog = {
    ...input,
    id: `al-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    fecha: input.fecha ?? new Date().toISOString(),
    // Default user — override with real auth context when backend is ready
    usuarioId: input.usuarioId ?? "usr-admin",
    usuarioNombre: input.usuarioNombre ?? "Prevencionista NEXTPREV",
  };
  _logs = [log, ..._logs];
  notify();
  return log;
}

/** Return all logs, newest first. */
export function getLogs(): AuditLog[] {
  return _logs;
}

/** Return logs filtered by optional criteria. */
export function getLogsFiltrados(opts: {
  modulo?: ModuloAudit | "todos";
  accion?: AccionAudit | "todas";
  usuario?: string;
  desde?: string;
  hasta?: string;
}): AuditLog[] {
  return _logs.filter((l) => {
    if (opts.modulo && opts.modulo !== "todos" && l.modulo !== opts.modulo) return false;
    if (opts.accion && opts.accion !== "todas" && l.accion !== opts.accion) return false;
    if (opts.usuario && !l.usuarioNombre.toLowerCase().includes(opts.usuario.toLowerCase())) return false;
    if (opts.desde && l.fecha < opts.desde) return false;
    if (opts.hasta && l.fecha > opts.hasta + "T23:59:59") return false;
    return true;
  });
}
