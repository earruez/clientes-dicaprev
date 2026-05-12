// ──────────────────────────────────────────────────────────────
//  Shared alert types and generator
//  Used by: dashboard/page.tsx, notificaciones/page.tsx
// ──────────────────────────────────────────────────────────────

import { HALLAZGOS_MOCK } from "@/app/dicaprev/cumplimiento/mock-data";
import {
  ACREDITACIONES_MOCK,
  HISTORIAL_GESTION_MOCK,
} from "@/app/dicaprev/acreditaciones/mock-data";

export type AlertaTipo = "critica" | "proxima" | "gestion";

export interface AlertaSistema {
  id: string;
  tipo: AlertaTipo;
  titulo: string;
  descripcion: string;
  entidadId?: string;
  link: string;
  prioridad: 1 | 2 | 3;
  fecha: string;
}

export interface Notificacion extends AlertaSistema {
  leida: boolean;
}

/** Generates all system alerts, sorted by priority ascending.
 *  Consumers can slice to their own limit.
 *  @param sinDocCompleta - Número de trabajadores con documentación incompleta (calculable desde Prisma).
 *                          Los módulos Acreditaciones/Cumplimiento siguen siendo mock hasta su migración. */
export function generarAlertas(sinDocCompleta = 0): AlertaSistema[] {
  const resultado: AlertaSistema[] = [];
  const hoy = new Date().toISOString().slice(0, 10);

  // vehiculosConProblema: pendiente de migración de Acreditaciones (aún mock)
  const vehiculosConProblema = HISTORIAL_GESTION_MOCK.filter(
    (h) => h.motivoRechazo === "documentos_vehiculo"
  ).length;

  // a) Hallazgos críticos abiertos
  HALLAZGOS_MOCK.filter(
    (h) => h.prioridad === "critica" && h.estado === "abierto"
  ).forEach((h) => {
    resultado.push({
      id: `hallazgo-${h.id}`,
      tipo: "critica",
      titulo: "Hallazgo crítico abierto",
      descripcion: `${h.centroNombre} — ${h.descripcion}`,
      entidadId: h.id,
      link: "/dicaprev/cumplimiento/hallazgos",
      prioridad: 1,
      fecha: hoy,
    });
  });

  // b) Trabajadores sin documentación completa
  if (sinDocCompleta > 0) {
    resultado.push({
      id: "brecha-docs",
      tipo: "critica",
      titulo: "Documentación incompleta",
      descripcion: `${sinDocCompleta} trabajador${sinDocCompleta !== 1 ? "es" : ""} con docs pendientes o vencidas`,
      link: "/dicaprev/trabajadores/control-documental",
      prioridad: 1,
      fecha: hoy,
    });
  }

  // c) Vehículos fuera de regla
  if (vehiculosConProblema > 0) {
    resultado.push({
      id: "vehiculos-problema",
      tipo: "critica",
      titulo: "Vehículos fuera de regla",
      descripcion: `${vehiculosConProblema} acreditación${vehiculosConProblema !== 1 ? "es" : ""} rechazada${vehiculosConProblema !== 1 ? "s" : ""} por documentación vehicular`,
      link: "/dicaprev/acreditaciones",
      prioridad: 2,
      fecha: hoy,
    });
  }

  // d) Acreditaciones rechazadas
  ACREDITACIONES_MOCK.filter((a) => a.estado === "rechazado").forEach((a) => {
    resultado.push({
      id: `acred-rechazada-${a.id}`,
      tipo: "gestion",
      titulo: "Acreditación rechazada",
      descripcion: `Mandante: ${a.mandante}`,
      entidadId: a.id,
      link: "/dicaprev/acreditaciones",
      prioridad: 2,
      fecha: hoy,
    });
  });

  // e) Acreditaciones estancadas (enviado > 30 días sin respuesta)
  ACREDITACIONES_MOCK.filter((a) => {
    if (a.estado !== "enviado" || !a.ultimoExpediente) return false;
    const dias = Math.ceil(
      (Date.now() - new Date(a.ultimoExpediente).getTime()) / 86_400_000
    );
    return dias > 30;
  }).forEach((a) => {
    resultado.push({
      id: `acred-estancada-${a.id}`,
      tipo: "gestion",
      titulo: "Acreditación sin respuesta",
      descripcion: `${a.mandante} — más de 30 días enviada`,
      entidadId: a.id,
      link: "/dicaprev/acreditaciones",
      prioridad: 3,
      fecha: hoy,
    });
  });

  return resultado.sort((a, b) => a.prioridad - b.prioridad);
}
