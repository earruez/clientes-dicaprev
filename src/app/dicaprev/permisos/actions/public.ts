"use server";

import { prisma } from "@/lib/prisma";
import { PERMISO_ESTADOS, PermisoEstado } from "../types";

/**
 * Acciones públicas (sin sesión) para que el organismo/responsable pueda
 * responder una observación a través del link enviado por correo.
 * La única credencial es el token de un solo uso.
 */

export async function obtenerPermisoParaResponder(token: string) {
  if (!token || token.length < 32) {
    return null;
  }

  const permiso = await prisma.permisoInstalacion.findFirst({
    where: { tokenRespuestaObservacion: token, tokenRespuestaUsado: false, estado: "OBSERVADO" },
    include: {
      organismo: true,
      historial: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  if (!permiso) {
    return null;
  }

  const ultimaObservacion = permiso.historial.find((h) => h.estadoNuevo === "OBSERVADO")?.comentario || null;

  return {
    direccion: permiso.direccion,
    fechaInstalacion: permiso.fechaInstalacion,
    organismoNombre: permiso.organismo.nombre,
    estadoLabel: PERMISO_ESTADOS[permiso.estado as PermisoEstado] || permiso.estado,
    ultimaObservacion,
  };
}

export async function responderObservacion(token: string, respuesta: string) {
  if (!token || token.length < 32) {
    throw new Error("Enlace inválido o expirado");
  }

  if (!respuesta?.trim()) {
    throw new Error("Escribe tu respuesta antes de enviar");
  }

  const permiso = await prisma.permisoInstalacion.findFirst({
    where: { tokenRespuestaObservacion: token, tokenRespuestaUsado: false, estado: "OBSERVADO" },
  });

  if (!permiso) {
    throw new Error("Enlace inválido o expirado");
  }

  await prisma.permisoInstalacion.update({
    where: { id: permiso.id },
    data: {
      estado: "SOLICITADO",
      tokenRespuestaUsado: true,
      updatedAt: new Date(),
    },
  });

  await prisma.permisoHistorial.create({
    data: {
      permisoId: permiso.id,
      estadoAnterior: "OBSERVADO",
      estadoNuevo: "SOLICITADO",
      comentario: respuesta.trim(),
      usuarioId: "ORGANISMO_EXTERNO",
    },
  });

  return { ok: true };
}
