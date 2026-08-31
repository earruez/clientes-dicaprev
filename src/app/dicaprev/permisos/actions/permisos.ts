"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import { PermisoOrganismoFormData, PermisoResponsableFormData, PermisoFormData } from "../types";
import { calcularFechaEstimadaResolucion, calcularNivelRiesgo } from "../utils/calculos";
import { sendEmail } from "@/lib/email/send-email";
import { generarEmailPermiso } from "../utils/email-templates";

/**
 * Obtener lista de organismos de una empresa
 */
export async function obtenerOrganismos(filtros?: { activos?: boolean; comuna?: string }) {
  const { empresaId } = await requirePermission("canReadPermisos");

  const where = {
    empresaId,
    ...(filtros?.activos !== undefined && { activo: filtros.activos }),
    ...(filtros?.comuna && { comuna: filtros.comuna }),
  };

  return prisma.permisoOrganismo.findMany({
    where,
    orderBy: { nombre: "asc" },
  });
}

/**
 * Obtener detalle de un organismo
 */
export async function obtenerOrganismo(id: string) {
  const { empresaId } = await requirePermission("canReadPermisos");

  return prisma.permisoOrganismo.findFirst({
    where: { id, empresaId },
  });
}

/**
 * Crear o actualizar organismo
 */
export async function guardarOrganismo(
  data: PermisoOrganismoFormData,
  id?: string,
) {
  const { empresaId } = await requirePermission("canManagePermisos");

  if (id) {
    // Actualizar
    return prisma.permisoOrganismo.update({
      where: { id },
      data: {
        ...data,
        plazoDias: data.plazoDias ? parseInt(String(data.plazoDias)) : null,
        updatedAt: new Date(),
      },
    });
  } else {
    // Crear
    return prisma.permisoOrganismo.create({
      data: {
        ...data,
        empresaId,
        plazoDias: data.plazoDias ? parseInt(String(data.plazoDias)) : null,
      },
    });
  }
}

/**
 * Obtener lista de responsables
 */
export async function obtenerResponsables(filtros?: { activos?: boolean }) {
  const { empresaId } = await requirePermission("canReadPermisos");

  const where = {
    empresaId,
    ...(filtros?.activos !== undefined && { activo: filtros.activos }),
  };

  return prisma.permisoResponsable.findMany({
    where,
    orderBy: { nombre: "asc" },
  });
}

/**
 * Crear o actualizar responsable
 */
export async function guardarResponsable(
  data: PermisoResponsableFormData,
  id?: string,
) {
  const { empresaId } = await requirePermission("canManagePermisos");

  if (id) {
    // Actualizar
    return prisma.permisoResponsable.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  } else {
    // Crear
    return prisma.permisoResponsable.create({
      data: {
        ...data,
        empresaId,
      },
    });
  }
}

/**
 * Desactivar responsable (soft delete)
 */
export async function desactivarResponsable(id: string) {
  const { empresaId } = await requirePermission("canManagePermisos");

  const responsable = await prisma.permisoResponsable.findFirst({
    where: { id, empresaId },
  });

  if (!responsable) {
    throw new Error("Responsable no encontrado");
  }

  return prisma.permisoResponsable.update({
    where: { id },
    data: { activo: false },
  });
}

/**
 * Crear nuevo permiso
 */
export async function crearPermiso(data: PermisoFormData) {
  const { empresaId, email, usuarioId } = await requirePermission("canManagePermisos");

  // Obtener organismo para snapshot de datos
  const organismo = await prisma.permisoOrganismo.findUniqueOrThrow({
    where: { id: data.organismoId },
  });

  // Obtener responsable
  const responsable = await prisma.permisoResponsable.findUniqueOrThrow({
    where: { id: data.responsableId },
  });

  // Calcular fecha estimada si tenemos fecha de presentación
  let fechaEstimadaResolucion: Date | null = null;
  if (data.fechaPresentacion) {
    fechaEstimadaResolucion = calcularFechaEstimadaResolucion(
      new Date(data.fechaPresentacion),
      organismo.plazoDias,
      (organismo.tipoPlazo as any) || "NO_INFORMADO",
    );
  }

  // Calcular riesgo
  const nivelRiesgo = calcularNivelRiesgo(
    new Date(data.fechaInstalacion),
    fechaEstimadaResolucion,
    organismo.plazoDias,
    (organismo.tipoPlazo as any) || "NO_INFORMADO",
  );

  // Crear permiso
  const permiso = await prisma.permisoInstalacion.create({
    data: {
      empresaId,
      ...data,
      estado: data.estado || "SOLICITUD_RECIBIDA",
      nivelRiesgo,
      fechaInstalacion: new Date(data.fechaInstalacion),
      fechaRecepcionSolicitud: new Date(data.fechaRecepcionSolicitud),
      fechaPresentacion: data.fechaPresentacion ? new Date(data.fechaPresentacion) : null,
      fechaEstimadaResolucion,
      plazoDiasSnapshot: organismo.plazoDias,
      tipoPlazoSnapshot: organismo.tipoPlazo,
      modalidadSnapshot: data.modalidad || organismo.modalidad,
      nombreOrganismoSnapshot: organismo.nombre,
      createdBy: usuarioId,
    },
    include: {
      organismo: true,
      responsable: true,
    },
  });

  // Registrar en historial
  await prisma.permisoHistorial.create({
    data: {
      permisoId: permiso.id,
      estadoNuevo: permiso.estado,
      usuarioId,
      comentario: "Permiso creado",
    },
  });

  // Enviar email al responsable
  try {
    const emailResult = await sendEmail({
      to: responsable.email,
      subject: `Nuevo permiso registrado · ${permiso.clienteId || "Permiso"}`,
      html: generarEmailPermiso(permiso, responsable, "PERMISO_CREADO"),
    });

    // Registrar notificación
    await prisma.permisoNotificacion.create({
      data: {
        permisoId: permiso.id,
        tipo: "PERMISO_CREADO",
        destinatario: responsable.email,
        estado: "ENVIADO",
        providerMessageId: emailResult.messageId,
      },
    });
  } catch (error) {
    // Registrar error pero no fallar la creación del permiso
    await prisma.permisoNotificacion.create({
      data: {
        permisoId: permiso.id,
        tipo: "PERMISO_CREADO",
        destinatario: responsable.email,
        estado: "ERROR",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
    });

    console.error("Error enviando email de permiso:", error);
  }

  return permiso;
}

/**
 * Cambiar estado de permiso
 */
export async function cambiarEstadoPermiso(
  permisoId: string,
  nuevoEstado: string,
  comentario?: string,
) {
  const { empresaId, usuarioId } = await requirePermission("canManagePermisos");

  const permiso = await prisma.permisoInstalacion.findFirst({
    where: { id: permisoId, empresaId },
    include: { responsable: true },
  });

  if (!permiso) {
    throw new Error("Permiso no encontrado");
  }

  const estadoAnterior = permiso.estado;

  // Actualizar permiso
  const permisoActualizado = await prisma.permisoInstalacion.update({
    where: { id: permisoId },
    data: {
      estado: nuevoEstado,
      updatedAt: new Date(),
    },
    include: { organismo: true, responsable: true },
  });

  // Registrar en historial
  await prisma.permisoHistorial.create({
    data: {
      permisoId,
      estadoAnterior,
      estadoNuevo: nuevoEstado,
      comentario,
      usuarioId,
    },
  });

  // Enviar email al responsable
  try {
    const emailResult = await sendEmail({
      to: permiso.responsable.email,
      subject: `Actualización de permiso · ${permisoId.slice(0, 8)} · ${nuevoEstado}`,
      html: generarEmailPermiso(permisoActualizado, permiso.responsable, "CAMBIO_ESTADO", {
        estadoAnterior,
        comentario,
      }),
    });

    await prisma.permisoNotificacion.create({
      data: {
        permisoId,
        tipo: "CAMBIO_ESTADO",
        destinatario: permiso.responsable.email,
        estado: "ENVIADO",
        providerMessageId: emailResult.messageId,
      },
    });
  } catch (error) {
    await prisma.permisoNotificacion.create({
      data: {
        permisoId,
        tipo: "CAMBIO_ESTADO",
        destinatario: permiso.responsable.email,
        estado: "ERROR",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
    });

    console.error("Error enviando email de cambio de estado:", error);
  }

  return permisoActualizado;
}

/**
 * Obtener historial de cambios de un permiso
 */
export async function obtenerHistorialPermiso(permisoId: string) {
  const { empresaId } = await requirePermission("canReadPermisos");

  // Verificar que el permiso pertenece a la empresa
  const permiso = await prisma.permisoInstalacion.findFirst({
    where: { id: permisoId, empresaId },
  });

  if (!permiso) {
    throw new Error("Permiso no encontrado");
  }

  return prisma.permisoHistorial.findMany({
    where: { permisoId },
    orderBy: { createdAt: "asc" },
  });
}
