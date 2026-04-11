/**
 * acciones.ts
 *
 * Lógica de negocio para derivar AccionCumplimiento desde hallazgos.
 *
 * Fuentes de acciones:
 *   1. HallazgoGenerado[] — generados por el motor de cumplimiento (automáticos)
 *   2. Hallazgo[]         — hallazgos manuales activos (no cerrados)
 *
 * Reglas de derivación:
 *   - tipo "faltante" → "Regularizar: {obligación}" (sin documento real)
 *   - tipo "vencido"  → "Renovar: {obligación}"    (documento caducado)
 *
 * Los hallazgos manuales activos que no estén ya cubiertos por una acción
 * automática (misma obligación + entidad) se incorporan como acciones "manual".
 */

import {
  calcularTamañoEmpresa,
  type HallazgoGenerado,
} from "@/lib/cumplimiento/cumplimiento-engine";
import type {
  Hallazgo,
  AccionCumplimiento,
  PrioridadHallazgo,
  EstadoAccionCumplimiento,
} from "./types";
import {
  getReglasEmpresaByCount,
  ESTRUCTURA_LABELS,
  type ReglasEmpresa,
} from "@/lib/empresa/reglas-empresa";

// ─── Constantes ───────────────────────────────────────────────────────────────

/** Días desde hoy para calcular la fecha de compromiso según prioridad */
const DIAS_POR_PRIORIDAD: Record<PrioridadHallazgo, number> = {
  critica: 7,
  alta: 15,
  media: 30,
  baja: 60,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fechaCompromisoPorPrioridad(prioridad: PrioridadHallazgo): string {
  const dias = DIAS_POR_PRIORIDAD[prioridad];
  return new Date(Date.now() + dias * 86_400_000).toISOString().slice(0, 10);
}

// ─── Función principal ────────────────────────────────────────────────────────

/**
 * Deriva un array de `AccionCumplimiento` unificado desde:
 *  - `hallazgosAuto`     — salida de `generarHallazgosDesdeEvaluaciones()`
 *  - `hallazgosManuales` — `HALLAZGOS_MOCK` o datos de Firestore
 *  - `centros`           — para resolver nombre de entidad
 *  - `obligaciones`      — para resolver nombre y responsable
 *
 * Garantía de unicidad: un hallazgo automático y uno manual para la misma
 * obligación+entidad sólo generan UNA acción (la automática tiene prioridad).
 */
export function derivarAccionesDesdeHallazgos(
  hallazgosAuto: HallazgoGenerado[],
  hallazgosManuales: Hallazgo[],
  centros: { id: string; nombre: string }[],
  obligaciones: { id: string; nombre: string; responsable: string }[]
): AccionCumplimiento[] {
  const ahora = new Date().toISOString();

  // ── 1. Acciones automáticas ──────────────────────────────────────────────
  const accionesAuto: AccionCumplimiento[] = hallazgosAuto.map((hg) => {
    const centro = centros.find((c) => c.id === hg.entidadId);
    const ob = obligaciones.find((o) => o.id === hg.obligacionId);
    const prioridad = hg.prioridad as PrioridadHallazgo;

    const titulo =
      hg.tipo === "vencido"
        ? `Renovar: ${hg.obligacionNombre}`
        : `Regularizar: ${hg.obligacionNombre}`;

    const descripcion =
      hg.tipo === "vencido"
        ? `La obligación "${hg.obligacionNombre}" tiene documentación vencida en ${centro?.nombre ?? hg.entidadId}. Renovar o actualizar el documento.`
        : `La obligación "${hg.obligacionNombre}" no tiene evidencia documental en ${centro?.nombre ?? hg.entidadId}. Cargar el documento requerido.`;

    return {
      id: `accion-${hg.id}`,
      hallazgoId: hg.id,
      entidadId: hg.entidadId,
      entidadNombre: centro?.nombre ?? hg.entidadId,
      obligacionId: hg.obligacionId,
      obligacionNombre: hg.obligacionNombre,
      titulo,
      descripcion,
      prioridad,
      responsable: ob?.responsable ?? "Sin asignar",
      fechaCompromiso: fechaCompromisoPorPrioridad(prioridad),
      estado: "pendiente" as EstadoAccionCumplimiento,
      evidenciaIds: [],
      origenTipo: "automatico",
      generadaEl: ahora,
    };
  });

  // ── 2. Acciones manuales (sin duplicar las ya cubiertas por el motor) ──────
  const autoKeys = new Set(
    accionesAuto.map((a) => `${a.obligacionId ?? ""}::${a.entidadId}`)
  );

  const accionesManuales: AccionCumplimiento[] = hallazgosManuales
    .filter(
      (h) =>
        h.estado !== "cerrado" &&
        !autoKeys.has(`${h.obligacionId ?? ""}::${h.centroId}`)
    )
    .map((h) => {
      const ob = h.obligacionId
        ? obligaciones.find((o) => o.id === h.obligacionId)
        : undefined;
      const prioridad = h.prioridad as PrioridadHallazgo;
      const estado: EstadoAccionCumplimiento =
        h.estado === "en_proceso" ? "en_proceso" : "pendiente";

      return {
        id: `accion-${h.id}`,
        hallazgoId: h.id,
        entidadId: h.centroId,
        entidadNombre: h.centroNombre,
        obligacionId: h.obligacionId,
        obligacionNombre: h.obligacionNombre,
        titulo: h.descripcion,
        descripcion: "",
        prioridad,
        responsable: ob?.responsable ?? "Sin asignar",
        fechaCompromiso: h.fechaCompromiso,
        estado,
        evidenciaIds: h.evidenciaIds,
        origenTipo: "manual",
        generadaEl: h.fechaCreacion,
      };
    });

  return [...accionesAuto, ...accionesManuales];
}

// ─────────────────────────────────────────────────────────────────────────────
// Hallazgos estructurales por tamaño de empresa
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Genera hallazgos automáticos para estructuras obligatorias que no existen
 * en la empresa según su tamaño de dotación.
 *
 * Ejemplo: empresa "mediana" (48 trabajadores) debe tener Comité Paritario.
 * Si `estadoActual.comiteParitario === false`, se genera un HallazgoGenerado
 * de tipo "faltante" con prioridad "alta".
 *
 * @param tamano         - Tamaño derivado por `calcularTamañoEmpresa()`
 * @param estadoActual   - Mapa de qué estructuras existen actualmente
 * @param entidadId      - ID de la empresa o centro (default "empresa")
 * @returns              - Array de HallazgoGenerado para estructuras faltantes
 */
export function hallazgosEstructurales(
  cantidadTrabajadores: number,
  estadoActual: Partial<Record<keyof Omit<ReglasEmpresa, "tamano">, boolean>>,
  entidadId = "empresa"
): HallazgoGenerado[] {
  const reglas = getReglasEmpresaByCount(cantidadTrabajadores);
  const tamano = calcularTamañoEmpresa(cantidadTrabajadores);
  const generadoEl = new Date().toISOString();
  const claves = Object.keys(ESTRUCTURA_LABELS) as (keyof typeof ESTRUCTURA_LABELS)[];

  return claves
    .filter((k) => reglas[k].obligatorio && !(estadoActual[k] ?? false))
    .map<HallazgoGenerado>((k) => {
      const label = ESTRUCTURA_LABELS[k];
      const base = reglas[k].base;
      return {
        id: `estruc-${k}-${entidadId}`,
        obligacionId: k,
        obligacionNombre: label,
        entidadId,
        entidadTipo: "empresa",
        tipo: "faltante",
        prioridad: "alta",
        titulo: `Estructura obligatoria ausente: ${label}`,
        descripcion: `${label} es obligatorio para empresas de tamaño "${tamano}". ${base}. Sin esta estructura la empresa incumple la normativa DS44/Ley 16.744.`,
        fuenteTipo: "manual",
        generadoEl,
      };
    });
}
