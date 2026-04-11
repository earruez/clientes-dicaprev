/**
 * calcular-duraciones.ts
 * Helper para medir tiempos reales del proceso de acreditación
 * a partir de historialEstados (Acreditacion) o fechas crudas (RegistroHistorial).
 */

import type { Acreditacion } from "@/app/dicaprev/acreditaciones/types";

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface DuracionesAcreditacion {
  /** Días desde creadoEl hasta el primer estado listo_para_enviar o enviado */
  diasPreparacion: number | null;
  /** Días desde creadoEl hasta el primer estado "enviado" */
  diasHastaEnvio: number | null;
  /** Días desde el primer "enviado" hasta el primer aprobado / rechazado / observada */
  diasHastaRespuesta: number | null;
  /** Días desde creadoEl hasta el estado "aprobado" */
  diasHastaAprobacion: number | null;
}

// ── Utilidades ───────────────────────────────────────────────────────────────

function diffDias(desde: string, hasta: string): number {
  const t1 = new Date(desde).getTime();
  const t2 = new Date(hasta).getTime();
  if (Number.isNaN(t1) || Number.isNaN(t2)) return 0;
  return Math.max(0, Math.round((t2 - t1) / (1000 * 60 * 60 * 24)));
}

// ── Helper principal ─────────────────────────────────────────────────────────

/**
 * Calcula los tiempos de cada fase del proceso de acreditación
 * usando el historial de cambios de estado (historialEstados).
 *
 * @param acreditacion - Objeto Acreditacion con historialEstados opcional
 * @returns DuracionesAcreditacion con nulls para fases aún no alcanzadas
 */
export function calcularDuracionesAcreditacion(
  acreditacion: Acreditacion
): DuracionesAcreditacion {
  const hist = acreditacion.historialEstados ?? [];

  const primerListaParaEnviar = hist.find(
    (h) => h.estado === "listo_para_enviar"
  );
  const primerEnviado = hist.find((h) => h.estado === "enviado");
  const primeraRespuesta = hist.find(
    (h) =>
      h.estado === "aprobado" ||
      h.estado === "rechazado" ||
      h.estado === "observada"
  );
  const aprobado = hist.find((h) => h.estado === "aprobado");

  // Referencia de inicio: creadoEl del objeto
  const inicio = acreditacion.creadoEl;

  const hito = primerListaParaEnviar ?? primerEnviado;
  const diasPreparacion = hito ? diffDias(inicio, hito.fecha) : null;

  const diasHastaEnvio = primerEnviado
    ? diffDias(inicio, primerEnviado.fecha)
    : null;

  const diasHastaRespuesta =
    primerEnviado && primeraRespuesta
      ? diffDias(primerEnviado.fecha, primeraRespuesta.fecha)
      : null;

  const diasHastaAprobacion = aprobado
    ? diffDias(inicio, aprobado.fecha)
    : null;

  return {
    diasPreparacion,
    diasHastaEnvio,
    diasHastaRespuesta,
    diasHastaAprobacion,
  };
}

// ── Umbrales de alerta (días) ─────────────────────────────────────────────────

export const UMBRALES = {
  /** Días en preparación antes de considerarse lento */
  preparacionLenta: 30,
  /** Días enviada sin respuesta antes de considerarse sin respuesta */
  sinRespuesta: 21,
  /** Días hasta aprobación para considerarse proceso lento */
  aprobacionLenta: 60,
} as const;

// ── Tipo de alerta ────────────────────────────────────────────────────────────

export type TipoAlerta =
  | "preparacion_lenta"
  | "sin_respuesta"
  | "aprobacion_lenta";

export interface AlertaAcreditacion {
  tipo: TipoAlerta;
  dias: number;
  umbral: number;
}

// ── Detectores para RegistroHistorial (fechas crudas) ────────────────────────

interface AlertaInput {
  estado: string;
  fechaCreacion: string;
  fechaEnvio?: string;
  fechaRespuesta?: string;
  resultado?: string;
  diasGestion: number;
}

/**
 * Detecta alertas de atraso en un registro de historial.
 * Devuelve array vacío si no hay alertas.
 */
export function detectarAlertas(h: AlertaInput): AlertaAcreditacion[] {
  const alertas: AlertaAcreditacion[] = [];
  const hoy = new Date().toISOString();

  // Lento en preparación: sin envío y pasan más días del umbral
  if (!h.fechaEnvio) {
    const diasDesdeCreacion = diffDias(h.fechaCreacion, hoy);
    if (diasDesdeCreacion > UMBRALES.preparacionLenta) {
      alertas.push({
        tipo: "preparacion_lenta",
        dias: diasDesdeCreacion,
        umbral: UMBRALES.preparacionLenta,
      });
    }
  }

  // Enviada sin respuesta: envío pero sin respuesta y pasó el umbral
  if (h.fechaEnvio && !h.fechaRespuesta && !h.resultado) {
    const diasDesdeEnvio = diffDias(h.fechaEnvio, hoy);
    if (diasDesdeEnvio > UMBRALES.sinRespuesta) {
      alertas.push({
        tipo: "sin_respuesta",
        dias: diasDesdeEnvio,
        umbral: UMBRALES.sinRespuesta,
      });
    }
  }

  // Aprobación lenta: tiene resultado pero tomó muchos días
  if (h.resultado === "aprobado" && h.diasGestion > UMBRALES.aprobacionLenta) {
    alertas.push({
      tipo: "aprobacion_lenta",
      dias: h.diasGestion,
      umbral: UMBRALES.aprobacionLenta,
    });
  }

  return alertas;
}

/** Verdadero si el registro tiene al menos una alerta activa */
export function tieneAlerta(h: AlertaInput): boolean {
  return detectarAlertas(h).length > 0;
}

/** Nivel de severidad del conjunto de alertas */
export function severidadAlertas(alertas: AlertaAcreditacion[]): "critica" | "advertencia" | null {
  if (alertas.length === 0) return null;
  if (alertas.some((a) => a.tipo === "sin_respuesta")) return "critica";
  return "advertencia";
}
