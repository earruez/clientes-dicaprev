/**
 * Shared module-level store that bridges Historial de Acreditaciones → Cumplimiento.
 *
 * Persists for the lifetime of the JS bundle (resets on hard reload).
 * Designed for mock-data stage — replace with Firestore writes when backend is ready.
 */
import type { Hallazgo } from "@/app/dicaprev/cumplimiento/types";

const _store = new Map<string, Hallazgo>();

/** Persist a hallazgo derived from an acreditacion rejection. */
export function agregarHallazgoAcreditacion(acreditacionId: string, hallazgo: Hallazgo): void {
  _store.set(acreditacionId, hallazgo);
}

/** Return the hallazgo linked to this acreditacion, if any. */
export function getHallazgoAcreditacion(acreditacionId: string): Hallazgo | undefined {
  return _store.get(acreditacionId);
}

/** True if a hallazgo has been generated for this acreditacion. */
export function isVinculado(acreditacionId: string): boolean {
  return _store.has(acreditacionId);
}

/** All generated hallazgos, ordered by insertion (most recent last). */
export function getAll(): Hallazgo[] {
  return Array.from(_store.values());
}
