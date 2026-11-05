"use server";

import {
  listarSolicitudesFirmaExterna,
  revocarSolicitudFirmaExterna,
  reenviarSolicitudFirmaExterna,
  completarSolicitudFirmaExterna,
  rechazarSolicitudFirmaExterna,
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
  firmaSvg?: string | null; firmaTexto?: string | null;
}) {
  return completarSolicitudFirmaExterna(input);
}

export async function rechazarFirmaExterna(token: string, motivo: string) {
  return rechazarSolicitudFirmaExterna(token, motivo);
}
