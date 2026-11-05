"use server";

import {
  otorgarAccesoFiscalizacion, listarAccesosFiscalizacion, modificarAccesoFiscalizacion,
  solicitarCodigoFiscalizacion, validarCodigoFiscalizacion,
  obtenerExpedienteFiscalizacion, auditarDocumentoFiscalizacion, cerrarSesionFiscalizacion,
} from "@/lib/firmas-sst/fiscalizacion";

export async function registrarInspectorSst(input: { empresaId: string; inspectorEmail: string; inspectorNombre: string; inspectorRut: string; identidadVerificada: boolean }) {
  return otorgarAccesoFiscalizacion(input);
}
export async function obtenerInspectoresSst() { return listarAccesosFiscalizacion(); }
export async function cambiarAccesoInspectorSst(id: string, activo: boolean) { return modificarAccesoFiscalizacion(id, activo); }
export async function solicitarAccesoDtSst(rut: string, email: string) { return solicitarCodigoFiscalizacion(rut, email); }
export async function validarAccesoDtSst(rut: string, email: string, codigo: string) { return validarCodigoFiscalizacion(rut, email, codigo); }
export async function consultarExpedienteDtSst(skip: number) { return obtenerExpedienteFiscalizacion({ skip }); }
export async function ratificarDocumentoDtSst(documentoId: string, confirmo: boolean) {
  if (confirmo !== true) throw new Error("Debes confirmar expresamente la ratificación.");
  return auditarDocumentoFiscalizacion(documentoId, "ratificacion");
}
export async function salirFiscalizacionDtSst() { return cerrarSesionFiscalizacion(); }
