"use server";

import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { generarHashFirma } from "@/lib/firmas/hash";
import { generarTokenFirma } from "@/lib/firmas/tokens";
import { requirePermission } from "@/server/auth/permissions";

export type CrearFirmaDocumentoInput = {
  empresaId: string;
  trabajadorId?: string | null;
  documentoId: string;
  documentoOrigen: "documento_trabajador" | "documento_empresa" | "entrega_epp" | "capacitacion" | "induccion" | "acreditacion" | "otro";
  tituloDocumento: string;
  descripcion?: string | null;
  nombreFirmante?: string | null;
  emailFirmante?: string | null;
  rutFirmante?: string | null;
  expiresAt?: Date | null;
};

export type FirmaPublicaView = {
  id: string;
  token: string;
  estado: "pendiente" | "firmado" | "rechazado" | "expirado";
  tituloDocumento: string;
  descripcion: string | null;
  nombreTrabajador: string | null;
  nombreFirmante: string | null;
  rutFirmante: string | null;
  firmadoAt: string | null;
  expiresAt: string | null;
};

export type CompletarFirmaDocumentoInput = {
  token: string;
  nombreFirmante: string;
  rutFirmante: string;
  aceptoLectura: boolean;
  firmaSvg?: string | null;
  firmaTexto?: string | null;
};

async function registrarHistorialTrabajador(documentoId: string, usuarioId: string | null, accion: string, detalle: string) {
  const documento = await prisma.trabajadorDocumento.findUnique({
    where: { id: documentoId },
    select: { id: true, version: true },
  });

  if (!documento) return;

  await prisma.trabajadorDocumentoHistorial.create({
    data: {
      documentoId,
      usuarioId: usuarioId ?? undefined,
      accion,
      detalle,
      version: documento.version,
      origen: "sistema",
    },
  });
}

export async function crearFirmaDocumento(input: CrearFirmaDocumentoInput) {
  const { empresaId: empresaActivaId, usuarioId } = await requirePermission("canManageDocumentacion");

  if (empresaActivaId !== input.empresaId) {
    throw new Error("Empresa inválida para crear firma");
  }

  const token = generarTokenFirma();

  const firma = await prisma.firmaDocumento.create({
    data: {
      empresaId: input.empresaId,
      trabajadorId: input.trabajadorId ?? null,
      documentoId: input.documentoId,
      documentoOrigen: input.documentoOrigen,
      token,
      estado: "pendiente",
      tituloDocumento: input.tituloDocumento,
      descripcion: input.descripcion?.trim() || null,
      nombreFirmante: input.nombreFirmante?.trim() || null,
      emailFirmante: input.emailFirmante?.trim() || null,
      rutFirmante: input.rutFirmante?.trim() || null,
      expiresAt: input.expiresAt ?? null,
    },
    select: { id: true, token: true },
  });

  if (input.documentoOrigen === "documento_trabajador") {
    await prisma.trabajadorDocumento.update({
      where: { id: input.documentoId },
      data: { estado: "enviado_firma" },
    });

    await registrarHistorialTrabajador(
      input.documentoId,
      usuarioId,
      "DOCUMENTO_ENVIADO_FIRMA",
      "Documento enviado a firma. Link generado.",
    );
  }

  return {
    id: firma.id,
    token: firma.token,
    link: `/firma/${firma.token}`,
  };
}

export async function getFirmaPorToken(token: string): Promise<FirmaPublicaView | null> {
  const firma = await prisma.firmaDocumento.findUnique({
    where: { token },
    select: {
      id: true,
      token: true,
      estado: true,
      tituloDocumento: true,
      descripcion: true,
      nombreFirmante: true,
      rutFirmante: true,
      firmadoAt: true,
      expiresAt: true,
      trabajador: {
        select: {
          nombres: true,
          apellidos: true,
        },
      },
    },
  });

  if (!firma) return null;

  if (firma.estado === "pendiente" && firma.expiresAt && firma.expiresAt.getTime() < Date.now()) {
    await prisma.firmaDocumento.update({
      where: { id: firma.id },
      data: { estado: "expirado" },
    });

    return {
      id: firma.id,
      token: firma.token,
      estado: "expirado",
      tituloDocumento: firma.tituloDocumento,
      descripcion: firma.descripcion,
      nombreTrabajador: firma.trabajador ? `${firma.trabajador.nombres} ${firma.trabajador.apellidos}`.trim() : null,
      nombreFirmante: firma.nombreFirmante,
      rutFirmante: firma.rutFirmante,
      firmadoAt: firma.firmadoAt?.toISOString() ?? null,
      expiresAt: firma.expiresAt?.toISOString() ?? null,
    };
  }

  return {
    id: firma.id,
    token: firma.token,
    estado: firma.estado,
    tituloDocumento: firma.tituloDocumento,
    descripcion: firma.descripcion,
    nombreTrabajador: firma.trabajador ? `${firma.trabajador.nombres} ${firma.trabajador.apellidos}`.trim() : null,
    nombreFirmante: firma.nombreFirmante,
    rutFirmante: firma.rutFirmante,
    firmadoAt: firma.firmadoAt?.toISOString() ?? null,
    expiresAt: firma.expiresAt?.toISOString() ?? null,
  };
}

export async function completarFirmaDocumento(input: CompletarFirmaDocumentoInput) {
  if (!input.aceptoLectura) {
    throw new Error("Debe aceptar la lectura del documento para firmar");
  }

  const firma = await prisma.firmaDocumento.findUnique({
    where: { token: input.token },
    select: {
      id: true,
      token: true,
      estado: true,
      expiresAt: true,
      documentoId: true,
      documentoOrigen: true,
    },
  });

  if (!firma) throw new Error("Link de firma inválido");
  if (firma.estado !== "pendiente") throw new Error("La firma ya no está disponible");
  if (firma.expiresAt && firma.expiresAt.getTime() < Date.now()) {
    await prisma.firmaDocumento.update({ where: { id: firma.id }, data: { estado: "expirado" } });
    throw new Error("El link de firma expiró");
  }

  const requestHeaders = await headers();
  const userAgent = requestHeaders.get("user-agent");
  const forwardedFor = requestHeaders.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() ?? null;
  const firmadoAt = new Date();
  const hashDocumento = generarHashFirma({
    documentoId: firma.documentoId,
    token: firma.token,
    timestamp: firmadoAt.toISOString(),
    firmante: input.nombreFirmante,
    rut: input.rutFirmante,
  });

  await prisma.firmaDocumento.update({
    where: { id: firma.id },
    data: {
      estado: "firmado",
      nombreFirmante: input.nombreFirmante.trim(),
      rutFirmante: input.rutFirmante.trim(),
      aceptoLectura: true,
      firmaSvg: input.firmaSvg?.trim() || null,
      firmaTexto: input.firmaTexto?.trim() || null,
      ipFirma: ip,
      userAgentFirma: userAgent,
      hashDocumento,
      firmadoAt,
    },
  });

  if (firma.documentoOrigen === "documento_trabajador") {
    await prisma.trabajadorDocumento.update({
      where: { id: firma.documentoId },
      data: {
        estado: "firmado",
        firmado: true,
        firmadoPor: input.nombreFirmante.trim(),
        firmadoEn: firmadoAt,
      },
    });

    await registrarHistorialTrabajador(
      firma.documentoId,
      null,
      "DOCUMENTO_FIRMADO",
      `Documento firmado electrónicamente por ${input.nombreFirmante.trim()} RUT ${input.rutFirmante.trim()}.`,
    );
  }

  return { ok: true, firmadoAt: firmadoAt.toISOString() };
}

export async function expirarFirmaDocumento(id: string) {
  const { empresaId } = await requirePermission("canManageDocumentacion");

  const firma = await prisma.firmaDocumento.findFirst({
    where: { id, empresaId },
    select: { id: true },
  });

  if (!firma) {
    throw new Error("Firma no encontrada");
  }

  await prisma.firmaDocumento.update({
    where: { id },
    data: { estado: "expirado" },
  });

  return { ok: true };
}