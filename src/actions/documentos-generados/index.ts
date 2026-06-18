"use server";

import { prisma } from "@/lib/prisma";
import { requireEmpresaAccess } from "@/server/auth/permissions";
import { generarHashFirma } from "@/lib/firmas/hash";
import { generarTokenFirma } from "@/lib/firmas/tokens";
import type { Prisma } from "@prisma/client";
import {
  construirRegistroDocumentoGenerado,
  type DocumentoGeneradoInput,
} from "@/lib/documentacion/registro-documento-generado";

function metadataAsObject(metadata: Prisma.InputJsonValue | undefined): Record<string, unknown> {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return {};
  return { ...(metadata as Record<string, unknown>) };
}

export async function registrarDocumentoGenerado(input: DocumentoGeneradoInput): Promise<{ id: string }> {
  const context = await requireEmpresaAccess(input.empresaId);
  const registro = construirRegistroDocumentoGenerado({
    ...input,
    empresaId: context.empresaId,
    usuarioId: context.usuarioId,
  });

  const created = await prisma.documentoGeneradoRegistro.create({
    data: registro,
    select: { id: true },
  });

  const firmaPrevencionista = await prisma.firmaUsuarioPerfil.findFirst({
    where: {
      empresaId: context.empresaId,
      usuarioId: context.usuarioId,
      activa: true,
    },
    select: {
      id: true,
      nombre: true,
      rut: true,
      cargo: true,
      imagenFirma: true,
      trazoFirma: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  if (!firmaPrevencionista) {
    return created;
  }

  const firmadoAt = new Date();
  const token = generarTokenFirma();
  const tokenTrazabilidad = generarHashFirma({
    documentoId: created.id,
    token,
    timestamp: firmadoAt.toISOString(),
    firmante: firmaPrevencionista.nombre,
    rut: firmaPrevencionista.rut,
  });

  await prisma.firmaDocumento.create({
    data: {
      empresaId: context.empresaId,
      usuarioPrevencionistaId: context.usuarioId,
      documentoId: created.id,
      documentoOrigen: "otro",
      token,
      tipoFirmante: "prevencionista",
      tipoFirma: "automatica",
      estado: "firmado",
      tituloDocumento: registro.nombre,
      descripcion: "Firma del prevencionista aplicada automáticamente",
      nombreFirmante: firmaPrevencionista.nombre,
      rutFirmante: firmaPrevencionista.rut,
      firmaSvg: firmaPrevencionista.trazoFirma?.trim() || firmaPrevencionista.imagenFirma?.trim() || null,
      firmaTexto: firmaPrevencionista.nombre,
      aceptoLectura: true,
      tokenTrazabilidad,
      hashDocumento: tokenTrazabilidad,
      firmadoAt,
    },
  });

  const metadata = metadataAsObject(registro.metadata);
  const historial = Array.isArray(metadata.historial) ? [...metadata.historial] : [];
  const firmas = Array.isArray(metadata.firmas) ? [...metadata.firmas] : [];

  historial.push({
    fecha: firmadoAt.toISOString(),
    evento: "firma_prevencionista_automatica",
    detalle: "Firma del prevencionista aplicada automáticamente",
    usuarioId: context.usuarioId,
  });

  firmas.push({
    tipoFirmante: "prevencionista",
    tipoFirma: "automatica",
    nombreFirmante: firmaPrevencionista.nombre,
    rutFirmante: firmaPrevencionista.rut,
    cargoFirmante: firmaPrevencionista.cargo ?? null,
    fechaHora: firmadoAt.toISOString(),
    tokenTrazabilidad,
    estado: "firmado",
  });

  await prisma.documentoGeneradoRegistro.update({
    where: { id: created.id },
    data: {
      metadata: {
        ...metadata,
        historial,
        firmas,
      },
    },
  });

  return created;
}
