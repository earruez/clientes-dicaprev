"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/auth/permissions";
import {
  calcularTamañoEmpresa,
  evaluarObligaciones,
  generarHallazgosDesdeEvaluaciones,
  type DocumentoEvaluable,
  type EntidadInput,
} from "@/lib/cumplimiento/cumplimiento-engine";
import { getObligacionesCumplimientoEmpresa } from "../obligaciones/actions";
import { getHallazgos } from "../hallazgos/actions";
import { derivarAccionesDesdeHallazgos, hallazgosEstructurales } from "../acciones";
import type { AccionCumplimiento } from "../types";
export type PlanTrabajoData = {
  acciones: AccionCumplimiento[];
  centros: Array<{ id: string; nombre: string }>;
  cantidadTrabajadores: number;
  empresaNombre: string;
};

export async function getPlanTrabajoData(): Promise<PlanTrabajoData> {
  const { empresaId } = await requirePermission("canReadCumplimiento");

  // Fetch empresa info + centros + documentos en paralelo con obligaciones y hallazgos
  const [empresa, centrosDb, documentosDb, obligacionesPayload, hallazgos] =
    await Promise.all([
      prisma.empresa.findUnique({
        where: { id: empresaId },
        select: { nombre: true, cantidadTrabajadores: true },
      }),
      prisma.centroTrabajo.findMany({
        where: { empresaId, estado: "activo" },
        select: { id: true, nombre: true },
        orderBy: { nombre: "asc" },
      }),
      prisma.documentoEmpresa.findMany({
        where: { empresaId },
        select: {
          id: true,
          archivoNombre: true,
          estado: true,
          fechaVencimiento: true,
          documentoRequerido: { select: { id: true, nombre: true, categoria: true } },
        },
      }),
      getObligacionesCumplimientoEmpresa(),
      getHallazgos(),
    ]);

  const cantidadTrabajadores = empresa?.cantidadTrabajadores ?? 0;
  const empresaNombre = empresa?.nombre ?? "Empresa";

  // ── Centros: usar los de Prisma; si no hay, usar empresa como entidad
  const centros =
    centrosDb.length > 0
      ? centrosDb
      : [{ id: empresaId, nombre: empresaNombre }];

  // ── Construir DocumentoEvaluable desde documentos reales de empresa
  const docs: DocumentoEvaluable[] = documentosDb.flatMap((doc) => {
    const nombre = doc.documentoRequerido?.nombre ?? doc.archivoNombre ?? "Documento";
    const obligacionId = doc.documentoRequerido?.id;
    const fechaVencimiento = doc.fechaVencimiento
      ? doc.fechaVencimiento.toISOString().slice(0, 10)
      : undefined;

    // Asignar documento a todos los centros (o a empresa si no hay centros)
    return centros.map((centro) => ({
      id: `${doc.id}-${centro.id}`,
      nombre,
      tipo: doc.documentoRequerido?.categoria ?? "documento",
      entidadId: centro.id,
      entidadTipo: "centro" as const,
      obligacionId,
      fechaVencimiento,
    }));
  });

  // ── Entidades para el motor
  const entidades: EntidadInput[] = centros.map((c) => ({
    id: c.id,
    tipo: "centro" as const,
  }));

  // ── Obligaciones aplicables como ObligacionInput para el motor
  const obligacionesInput = obligacionesPayload.obligaciones
    .filter((o) => o.aplica)
    .map((o) => ({
      id: o.obligacionClave,
      nombre: o.nombre,
      tipo: o.tipo,
      vencimiento: o.vencimiento,
      aplicaDesdeTrabajadores: o.aplicaDesdeTrabajadores,
      aplicaHastaTrabajadores: o.aplicaHastaTrabajadores,
    }));

  const tamanoEmpresa = calcularTamañoEmpresa(cantidadTrabajadores);

  // ── Evaluar obligaciones con el motor
  const evaluaciones = evaluarObligaciones(
    obligacionesInput,
    docs,
    entidades,
    new Date(),
    tamanoEmpresa,
    cantidadTrabajadores,
  );

  // ── Generar hallazgos automáticos desde evaluaciones
  const hallazgosAuto = generarHallazgosDesdeEvaluaciones(evaluaciones);

  // ── Derivar estado SST desde las obligaciones reales
  const estadoActualSst: Partial<Record<string, boolean>> = {
    comiteParitario: obligacionesPayload.obligaciones.some(
      (o) =>
        o.nombre.toLowerCase().includes("comité paritario") &&
        o.estadoObligacion === "cumplida",
    ),
    expertoPrevencion: obligacionesPayload.obligaciones.some(
      (o) =>
        (o.nombre.toLowerCase().includes("experto") ||
          o.nombre.toLowerCase().includes("prevencionista")) &&
        o.estadoObligacion === "cumplida",
    ),
    departamentoPrevencion: obligacionesPayload.obligaciones.some(
      (o) =>
        o.nombre.toLowerCase().includes("departamento") &&
        o.estadoObligacion === "cumplida",
    ),
    reglamentoInterno: obligacionesPayload.obligaciones.some(
      (o) =>
        o.nombre.toLowerCase().includes("reglamento interno") &&
        o.estadoObligacion === "cumplida",
    ),
    programaAnual: obligacionesPayload.obligaciones.some(
      (o) =>
        o.nombre.toLowerCase().includes("programa anual") &&
        o.estadoObligacion === "cumplida",
    ),
    investigacionAccidentes: obligacionesPayload.obligaciones.some(
      (o) =>
        o.nombre.toLowerCase().includes("accidente") &&
        o.estadoObligacion === "cumplida",
    ),
    planCapacitacion: obligacionesPayload.obligaciones.some(
      (o) =>
        o.nombre.toLowerCase().includes("capacitaci") &&
        o.estadoObligacion === "cumplida",
    ),
  };

  // ── Generar hallazgos estructurales usando el estado real
  const hallazgosEstruc = hallazgosEstructurales(
    cantidadTrabajadores,
    estadoActualSst as Parameters<typeof hallazgosEstructurales>[1],
    empresaId,
  );

  // ── Derivar acciones desde hallazgos auto + estructurales + manuales reales
  const obligacionesParaAcciones = obligacionesPayload.obligaciones.map((o) => ({
    id: o.obligacionClave,
    nombre: o.nombre,
    responsable: o.responsable,
  }));

  const acciones = derivarAccionesDesdeHallazgos(
    [...hallazgosAuto, ...hallazgosEstruc],
    hallazgos,
    centros,
    obligacionesParaAcciones,
  );

  return {
    acciones,
    centros,
    cantidadTrabajadores,
    empresaNombre,
  };
}
