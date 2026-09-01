"use server";

import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/auth/permissions";
import { PermisoOrganismoFormData, PermisoResponsableFormData, PermisoClienteFormData, PermisoFormData, ESTADOS_REQUIEREN_COMENTARIO } from "../types";
import { calcularFechaEstimadaResolucion, calcularNivelRiesgo } from "../utils/calculos";
import { sendEmail } from "@/lib/email/send-email";
import { generarEmailPermiso } from "../utils/email-templates";

type DestinatarioNotificacion = { email: string };

async function enviarNotificacionATodos(
  permisoId: string,
  destinatarios: DestinatarioNotificacion[],
  tipo: "PERMISO_CREADO" | "CAMBIO_ESTADO",
  subject: string,
  html: string,
) {
  const emailsUnicos = Array.from(new Set(destinatarios.map((d) => d.email)));

  for (const email of emailsUnicos) {
    try {
      const emailResult = await sendEmail({ to: email, subject, html });
      await prisma.permisoNotificacion.create({
        data: {
          permisoId,
          tipo,
          destinatario: email,
          estado: "ENVIADO",
          providerMessageId: emailResult.messageId,
        },
      });
    } catch (error) {
      await prisma.permisoNotificacion.create({
        data: {
          permisoId,
          tipo,
          destinatario: email,
          estado: "ERROR",
          error: error instanceof Error ? error.message : "Error desconocido",
        },
      });

      console.error(`Error enviando email (${tipo}) a ${email}:`, error);
    }
  }
}


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
 * Lista de comunas con su región asociada (derivada de la matriz de organismos importada),
 * usada para el desplegable de comuna/región del formulario de nuevo permiso.
 */
export async function obtenerComunasConRegion() {
  const { empresaId } = await requirePermission("canReadPermisos");

  const registros = await prisma.permisoOrganismo.findMany({
    where: { empresaId, comuna: { not: null }, region: { not: null } },
    select: { comuna: true, region: true },
    distinct: ["comuna"],
    orderBy: { comuna: "asc" },
  });

  return registros
    .filter((r): r is { comuna: string; region: string } => Boolean(r.comuna && r.region))
    .sort((a, b) => a.comuna.localeCompare(b.comuna, "es"));
}

/**
 * Sugerir el organismo más probable según la comuna/región de la instalación.
 * El usuario siempre puede seleccionar otro organismo manualmente.
 */
export async function obtenerOrganismoSugerido(comuna?: string, region?: string) {
  const { empresaId } = await requirePermission("canReadPermisos");

  if (!comuna && !region) {
    return null;
  }

  if (comuna) {
    const porComuna = await prisma.permisoOrganismo.findFirst({
      where: { empresaId, activo: true, comuna: { equals: comuna, mode: "insensitive" } },
      orderBy: { nombre: "asc" },
    });
    if (porComuna) {
      return porComuna;
    }
  }

  if (region) {
    const porRegion = await prisma.permisoOrganismo.findFirst({
      where: { empresaId, activo: true, region: { equals: region, mode: "insensitive" } },
      orderBy: { nombre: "asc" },
    });
    if (porRegion) {
      return porRegion;
    }
  }

  return null;
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
 * Obtener detalle de un responsable
 */
export async function obtenerResponsable(id: string) {
  const { empresaId } = await requirePermission("canReadPermisos");

  return prisma.permisoResponsable.findFirst({
    where: { id, empresaId },
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
 * Obtener lista de clientes
 */
export async function obtenerClientes(filtros?: { activos?: boolean }) {
  const { empresaId } = await requirePermission("canReadPermisos");

  const where = {
    empresaId,
    ...(filtros?.activos !== undefined && { activo: filtros.activos }),
  };

  return prisma.permisoCliente.findMany({
    where,
    orderBy: { nombre: "asc" },
  });
}

/**
 * Obtener detalle de un cliente
 */
export async function obtenerCliente(id: string) {
  const { empresaId } = await requirePermission("canReadPermisos");

  return prisma.permisoCliente.findFirst({
    where: { id, empresaId },
  });
}

/**
 * Crear o actualizar cliente
 */
export async function guardarCliente(
  data: PermisoClienteFormData,
  id?: string,
) {
  const { empresaId } = await requirePermission("canManagePermisos");

  if (id) {
    // Actualizar
    return prisma.permisoCliente.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  } else {
    // Crear
    return prisma.permisoCliente.create({
      data: {
        ...data,
        empresaId,
      },
    });
  }
}

/**
 * Desactivar cliente (soft delete)
 */
export async function desactivarCliente(id: string) {
  const { empresaId } = await requirePermission("canManagePermisos");

  const cliente = await prisma.permisoCliente.findFirst({
    where: { id, empresaId },
  });

  if (!cliente) {
    throw new Error("Cliente no encontrado");
  }

  return prisma.permisoCliente.update({
    where: { id },
    data: { activo: false },
  });
}

/**
 * Crear nuevo permiso
 */
export async function crearPermiso(data: PermisoFormData) {
  const { empresaId, usuarioId } = await requirePermission("canManagePermisos");

  const { responsableIds, ...permisoData } = data;
  const fechaInstalacion = new Date(permisoData.fechaInstalacion);
  const fechaSolicitud = new Date(permisoData.fechaRecepcionSolicitud);
  const hoy = new Date();

  hoy.setHours(0, 0, 0, 0);
  fechaInstalacion.setHours(0, 0, 0, 0);

  if (Number.isNaN(fechaInstalacion.getTime()) || Number.isNaN(fechaSolicitud.getTime())) {
    throw new Error("Las fechas de instalación y solicitud son requeridas");
  }

  if (fechaInstalacion < hoy) {
    throw new Error("La fecha de instalación no puede ser anterior a hoy");
  }

  // Obtener organismo para snapshot de datos
  const organismo = await prisma.permisoOrganismo.findUniqueOrThrow({
    where: { id: permisoData.organismoId },
  });

  // Obtener responsable
  const responsable = await prisma.permisoResponsable.findUniqueOrThrow({
    where: { id: permisoData.responsableId },
  });

  // Responsables adicionales (además del principal), sin duplicados
  const responsableIdsAdicionales = Array.from(
    new Set((responsableIds || []).filter((id) => id && id !== permisoData.responsableId)),
  );

  // El plazo comienza desde la fecha de solicitud; la presentación efectiva puede reemplazarla después.
  const fechaBaseResolucion = permisoData.fechaPresentacion ? new Date(permisoData.fechaPresentacion) : fechaSolicitud;
  const fechaEstimadaResolucion = calcularFechaEstimadaResolucion(
    fechaBaseResolucion,
    organismo.plazoDias,
    (organismo.tipoPlazo as "HABILES" | "CORRIDOS" | "NO_INFORMADO" | null) || "NO_INFORMADO",
  );

  // Calcular riesgo
  const nivelRiesgo = calcularNivelRiesgo(
    fechaInstalacion,
    fechaEstimadaResolucion,
    organismo.plazoDias,
    (organismo.tipoPlazo as "HABILES" | "CORRIDOS" | "NO_INFORMADO" | null) || "NO_INFORMADO",
  );

  // Crear permiso
  const permiso = await prisma.permisoInstalacion.create({
    data: {
      empresaId,
      ...permisoData,
      estado: permisoData.estado || "PERMISO_CREADO",
      nivelRiesgo,
      fechaInstalacion,
      fechaRecepcionSolicitud: fechaSolicitud,
      fechaPresentacion: permisoData.fechaPresentacion ? new Date(permisoData.fechaPresentacion) : null,
      fechaEstimadaResolucion,
      plazoDiasSnapshot: organismo.plazoDias,
      tipoPlazoSnapshot: organismo.tipoPlazo,
      modalidadSnapshot: permisoData.modalidad || organismo.modalidad,
      nombreOrganismoSnapshot: organismo.nombre,
      createdBy: usuarioId,
    },
    include: {
      organismo: true,
      responsable: true,
      cliente: true,
    },
  });

  if (responsableIdsAdicionales.length > 0) {
    await prisma.permisoInstalacionResponsable.createMany({
      data: responsableIdsAdicionales.map((responsableId) => ({
        permisoId: permiso.id,
        responsableId,
      })),
      skipDuplicates: true,
    });
  }

  const responsablesAdicionales = responsableIdsAdicionales.length
    ? await prisma.permisoResponsable.findMany({ where: { id: { in: responsableIdsAdicionales } } })
    : [];

  // Registrar en historial
  await prisma.permisoHistorial.create({
    data: {
      permisoId: permiso.id,
      estadoNuevo: permiso.estado,
      usuarioId,
      comentario: "Permiso creado",
    },
  });

  // Enviar email a todos los responsables asignados
  await enviarNotificacionATodos(
    permiso.id,
    [responsable, ...responsablesAdicionales],
    "PERMISO_CREADO",
    `Nuevo permiso registrado · ${permiso.cliente?.nombre || permiso.direccion}`,
    generarEmailPermiso(permiso, responsable, "PERMISO_CREADO"),
  );

  return permiso;
}

/**
 * Obtener detalle de un permiso
 */
export async function obtenerPermiso(id: string) {
  const { empresaId } = await requirePermission("canReadPermisos");

  const permiso = await prisma.permisoInstalacion.findFirst({
    where: { id, empresaId },
    include: {
      organismo: true,
      responsable: true,
      cliente: true,
      responsablesAdicionales: { include: { responsable: true } },
    },
  });

  if (!permiso) {
    throw new Error("Permiso no encontrado");
  }

  return permiso;
}

/**
 * Actualizar la fecha de presentación de un permiso ya creado.
 * Recalcula la fecha estimada de resolución y el nivel de riesgo.
 */
export async function actualizarFechaPresentacion(
  permisoId: string,
  fechaPresentacion: string,
) {
  const { empresaId, usuarioId } = await requirePermission("canManagePermisos");

  const permiso = await prisma.permisoInstalacion.findFirst({
    where: { id: permisoId, empresaId },
    include: { organismo: true },
  });

  if (!permiso) {
    throw new Error("Permiso no encontrado");
  }

  const fechaEstimadaResolucion = calcularFechaEstimadaResolucion(
    new Date(fechaPresentacion),
    permiso.plazoDiasSnapshot,
    (permiso.tipoPlazoSnapshot as "HABILES" | "CORRIDOS" | "NO_INFORMADO" | null) || "NO_INFORMADO",
  );

  const nivelRiesgo = calcularNivelRiesgo(
    permiso.fechaInstalacion,
    fechaEstimadaResolucion,
    permiso.plazoDiasSnapshot,
    (permiso.tipoPlazoSnapshot as "HABILES" | "CORRIDOS" | "NO_INFORMADO" | null) || "NO_INFORMADO",
  );

  const permisoActualizado = await prisma.permisoInstalacion.update({
    where: { id: permisoId },
    data: {
      fechaPresentacion: new Date(fechaPresentacion),
      fechaEstimadaResolucion,
      nivelRiesgo,
      updatedAt: new Date(),
    },
    include: { organismo: true, responsable: true, cliente: true, responsablesAdicionales: { include: { responsable: true } } },
  });

  await prisma.permisoHistorial.create({
    data: {
      permisoId,
      estadoAnterior: permiso.estado,
      estadoNuevo: permiso.estado,
      comentario: `Fecha de presentación actualizada al ${new Date(fechaPresentacion).toLocaleDateString("es-CL")}`,
      usuarioId,
    },
  });

  return permisoActualizado;
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

  if (ESTADOS_REQUIEREN_COMENTARIO.includes(nuevoEstado as (typeof ESTADOS_REQUIEREN_COMENTARIO)[number]) && !comentario?.trim()) {
    throw new Error(
      "Debes indicar una observación/motivo para cambiar el permiso a este estado",
    );
  }

  const permiso = await prisma.permisoInstalacion.findFirst({
    where: { id: permisoId, empresaId },
    include: { responsable: true, responsablesAdicionales: { include: { responsable: true } } },
  });

  if (!permiso) {
    throw new Error("Permiso no encontrado");
  }

  if (permiso.estado === "APROBADO") {
    throw new Error("Este permiso ya fue aprobado y no admite más cambios de estado");
  }

  const estadoAnterior = permiso.estado;

  // Si pasa a Observado, generar un token de un solo uso para que el organismo/responsable responda por link
  const tokenRespuestaObservacion = nuevoEstado === "OBSERVADO" ? randomBytes(32).toString("hex") : undefined;

  // Actualizar permiso
  const permisoActualizado = await prisma.permisoInstalacion.update({
    where: { id: permisoId },
    data: {
      estado: nuevoEstado,
      updatedAt: new Date(),
      ...(tokenRespuestaObservacion
        ? { tokenRespuestaObservacion, tokenRespuestaUsado: false }
        : {}),
    },
    include: { organismo: true, responsable: true, cliente: true, responsablesAdicionales: { include: { responsable: true } } },
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

  // Enviar email a todos los responsables asignados
  const destinatarios = [permiso.responsable, ...permiso.responsablesAdicionales.map((r) => r.responsable)];
  await enviarNotificacionATodos(
    permisoId,
    destinatarios,
    "CAMBIO_ESTADO",
    `Actualización de permiso · ${permisoId.slice(0, 8)} · ${nuevoEstado}`,
    generarEmailPermiso(permisoActualizado, permiso.responsable, "CAMBIO_ESTADO", {
      estadoAnterior,
      comentario,
      tokenRespuestaObservacion,
    }),
  );

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

/**
 * Datos para el informe mensual de permisos (por estado, agrupados por mes/año).
 */
export async function obtenerInformeMensualPermisos(anio: number, mes: number) {
  const { empresaId } = await requirePermission("canReadPermisos");

  const inicio = new Date(anio, mes - 1, 1);
  const fin = new Date(anio, mes, 1);

  const [empresa, permisos] = await Promise.all([
    prisma.empresa.findUnique({ where: { id: empresaId }, select: { nombre: true } }),
    prisma.permisoInstalacion.findMany({
      where: { empresaId, createdAt: { gte: inicio, lt: fin } },
      include: { organismo: true, responsable: true, cliente: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return {
    empresaNombre: empresa?.nombre || "Empresa",
    anio,
    mes,
    permisos,
  };
}

