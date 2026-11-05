import { createHash } from "crypto";
import { generarCodigoOtp, hashOtp, compararOtp, otpVigente, puedeReenviarOtp, validarFormatoCodigo, OTP_INTENTOS_MAX, OTP_VIGENCIA_MS } from "@/lib/firmas-sst/otp";
import { crearConstanciaFirmaSst } from "@/lib/firmas-sst/constancia";
import type { Prisma } from "@prisma/client";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { generarTokenFirma } from "@/lib/firmas/tokens";
import { subirArchivoContratista, descargarArchivoContratista } from "@/lib/contratistas/archivos";
import { origenNextPrev } from "@/lib/contratistas/portal";
import { sendEmail } from "@/lib/email/send-email";
import { validarRutChile } from "@/lib/rut";
import { requirePermission } from "@/server/auth/permissions";

export const MODULO_FIRMAS_EXTERNAS = "firmas_externas";
const DIAS_MAXIMOS = 7;

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
  trabajadorId: string;
  modalidadContrato: "Plazo Fijo" | "Por Obra";
  fechaInicio: string;
  fechaTermino: string;
  tipoEvidencia: "irl" | "extintores" | "capacitacion_epp" | "entrega_epp" | "reglamento" | "procedimientos" | "miper" | "otra";
  actividadPresencialConfirmada: boolean;
  fechaActividad: string;
  lugarActividad: string;
  responsableActividad: string;
  archivo: File;
}) {
  const { empresaId, usuarioId } = await requirePermission("canManageDocumentacion");
  // Los firmantes son trabajadores dependientes de la empresa activa (contratación temporal).
  const trabajador = await prisma.trabajador.findFirst({
    where: { id: input.trabajadorId, empresaId },
    select: { id: true, nombres: true, apellidos: true, rut: true, email: true },
  });
  if (!trabajador) throw new Error("Selecciona un trabajador contratado por la empresa activa.");
  if (!["Plazo Fijo", "Por Obra"].includes(input.modalidadContrato)) {
    throw new Error("Indica si el contrato es a plazo fijo o por obra/faena.");
  }
  const fechaInicio = new Date(input.fechaInicio + "T12:00:00Z");
  const fechaTermino = new Date(input.fechaTermino + "T12:00:00Z");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.fechaInicio) || !/^\d{4}-\d{2}-\d{2}$/.test(input.fechaTermino) ||
      Number.isNaN(fechaInicio.getTime()) || Number.isNaN(fechaTermino.getTime()) ||
      fechaTermino.getTime() < fechaInicio.getTime() ||
      fechaTermino.getTime() - fechaInicio.getTime() >= 7 * 86400000) {
    throw new Error("Indica un período de contratación válido de hasta siete días.");
  }
  const tipos = ["irl", "extintores", "capacitacion_epp", "entrega_epp", "reglamento", "procedimientos", "miper", "otra"];
  if (!tipos.includes(input.tipoEvidencia)) throw new Error("Selecciona el tipo de documento SST.");
  // Las actividades prácticas son presenciales; la firma solo acredita la constancia documental.
  const requierePresencial = ["extintores", "capacitacion_epp", "entrega_epp"].includes(input.tipoEvidencia);
  const lugarActividad = input.lugarActividad?.trim().slice(0, 180) || "";
  const responsableActividad = input.responsableActividad?.trim().slice(0, 160) || "";
  const fechaActividad = input.fechaActividad?.trim() || "";
  if (requierePresencial && (!input.actividadPresencialConfirmada || !lugarActividad || !responsableActividad ||
      !/^\d{4}-\d{2}-\d{2}$/.test(fechaActividad) ||
      fechaActividad < input.fechaInicio || fechaActividad > input.fechaTermino ||
      fechaActividad > new Date().toISOString().slice(0, 10))) {
    throw new Error("La capacitación o entrega presencial debe estar efectivamente realizada. Registra fecha, lugar y responsable dentro del contrato.");
  }
  const titulo = (input.titulo || "").trim().slice(0, 180);
  const nombre = (input.nombreFirmante || "").trim().slice(0, 160);
  const rut = (input.rutFirmante || "").trim().slice(0, 20);
  const email = (input.emailFirmante || "").trim().toLowerCase().slice(0, 240);
  if (!titulo || !nombre || !validarRutChile(rut) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Completa documento, nombre, RUT válido y correo del firmante.");
  }
  const rutRegistro = (trabajador.rut || "").replace(/[^0-9K]/gi, "").toUpperCase();
  if (!rutRegistro || rut.replace(/[^0-9K]/gi, "").toUpperCase() !== rutRegistro) {
    throw new Error("El RUT debe coincidir con el trabajador registrado en Personas.");
  }
  if (!trabajador.email || trabajador.email.trim().toLowerCase() !== email) {
    throw new Error("El correo particular debe coincidir con el registrado en Personas. Corrige primero su ficha.");
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
  // El enlace no debe mantenerse firmable después del término del contrato temporal.
  const finContrato = Date.parse(input.fechaTermino + "T23:59:59Z");
  const limite = Math.min(Date.now() + dias * 86400000, finContrato);
  if (limite <= Date.now()) throw new Error("El contrato ya terminó; no puedes generar una nueva firma de acreditación previa.");
  const vence = new Date(limite);
  const registro = await prisma.$transaction(async (tx) => {
    const doc = await tx.documentoGeneradoRegistro.create({
      data: {
        empresaId, usuarioId, modulo: MODULO_FIRMAS_EXTERNAS, tipoDocumento: "documento_externo",
        entidadTipo: "trabajador_temporal", entidadId: trabajador.id,
        nombre: titulo, formato: "PDF",
        archivoNombre: almacenado.archivoNombre, archivoNombreOriginal: almacenado.archivoOriginal,
        archivoTipo: "application/pdf", archivoPeso: almacenado.archivoPeso,
        metadata: {
          sha256Original: hashOriginal, tipoEvidencia: input.tipoEvidencia,
          modalidadContrato: input.modalidadContrato,
          fechaInicioContrato: input.fechaInicio, fechaTerminoContrato: input.fechaTermino,
          trabajadorId: trabajador.id,
          tipoRelacion: "dependiente_temporal",
          ...(requierePresencial ? {
            actividadPresencial: { fecha: fechaActividad, lugar: lugarActividad,
              responsable: responsableActividad, declaradaRealizada: true },
          } : {}),
          eventos: [evento("creado", usuarioId, "Documento de SST vinculado a trabajador temporal de la empresa")],
        },
      },
    });
    await tx.firmaDocumento.create({
      data: {
        empresaId, trabajadorId: trabajador.id,
        documentoId: doc.id, documentoOrigen: "otro",
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
      modalidadContrato: typeof metadata.modalidadContrato === "string" ? metadata.modalidadContrato : "",
      tipoEvidencia: typeof metadata.tipoEvidencia === "string" ? metadata.tipoEvidencia : "",
      fechaInicioContrato: typeof metadata.fechaInicioContrato === "string" ? metadata.fechaInicioContrato : "",
      fechaTerminoContrato: typeof metadata.fechaTerminoContrato === "string" ? metadata.fechaTerminoContrato : "",
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
      id: true, empresaId: true, trabajadorId: true, emailFirmante: true, documentoId: true, documentoOrigen: true, tipoFirmante: true,
      estado: true, tituloDocumento: true, descripcion: true, nombreFirmante: true,
      rutFirmante: true, firmadoAt: true, expiresAt: true,
      codigoFirmaHash: true, codigoFirmaEnviadoAt: true, codigoFirmaVenceAt: true, codigoFirmaIntentos: true,
      consentimientoElectronicoAt: true,
    },
  });
  if (!firma || firma.documentoOrigen !== "otro" || firma.tipoFirmante !== "externo") return null;
  if (!firma.trabajadorId) return null;
  const documento = await prisma.documentoGeneradoRegistro.findFirst({
    where: {
      id: firma.documentoId, empresaId: firma.empresaId,
      entidadId: firma.trabajadorId, modulo: MODULO_FIRMAS_EXTERNAS,
    },
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
    documentoExternoUrl: (estado === "pendiente" || estado === "firmado") && !!firma.consentimientoElectronicoAt ? "/api/firma/" + token + "/archivo" : null,
    emailPersonal: firma.emailFirmante || null,
    esFirmaTemporal: true,
    consentimientoPreviamenteOtorgado: !!firma.consentimientoElectronicoAt,
    documentoHash: hashOriginal,
  };
}

export async function completarSolicitudFirmaExterna(input: {
  token: string; nombreFirmante: string; rutFirmante: string; aceptoLectura: boolean;
  firmaSvg?: string | null; firmaTexto?: string | null;
  aceptoEnvioElectronico: boolean;
  codigoVerificacion: string;
}) {
  const resuelta = await resolverFirmaExterna(input.token);
  if (!resuelta || resuelta.estado !== "pendiente") throw new Error("El enlace ya no está disponible.");
  if (!input.aceptoLectura) throw new Error("Debes confirmar la lectura y aceptación del documento.");
  const codigo = (input.codigoVerificacion || "").trim();
  if (!validarFormatoCodigo(codigo) || !otpVigente(resuelta.firma.codigoFirmaVenceAt, resuelta.firma.codigoFirmaIntentos)) {
    throw new Error("Solicita un código vigente a tu correo particular antes de firmar.");
  }
  if (!compararOtp(resuelta.firma.codigoFirmaHash, hashOtp(resuelta.firma.id, codigo))) {
    await prisma.firmaDocumento.updateMany({
      where: { id: resuelta.firma.id, estado: "pendiente", codigoFirmaIntentos: { lt: OTP_INTENTOS_MAX } },
      data: { codigoFirmaIntentos: { increment: 1 } },
    });
    throw new Error("Código incorrecto. Verifica tu correo; se permite un máximo de cinco intentos.");
  }
  if (!input.aceptoEnvioElectronico || !resuelta.firma.consentimientoElectronicoAt) throw new Error("Debes otorgar tu consentimiento previo a la modalidad electrónica o solicitar soporte papel.");
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
  // Verificar los bytes realmente almacenados antes de dar por firmado el archivo.
  const original = await descargarArchivoContratista(resuelta.firma.empresaId, resuelta.documento.archivoNombre!);
  if (!original.ok) throw new Error("No se pudo recuperar el documento original para verificar su integridad.");
  const pdfOriginal = Buffer.from(await original.arrayBuffer());
  if (sha256(pdfOriginal) !== resuelta.hashOriginal) throw new Error("La integridad del PDF original no coincide con la versión solicitada.");
  const evidenciaHash = sha256([resuelta.hashOriginal, hashTokenFirmaExterna(input.token),
    ahora.toISOString(), nombre, rut, sha256(trazo || texto)].join("|"));
  await prisma.$transaction(async (tx) => {
    const actualizado = await tx.firmaDocumento.updateMany({
      where: {
        id: resuelta.firma.id, token: hashTokenFirmaExterna(input.token), estado: "pendiente",
        consentimientoElectronicoAt: { not: null },
        expiresAt: { gt: ahora }, codigoFirmaHash: hashOtp(resuelta.firma.id, codigo),
        codigoFirmaVenceAt: { gt: ahora }, codigoFirmaIntentos: { lt: OTP_INTENTOS_MAX },
      },
      data: {
        estado: "firmado", nombreFirmante: nombre, rutFirmante: rut,
        aceptoLectura: true, firmaSvg: trazo || null, firmaTexto: texto || null,
        ipFirma: ip, userAgentFirma: userAgent, firmadoAt: ahora,
        hashDocumento: resuelta.hashOriginal, tokenTrazabilidad: evidenciaHash,
        correoValidadoAt: ahora, codigoFirmaHash: null, codigoFirmaVenceAt: null,
      },
    });
    if (actualizado.count !== 1) throw new Error("Este documento ya fue firmado, revocado o venció.");
    const registro = await tx.documentoGeneradoRegistro.findUnique({ where: { id: resuelta.documento.id }, select: { metadata: true } });
    const previo = objeto(registro?.metadata);
    const eventos = Array.isArray(previo.eventos) ? previo.eventos : [];
    await tx.documentoGeneradoRegistro.update({
      where: { id: resuelta.documento.id },
      data: { metadata: { ...previo, hashEvidencia: evidenciaHash, verificacionCorreo: { verificadoAt: ahora.toISOString(), metodo: "OTP correo particular", intentosFallidos: resuelta.firma.codigoFirmaIntentos }, consentimientoElectronico: { aceptadoAt: ahora.toISOString(), alcance: "gestion_firma_envio_documentacion_sst" }, eventos: [...eventos, evento("firmado", nombre, "Lectura, consentimiento electrónico, OTP correo particular e integridad SHA256 del PDF registrados")] } as Prisma.InputJsonValue },
    });
  });
  // El vínculo se cierra primero. Si falla el correo se conserva la firma y su evidencia.
  const copia = await enviarCopiaFirmaTemporal(resuelta.documento.id, pdfOriginal).catch(() => false);
  return { ok: true, firmadoAt: ahora.toISOString(), copiaEnviada: copia };
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
  const documentoOrigen = await prisma.documentoGeneradoRegistro.findUnique({ where: { id: doc.id }, select: { metadata: true } });
  const metaAnterior = objeto(documentoOrigen?.metadata);
  const finContrato = Date.parse(String(metaAnterior.fechaTerminoContrato || "") + "T23:59:59Z");
  const limite = Math.min(Date.now() + 7 * 86400000, finContrato);
  if (!Number.isFinite(limite) || limite <= Date.now()) throw new Error("El período de contratación ya terminó; no corresponde renovar firmas de acreditación.");
  const vence = new Date(limite);
  const renovada = await prisma.firmaDocumento.updateMany({
    where: { id: firma.id, estado: { in: ["pendiente", "expirado", "rechazado"] } },
    data: { token: hashTokenFirmaExterna(token), estado: "pendiente", expiresAt: vence, firmadoAt: null, consentimientoElectronicoAt: null, consentimientoIp: null, consentimientoUserAgent: null, codigoFirmaHash: null, codigoFirmaVenceAt: null, codigoFirmaEnviadoAt: null, codigoFirmaIntentos: 0 },
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

async function enviarCopiaFirmaTemporal(documentoId: string, pdfVerificado?: Buffer): Promise<boolean> {
  const documento = await prisma.documentoGeneradoRegistro.findUnique({
    where: { id: documentoId },
    select: { id: true, empresaId: true, modulo: true, nombre: true, archivoNombre: true, archivoNombreOriginal: true, metadata: true, empresa: { select: { nombre: true, rut: true } } },
  });
  if (!documento || documento.modulo !== MODULO_FIRMAS_EXTERNAS || !documento.archivoNombre) return false;
  const firma = await prisma.firmaDocumento.findFirst({
    where: { empresaId: documento.empresaId, documentoId, estado: "firmado", tipoFirmante: "externo" },
    select: {
      nombreFirmante: true, rutFirmante: true, emailFirmante: true, firmadoAt: true,
      hashDocumento: true, tokenTrazabilidad: true, aceptoLectura: true,
      firmaSvg: true, firmaTexto: true, correoValidadoAt: true,
      ipFirma: true, userAgentFirma: true, createdAt: true,
    },
  });
  if (!firma?.emailFirmante || !firma.firmadoAt || !firma.aceptoLectura) return false;
  const contenido = pdfVerificado ?? await (async () => {
    const archivo = await descargarArchivoContratista(documento.empresaId, documento.archivoNombre!);
    if (!archivo.ok) throw new Error("No disponible");
    return Buffer.from(await archivo.arrayBuffer());
  })();
  const metadata = objeto(documento.metadata);
  if (typeof metadata.sha256Original !== "string" || sha256(contenido) !== metadata.sha256Original) {
    throw new Error("Integridad de PDF inválida");
  }
  const constancia = crearConstanciaFirmaSst({
    empresa: documento.empresa.nombre,
    rutEmpresa: documento.empresa.rut || "-",
    titulo: documento.nombre, archivoOriginal: documento.archivoNombreOriginal || documento.nombre + ".pdf",
    tipoEvidencia: String(metadata.tipoEvidencia || "otra"),
    modalidadContrato: String(metadata.modalidadContrato || "-"),
    fechaInicioContrato: String(metadata.fechaInicioContrato || "-"),
    fechaTerminoContrato: String(metadata.fechaTerminoContrato || "-"),
    actividadPresencial: metadata.actividadPresencial ? JSON.stringify(metadata.actividadPresencial) : undefined,
    nombreFirmante: firma.nombreFirmante || "-", rutFirmante: firma.rutFirmante || "-",
    correoParticular: firma.emailFirmante, solicitadoAt: firma.createdAt,
    firmadoAt: firma.firmadoAt, correoValidadoAt: firma.correoValidadoAt,
    firmaImagen: firma.firmaSvg, firmaTexto: firma.firmaTexto,
    hashDocumento: firma.hashDocumento || "", hashEvidencia: firma.tokenTrazabilidad || "",
    ip: firma.ipFirma, userAgent: firma.userAgentFirma,
    verificacionUrl: origenNextPrev() + "/verificar-firma/" + (firma.tokenTrazabilidad || ""),
  });
  try {
    const entrega = await sendEmail({
      to: firma.emailFirmante,
      subject: "NextPrev · Copia de documento de SST firmado: " + documento.nombre,
      html: '<div style="font-family:Arial,sans-serif;padding:24px"><h2>Documento firmado</h2><p>Se adjuntan el documento original y su constancia de firma electrónica simple.</p><p>Fecha de firma: ' + firma.firmadoAt.toISOString() + '</p><p>Generado por NextPrev</p></div>',
      text: "Se adjuntan el PDF original y la constancia de firma electrónica simple. Firma: " + firma.firmadoAt.toISOString(),
      attachments: [
        { filename: "documento-original.pdf", content: contenido.toString("base64"), contentType: "application/pdf" },
        { filename: "constancia-firma-nextprev.pdf", content: constancia.toString("base64"), contentType: "application/pdf" },
      ],
    });
    await agregarEventoDocumento(documento.id, "copia_firmada_enviada", firma.nombreFirmante, firma.emailFirmante, { copiaFirmadaEnviadaAt: new Date().toISOString(), copiaFirmadaProveedor: entrega.provider, copiaFirmadaMensajeId: entrega.messageId || null });
    return true;
  } catch {
    await agregarEventoDocumento(documento.id, "copia_firmada_pendiente", firma.nombreFirmante, "Error de envío al correo personal");
    return false;
  }
}

/** Permite repetir la entrega documental sin volver a firmar ni reabrir la solicitud. */
export async function reenviarCopiaFirmadaTrabajadorTemporal(documentoId: string) {
  const { empresaId } = await requirePermission("canManageDocumentacion");
  const documento = await prisma.documentoGeneradoRegistro.findFirst({
    where: { id: documentoId, empresaId, modulo: MODULO_FIRMAS_EXTERNAS },
    select: { id: true },
  });
  if (!documento) throw new Error("Documento SST no encontrado");
  const enviado = await enviarCopiaFirmaTemporal(documento.id);
  return { enviado };
}

/** Segundo factor obligatorio: el enlace no basta para firmar; hay que controlar el correo particular. */
export async function solicitarCodigoFirmaTemporal(token: string) {
  const resuelta = await resolverFirmaExterna(token);
  if (!resuelta || resuelta.estado !== "pendiente" ||
      !resuelta.firma.expiresAt || resuelta.firma.expiresAt.getTime() <= Date.now()) {
    throw new Error("El enlace está vencido o no admite firmas.");
  }
  const firma = resuelta.firma;
  if (!firma.consentimientoElectronicoAt) throw new Error("Debes aceptar primero el tratamiento y envío electrónico.");
  if (!firma.emailFirmante) throw new Error("No existe un correo particular para verificar.");
  if (!puedeReenviarOtp(firma.codigoFirmaEnviadoAt)) {
    throw new Error("Espera un minuto antes de solicitar otro código.");
  }
  const codigo = generarCodigoOtp();
  const ahora = new Date();
  const guardado = await prisma.firmaDocumento.updateMany({
    where: {
      id: firma.id, estado: "pendiente", expiresAt: { gt: ahora },
      ...(firma.codigoFirmaEnviadoAt ? { codigoFirmaEnviadoAt: { lte: new Date(ahora.getTime() - 60_000) } } : { codigoFirmaEnviadoAt: null }),
    },
    data: {
      codigoFirmaHash: hashOtp(firma.id, codigo),
      codigoFirmaEnviadoAt: ahora,
      codigoFirmaVenceAt: new Date(ahora.getTime() + OTP_VIGENCIA_MS),
      codigoFirmaIntentos: 0,
    },
  });
  if (guardado.count !== 1) throw new Error("Espera un minuto antes de solicitar otro código.");
  try {
    await sendEmail({
      to: firma.emailFirmante,
      subject: "NextPrev · Código de verificación para firmar",
      html: '<div style="font-family:Arial,sans-serif;max-width:560px;padding:24px"><h2>Verificación de identidad · NextPrev</h2><p>El código para confirmar la firma del documento <strong>' + escapado(firma.tituloDocumento) + '</strong> es:</p><div style="font-size:32px;font-weight:bold;letter-spacing:7px">' + codigo + '</div><p>Vence en 10 minutos. No compartas este código.</p><p>Si no solicitaste firmar, ignora el mensaje y comunícate con tu empleador.</p></div>',
      text: "Tu código de verificación NextPrev es " + codigo + ". Vence en 10 minutos. No lo compartas.",
    });
  } catch {
    await prisma.firmaDocumento.updateMany({
      where: { id: firma.id, codigoFirmaHash: hashOtp(firma.id, codigo), estado: "pendiente" },
      data: { codigoFirmaHash: null, codigoFirmaVenceAt: null, codigoFirmaEnviadoAt: null },
    });
    throw new Error("No fue posible enviar el código al correo particular. Solicita uno nuevo.");
  }
  await agregarEventoDocumento(resuelta.documento.id, "otp_enviado", null, "Desafío enviado al correo particular del firmante");
  return { ok: true, venceEnMinutos: 10 };
}

/** El consentimiento se registra antes de permitir acceso al PDF o solicitar OTP. */
export async function aceptarModalidadElectronicaSst(token: string, confirma: boolean) {
  if (confirma !== true) throw new Error("No se ha aceptado la modalidad electrónica.");
  const resuelta = await resolverFirmaExterna(token);
  if (!resuelta || resuelta.estado !== "pendiente") throw new Error("El enlace no admite consentimiento.");
  if (resuelta.firma.consentimientoElectronicoAt) return { ok: true };
  const h = await headers();
  const ahora = new Date();
  const actualizado = await prisma.firmaDocumento.updateMany({
    where: {
      id: resuelta.firma.id, token: hashTokenFirmaExterna(token), estado: "pendiente",
      expiresAt: { gt: ahora }, consentimientoElectronicoAt: null,
    },
    data: {
      consentimientoElectronicoAt: ahora,
      consentimientoIp: (h.get("x-forwarded-for") || "").split(",")[0].trim().slice(0, 64) || null,
      consentimientoUserAgent: h.get("user-agent")?.slice(0, 350) || null,
    },
  });
  if (actualizado.count === 1) {
    await agregarEventoDocumento(resuelta.documento.id, "consentimiento_previo", resuelta.firma.nombreFirmante,
      "Aceptó gestión, firma y entrega electrónica en su correo particular antes de recibir el PDF; opción papel disponible.");
  }
  return { ok: true };
}
