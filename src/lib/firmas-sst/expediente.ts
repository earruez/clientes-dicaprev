import JSZip from "jszip";
import { prisma } from "@/lib/prisma";
import { descargarArchivoContratista } from "@/lib/contratistas/archivos";
import { crearConstanciaFirmaSst } from "@/lib/firmas-sst/constancia";
import { MODULO_FIRMAS_EXTERNAS, sha256 } from "@/lib/firmas-externas";
import { origenNextPrev } from "@/lib/contratistas/portal";

export async function documentoSstVerificado(empresaId: string, documentoId: string) {
  const documento = await prisma.documentoGeneradoRegistro.findFirst({
    where: { id: documentoId, empresaId, modulo: MODULO_FIRMAS_EXTERNAS },
    select: {
      id: true, nombre: true, archivoNombre: true, archivoNombreOriginal: true, metadata: true,
      empresa: { select: { nombre: true, rut: true } },
    },
  });
  if (!documento?.archivoNombre) throw new Error("Documento SST inexistente.");
  const metadata = documento.metadata && typeof documento.metadata === "object" && !Array.isArray(documento.metadata)
    ? documento.metadata as Record<string, unknown> : {};
  const respuesta = await descargarArchivoContratista(empresaId, documento.archivoNombre);
  if (!respuesta.ok) throw new Error("El original privado no está disponible.");
  const original = Buffer.from(await respuesta.arrayBuffer());
  const huella = sha256(original);
  if (huella !== metadata.sha256Original) throw new Error("La integridad del PDF original ha fallado.");
  const firma = await prisma.firmaDocumento.findFirst({
    where: { empresaId, documentoId, tipoFirmante: "externo", documentoOrigen: "otro" },
    select: {
      estado: true, nombreFirmante: true, rutFirmante: true, emailFirmante: true, firmadoAt: true,
      createdAt: true, firmaSvg: true, firmaTexto: true, aceptoLectura: true,
      hashDocumento: true, tokenTrazabilidad: true, ipFirma: true, userAgentFirma: true,
      correoValidadoAt: true,
    },
  });
  return { documento, metadata, original, huella, firma };
}

export async function expedienteFirmadoSst(empresaId: string, documentoId: string) {
  const d = await documentoSstVerificado(empresaId, documentoId);
  const f = d.firma;
  if (!f || f.estado !== "firmado" || !f.firmadoAt || !f.aceptoLectura ||
      d.huella !== f.hashDocumento || !f.tokenTrazabilidad) {
    throw new Error("Este documento no tiene evidencia de firma válida para exportar.");
  }
  const constancia = crearConstanciaFirmaSst({
    empresa: d.documento.empresa.nombre,
    rutEmpresa: d.documento.empresa.rut || "-",
    titulo: d.documento.nombre,
    archivoOriginal: d.documento.archivoNombreOriginal || d.documento.nombre + ".pdf",
    tipoEvidencia: String(d.metadata.tipoEvidencia || "otra"),
    modalidadContrato: String(d.metadata.modalidadContrato || "-"),
    fechaInicioContrato: String(d.metadata.fechaInicioContrato || "-"),
    fechaTerminoContrato: String(d.metadata.fechaTerminoContrato || "-"),
    actividadPresencial: d.metadata.actividadPresencial ? JSON.stringify(d.metadata.actividadPresencial) : undefined,
    nombreFirmante: f.nombreFirmante || "-",
    rutFirmante: f.rutFirmante || "-",
    correoParticular: f.emailFirmante || "-",
    solicitadoAt: f.createdAt, firmadoAt: f.firmadoAt, correoValidadoAt: f.correoValidadoAt,
    firmaImagen: f.firmaSvg, firmaTexto: f.firmaTexto,
    hashDocumento: f.hashDocumento || "", hashEvidencia: f.tokenTrazabilidad,
    ip: f.ipFirma, userAgent: f.userAgentFirma,
    verificacionUrl: origenNextPrev() + "/verificar-firma/" + f.tokenTrazabilidad,
  });
  const manifest = {
    sistema: "NextPrev", tipo: "expediente_firma_sst_v1",
    titulo: d.documento.nombre,
    empleador: d.documento.empresa.nombre, rutEmpleador: d.documento.empresa.rut,
    documentoId, tipoEvidencia: d.metadata.tipoEvidencia,
    actividadPresencialDeclarada: d.metadata.actividadPresencial || null,
    trabajador: f.nombreFirmante, rutTrabajador: f.rutFirmante,
    firmadoAt: f.firmadoAt.toISOString(), correoParticularValidadoAt: f.correoValidadoAt?.toISOString() || null,
    sha256Original: d.huella, sha256Constancia: sha256(constancia),
    sha256Evidencia: f.tokenTrazabilidad,
    urlVerificacion: origenNextPrev() + "/verificar-firma/" + f.tokenTrazabilidad,
    nota: "Firma electronica simple; la evidencia no certifica por si sola una actividad practica.",
  };
  return { ...d, constancia, manifest };
}

export async function zipExpedienteFirmadoSst(empresaId: string, documentoId: string) {
  const d = await expedienteFirmadoSst(empresaId, documentoId);
  const zip = new JSZip();
  zip.file("01_documento_original.pdf", d.original);
  zip.file("02_constancia_firma_nextprev.pdf", d.constancia);
  zip.file("03_manifest_integridad.json", JSON.stringify(d.manifest, null, 2));
  const bytes = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  return bytes;
}
