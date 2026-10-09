"use server";

import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/send-email";
import { generarTokenPortal, hashTokenPortal, origenNextPrev } from "@/lib/contratistas/portal";
import { REQUISITOS_EMPRESA, estadoEfectivo } from "@/lib/contratistas/requisitos";
import { requirePermission } from "@/server/auth/permissions";

const DIAS_ENLACE = 60;

function fecha(value?: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value + "T12:00:00.000Z");
  if (Number.isNaN(parsed.getTime())) throw new Error("Fecha no válida");
  return parsed;
}

function escapar(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] || c));
}

export async function listarSolicitudesContratistas() {
  const { empresaId } = await requirePermission("canReadDocumentacion");
  const solicitudes = await prisma.contratistaSolicitud.findMany({
    where: { empresaId },
    orderBy: { createdAt: "desc" },
    include: {
      contratista: { select: { nombre: true, rut: true, razonSocial: true } },
      recursos: { orderBy: { createdAt: "asc" } },
      requisitos: {
        orderBy: [{ categoria: "asc" }, { createdAt: "asc" }],
        include: { recurso: { select: { nombre: true, identificador: true, patente: true } }, versiones: { orderBy: { version: "desc" }, select: { id: true, version: true, subidoAt: true, archivoNombre: true, archivoOriginal: true } } },
      },
    },
  });
  return solicitudes.map((s) => {
    const total = s.requisitos.filter((r) => r.obligatorio).length;
    const aprobados = s.requisitos.filter((r) => r.obligatorio && estadoEfectivo(r.estado, r.fechaVencimiento) === "aprobado").length;
    return { ...s, totalObligatorios: total, aprobados, porcentaje: total ? Math.round((aprobados / total) * 100) : 0 };
  });
}

export async function crearSolicitudContratista(input: {
  contratistaId: string;
  nombre: string;
  faena?: string;
  servicio?: string;
  contactoEmail: string;
  responsable?: string;
  dotacionEstimada?: number;
  fechaInicio?: string;
  fechaTermino?: string;
  requisitos?: string[];
}) {
  const { empresaId } = await requirePermission("canManageDocumentacion");
  const contratista = await prisma.contratista.findFirst({
    where: { id: input.contratistaId, empresaId, activo: true },
    select: { id: true },
  });
  if (!contratista) throw new Error("Contratista no encontrado");
  if (!input.nombre?.trim()) throw new Error("Indica el nombre del contrato o servicio");
  const email = input.contactoEmail?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Correo de contacto inválido");
  const selected = input.requisitos === undefined
    ? REQUISITOS_EMPRESA.filter((r) => r.obligatorio)
    : REQUISITOS_EMPRESA.filter((r) => input.requisitos?.includes(r.clave));
  const solicitud = await prisma.contratistaSolicitud.create({
    data: {
      empresaId,
      contratista: { connect: { id: contratista.id } },
      nombre: input.nombre.trim().slice(0, 180),
      faena: input.faena?.trim().slice(0, 180) || null,
      servicio: input.servicio?.trim().slice(0, 300) || null,
      contactoEmail: email,
      responsable: input.responsable?.trim().slice(0, 160) || null,
      dotacionEstimada: input.dotacionEstimada && input.dotacionEstimada > 0 ? Math.floor(input.dotacionEstimada) : null,
      fechaInicio: fecha(input.fechaInicio),
      fechaTermino: fecha(input.fechaTermino),
      requisitos: { create: selected.map((r) => ({
        empresaId, nombre: r.nombre, categoria: r.categoria, obligatorio: r.obligatorio,
      })) },
    },
    select: { id: true },
  });
  return solicitud;
}

export async function agregarRequisitoContratista(input: {
  solicitudId: string;
  nombre: string;
  categoria: "empresa" | "trabajador" | "vehiculo" | "equipo";
  recursoId?: string;
  obligatorio?: boolean;
}) {
  const { empresaId } = await requirePermission("canManageDocumentacion");
  const solicitud = await prisma.contratistaSolicitud.findFirst({ where: { id: input.solicitudId, empresaId, estado: { not: "cerrada" } }, select: { id: true } });
  if (!solicitud) throw new Error("Expediente no encontrado o cerrado");
  if (!input.nombre?.trim()) throw new Error("Nombre del requisito obligatorio");
  if (input.recursoId) {
    const recurso = await prisma.contratistaRecurso.findFirst({ where: { id: input.recursoId, solicitudId: solicitud.id, empresaId } });
    if (!recurso || recurso.tipo !== input.categoria) throw new Error("Recurso no válido para este requisito");
  } else if (input.categoria !== "empresa") {
    throw new Error("Selecciona un trabajador, vehículo o equipo para este requisito");
  }
  await prisma.contratistaRequisito.create({
    data: { empresaId, solicitudId: solicitud.id, recursoId: input.recursoId || null, nombre: input.nombre.trim().slice(0, 220), categoria: input.categoria, obligatorio: input.obligatorio !== false },
  });
  await recalcularEstado(solicitud.id, empresaId);
  return { ok: true };
}

export async function cambiarObligatoriedadContratista(requisitoId: string, obligatorio: boolean) {
  const { empresaId } = await requirePermission("canManageDocumentacion");
  const r = await prisma.contratistaRequisito.findFirst({ where: { id: requisitoId, empresaId, solicitud: { estado: { not: "cerrada" } } }, select: { id: true, solicitudId: true } });
  if (!r) throw new Error("Requisito no encontrado");
  await prisma.contratistaRequisito.update({ where: { id: r.id }, data: { obligatorio } });
  await recalcularEstado(r.solicitudId, empresaId);
  return { ok: true };
}

export async function invitarContratista(solicitudId: string) {
  const { empresaId } = await requirePermission("canManageDocumentacion");
  const solicitud = await prisma.contratistaSolicitud.findFirst({
    where: { id: solicitudId, empresaId, estado: { not: "cerrada" } },
    include: { contratista: { select: { nombre: true } } },
  });
  if (!solicitud) throw new Error("Expediente no encontrado o cerrado");
  const empresa = await prisma.empresa.findUnique({ where: { id: empresaId }, select: { nombre: true } });
  const token = generarTokenPortal();
  const url = `${origenNextPrev()}/contratistas/portal/${token}`;
  const expira = new Date(Date.now() + DIAS_ENLACE * 86400000);
  await prisma.contratistaSolicitud.update({
    where: { id: solicitud.id },
    data: { tokenHash: hashTokenPortal(token), tokenExpiraAt: expira, invitadoAt: new Date(), estado: "enviada" },
  });
  try {
    await sendEmail({
      to: solicitud.contactoEmail,
      subject: `NextPrev · Solicitud de documentos: ${solicitud.nombre}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;background:#fff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden"><header style="background:#0f172a;color:white;padding:24px"><strong style="font-size:22px">NextPrev</strong><p style="margin:8px 0 0">Carpeta documental de contratista</p></header><main style="padding:26px"><h2 style="color:#0f172a">Solicitud de antecedentes</h2><p>${escapar(empresa?.nombre || "Empresa mandante")} ha solicitado antecedentes para <strong>${escapar(solicitud.nombre)}</strong>.</p><p>Empresa destinataria: ${escapar(solicitud.contratista.nombre)}</p><p>Revisa los requisitos, incorpora trabajadores y equipos y carga tus archivos desde el siguiente enlace:</p><p><a style="display:inline-block;background:#0284c7;color:#fff;padding:14px 20px;text-decoration:none;border-radius:10px" href="${url}">Completar carpeta documental</a></p><p style="color:#64748b;font-size:12px">Enlace personal vigente por 60 días. No lo compartas con terceros.</p></main><footer style="padding:16px 26px;color:#94a3b8;background:#f8fafc;font-size:12px">Generado por NextPrev</footer></div>`,
      text: `${empresa?.nombre || "Empresa mandante"} solicita antecedentes para ${solicitud.nombre}. Accede a tu carpeta: ${url}. Enlace válido por 60 días.`,
    });
  } catch (error) {
    // Se conserva la invitación para poder reintentar el envío desde la mandante.
    throw new Error(`No se pudo entregar el correo. Reintenta la invitación: ${error instanceof Error ? error.message : "error de envío"}`);
  }
  return { ok: true };
}

async function recalcularEstado(solicitudId: string, empresaId: string) {
  const solicitud = await prisma.contratistaSolicitud.findFirst({
    where: { id: solicitudId, empresaId },
    include: { requisitos: true },
  });
  if (!solicitud || solicitud.estado === "cerrada") return;
  const requeridos = solicitud.requisitos.filter((r) => r.obligatorio);
  let estado: string;
  if (!solicitud.invitadoAt) estado = "borrador";
  else if (requeridos.some((r) => ["observado", "rechazado"].includes(r.estado))) estado = "observada";
  else if (requeridos.length > 0 && requeridos.every((r) => estadoEfectivo(r.estado, r.fechaVencimiento) === "aprobado")) estado = "aprobada";
  else if (solicitud.requisitos.some((r) => r.estado === "en_revision" || r.estado === "aprobado")) estado = "en_revision";
  else estado = "enviada";
  await prisma.contratistaSolicitud.update({ where: { id: solicitudId }, data: { estado } });
}

export async function revisarRequisitoContratista(input: {
  requisitoId: string;
  estado: "aprobado" | "observado" | "rechazado";
  observacion?: string;
}) {
  const { empresaId, usuarioId } = await requirePermission("canManageDocumentacion");
  const requisito = await prisma.contratistaRequisito.findFirst({
    where: { id: input.requisitoId, empresaId, solicitud: { estado: { not: "cerrada" } } },
    include: { solicitud: { select: { contactoEmail: true, nombre: true } } },
  });
  if (!requisito || !requisito.archivoNombre) throw new Error("Documento no cargado");
  if (input.estado === "aprobado" && estadoEfectivo("aprobado", requisito.fechaVencimiento) === "vencido") throw new Error("No se puede aprobar un documento vencido");
  if (input.estado !== "aprobado" && !input.observacion?.trim()) throw new Error("Indica el motivo de la observación o rechazo");
  await prisma.contratistaRequisito.update({
    where: { id: requisito.id },
    data: {
      estado: input.estado,
      observacionRevision: input.estado === "aprobado" ? null : input.observacion?.trim().slice(0, 1200),
      revisadoPorId: usuarioId,
      revisadoAt: new Date(),
    },
  });
  await recalcularEstado(requisito.solicitudId, empresaId);
  if (input.estado !== "aprobado") {
    try {
      await sendEmail({
        to: requisito.solicitud.contactoEmail,
        subject: `NextPrev · Documento requiere corrección: ${requisito.nombre}`,
        html: `<div style="font-family:Arial,sans-serif;padding:28px;max-width:600px"><h2 style="color:#0f172a">Revisión de documento</h2><p>En el expediente <b>${escapar(requisito.solicitud.nombre)}</b>, el documento <b>${escapar(requisito.nombre)}</b> fue marcado como ${input.estado === "observado" ? "observado" : "rechazado"}.</p><p><b>Motivo:</b> ${escapar(input.observacion?.trim() || "")}</p><p>Ingresa nuevamente mediante el enlace de la invitación para cargar la corrección.</p><small>Generado por NextPrev</small></div>`,
        text: `Documento: ${requisito.nombre}. Motivo: ${input.observacion?.trim()}. Ingresa con tu invitación original.`,
      });
    } catch (error) {
      console.error("[contratistas] revisión guardada, error de correo", error instanceof Error ? error.message : "Error");
    }
  }
  return { ok: true };
}

export async function cerrarExpedienteContratista(solicitudId: string) {
  const { empresaId } = await requirePermission("canManageDocumentacion");
  const r = await prisma.contratistaSolicitud.updateMany({ where: { id: solicitudId, empresaId }, data: { estado: "cerrada", tokenHash: null, tokenExpiraAt: null } });
  if (!r.count) throw new Error("Expediente no encontrado");
  return { ok: true };
}
