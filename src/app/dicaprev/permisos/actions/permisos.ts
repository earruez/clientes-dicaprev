"use server";

import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/auth/permissions";
import {
  ESTADOS_REQUIEREN_COMENTARIO,
  PermisoClienteFormData,
  PermisoFormData,
  PermisoOrganismoFormData,
  PermisoResponsableFormData,
} from "../types";
import { calcularFechaEstimadaResolucion, calcularNivelRiesgo } from "../utils/calculos";
import { sendEmail } from "@/lib/email/send-email";
import { generarAsuntoEmailPermiso, generarEmailPermiso } from "../utils/email-templates";

type DestinatarioNotificacion = { email: string };

const ESTADOS_CON_NOTIFICACION = new Set(["SOLICITADO", "APROBADO", "CANCELADO"]);

async function enviarNotificacionATodos(
  permisoId: string,
  destinatarios: DestinatarioNotificacion[],
  tipo: "PERMISO_CREADO" | "CAMBIO_ESTADO",
  subject: string,
  html: string,
) {
  const emailsUnicos = Array.from(new Set(destinatarios.map((d) => d.email).filter(Boolean)));
  for (const email of emailsUnicos) {
    try {
      const emailResult = await sendEmail({ to: email, subject, html });
      await prisma.permisoNotificacion.create({
        data: { permisoId, tipo, destinatario: email, estado: "ENVIADO", providerMessageId: emailResult.messageId },
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

export async function obtenerOrganismos(filtros?: { activos?: boolean; comuna?: string }) {
  const { empresaId } = await requirePermission("canReadPermisos");
  return prisma.permisoOrganismo.findMany({
    where: {
      empresaId,
      ...(filtros?.activos !== undefined && { activo: filtros.activos }),
      ...(filtros?.comuna && { comuna: filtros.comuna }),
    },
    orderBy: { nombre: "asc" },
  });
}

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

export async function obtenerOrganismoSugerido(comuna?: string, region?: string) {
  const { empresaId } = await requirePermission("canReadPermisos");
  if (!comuna && !region) return null;
  if (comuna) {
    const porComuna = await prisma.permisoOrganismo.findFirst({
      where: { empresaId, activo: true, comuna: { equals: comuna, mode: "insensitive" } },
      orderBy: { nombre: "asc" },
    });
    if (porComuna) return porComuna;
  }
  if (region) {
    return prisma.permisoOrganismo.findFirst({
      where: { empresaId, activo: true, region: { equals: region, mode: "insensitive" } },
      orderBy: { nombre: "asc" },
    });
  }
  return null;
}

export async function obtenerOrganismo(id: string) {
  const { empresaId } = await requirePermission("canReadPermisos");
  return prisma.permisoOrganismo.findFirst({ where: { id, empresaId } });
}

export async function guardarOrganismo(data: PermisoOrganismoFormData, id?: string) {
  const { empresaId } = await requirePermission("canManagePermisos");
  if (id) {
    const existente = await prisma.permisoOrganismo.findFirst({ where: { id, empresaId }, select: { id: true } });
    if (!existente) throw new Error("Municipalidad no encontrada");
    return prisma.permisoOrganismo.update({
      where: { id: existente.id },
      data: { ...data, plazoDias: data.plazoDias ? parseInt(String(data.plazoDias)) : null, updatedAt: new Date() },
    });
  }
  return prisma.permisoOrganismo.create({
    data: { ...data, empresaId, plazoDias: data.plazoDias ? parseInt(String(data.plazoDias)) : null },
  });
}

export async function obtenerResponsables(filtros?: { activos?: boolean }) {
  const { empresaId } = await requirePermission("canReadPermisos");
  return prisma.permisoResponsable.findMany({
    where: { empresaId, ...(filtros?.activos !== undefined && { activo: filtros.activos }) },
    orderBy: { nombre: "asc" },
  });
}

export async function obtenerResponsable(id: string) {
  const { empresaId } = await requirePermission("canReadPermisos");
  return prisma.permisoResponsable.findFirst({ where: { id, empresaId } });
}

export async function guardarResponsable(data: PermisoResponsableFormData, id?: string) {
  const { empresaId } = await requirePermission("canManagePermisos");
  if (id) {
    const existente = await prisma.permisoResponsable.findFirst({ where: { id, empresaId }, select: { id: true } });
    if (!existente) throw new Error("Coordinador no encontrado");
    return prisma.permisoResponsable.update({ where: { id: existente.id }, data: { ...data, updatedAt: new Date() } });
  }
  return prisma.permisoResponsable.create({ data: { ...data, empresaId } });
}

export async function desactivarResponsable(id: string) {
  const { empresaId } = await requirePermission("canManagePermisos");
  const responsable = await prisma.permisoResponsable.findFirst({ where: { id, empresaId }, select: { id: true } });
  if (!responsable) throw new Error("Coordinador no encontrado");
  return prisma.permisoResponsable.update({ where: { id: responsable.id }, data: { activo: false } });
}

export async function desactivarOrganismo(id: string) {
  const { empresaId } = await requirePermission("canManagePermisos");
  const organismo = await prisma.permisoOrganismo.findFirst({ where: { id, empresaId }, select: { id: true } });
  if (!organismo) throw new Error("Municipalidad no encontrada");
  return prisma.permisoOrganismo.update({ where: { id: organismo.id }, data: { activo: false } });
}

export async function obtenerClientes(filtros?: { activos?: boolean }) {
  const { empresaId } = await requirePermission("canReadPermisos");
  return prisma.permisoCliente.findMany({
    where: { empresaId, ...(filtros?.activos !== undefined && { activo: filtros.activos }) },
    orderBy: { nombre: "asc" },
  });
}

export async function obtenerCliente(id: string) {
  const { empresaId } = await requirePermission("canReadPermisos");
  return prisma.permisoCliente.findFirst({ where: { id, empresaId } });
}

export async function guardarCliente(data: PermisoClienteFormData, id?: string) {
  const { empresaId } = await requirePermission("canManagePermisos");
  if (id) {
    const existente = await prisma.permisoCliente.findFirst({ where: { id, empresaId }, select: { id: true } });
    if (!existente) throw new Error("Cliente no encontrado");
    return prisma.permisoCliente.update({ where: { id: existente.id }, data: { ...data, updatedAt: new Date() } });
  }
  return prisma.permisoCliente.create({ data: { ...data, empresaId } });
}

export async function desactivarCliente(id: string) {
  const { empresaId } = await requirePermission("canManagePermisos");
  const cliente = await prisma.permisoCliente.findFirst({ where: { id, empresaId }, select: { id: true } });
  if (!cliente) throw new Error("Cliente no encontrado");
  return prisma.permisoCliente.update({ where: { id: cliente.id }, data: { activo: false } });
}

export async function crearPermiso(data: PermisoFormData) {
  const { empresaId, usuarioId } = await requirePermission("canManagePermisos");
  const { responsableIds, clienteNombre, clienteContactoEmail, clienteContactoTelefono, ...permisoData } = data;
  const fechaInstalacion = new Date(permisoData.fechaInstalacion);
  const fechaSolicitud = new Date(permisoData.fechaRecepcionSolicitud);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  fechaInstalacion.setHours(0, 0, 0, 0);

  if (Number.isNaN(fechaInstalacion.getTime()) || Number.isNaN(fechaSolicitud.getTime())) {
    throw new Error("Las fechas de instalación y solicitud son requeridas");
  }
  if (fechaInstalacion < hoy) throw new Error("La fecha de instalación no puede ser anterior a hoy");

  const contactoCliente = {
    ...(clienteContactoEmail?.trim() ? { contactoEmail: clienteContactoEmail.trim() } : {}),
    ...(clienteContactoTelefono?.trim() ? { contactoTelefono: clienteContactoTelefono.trim() } : {}),
  };
  let clienteId = permisoData.clienteId || undefined;

  if (clienteId) {
    const clienteExistente = await prisma.permisoCliente.findFirst({ where: { id: clienteId, empresaId }, select: { id: true } });
    if (!clienteExistente) throw new Error("Cliente no encontrado");
    if (Object.keys(contactoCliente).length > 0) {
      await prisma.permisoCliente.update({ where: { id: clienteExistente.id }, data: contactoCliente });
    }
  } else if (clienteNombre?.trim()) {
    const cliente = await prisma.permisoCliente.upsert({
      where: { empresaId_nombre: { empresaId, nombre: clienteNombre.trim() } },
      update: contactoCliente,
      create: { empresaId, nombre: clienteNombre.trim(), ...contactoCliente },
      select: { id: true },
    });
    clienteId = cliente.id;
  }

  const organismo = await prisma.permisoOrganismo.findFirst({
    where: { id: permisoData.organismoId, empresaId, activo: true },
  });
  if (!organismo) throw new Error("Municipalidad no encontrada para la empresa activa");

  const responsable = await prisma.permisoResponsable.findFirst({
    where: { id: permisoData.responsableId, empresaId, activo: true },
  });
  if (!responsable) throw new Error("Coordinador no encontrado para la empresa activa");

  const solicitadosAdicionales = Array.from(new Set((responsableIds || []).filter((id) => id && id !== permisoData.responsableId)));
  const responsablesAdicionales = solicitadosAdicionales.length > 0
    ? await prisma.permisoResponsable.findMany({ where: { empresaId, activo: true, id: { in: solicitadosAdicionales } } })
    : [];
  if (responsablesAdicionales.length !== solicitadosAdicionales.length) {
    throw new Error("Uno o más coordinadores adicionales no pertenecen a la empresa activa");
  }
  const responsableIdsAdicionales = responsablesAdicionales.map((item) => item.id);

  const fechaBaseResolucion = permisoData.fechaPresentacion ? new Date(permisoData.fechaPresentacion) : fechaSolicitud;
  const tipoPlazo = (organismo.tipoPlazo as "HABILES" | "CORRIDOS" | "NO_INFORMADO" | null) || "NO_INFORMADO";
  const fechaEstimadaResolucion = calcularFechaEstimadaResolucion(fechaBaseResolucion, organismo.plazoDias, tipoPlazo);
  const nivelRiesgo = calcularNivelRiesgo(fechaInstalacion, fechaEstimadaResolucion, organismo.plazoDias, tipoPlazo);

  const permiso = await prisma.permisoInstalacion.create({
    data: {
      empresaId,
      ...permisoData,
      organismoId: organismo.id,
      responsableId: responsable.id,
      clienteId,
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
    include: { organismo: true, responsable: true, cliente: true },
  });

  if (responsableIdsAdicionales.length > 0) {
    await prisma.permisoInstalacionResponsable.createMany({
      data: responsableIdsAdicionales.map((responsableId) => ({ permisoId: permiso.id, responsableId })),
      skipDuplicates: true,
    });
  }

  await prisma.permisoHistorial.create({
    data: { permisoId: permiso.id, estadoNuevo: permiso.estado, usuarioId, comentario: "Permiso creado" },
  });

  await enviarNotificacionATodos(
    permiso.id,
    [responsable, ...responsablesAdicionales],
    "PERMISO_CREADO",
    generarAsuntoEmailPermiso(permiso),
    generarEmailPermiso(permiso, responsable, "PERMISO_CREADO"),
  );

  return permiso;
}

export async function obtenerPermiso(id: string) {
  const { empresaId } = await requirePermission("canReadPermisos");
  const permiso = await prisma.permisoInstalacion.findFirst({
    where: { id, empresaId },
    include: { organismo: true, responsable: true, cliente: true, responsablesAdicionales: { include: { responsable: true } } },
  });
  if (!permiso) throw new Error("Permiso no encontrado");
  return permiso;
}

export async function actualizarFechaPresentacion(permisoId: string, fechaPresentacion: string) {
  const { empresaId, usuarioId } = await requirePermission("canManagePermisos");
  const permiso = await prisma.permisoInstalacion.findFirst({ where: { id: permisoId, empresaId }, include: { organismo: true } });
  if (!permiso) throw new Error("Permiso no encontrado");

  const tipoPlazo = (permiso.tipoPlazoSnapshot as "HABILES" | "CORRIDOS" | "NO_INFORMADO" | null) || "NO_INFORMADO";
  const nuevaFecha = new Date(fechaPresentacion);
  if (Number.isNaN(nuevaFecha.getTime())) throw new Error("Fecha de presentación inválida");
  const fechaEstimadaResolucion = calcularFechaEstimadaResolucion(nuevaFecha, permiso.plazoDiasSnapshot, tipoPlazo);
  const nivelRiesgo = calcularNivelRiesgo(permiso.fechaInstalacion, fechaEstimadaResolucion, permiso.plazoDiasSnapshot, tipoPlazo);

  const permisoActualizado = await prisma.permisoInstalacion.update({
    where: { id: permiso.id },
    data: { fechaPresentacion: nuevaFecha, fechaEstimadaResolucion, nivelRiesgo, updatedAt: new Date() },
    include: { organismo: true, responsable: true, cliente: true, responsablesAdicionales: { include: { responsable: true } } },
  });

  await prisma.permisoHistorial.create({
    data: {
      permisoId: permiso.id,
      estadoAnterior: permiso.estado,
      estadoNuevo: permiso.estado,
      comentario: `Fecha de presentación actualizada al ${nuevaFecha.toLocaleDateString("es-CL")}`,
      usuarioId,
    },
  });
  return permisoActualizado;
}

export async function eliminarPermiso(permisoId: string) {
  const { empresaId } = await requirePermission("canManagePermisos");
  const permiso = await prisma.permisoInstalacion.findFirst({ where: { id: permisoId, empresaId }, select: { id: true } });
  if (!permiso) throw new Error("Permiso no encontrado");
  await prisma.permisoInstalacion.delete({ where: { id: permiso.id } });
}

export async function cambiarEstadoPermiso(permisoId: string, nuevoEstado: string, comentario?: string) {
  const { empresaId, usuarioId } = await requirePermission("canManagePermisos");
  if (ESTADOS_REQUIEREN_COMENTARIO.includes(nuevoEstado as (typeof ESTADOS_REQUIEREN_COMENTARIO)[number]) && !comentario?.trim()) {
    throw new Error("Debes indicar una observación/motivo para cambiar el permiso a este estado");
  }

  const permiso = await prisma.permisoInstalacion.findFirst({
    where: { id: permisoId, empresaId },
    include: { responsable: true, responsablesAdicionales: { include: { responsable: true } } },
  });
  if (!permiso) throw new Error("Permiso no encontrado");
  if (permiso.estado === "APROBADO") throw new Error("Este permiso ya fue aprobado y no admite más cambios de estado");

  const estadoAnterior = permiso.estado;
  const tokenRespuestaObservacion = nuevoEstado === "OBSERVADO" ? randomBytes(32).toString("hex") : undefined;
  const permisoActualizado = await prisma.permisoInstalacion.update({
    where: { id: permiso.id },
    data: {
      estado: nuevoEstado,
      updatedAt: new Date(),
      ...(tokenRespuestaObservacion ? { tokenRespuestaObservacion, tokenRespuestaUsado: false } : {}),
    },
    include: { organismo: true, responsable: true, cliente: true, responsablesAdicionales: { include: { responsable: true } } },
  });

  await prisma.permisoHistorial.create({
    data: { permisoId: permiso.id, estadoAnterior, estadoNuevo: nuevoEstado, comentario, usuarioId },
  });

  if (ESTADOS_CON_NOTIFICACION.has(nuevoEstado)) {
    const destinatarios = [permiso.responsable, ...permiso.responsablesAdicionales.map((r) => r.responsable)];
    await enviarNotificacionATodos(
      permiso.id,
      destinatarios,
      "CAMBIO_ESTADO",
      generarAsuntoEmailPermiso(permisoActualizado),
      generarEmailPermiso(permisoActualizado, permiso.responsable, "CAMBIO_ESTADO", { estadoAnterior, comentario, tokenRespuestaObservacion }),
    );
  }
  return permisoActualizado;
}

export async function obtenerHistorialPermiso(permisoId: string) {
  const { empresaId } = await requirePermission("canReadPermisos");
  const permiso = await prisma.permisoInstalacion.findFirst({ where: { id: permisoId, empresaId }, select: { id: true } });
  if (!permiso) throw new Error("Permiso no encontrado");
  return prisma.permisoHistorial.findMany({ where: { permisoId: permiso.id }, orderBy: { createdAt: "asc" } });
}

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
  return { empresaNombre: empresa?.nombre || "Empresa", anio, mes, permisos };
}
