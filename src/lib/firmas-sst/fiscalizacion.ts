import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/server/auth/permissions";
import { sendEmail } from "@/lib/email/send-email";
import { origenNextPrev } from "@/lib/contratistas/portal";
import {
  generarCodigoOtp, hashOtp, compararOtp, otpVigente, puedeReenviarOtp,
  OTP_VIGENCIA_MS, OTP_INTENTOS_MAX, validarFormatoCodigo,
} from "@/lib/firmas-sst/otp";
import { MODULO_FIRMAS_EXTERNAS } from "@/lib/firmas-externas";
import { validarRutChile } from "@/lib/rut";

const COOKIE_FISCALIZADOR = "nextprev_dt_sst";
const SESSION_MS = 8 * 60 * 60 * 1000;
function rutNormalizado(value: string): string {
  return value.replace(/[^0-9kK]/g, "").toUpperCase();
}
function emailNormalizado(value: string): string {
  return value.trim().toLowerCase();
}
function validarEmail(email: string) {
  return email.length <= 240 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function claveSesion(): string {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret || secret.length < 16) throw new Error("Falta clave segura de sesión.");
  return secret;
}
function firmaSesion(payload: string): string {
  return createHmac("sha256", claveSesion()).update(payload).digest("hex");
}
function parseSesion(cookie: string | undefined): { id: string; vence: number } | null {
  if (!cookie) return null;
  const [body, digest] = cookie.split(".");
  if (!body || !digest || !/^[a-f0-9]{64}$/.test(digest)) return null;
  const calculado = firmaSesion(body);
  if (!timingSafeEqual(Uint8Array.from(Buffer.from(digest, "hex")), Uint8Array.from(Buffer.from(calculado, "hex")))) return null;
  try {
    const json = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as { id?: unknown; vence?: unknown };
    if (typeof json.id !== "string" || typeof json.vence !== "number" || json.vence < Date.now()) return null;
    return { id: json.id, vence: json.vence };
  } catch { return null; }
}
async function auditoria(accesoId: string, tipo: string, documentoId?: string, evidenciaHash?: string) {
  const h = await headers();
  await prisma.fiscalizacionFirmaEvento.create({
    data: {
      accesoId, tipo, documentoId, evidenciaHash,
      ip: (h.get("x-forwarded-for") || "").split(",")[0].trim().slice(0, 64) || null,
      userAgent: h.get("user-agent")?.slice(0, 350) || null,
    },
  });
}
export async function obtenerAccesoFiscalizacion() {
  const cookie = (await cookies()).get(COOKIE_FISCALIZADOR)?.value;
  const sesion = parseSesion(cookie);
  if (!sesion) return null;
  const acceso = await prisma.fiscalizacionFirmaAcceso.findFirst({
    where: { id: sesion.id, activo: true },
    select: {
      id: true, empresaId: true, inspectorEmail: true, inspectorNombre: true, inspectorRut: true,
      empresa: { select: { nombre: true, rut: true } },
    },
  });
  return acceso;
}

/** La autorización la emite el proveedor NextPrev, nunca el empleador fiscalizado. */
export async function otorgarAccesoFiscalizacion(input: { empresaId: string; inspectorEmail: string; inspectorNombre: string; inspectorRut: string; identidadVerificada: boolean }) {
  const context = await requireRole("SUPERADMIN");
  const email = emailNormalizado(input.inspectorEmail);
  const nombre = input.inspectorNombre.trim().slice(0, 160);
  const rutInspector = input.inspectorRut.trim().slice(0, 20);
  if (!input.identidadVerificada || !validarEmail(email) || nombre.length < 5 || !validarRutChile(rutInspector)) {
    throw new Error("Verifica por un canal independiente la calidad de fiscalizador antes de habilitar su correo.");
  }
  const empresa = await prisma.empresa.findUnique({ where: { id: input.empresaId }, select: { id: true, nombre: true, rut: true } });
  if (!empresa?.rut) throw new Error("Empresa no encontrada o sin RUT para consulta DT.");
  const concedido = await prisma.fiscalizacionFirmaAcceso.upsert({
    where: { empresaId_inspectorEmail: { empresaId: empresa.id, inspectorEmail: email } },
    update: { inspectorNombre: nombre, inspectorRut: rutInspector, activo: true, otpHash: null, otpIntentos: 0, creadoPorUsuarioId: context.usuarioId },
    create: { empresaId: empresa.id, inspectorEmail: email, inspectorNombre: nombre, inspectorRut: rutInspector, creadoPorUsuarioId: context.usuarioId },
  });
  await auditoria(concedido.id, "habilitado_proveedor");
  let correoEnviado = false;
  try {
    await sendEmail({
      to: email, subject: "NextPrev · Habilitación de consulta documental SST",
      html: '<div style="font-family:Arial;padding:24px"><h2>Acceso de fiscalización NextPrev</h2><p>Se habilitó tu correo para consultar documentación SST de ' + empresa.nombre.replace(/[<>&]/g, "") + '.</p><p>Ingresa con el RUT del empleador a <a href="' + origenNextPrev() + '/fiscalizacion/firmas">Portal de fiscalización</a> y solicita un código de un solo uso.</p><p>Si no has solicitado acceso, comunícate con el proveedor de NextPrev.</p></div>',
      text: "Acceso habilitado para la documentación SST de " + empresa.nombre + ". Portal: " + origenNextPrev() + "/fiscalizacion/firmas",
    });
    correoEnviado = true;
    await auditoria(concedido.id, "invitacion_fiscalizador_enviada");
  } catch {
    await auditoria(concedido.id, "invitacion_fiscalizador_pendiente");
  }
  return { ok: true, correoEnviado };
}
export async function listarAccesosFiscalizacion() {
  await requireRole("SUPERADMIN");
  const [empresas, accesos] = await Promise.all([
    prisma.empresa.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true, rut: true } }),
    prisma.fiscalizacionFirmaAcceso.findMany({
      orderBy: { creadoAt: "desc" },
      select: { id: true, inspectorEmail: true, inspectorNombre: true, inspectorRut: true, activo: true, empresa: { select: { nombre: true, rut: true } } },
    }),
  ]);
  return { empresas, accesos };
}
export async function modificarAccesoFiscalizacion(id: string, activo: boolean) {
  await requireRole("SUPERADMIN");
  await prisma.fiscalizacionFirmaAcceso.update({ where: { id }, data: { activo, otpHash: null } });
  return { ok: true };
}

/** Respuesta no enumerable: no informa si la empresa o inspector existen. */
export async function solicitarCodigoFiscalizacion(rutEmpresa: string, emailUsuario: string) {
  const email = emailNormalizado(emailUsuario);
  const rut = rutNormalizado(rutEmpresa);
  const generica = { ok: true, mensaje: "Si el acceso está habilitado, recibirás un código de verificación." };
  if (!validarEmail(email) || rut.length < 7 || rut.length > 10) return generica;
  const accesos = await prisma.fiscalizacionFirmaAcceso.findMany({
    where: { inspectorEmail: email, activo: true },
    select: { id: true, otpEnviadoAt: true, inspectorNombre: true, empresa: { select: { nombre: true, rut: true } } },
  });
  const acceso = accesos.find((a) => rutNormalizado(a.empresa.rut || "") === rut);
  if (!acceso || !puedeReenviarOtp(acceso.otpEnviadoAt)) return generica;
  const codigo = generarCodigoOtp();
  const ahora = new Date();
  const actualizado = await prisma.fiscalizacionFirmaAcceso.updateMany({
    where: {
      id: acceso.id, activo: true,
      ...(acceso.otpEnviadoAt ? { otpEnviadoAt: { lte: new Date(ahora.getTime() - 60_000) } } : { otpEnviadoAt: null }),
    },
    data: {
      otpHash: hashOtp(acceso.id, codigo), otpEnviadoAt: ahora,
      otpVenceAt: new Date(ahora.getTime() + OTP_VIGENCIA_MS), otpIntentos: 0,
    },
  });
  if (actualizado.count !== 1) return generica;
  try {
    await sendEmail({
      to: email, subject: "NextPrev · Acceso de fiscalización SST",
      html: '<div style="font-family:Arial;padding:24px"><h2>Acceso de fiscalización</h2><p>El código temporal para consultar los documentos SST es <strong style="font-size:26px">' + codigo + '</strong>.</p><p>Vence en 10 minutos. No compartas el código.</p></div>',
      text: "Código de acceso NextPrev: " + codigo + ". Vence en diez minutos.",
    });
    await auditoria(acceso.id, "otp_fiscalizacion_enviado");
  } catch {
    await prisma.fiscalizacionFirmaAcceso.updateMany({
      where: { id: acceso.id, otpHash: hashOtp(acceso.id, codigo) },
      data: { otpHash: null, otpEnviadoAt: null, otpVenceAt: null },
    });
  }
  return generica;
}
export async function validarCodigoFiscalizacion(rutEmpresa: string, emailUsuario: string, codigo: string) {
  const email = emailNormalizado(emailUsuario);
  const rut = rutNormalizado(rutEmpresa);
  if (!validarFormatoCodigo(codigo) || !validarEmail(email)) throw new Error("Datos de acceso incorrectos.");
  const accesos = await prisma.fiscalizacionFirmaAcceso.findMany({
    where: { inspectorEmail: email, activo: true },
    select: {
      id: true, otpHash: true, otpVenceAt: true, otpIntentos: true,
      empresa: { select: { rut: true } },
    },
  });
  const acceso = accesos.find((a) => rutNormalizado(a.empresa.rut || "") === rut);
  if (!acceso || !otpVigente(acceso.otpVenceAt, acceso.otpIntentos)) throw new Error("Código inválido o expirado.");
  const hash = hashOtp(acceso.id, codigo);
  if (!compararOtp(acceso.otpHash, hash)) {
    await prisma.fiscalizacionFirmaAcceso.updateMany({
      where: { id: acceso.id, activo: true, otpIntentos: { lt: OTP_INTENTOS_MAX } },
      data: { otpIntentos: { increment: 1 } },
    });
    throw new Error("Código inválido o expirado.");
  }
  const actualizado = await prisma.fiscalizacionFirmaAcceso.updateMany({
    where: { id: acceso.id, activo: true, otpHash: hash, otpIntentos: { lt: OTP_INTENTOS_MAX }, otpVenceAt: { gt: new Date() } },
    data: { otpHash: null, otpVenceAt: null, otpIntentos: 0 },
  });
  if (actualizado.count !== 1) throw new Error("Código ya utilizado o vencido.");
  const vence = Date.now() + SESSION_MS;
  const cuerpo = Buffer.from(JSON.stringify({ id: acceso.id, vence, nonce: randomBytes(12).toString("hex") })).toString("base64url");
  (await cookies()).set(COOKIE_FISCALIZADOR, cuerpo + "." + firmaSesion(cuerpo), {
    httpOnly: true, secure: process.env.NODE_ENV === "production",
    sameSite: "strict", path: "/", maxAge: SESSION_MS / 1000,
  });
  await auditoria(acceso.id, "inicio_sesion");
  return { ok: true };
}
export async function cerrarSesionFiscalizacion() {
  (await cookies()).delete(COOKIE_FISCALIZADOR);
  return { ok: true };
}
export async function obtenerExpedienteFiscalizacion({ skip = 0 }: { skip?: number } = {}) {
  const acceso = await obtenerAccesoFiscalizacion();
  if (!acceso) throw new Error("No existe una sesión válida de fiscalización.");
  const omitidos = Number.isFinite(skip) ? Math.max(0, Math.floor(skip)) : 0;
  const [total, documentos] = await Promise.all([
    prisma.documentoGeneradoRegistro.count({ where: { empresaId: acceso.empresaId, modulo: MODULO_FIRMAS_EXTERNAS } }),
    prisma.documentoGeneradoRegistro.findMany({
      where: { empresaId: acceso.empresaId, modulo: MODULO_FIRMAS_EXTERNAS },
      orderBy: { createdAt: "desc" }, skip: omitidos, take: 100,
      select: { id: true, nombre: true, metadata: true, createdAt: true },
    }),
  ]);
  const firmas = await prisma.firmaDocumento.findMany({
    where: { empresaId: acceso.empresaId, documentoId: { in: documentos.map((d) => d.id) }, tipoFirmante: "externo" },
    select: { documentoId: true, rutFirmante: true, nombreFirmante: true, estado: true, firmadoAt: true, tokenTrazabilidad: true, correoValidadoAt: true },
  });
  const mapa = new Map(firmas.map((f) => [f.documentoId, f]));
  await auditoria(acceso.id, "consulta_expediente");
  return {
    total, skip: omitidos, inspector: acceso.inspectorNombre, rutInspector: acceso.inspectorRut,
    empresa: acceso.empresa,
    documentos: documentos.map((d) => {
      const f = mapa.get(d.id);
      const meta = d.metadata && typeof d.metadata === "object" && !Array.isArray(d.metadata) ? d.metadata as Record<string, unknown> : {};
      return {
        id: d.id, titulo: d.nombre, creadoAt: d.createdAt.toISOString(),
        rutFirmante: f?.rutFirmante || "", nombreFirmante: f?.nombreFirmante || "",
        estado: f?.estado || "pendiente", firmadoAt: f?.firmadoAt?.toISOString() || null,
        hashEvidencia: f?.tokenTrazabilidad || null,
        tipoEvidencia: String(meta.tipoEvidencia || "otra"),
        otp: !!f?.correoValidadoAt,
      };
    }),
  };
}
export async function auditarDocumentoFiscalizacion(documentoId: string, accion: "descarga_original" | "descarga_constancia" | "ratificacion") {
  const acceso = await obtenerAccesoFiscalizacion();
  if (!acceso) throw new Error("Sesión de fiscalización no válida.");
  const doc = await prisma.documentoGeneradoRegistro.findFirst({
    where: { id: documentoId, empresaId: acceso.empresaId, modulo: MODULO_FIRMAS_EXTERNAS },
    select: { id: true },
  });
  if (!doc) throw new Error("Documento inexistente para esta empresa.");
  const f = await prisma.firmaDocumento.findFirst({
    where: { documentoId: doc.id, empresaId: acceso.empresaId, tipoFirmante: "externo" },
    select: { tokenTrazabilidad: true },
  });
  await auditoria(acceso.id, accion, doc.id, f?.tokenTrazabilidad || undefined);
  return { acceso, doc };
}
