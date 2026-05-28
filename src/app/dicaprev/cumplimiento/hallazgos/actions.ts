"use server";

import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions-matrix";
import { requireAuth, requirePermission } from "@/server/auth/permissions";
import type {
  EstadoHallazgo,
  Hallazgo,
  PrioridadHallazgo,
} from "../types";
import { getObligacionesCumplimientoEmpresa } from "../obligaciones/actions";

export type PlantillaHallazgo = {
  clave: string;
  label: string;
  tipo: string;
  prioridad: PrioridadHallazgo;
  descripcionBase: string;
  diasCompromiso: number;
  sugerenciaObligacionTexto?: string;
};

const PLANTILLAS_HALLAZGO: PlantillaHallazgo[] = [
  {
    clave: "doc_vencido",
    label: "Documento vencido",
    tipo: "documental",
    prioridad: "alta",
    descripcionBase: "Documento vencido para obligación DS44. Regularizar versión vigente y evidencia de respaldo.",
    diasCompromiso: 15,
  },
  {
    clave: "doc_pendiente",
    label: "Documento pendiente de carga",
    tipo: "documental",
    prioridad: "media",
    descripcionBase: "Documento obligatorio pendiente de carga en sistema.",
    diasCompromiso: 20,
  },
  {
    clave: "obligacion_no_implementada",
    label: "Obligación DS44 no implementada",
    tipo: "estructural",
    prioridad: "alta",
    descripcionBase: "Obligación DS44 aplicable no implementada en la operación.",
    diasCompromiso: 15,
  },
  {
    clave: "falta_evidencia",
    label: "Falta evidencia de cumplimiento",
    tipo: "evidencia",
    prioridad: "media",
    descripcionBase: "No existe evidencia suficiente para acreditar cumplimiento de la obligación.",
    diasCompromiso: 20,
  },
  {
    clave: "comite_no_constituido",
    label: "Comité Paritario no constituido",
    tipo: "comite_paritario",
    prioridad: "critica",
    descripcionBase: "No se evidencia constitución formal del Comité Paritario pese a dotación aplicable.",
    diasCompromiso: 10,
    sugerenciaObligacionTexto: "Comité Paritario",
  },
  {
    clave: "plan_emergencia_desactualizado",
    label: "Plan de emergencia no actualizado",
    tipo: "procedimiento",
    prioridad: "alta",
    descripcionBase: "Plan de emergencia desactualizado o no alineado a la operación vigente.",
    diasCompromiso: 15,
    sugerenciaObligacionTexto: "Plan de emergencia",
  },
  {
    clave: "iper_no_cargada",
    label: "Matriz IPER no cargada/desactualizada",
    tipo: "procedimiento",
    prioridad: "alta",
    descripcionBase: "Matriz IPER no cargada o desactualizada para procesos críticos.",
    diasCompromiso: 15,
    sugerenciaObligacionTexto: "Matriz IPER",
  },
  {
    clave: "programa_anual_no_cargado",
    label: "Programa anual no cargado",
    tipo: "plan_trabajo",
    prioridad: "alta",
    descripcionBase: "Programa anual de prevención no cargado para el periodo vigente.",
    diasCompromiso: 20,
    sugerenciaObligacionTexto: "Programa",
  },
  {
    clave: "plan_capacitacion_pendiente",
    label: "Plan de capacitación pendiente",
    tipo: "capacitacion",
    prioridad: "media",
    descripcionBase: "Plan de capacitación pendiente de implementación y registro.",
    diasCompromiso: 25,
    sugerenciaObligacionTexto: "Plan de capacitación",
  },
];

export type OpcionesHallazgo = {
  puedeEditar: boolean;
  centros: Array<{ id: string; nombre: string }>;
  areas: Array<{ id: string; nombre: string }>;
  trabajadores: Array<{ id: string; nombreCompleto: string; centroTrabajoId: string | null }>;
  obligaciones: Array<{
    clave: string;
    nombre: string;
    aplica: boolean;
    incumplida: boolean;
    estadoObligacion: string;
  }>;
  plantillas: PlantillaHallazgo[];
};

export type HallazgoInput = {
  centroTrabajoId: string | null;
  trabajadorId: string | null;
  obligacionClave: string | null;
  tipo: string;
  prioridad: PrioridadHallazgo;
  descripcion: string;
  fechaCompromiso: string;
};

function canManageCumplimiento(rol: string): boolean {
  if (rol === "SUPERADMIN") return true;
  const manageCumplimiento = PERMISSIONS.canManageCumplimiento.some((r) => r === rol);
  const manageDocumentacion = PERMISSIONS.canManageDocumentacion.some((r) => r === rol);
  return manageCumplimiento || manageDocumentacion;
}

function ensureEstado(estado: string): EstadoHallazgo {
  if (
    estado === "abierto" ||
    estado === "en_seguimiento" ||
    estado === "en_proceso" ||
    estado === "resuelto" ||
    estado === "cerrado"
  ) {
    return estado;
  }
  return "abierto";
}

function normalizeHallazgoRow(row: {
  id: string;
  tipo: string;
  descripcion: string;
  estado: string;
  prioridad: string;
  fechaCompromiso: Date;
  createdAt: Date;
  updatedAt: Date;
  obligacionClave: string | null;
  centroTrabajo: { id: string; nombre: string } | null;
  trabajador: { id: string; nombres: string; apellidos: string } | null;
  creadoPor: { nombre: string };
}): Hallazgo {
  const estado = ensureEstado(row.estado);
  const tipo = row.tipo as Hallazgo["tipo"];
  const prioridad = row.prioridad as PrioridadHallazgo;

  return {
    id: row.id,
    centroTrabajoId: row.centroTrabajo?.id ?? undefined,
    trabajadorId: row.trabajador?.id ?? undefined,
    obligacionClave: row.obligacionClave ?? undefined,
    tipo,
    descripcion: row.descripcion,
    centroId: row.centroTrabajo?.id ?? "sin-centro",
    centroNombre: row.centroTrabajo?.nombre ?? "Sin centro",
    trabajadorNombre: row.trabajador
      ? `${row.trabajador.nombres} ${row.trabajador.apellidos}`.trim()
      : undefined,
    obligacionId: row.obligacionClave ?? undefined,
    obligacionNombre: row.obligacionClave ?? undefined,
    estado,
    prioridad,
    fechaCompromiso: row.fechaCompromiso.toISOString().slice(0, 10),
    fechaCreacion: row.createdAt.toISOString(),
    creadoPor: row.creadoPor.nombre,
    historial: [
      {
        fecha: row.createdAt.toISOString(),
        usuario: row.creadoPor.nombre,
        accion: "Creación de hallazgo",
      },
      {
        fecha: row.updatedAt.toISOString(),
        usuario: row.creadoPor.nombre,
        accion: "Actualización",
      },
    ],
    evidenciaIds: [],
  };
}

export async function getHallazgos(): Promise<Hallazgo[]> {
  const context = await requirePermission("canReadCumplimiento");

  const rows = await prisma.hallazgoCumplimiento.findMany({
    where: { empresaId: context.empresaId },
    include: {
      centroTrabajo: { select: { id: true, nombre: true } },
      trabajador: { select: { id: true, nombres: true, apellidos: true } },
      creadoPor: { select: { nombre: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return rows.map(normalizeHallazgoRow);
}

export async function getOpcionesHallazgo(): Promise<OpcionesHallazgo> {
  const context = await requirePermission("canReadCumplimiento");

  const [centros, areas, trabajadores, obligacionesPayload] = await Promise.all([
    prisma.centroTrabajo.findMany({
      where: { empresaId: context.empresaId, estado: "activo" },
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
    prisma.area.findMany({
      where: { empresaId: context.empresaId, estado: "activa" },
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
    prisma.trabajador.findMany({
      where: { empresaId: context.empresaId, estado: "activo" },
      select: {
        id: true,
        nombres: true,
        apellidos: true,
        centroTrabajoId: true,
      },
      orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
    }),
    getObligacionesCumplimientoEmpresa(),
  ]);

  return {
    puedeEditar: canManageCumplimiento(context.rol),
    centros,
    areas,
    trabajadores: trabajadores.map((t) => ({
      id: t.id,
      nombreCompleto: `${t.nombres} ${t.apellidos}`.trim(),
      centroTrabajoId: t.centroTrabajoId,
    })),
    obligaciones: obligacionesPayload.obligaciones
      .filter((o) => o.aplica)
      .map((o) => ({
        clave: o.obligacionClave,
        nombre: o.nombre,
        aplica: o.aplica,
        incumplida: o.estadoObligacion !== "cumplida",
        estadoObligacion: o.estadoObligacion,
      })),
    plantillas: PLANTILLAS_HALLAZGO,
  };
}

export async function crearHallazgo(data: HallazgoInput): Promise<{ id: string }> {
  const context = await requireAuth();
  if (!canManageCumplimiento(context.rol)) {
    throw new Error("No autorizado para crear hallazgos.");
  }

  if (!data.descripcion.trim()) {
    throw new Error("La descripcion es obligatoria.");
  }
  if (!data.fechaCompromiso) {
    throw new Error("La fecha compromiso es obligatoria.");
  }

  const created = await prisma.hallazgoCumplimiento.create({
    data: {
      empresaId: context.empresaId,
      centroTrabajoId: data.centroTrabajoId,
      trabajadorId: data.trabajadorId,
      obligacionClave: data.obligacionClave,
      tipo: data.tipo,
      prioridad: data.prioridad,
      descripcion: data.descripcion.trim(),
      estado: "abierto",
      fechaCompromiso: new Date(data.fechaCompromiso),
      creadoPorId: context.usuarioId,
    },
    select: { id: true },
  });

  return created;
}

export async function actualizarHallazgo(
  id: string,
  data: Partial<HallazgoInput> & { estado?: EstadoHallazgo }
): Promise<void> {
  const context = await requireAuth();
  if (!canManageCumplimiento(context.rol)) {
    throw new Error("No autorizado para actualizar hallazgos.");
  }

  const updateData: {
    centroTrabajoId?: string | null;
    trabajadorId?: string | null;
    obligacionClave?: string | null;
    tipo?: string;
    prioridad?: string;
    descripcion?: string;
    fechaCompromiso?: Date;
    estado?: string;
  } = {};

  if (data.centroTrabajoId !== undefined) updateData.centroTrabajoId = data.centroTrabajoId;
  if (data.trabajadorId !== undefined) updateData.trabajadorId = data.trabajadorId;
  if (data.obligacionClave !== undefined) updateData.obligacionClave = data.obligacionClave;
  if (data.tipo !== undefined) updateData.tipo = data.tipo;
  if (data.prioridad !== undefined) updateData.prioridad = data.prioridad;
  if (data.descripcion !== undefined) updateData.descripcion = data.descripcion.trim();
  if (data.fechaCompromiso !== undefined) updateData.fechaCompromiso = new Date(data.fechaCompromiso);
  if (data.estado !== undefined) updateData.estado = data.estado;

  await prisma.hallazgoCumplimiento.updateMany({
    where: {
      id,
      empresaId: context.empresaId,
    },
    data: updateData,
  });
}

export async function cerrarHallazgo(id: string): Promise<void> {
  const context = await requireAuth();
  if (!canManageCumplimiento(context.rol)) {
    throw new Error("No autorizado para cerrar hallazgos.");
  }

  await prisma.hallazgoCumplimiento.updateMany({
    where: {
      id,
      empresaId: context.empresaId,
    },
    data: {
      estado: "cerrado",
    },
  });
}
