"use server";

import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { generarHashFirma } from "@/lib/firmas/hash";
import { generarTokenFirma } from "@/lib/firmas/tokens";
import { requirePermission } from "@/server/auth/permissions";

type JsonObject = Record<string, unknown>;

function metadataAsObject(value: unknown): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return { ...(value as JsonObject) };
}

function toOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export type CrearFirmaDocumentoInput = {
  empresaId: string;
  trabajadorId?: string | null;
  usuarioPrevencionistaId?: string | null;
  documentoId: string;
  documentoOrigen: "documento_trabajador" | "documento_empresa" | "entrega_epp" | "capacitacion" | "induccion" | "acreditacion" | "otro";
  tipoFirmante?: "trabajador" | "prevencionista";
  tipoFirma?: "manual" | "automatica";
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
  documentoOrigen: "documento_trabajador" | "documento_empresa" | "entrega_epp" | "capacitacion" | "induccion" | "acreditacion" | "otro";
  estado: "pendiente" | "firmado" | "rechazado" | "expirado";
  tituloDocumento: string;
  descripcion: string | null;
  nombreTrabajador: string | null;
  rutTrabajador: string | null;
  nombreFirmante: string | null;
  rutFirmante: string | null;
  firmadoAt: string | null;
  expiresAt: string | null;
  contenidoMarkdown: string | null;
};

export type FirmaPrevencionistaPerfilInput = {
  nombre: string;
  rut: string;
  cargo?: string | null;
  imagenFirma?: string | null;
  trazoFirma?: string | null;
  activa?: boolean;
};

export type FirmaPrevencionistaPerfilView = {
  id: string;
  nombre: string;
  rut: string;
  cargo: string | null;
  imagenFirma: string | null;
  trazoFirma: string | null;
  activa: boolean;
  createdAt: string;
};

export type CrearFirmaDocumentoGeneradoTrabajadorInput = {
  documentoGeneradoId: string;
  trabajadorId: string;
  expiresAt?: Date | null;
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
      usuarioPrevencionistaId: input.usuarioPrevencionistaId ?? null,
      documentoId: input.documentoId,
      documentoOrigen: input.documentoOrigen,
      token,
      tipoFirmante: input.tipoFirmante ?? "trabajador",
      tipoFirma: input.tipoFirma ?? "manual",
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

export async function guardarFirmaPrevencionistaActiva(input: FirmaPrevencionistaPerfilInput): Promise<FirmaPrevencionistaPerfilView> {
  const { empresaId, usuarioId } = await requirePermission("canManageDocumentacion");

  const nombre = input.nombre.trim();
  const rut = input.rut.trim();

  if (!nombre) {
    throw new Error("El nombre de la firma es obligatorio.");
  }

  if (!rut) {
    throw new Error("El RUT de la firma es obligatorio.");
  }

  await prisma.firmaUsuarioPerfil.updateMany({
    where: { empresaId, usuarioId, activa: true },
    data: { activa: false },
  });

  const created = await prisma.firmaUsuarioPerfil.create({
    data: {
      empresaId,
      usuarioId,
      nombre,
      rut,
      cargo: input.cargo?.trim() || null,
      imagenFirma: input.imagenFirma?.trim() || null,
      trazoFirma: input.trazoFirma?.trim() || null,
      activa: input.activa ?? true,
    },
    select: {
      id: true,
      nombre: true,
      rut: true,
      cargo: true,
      imagenFirma: true,
      trazoFirma: true,
      activa: true,
      createdAt: true,
    },
  });

  return {
    id: created.id,
    nombre: created.nombre,
    rut: created.rut,
    cargo: created.cargo,
    imagenFirma: created.imagenFirma,
    trazoFirma: created.trazoFirma,
    activa: created.activa,
    createdAt: created.createdAt.toISOString(),
  };
}

export async function obtenerFirmaPrevencionistaActiva(): Promise<FirmaPrevencionistaPerfilView | null> {
  const { empresaId, usuarioId } = await requirePermission("canReadDocumentacion");

  const firma = await prisma.firmaUsuarioPerfil.findFirst({
    where: { empresaId, usuarioId, activa: true },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      nombre: true,
      rut: true,
      cargo: true,
      imagenFirma: true,
      trazoFirma: true,
      activa: true,
      createdAt: true,
    },
  });

  if (!firma) return null;

  return {
    id: firma.id,
    nombre: firma.nombre,
    rut: firma.rut,
    cargo: firma.cargo,
    imagenFirma: firma.imagenFirma,
    trazoFirma: firma.trazoFirma,
    activa: firma.activa,
    createdAt: firma.createdAt.toISOString(),
  };
}

export async function crearFirmaDocumentoGeneradoTrabajador(
  input: CrearFirmaDocumentoGeneradoTrabajadorInput,
): Promise<{ id: string; token: string; link: string }> {
  const { empresaId, usuarioId } = await requirePermission("canManageDocumentacion");

  const documento = await prisma.documentoGeneradoRegistro.findFirst({
    where: { id: input.documentoGeneradoId, empresaId },
    select: { id: true, nombre: true, metadata: true },
  });

  if (!documento) {
    throw new Error("Documento generado no encontrado para la empresa activa.");
  }

  const trabajador = await prisma.trabajador.findFirst({
    where: { id: input.trabajadorId, empresaId },
    select: { id: true, nombres: true, apellidos: true, rut: true },
  });

  if (!trabajador) {
    throw new Error("Trabajador no encontrado para la empresa activa.");
  }

  const token = generarTokenFirma();
  const firma = await prisma.firmaDocumento.create({
    data: {
      empresaId,
      trabajadorId: trabajador.id,
      documentoId: documento.id,
      documentoOrigen: "otro",
      token,
      tipoFirmante: "trabajador",
      tipoFirma: "manual",
      estado: "pendiente",
      tituloDocumento: documento.nombre,
      descripcion: "Firma de trabajador para documento generado",
      nombreFirmante: `${trabajador.nombres} ${trabajador.apellidos}`.trim(),
      rutFirmante: trabajador.rut?.trim() || null,
      expiresAt: input.expiresAt ?? null,
    },
    select: { id: true, token: true },
  });

  const metadata = metadataAsObject(documento.metadata);
  const historial = Array.isArray(metadata.historial) ? [...metadata.historial] : [];

  historial.push({
    fecha: new Date().toISOString(),
    evento: "documento_enviado_firma_trabajador",
    detalle: "Documento enviado a firma de trabajador",
    usuarioId,
  });

  await prisma.documentoGeneradoRegistro.update({
    where: { id: documento.id },
    data: {
      metadata: {
        ...metadata,
        historial,
        estadoFirmaTrabajador: "pendiente",
      },
    },
  });

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
      documentoId: true,
      documentoOrigen: true,
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
          rut: true,
        },
      },
    },
  });

  if (!firma) return null;

  let contenidoMarkdown: string | null = null;
  if (firma.documentoOrigen === "induccion") {
    const documentoInduccion = await prisma.documentoInduccionGenerado.findUnique({
      where: { id: firma.documentoId },
      select: { contenidoMarkdown: true },
    });
    contenidoMarkdown = documentoInduccion?.contenidoMarkdown ?? null;
  }

  if (firma.estado === "pendiente" && firma.expiresAt && firma.expiresAt.getTime() < Date.now()) {
    await prisma.firmaDocumento.update({
      where: { id: firma.id },
      data: { estado: "expirado" },
    });

    return {
      id: firma.id,
      token: firma.token,
      documentoOrigen: firma.documentoOrigen,
      estado: "expirado",
      tituloDocumento: firma.tituloDocumento,
      descripcion: firma.descripcion,
      nombreTrabajador: firma.trabajador ? `${firma.trabajador.nombres} ${firma.trabajador.apellidos}`.trim() : null,
      rutTrabajador: firma.trabajador?.rut?.trim() ?? null,
      nombreFirmante: firma.nombreFirmante,
      rutFirmante: firma.rutFirmante,
      firmadoAt: firma.firmadoAt?.toISOString() ?? null,
      expiresAt: firma.expiresAt?.toISOString() ?? null,
      contenidoMarkdown,
    };
  }

  return {
    id: firma.id,
    token: firma.token,
    documentoOrigen: firma.documentoOrigen,
    estado: firma.estado,
    tituloDocumento: firma.tituloDocumento,
    descripcion: firma.descripcion,
    nombreTrabajador: firma.trabajador ? `${firma.trabajador.nombres} ${firma.trabajador.apellidos}`.trim() : null,
    rutTrabajador: firma.trabajador?.rut?.trim() ?? null,
    nombreFirmante: firma.nombreFirmante,
    rutFirmante: firma.rutFirmante,
    firmadoAt: firma.firmadoAt?.toISOString() ?? null,
    expiresAt: firma.expiresAt?.toISOString() ?? null,
    contenidoMarkdown,
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
      empresaId: true,
      trabajadorId: true,
      tipoFirmante: true,
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
      tipoFirma: "manual",
      nombreFirmante: input.nombreFirmante.trim(),
      rutFirmante: input.rutFirmante.trim(),
      aceptoLectura: true,
      firmaSvg: input.firmaSvg?.trim() || null,
      firmaTexto: input.firmaTexto?.trim() || null,
      ipFirma: ip,
      userAgentFirma: userAgent,
      tokenTrazabilidad: hashDocumento,
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

  if (firma.documentoOrigen === "induccion") {
    await prisma.documentoInduccionGenerado.updateMany({
      where: { id: firma.documentoId },
      data: {
        estado: "firmado",
        firmadoPor: input.nombreFirmante.trim(),
        firmadoEn: firmadoAt,
      },
    });
  }

  if (firma.documentoOrigen === "otro" && (firma.tipoFirmante ?? "").toLowerCase() === "trabajador") {
    const registro = await prisma.documentoGeneradoRegistro.findFirst({
      where: { id: firma.documentoId, empresaId: firma.empresaId },
      select: { id: true, metadata: true },
    });

    if (!registro) {
      throw new Error("Documento generado no encontrado para esta firma.");
    }

    if (firma.trabajadorId) {
      const metadata = metadataAsObject(registro.metadata);
      const metadataTrabajadorId = toOptionalString(metadata.trabajadorId);
      if (metadataTrabajadorId && metadataTrabajadorId !== firma.trabajadorId) {
        throw new Error("El trabajador no corresponde al documento asociado.");
      }
    }

    const metadata = metadataAsObject(registro.metadata);
    const historial = Array.isArray(metadata.historial) ? [...metadata.historial] : [];
    const firmas = Array.isArray(metadata.firmas) ? [...metadata.firmas] : [];

    historial.push({
      fecha: firmadoAt.toISOString(),
      evento: "documento_firmado_trabajador",
      detalle: "Documento firmado por trabajador",
      usuarioId: null,
    });

    firmas.push({
      tipoFirmante: "trabajador",
      tipoFirma: "manual",
      trabajadorId: firma.trabajadorId ?? null,
      nombreFirmante: input.nombreFirmante.trim(),
      rutFirmante: input.rutFirmante.trim(),
      fechaHora: firmadoAt.toISOString(),
      ip: ip,
      userAgent,
      tokenTrazabilidad: hashDocumento,
      estado: "firmado",
    });

    await prisma.documentoGeneradoRegistro.update({
      where: { id: registro.id },
      data: {
        metadata: {
          ...metadata,
          historial,
          firmas,
          estado: "Firmado",
          estadoFirmaTrabajador: "firmado",
        },
      },
    });
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