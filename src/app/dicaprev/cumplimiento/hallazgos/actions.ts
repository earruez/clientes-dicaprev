"use server";

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
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
  trabajadores: Array<{
    id: string;
    nombreCompleto: string;
    centroTrabajoId: string | null;
    areaId: string | null;
    cargoNombre: string | null;
  }>;
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
  responsableId?: string | null;
  obligacionClave: string | null;
  tipo: string;
  prioridad: PrioridadHallazgo;
  descripcion: string;
  fechaCompromiso: string;
  medidaCorrectivaSugerida?: string | null;
};

export type HallazgoDetalle = {
  id: string;
  estado: EstadoHallazgo;
  responsable?: { id: string; nombre: string } | null;
  evidencias: Array<{
    id: string;
    titulo: string;
    tipo: string;
    estado: string;
    observacion: string | null;
    archivoUrl: string | null;
    archivoNombre: string | null;
    fechaEvidencia: string;
  }>;
  medidasCorrectivas: Array<{
    id: string;
    descripcion: string;
    responsable: string;
    fechaCompromiso: string;
    estado: "pendiente" | "en_proceso" | "completada" | "descartada";
    evidenciaCierre: boolean;
  }>;
  medidaCorrectiva: {
    id: string;
    titulo: string;
    descripcion: string;
    estado: string;
    fechaCompromiso: string;
  } | null;
};

type EstadoMedidaCorrectiva = "pendiente" | "en_proceso" | "completada" | "descartada";

function normalizeEstadoMedida(value: string | null | undefined): EstadoMedidaCorrectiva {
  const token = normalizeToken(value);
  if (token === "completada" || token === "valida" || token === "cerrada") return "completada";
  if (token === "descartada") return "descartada";
  if (token === "en_proceso") return "en_proceso";
  return "pendiente";
}

function medidaGestionada(estado: EstadoMedidaCorrectiva): boolean {
  return estado === "completada" || estado === "descartada";
}

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

function normalizeToken(value: string | null | undefined): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function buildTrabajadorNombre(trabajador: { nombres: string; apellidos: string }): string {
  return `${trabajador.nombres} ${trabajador.apellidos}`.trim();
}

function esJefatura(cargoNombre: string | null | undefined): boolean {
  const token = normalizeToken(cargoNombre);
  return ["jefe", "supervisor", "encargado", "coordinador", "lider", "gerente"].some((item) => token.includes(item));
}

async function resolverResponsableHallazgo(
  tx: Prisma.TransactionClient,
  empresaId: string,
  data: Pick<HallazgoInput, "centroTrabajoId" | "trabajadorId" | "responsableId">,
): Promise<{ id: string; nombre: string } | null> {
  if (data.responsableId) {
    const responsable = await tx.trabajador.findFirst({
      where: { id: data.responsableId, empresaId, estado: "activo" },
      select: { id: true, nombres: true, apellidos: true },
    });

    if (!responsable) {
      throw new Error("Responsable no valido para la empresa activa.");
    }

    return { id: responsable.id, nombre: buildTrabajadorNombre(responsable) };
  }

  const trabajadorBase = data.trabajadorId
    ? await tx.trabajador.findFirst({
        where: { id: data.trabajadorId, empresaId },
        select: { areaId: true },
      })
    : null;

  const candidatos = await tx.trabajador.findMany({
    where: {
      empresaId,
      estado: "activo",
      ...(trabajadorBase?.areaId
        ? { areaId: trabajadorBase.areaId }
        : data.centroTrabajoId
          ? { centroTrabajoId: data.centroTrabajoId }
          : {}),
    },
    select: {
      id: true,
      nombres: true,
      apellidos: true,
      cargo: { select: { nombre: true } },
    },
    orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
  });

  if (candidatos.length === 0) {
    return null;
  }

  const jefeArea = candidatos.find((item) => esJefatura(item.cargo?.nombre));
  const responsable = jefeArea ?? candidatos[0];

  return {
    id: responsable.id,
    nombre: buildTrabajadorNombre(responsable),
  };
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
  responsableNombre: string | null;
  evidenciasCumplimiento: Array<{ id: string }>;
  centroTrabajo: { id: string; nombre: string } | null;
  trabajador: { id: string; nombres: string; apellidos: string } | null;
  creadoPor: { nombre: string };
  responsableTrabajador: { id: string; nombres: string; apellidos: string } | null;
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
    trabajadorNombre: row.trabajador ? buildTrabajadorNombre(row.trabajador) : undefined,
    obligacionId: row.obligacionClave ?? undefined,
    obligacionNombre: row.obligacionClave ?? undefined,
    responsableId: row.responsableTrabajador?.id ?? undefined,
    responsableNombre: row.responsableTrabajador ? buildTrabajadorNombre(row.responsableTrabajador) : row.responsableNombre ?? undefined,
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
    evidenciaIds: row.evidenciasCumplimiento.map((ev) => ev.id),
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
      responsableTrabajador: { select: { id: true, nombres: true, apellidos: true } },
      evidenciasCumplimiento: { select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return rows.map(normalizeHallazgoRow);
}

export async function getHallazgoDetalle(id: string): Promise<HallazgoDetalle | null> {
  const context = await requirePermission("canReadCumplimiento");

  const hallazgo = await prisma.hallazgoCumplimiento.findFirst({
    where: {
      id,
      empresaId: context.empresaId,
    },
    select: {
      id: true,
      estado: true,
      responsableNombre: true,
      responsableTrabajador: { select: { id: true, nombres: true, apellidos: true } },
      fechaCompromiso: true,
      evidenciasCumplimiento: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          titulo: true,
          tipo: true,
          estado: true,
          observacion: true,
          archivoUrl: true,
          archivoNombre: true,
          fechaEvidencia: true,
          creadoPor: { select: { nombre: true } },
        },
      },
    },
  });

  if (!hallazgo) {
    return null;
  }

  const medidasCorrectivas = hallazgo.evidenciasCumplimiento
    .filter((ev) => normalizeToken(ev.tipo) === "accion_correctiva")
    .map((ev) => {
      const estado = normalizeEstadoMedida(ev.estado);
      return {
        id: ev.id,
        descripcion: ev.observacion ?? "Sin descripcion",
        responsable: ev.creadoPor?.nombre ?? "Por asignar",
        fechaCompromiso: hallazgo.fechaCompromiso.toISOString().slice(0, 10),
        estado,
        evidenciaCierre: hallazgo.evidenciasCumplimiento.some((cierre) => {
          const tipo = normalizeToken(cierre.tipo);
          return tipo === "cierre" || normalizeToken(cierre.observacion).includes("cierre");
        }),
      };
    });

  const medidaCorrectiva = medidasCorrectivas[0] ?? null;

  return {
    id: hallazgo.id,
    estado: ensureEstado(hallazgo.estado),
    responsable: hallazgo.responsableTrabajador
      ? { id: hallazgo.responsableTrabajador.id, nombre: buildTrabajadorNombre(hallazgo.responsableTrabajador) }
      : hallazgo.responsableNombre
        ? { id: "", nombre: hallazgo.responsableNombre }
        : null,
    evidencias: hallazgo.evidenciasCumplimiento.map((ev) => ({
      id: ev.id,
      titulo: ev.titulo,
      tipo: ev.tipo,
      estado: ev.estado,
      observacion: ev.observacion,
      archivoUrl: ev.archivoUrl,
      archivoNombre: ev.archivoNombre,
      fechaEvidencia: ev.fechaEvidencia.toISOString(),
    })),
    medidasCorrectivas,
    medidaCorrectiva: medidaCorrectiva
      ? {
          id: medidaCorrectiva.id,
          titulo: "Medida correctiva",
          descripcion: medidaCorrectiva.descripcion,
          estado: medidaCorrectiva.estado,
          fechaCompromiso: hallazgo.fechaCompromiso.toISOString().slice(0, 10),
        }
      : null,
  };
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
        areaId: true,
        cargo: { select: { nombre: true } },
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
      nombreCompleto: buildTrabajadorNombre(t),
      centroTrabajoId: t.centroTrabajoId,
      areaId: t.areaId,
      cargoNombre: t.cargo?.nombre ?? null,
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

  const created = await prisma.$transaction(async (tx) => {
    const responsable = await resolverResponsableHallazgo(tx, context.empresaId, data);

    const hallazgo = await tx.hallazgoCumplimiento.create({
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
        responsableId: responsable?.id ?? null,
        responsableNombre: responsable?.nombre ?? null,
      },
      select: { id: true },
    });

    if (data.medidaCorrectivaSugerida?.trim()) {
      await tx.evidenciaCumplimiento.create({
        data: {
          empresaId: context.empresaId,
          titulo: "Medida correctiva inicial",
          tipo: "accion_correctiva",
          estado: "pendiente",
          fechaEvidencia: new Date(),
          observacion: data.medidaCorrectivaSugerida.trim(),
          hallazgoId: hallazgo.id,
          centroTrabajoId: data.centroTrabajoId,
          trabajadorId: data.trabajadorId,
          creadoPorId: context.usuarioId,
        },
      });
    }

    return hallazgo;
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
    responsableId?: string | null;
    responsableNombre?: string | null;
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

  if (data.responsableId !== undefined || data.trabajadorId !== undefined || data.centroTrabajoId !== undefined) {
    const responsable = await prisma.$transaction((tx) =>
      resolverResponsableHallazgo(tx, context.empresaId, {
        centroTrabajoId: data.centroTrabajoId ?? null,
        trabajadorId: data.trabajadorId ?? null,
        responsableId: data.responsableId ?? null,
      }),
    );

    updateData.responsableId = responsable?.id ?? null;
    updateData.responsableNombre = responsable?.nombre ?? null;
  }

  await prisma.hallazgoCumplimiento.updateMany({
    where: {
      id,
      empresaId: context.empresaId,
    },
    data: updateData,
  });
}

export async function cerrarHallazgo(id: string, comentarioCierre?: string): Promise<void> {
  const context = await requireAuth();
  if (!canManageCumplimiento(context.rol)) {
    throw new Error("No autorizado para cerrar hallazgos.");
  }

  const comentario = comentarioCierre?.trim() ?? "";
  const hallazgo = await prisma.hallazgoCumplimiento.findFirst({
    where: {
      id,
      empresaId: context.empresaId,
    },
    select: {
      id: true,
      centroTrabajoId: true,
      trabajadorId: true,
      evidenciasCumplimiento: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          tipo: true,
          estado: true,
          observacion: true,
        },
      },
    },
  });

  if (!hallazgo) {
    throw new Error("Hallazgo no encontrado para la empresa activa.");
  }

  const medidas = hallazgo.evidenciasCumplimiento.filter((ev) => normalizeToken(ev.tipo) === "accion_correctiva");
  const medidaPrincipal = medidas[0] ?? null;
  const estadoMedidaPrincipal = medidaPrincipal ? normalizeEstadoMedida(medidaPrincipal.estado) : null;

  const tieneMedidaRegistrada = medidas.length > 0;
  const medidaCompleta = estadoMedidaPrincipal ? medidaGestionada(estadoMedidaPrincipal) : false;

  const evidenciaCierre = hallazgo.evidenciasCumplimiento.some((ev) => {
    const tipo = normalizeToken(ev.tipo);
    return tipo === "cierre" || normalizeToken(ev.observacion).includes("cierre");
  });

  if (!tieneMedidaRegistrada || !medidaCompleta || (!evidenciaCierre && !comentario)) {
    throw new Error("Para cerrar el hallazgo debes registrar y completar una medida correctiva, además de dejar evidencia o comentario de cierre.");
  }

  await prisma.$transaction(async (tx) => {
    if (comentario) {
      await tx.evidenciaCumplimiento.create({
        data: {
          empresaId: context.empresaId,
          titulo: "Comentario de cierre",
          tipo: "cierre",
          estado: "valida",
          fechaEvidencia: new Date(),
          observacion: comentario,
          hallazgoId: hallazgo.id,
          centroTrabajoId: hallazgo.centroTrabajoId,
          trabajadorId: hallazgo.trabajadorId,
          creadoPorId: context.usuarioId,
        },
      });
    }

    await tx.hallazgoCumplimiento.update({
      where: { id: hallazgo.id },
      data: {
        estado: "cerrado",
      },
    });
  });
}

export async function eliminarHallazgo(id: string): Promise<void> {
  const context = await requireAuth();
  if (!canManageCumplimiento(context.rol)) {
    throw new Error("No autorizado para eliminar hallazgos.");
  }

  await prisma.hallazgoCumplimiento.deleteMany({
    where: {
      id,
      empresaId: context.empresaId,
    },
  });
}

export async function eliminarHallazgos(ids: string[]): Promise<number> {
  const context = await requireAuth();
  if (!canManageCumplimiento(context.rol)) {
    throw new Error("No autorizado para eliminar hallazgos.");
  }

  const idsValidos = Array.from(new Set(ids.filter((id) => typeof id === "string" && id.trim().length > 0)));
  if (idsValidos.length === 0) return 0;

  const result = await prisma.hallazgoCumplimiento.deleteMany({
    where: {
      id: { in: idsValidos },
      empresaId: context.empresaId,
    },
  });

  return result.count;
}

export async function actualizarEstadoMedidaCorrectiva(
  hallazgoId: string,
  medidaId: string,
  estado: EstadoMedidaCorrectiva,
): Promise<void> {
  const context = await requireAuth();
  if (!canManageCumplimiento(context.rol)) {
    throw new Error("No autorizado para gestionar medidas correctivas.");
  }

  const hallazgo = await prisma.hallazgoCumplimiento.findFirst({
    where: {
      id: hallazgoId,
      empresaId: context.empresaId,
    },
    select: { id: true },
  });

  if (!hallazgo) {
    throw new Error("Hallazgo no encontrado para la empresa activa.");
  }

  await prisma.evidenciaCumplimiento.updateMany({
    where: {
      id: medidaId,
      hallazgoId,
      empresaId: context.empresaId,
      tipo: "accion_correctiva",
    },
    data: {
      estado,
    },
  });
}

export async function registrarMedidaCorrectivaHallazgo(
  hallazgoId: string,
  descripcion: string,
): Promise<void> {
  const context = await requireAuth();
  if (!canManageCumplimiento(context.rol)) {
    throw new Error("No autorizado para registrar medidas correctivas.");
  }

  const descripcionNormalizada = descripcion.trim();
  if (!descripcionNormalizada) {
    throw new Error("Debes ingresar una descripcion para la medida correctiva.");
  }

  const hallazgo = await prisma.hallazgoCumplimiento.findFirst({
    where: {
      id: hallazgoId,
      empresaId: context.empresaId,
    },
    select: {
      id: true,
      centroTrabajoId: true,
      trabajadorId: true,
    },
  });

  if (!hallazgo) {
    throw new Error("Hallazgo no encontrado para la empresa activa.");
  }

  await prisma.evidenciaCumplimiento.create({
    data: {
      empresaId: context.empresaId,
      titulo: "Medida correctiva",
      tipo: "accion_correctiva",
      estado: "pendiente",
      fechaEvidencia: new Date(),
      observacion: descripcionNormalizada,
      hallazgoId: hallazgo.id,
      centroTrabajoId: hallazgo.centroTrabajoId,
      trabajadorId: hallazgo.trabajadorId,
      creadoPorId: context.usuarioId,
    },
  });
}

export async function agregarEvidenciaCierreHallazgo(
  hallazgoId: string,
  observacion: string,
  archivoUrl?: string,
): Promise<void> {
  const context = await requireAuth();
  if (!canManageCumplimiento(context.rol)) {
    throw new Error("No autorizado para registrar evidencia de cierre.");
  }

  const obs = observacion.trim();
  if (!obs) {
    throw new Error("Debes ingresar una observacion para la evidencia de cierre.");
  }

  const hallazgo = await prisma.hallazgoCumplimiento.findFirst({
    where: {
      id: hallazgoId,
      empresaId: context.empresaId,
    },
    select: {
      id: true,
      centroTrabajoId: true,
      trabajadorId: true,
    },
  });

  if (!hallazgo) {
    throw new Error("Hallazgo no encontrado para la empresa activa.");
  }

  await prisma.evidenciaCumplimiento.create({
    data: {
      empresaId: context.empresaId,
      titulo: "Evidencia de cierre",
      tipo: "cierre",
      estado: "valida",
      fechaEvidencia: new Date(),
      observacion: obs,
      archivoUrl: archivoUrl || null,
      hallazgoId: hallazgo.id,
      centroTrabajoId: hallazgo.centroTrabajoId,
      trabajadorId: hallazgo.trabajadorId,
      creadoPorId: context.usuarioId,
    },
  });
}
