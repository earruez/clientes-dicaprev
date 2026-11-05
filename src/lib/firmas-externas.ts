import { createHash } from "crypto";
import type { Prisma } from "@prisma/client";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { generarTokenFirma } from "@/lib/firmas/tokens";
import { subirArchivoContratista } from "@/lib/contratistas/archivos";
import { origenNextPrev } from "@/lib/contratistas/portal";
import { sendEmail } from "@/lib/email/send-email";
import { validarRutChile } from "@/lib/rut";
import { requirePermission } from "@/server/auth/permissions";

export const MODULO_FIRMAS_EXTERNAS = "firmas_externas";
const DIAS_MAXIMOS = 30;

type Datos = Record<string, unknown>;

function objeto(value: unknown): Datos {
  return value && typeof value === "object" && !Array.isArray(value) ? { ...(value as Datos) } : {};
}

export function sha256(value: string | Buffer): string {
  return createHash("sha256").update(typeof value === "string" ? value : new Uint8Array(value)).digest("hex");
}

export function hashTokenFirmaExterna(token: string): string {
  return sha256(token);
}

function evento(tipo: string, actor: string | null, detalle?: string) {
  return { tipo, fecha: new Date().toISOString(), actor, detalle: detalle || null };
}

async function agregarEventoDocumento(documentoId: string, tipo: string, actor: string | null, detalle?: string, extra?: Datos) {
  const registro = await prisma.documentoGeneradoRegistro.findUnique({ where: { id: documentoId }, select: { metadata: true } });
  if (!registro) return;
  const anterior = objeto(registro.metadata);
  const eventos = Array.isArray(anterior.eventos) ? anterior.eventos : [];
  await prisma.documentoGeneradoRegistro.update({
    where: { id: documentoId },
    data: { metadata: { ...anterior, ...extra, eventos: [...eventos, evento(tipo, actor, detalle)] } as Prisma.InputJsonValue },
  });
}

function escapado(valor: string): string {
  return valor.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

async function enviarInvitacion(email: string, nombre: string, titulo: string, token: string, vence: Date) {
  const enlace = origenNextPrev() + "/firma/" + encodeURIComponent(token);
  await sendEmail({
    to: email,
    subject: "NextPrev · Firma solicitada: " + titulo,
    html: '<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden"><header style="background:#082f49;color:white;padding:24px"><strong style="font-size:23px">NextPrev</strong><p>Solicitud de firma electrónica simple</p></header><main style="padding:24px"><p>Hola ' + escapado(nombre) + ':</p><p>Se requiere tu firma para el documento <strong>' + escapado(titulo) + '</strong>.</p><p>Abre el archivo original, revisa su contenido y confirma tu firma desde el siguiente enlace:</p><p><a href="' + enlace + '" style="display:inline-block;padding:14px 22px;border-radius:10px;background:#047857;color:white;text-decoration:none">Revisar y firmar documento</a></p><p style="color:#64748b;font-size:12px">El enlace es personal, vence el ' + escapado(vence.toLocaleString("es-CL", { timeZone: "America/Santiago" })) + ' y se invalida al ser revocado. No lo reenvíes.</p><p style="color:#64748b;font-size:12px">Este proceso utiliza firma electrónica simple; no es una firma electrónica avanzada.</p></main><footer style="background:#f8fafc;padding:16px;font-size:12px;color:#64748b">Generado por NextPrev</footer></div>',
    text: "Hola " + nombre + ". Revisa y firma " + titulo + " en " + enlace + ". Enlace personal; vence " + vence.toISOString() + ".",
  });
  return enlace;
}

export async function crearSolicitudFirmaExterna(input: {
  titulo: string;
  nombreFirmante: string;
  rutFirmante: string;
  emailFirmante: string;
  diasVigencia: number;
  archivo: File;
}) {
  const { empresaId, usuarioId } = await requirePermission("canManageDocumentacion");
  const titulo = (input.titulo || "").trim().slice(0, 180);
  const nombre = (input.nombreFirmante || "").trim().slice(0, 160);
  const rut = (input.rutFirmante || "").trim().slice(0, 20);
  const email = (input.emailFirmante || "").trim().toLowerCase().slice(0, 240);
  if (!titulo || !nombre || !validarRutChile(rut) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Completa documento, nombre, RUT válido y correo del firmante.");
  }
  const dias = Number(input.diasVigencia);
  if (!Number.isInteger(dias) || dias < 1 || dias > DIAS_MAXIMOS) {
    throw new Error("La vigencia debe estar entre 1 y 30 días.");
  }
  if (!input.archivo || !input.archivo.name.toLowerCase().endsWith(".pdf") ||
      (input.archivo.type && input.archivo.type !== "application/pdf") ||
      input.archivo.size <= 0 || input.archivo.size > 10 * 1024 * 1024) {
    throw new Error("Adjunta un PDF válido de máximo 10 MB.");
  }
  const buffer = Buffer.from(await input.archivo.arrayBuffer());
  if (buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
    throw new Error("El archivo no corresponde a un PDF.");
  }
  const hashOriginal = sha256(buffer);
  const almacenado = await subirArchivoContratista(empresaId, input.archivo);
  const token = generarTokenFirma();
  const vence = new Date(Date.now() + dias * 86400000);
  const registro = await prisma.$transaction(async (tx) => {
    const doc = await tx.documentoGeneradoRegistro.create({
      data: {
        empresaId, usuarioId, modulo: MODULO_FIRMAS_EXTERNAS, tipoDocumento: "documento_externo",
        entidadTipo: "firmante_externo", nombre: titulo, formato: "PDF",
        archivoNombre: almacenado.archivoNombre, archivoNombreOriginal: almacenado.archivoOriginal,
        archivoTipo: "application/pdf", archivoPeso: almacenado.archivoPeso,
        metadata: { sha256Original: hashOriginal, eventos: [evento("creado", usuarioId, "PDF original recibido y conservado sin alteraciones")] },
      },
    });
    await tx.firmaDocumento.create({
      data: {
        empresaId, documentoId: doc.id, documentoOrigen: "otro",
        tipoFirmante: "externo", tipoFirma: "manual", estado: "pendiente",
        tituloDocumento: titulo, nombreFirmante: nombre, rutFirmante: rut,
        emailFirmante: email, token: hashTokenFirmaExterna(token), expiresAt: vence,
        hashDocumento: hashOriginal,
      },
    });
    return doc;
  });
  let enviado = false;
  try {
    await enviarInvitacion(email, nombre, titulo, token, vence);
    enviado = true;
    await agregarEventoDocumento(registro.id, "invitacion_enviada", usuarioId, email);
  } catch {
    await agregarEventoDocumento(registro.id, "correo_pendiente", usuarioId, "El correo no pudo entregarse");
  }
  return {
    id: registro.id, enviado, enlace: origenNextPrev() + "/firma/" + token,
    aviso: enviado ? "Se envió la solicitud de firma." : "El documento se guardó, pero falló el correo. Copia el enlace o reenvía desde la bandeja.",
  };
}

export async function listarSolicitudesFirmaExterna() {
  const { empresaId } = await requirePermission("canReadDocumentacion");
  const documentos = await prisma.documentoGeneradoRegistro.findMany({
    where: { empresaId, modulo: MODULO_FIRMAS_EXTERNAS },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: { id: true, nombre: true, archivoNombre: true, archivoNombreOriginal: true, archivoPeso: true, metadata: true, createdAt: true },
  });
  const firmas = documentos.length ? await prisma.firmaDocumento.findMany({
    where: { empresaId, documentoOrigen: "otro", tipoFirmante: "externo", documentoId: { in: documentos.map((d) => d.id) } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, documentoId: true, estado: true, nombreFirmante: true, rutFirmante: true,
      emailFirmante: true, expiresAt: true, firmadoAt: true, tokenTrazabilidad: true,
    },
  }) : [];
  const porDocumento = new Map(firmas.map((f) => [f.documentoId, f]));
  return documentos.map((doc) => {
    const firma = porDocumento.get(doc.id);
    const metadata = objeto(doc.metadata);
    return {
      id: doc.id, titulo: doc.nombre, archivo: doc.archivoNombreOriginal || "Documento PDF", archivoNombre: doc.archivoNombre || "",
      peso: doc.archivoPeso, creadoAt: doc.createdAt.toISOString(),
      nombreFirmante: firma?.nombreFirmante || "", emailFirmante: firma?.emailFirmante || "",
      rutFirmante: firma?.rutFirmante || "", firmaId: firma?.id || "",
      estado: metadata.revocado ? "revocado" : firma?.estado === "pendiente" && firma.expiresAt && firma.expiresAt < new Date() ? "expirado" : firma?.estado || "pendiente",
      firmadoAt: firma?.firmadoAt?.toISOString() || null,
      expiraAt: firma?.expiresAt?.toISOString() || null,
      hashOriginal: typeof metadata.sha256Original === "string" ? metadata.sha256Original : "",
      certificadoDisponible: firma?.estado === "firmado",
    };
  });
}

export async function resolverFirmaExterna(token: string) {
  if (!/^[a-f0-9]{48}$/.test(token)) return null;
  const firma = await prisma.firmaDocumento.findUnique({
    where: { token: hashTokenFirmaExterna(token) },
    select: {
      id: true, empresaId: true, documentoId: true, documentoOrigen: true, tipoFirmante: true,
      estado: true, tituloDocumento: true, descripcion: true, nombreFirmante: true,
      rutFirmante: true, firmadoAt: true, expiresAt: true,
    },
  });
  if (!firma || firma.documentoOrigen !== "otro" || firma.tipoFirmante !== "externo") return null;
  const documento = await prisma.documentoGeneradoRegistro.findFirst({
    where: { id: firma.documentoId, empresaId: firma.empresaId, modulo: MODULO_FIRMAS_EXTERNAS },
    select: { id: true, archivoNombre: true, metadata: true },
  });
  if (!documento?.archivoNombre) return null;
  const metadata = objeto(documento.metadata);
  const expirado = firma.estado === "pendiente" && !!firma.expiresAt && firma.expiresAt.getTime() <= Date.now();
  const estado = expirado ? "expirado" : firma.estado;
  return { firma, documento, estado, hashOriginal: typeof metadata.sha256Original === "string" ? metadata.sha256Original : "" };
}

export async function obtenerFirmaExternaPublica(token: string) {
  const resultado = await resolverFirmaExterna(token);
  if (!resultado) return null;
  const { firma, estado, hashOriginal } = resultado;
  return {
    id: firma.id, token, documentoOrigen: "otro" as const,
    estado, tituloDocumento: firma.tituloDocumento, descripcion: firma.descripcion,
    nombreTrabajador: null, rutTrabajador: null, nombreFirmante: firma.nombreFirmante,
    rutFirmante: firma.rutFirmante, firmadoAt: firma.firmadoAt?.toISOString() || null,
    expiresAt: firma.expiresAt?.toISOString() || null, contenidoMarkdown: null,
    documentoExternoUrl: (estado === "pendiente" || estado === "firmado") ? "/api/firma/" + token + "/archivo" : null,
    documentoHash: hashOriginal,
  };
}

export async function completarSolicitudFirmaExterna(input: {
  token: string; nombreFirmante: string; rutFirmante: string; aceptoLectura: boolean;
  firmaSvg?: string | null; firmaTexto?: string | null;
}) {
  const resuelta = await resolverFirmaExterna(input.token);
  if (!resuelta || resuelta.estado !== "pendiente") throw new Error("El enlace ya no está disponible.");
  if (!input.aceptoLectura) throw new Error("Debes confirmar la lectura y aceptación del documento.");
  const nombre = (input.nombreFirmante || "").trim().slice(0, 160);
  const rut = (input.rutFirmante || "").trim();
  const trazo = (input.firmaSvg || "").trim();
  const texto = (input.firmaTexto || "").trim().slice(0, 160);
  if (!nombre || !validarRutChile(rut) || (rut.replace(/[^0-9k]/gi, "").toUpperCase() !==
    (resuelta.firma.rutFirmante || "").replace(/[^0-9k]/gi, "").toUpperCase())) {
    throw new Error("Verifica tu nombre y el RUT indicado en la solicitud.");
  }
  if ((!trazo && !texto) || trazo.length > 400000 ||
    (trazo && !/^data:image\/png;base64,[a-zA-Z0-9+/=]+$/.test(trazo))) {
    throw new Error("Ingresa una firma escrita o dibujada válida.");
  }
  const reqHeaders = await headers();
  const ip = (reqHeaders.get("x-forwarded-for") || "").split(",")[0].trim().slice(0, 64) || null;
  const userAgent = (reqHeaders.get("user-agent") || "").slice(0, 350) || null;
  const ahora = new Date();
  const evidenciaHash = sha256([resuelta.hashOriginal, hashTokenFirmaExterna(input.token),
    ahora.toISOString(), nombre, rut, sha256(trazo || texto)].join("|"));
  await prisma.$transaction(async (tx) => {
    const actualizado = await tx.firmaDocumento.updateMany({
      where: { id: resuelta.firma.id, token: hashTokenFirmaExterna(input.token), estado: "pendiente", expiresAt: { gt: ahora } },
      data: {
        estado: "firmado", nombreFirmante: nombre, rutFirmante: rut,
        aceptoLectura: true, firmaSvg: trazo || null, firmaTexto: texto || null,
        ipFirma: ip, userAgentFirma: userAgent, firmadoAt: ahora,
        hashDocumento: resuelta.hashOriginal, tokenTrazabilidad: evidenciaHash,
      },
    });
    if (actualizado.count !== 1) throw new Error("Este documento ya fue firmado, revocado o venció.");
    const registro = await tx.documentoGeneradoRegistro.findUnique({ where: { id: resuelta.documento.id }, select: { metadata: true } });
    const previo = objeto(registro?.metadata);
    const eventos = Array.isArray(previo.eventos) ? previo.eventos : [];
    await tx.documentoGeneradoRegistro.update({
      where: { id: resuelta.documento.id },
      data: { metadata: { ...previo, hashEvidencia: evidenciaHash, eventos: [...eventos, evento("firmado", nombre, "Aceptación de lectura, RUT e integridad del PDF registrados")] } as Prisma.InputJsonValue },
    });
  });
  return { ok: true, firmadoAt: ahora.toISOString() };
}

export async function rechazarSolicitudFirmaExterna(token: string, motivo: string) {
  const resuelta = await resolverFirmaExterna(token);
  if (!resuelta || resuelta.estado !== "pendiente") throw new Error("El enlace no está disponible.");
  const razon = (motivo || "").trim().slice(0, 600);
  if (razon.length < 5) throw new Error("Indica el motivo del rechazo.");
  const actualizado = await prisma.firmaDocumento.updateMany({
    where: { id: resuelta.firma.id, token: hashTokenFirmaExterna(token), estado: "pendiente", expiresAt: { gt: new Date() } },
    data: { estado: "rechazado" },
  });
  if (actualizado.count !== 1) throw new Error("La solicitud ya no está pendiente.");
  await agregarEventoDocumento(resuelta.documento.id, "rechazado", resuelta.firma.nombreFirmante, razon);
  return { ok: true };
}

export async function revocarSolicitudFirmaExterna(documentoId: string) {
  const { empresaId, usuarioId } = await requirePermission("canManageDocumentacion");
  const doc = await prisma.documentoGeneradoRegistro.findFirst({
    where: { id: documentoId, empresaId, modulo: MODULO_FIRMAS_EXTERNAS }, select: { id: true },
  });
  if (!doc) throw new Error("Documento no encontrado.");
  const actualizado = await prisma.firmaDocumento.updateMany({
    where: { empresaId, documentoId, documentoOrigen: "otro", tipoFirmante: "externo", estado: "pendiente" },
    data: { estado: "expirado" },
  });
  if (!actualizado.count) throw new Error("No existe una solicitud pendiente que revocar.");
  await agregarEventoDocumento(doc.id, "revocado", usuarioId, "Enlace invalidado por la empresa", { revocado: true });
  return { ok: true };
}

export async function reenviarSolicitudFirmaExterna(documentoId: string) {
  const { empresaId, usuarioId } = await requirePermission("canManageDocumentacion");
  const doc = await prisma.documentoGeneradoRegistro.findFirst({
    where: { id: documentoId, empresaId, modulo: MODULO_FIRMAS_EXTERNAS },
    select: { id: true, nombre: true },
  });
  if (!doc) throw new Error("Documento no encontrado.");
  const firma = await prisma.firmaDocumento.findFirst({
    where: { empresaId, documentoId, documentoOrigen: "otro", tipoFirmante: "externo" },
    select: { id: true, estado: true, emailFirmante: true, nombreFirmante: true },
  });
  if (!firma || firma.estado === "firmado") throw new Error("Un documento firmado no puede volver a enviarse.");
  if (!firma.emailFirmante || !firma.nombreFirmante) throw new Error("Faltan los datos del destinatario.");
  const token = generarTokenFirma();
  const vence = new Date(Date.now() + 7 * 86400000);
  const renovada = await prisma.firmaDocumento.updateMany({
    where: { id: firma.id, estado: { in: ["pendiente", "expirado", "rechazado"] } },
    data: { token: hashTokenFirmaExterna(token), estado: "pendiente", expiresAt: vence, firmadoAt: null },
  });
  if (renovada.count !== 1) throw new Error("El documento cambió de estado y no puede reenviarse.");
  await agregarEventoDocumento(doc.id, "enlace_renovado", usuarioId, "Se invalidó el enlace anterior", { revocado: false });
  let enviado = false;
  try {
    await enviarInvitacion(firma.emailFirmante, firma.nombreFirmante, doc.nombre, token, vence);
    enviado = true;
    await agregarEventoDocumento(doc.id, "invitacion_reenviada", usuarioId, firma.emailFirmante);
  } catch {
    await agregarEventoDocumento(doc.id, "correo_pendiente", usuarioId, "Error de entrega al reenviar");
  }
  return { ok: true, enviado, enlace: origenNextPrev() + "/firma/" + token };
}
