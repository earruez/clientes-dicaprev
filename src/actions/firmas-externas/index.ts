"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/auth/permissions";
import {
  listarSolicitudesFirmaExterna,
  revocarSolicitudFirmaExterna,
  reenviarSolicitudFirmaExterna,
  completarSolicitudFirmaExterna,
  rechazarSolicitudFirmaExterna,
  reenviarCopiaFirmadaTrabajadorTemporal,
} from "@/lib/firmas-externas";

export async function listarFirmasExternas() {
  return listarSolicitudesFirmaExterna();
}

export async function revocarFirmaExterna(documentoId: string) {
  return revocarSolicitudFirmaExterna(documentoId);
}

export async function reenviarFirmaExterna(documentoId: string) {
  return reenviarSolicitudFirmaExterna(documentoId);
}

export async function completarFirmaExterna(input: {
  token: string; nombreFirmante: string; rutFirmante: string; aceptoLectura: boolean;
  firmaSvg?: string | null; firmaTexto?: string | null; aceptoEnvioElectronico: boolean;
}) {
  return completarSolicitudFirmaExterna(input);
}

export async function rechazarFirmaExterna(token: string, motivo: string) {
  return rechazarSolicitudFirmaExterna(token, motivo);
}

/** Selección de trabajadores de la empresa, sin usar el módulo de contratistas. */
export async function listarTrabajadoresFirmaTemporal() {
  const { empresaId } = await requirePermission("canReadDocumentacion");
  const trabajadores = await prisma.trabajador.findMany({
    where: { empresaId, estado: { in: ["activo", "Activo"] } },
    orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
    select: {
      id: true, nombres: true, apellidos: true, rut: true, email: true,
      tipoContrato: true, centroTrabajo: { select: { nombre: true } },
    },
    take: 500,
  });
  return trabajadores.map((t) => ({
    id: t.id,
    nombre: [t.nombres, t.apellidos].filter(Boolean).join(" "),
    rut: t.rut || "",
    email: t.email || "",
    tipoContrato: t.tipoContrato || "",
    centroTrabajo: t.centroTrabajo?.nombre || "",
  }));
}

export async function reenviarCopiaFirmadaTemporal(documentoId: string) {
  return reenviarCopiaFirmadaTrabajadorTemporal(documentoId);
}
