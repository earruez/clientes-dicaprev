import { NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/auth/permissions";
import { MODULO_FIRMAS_EXTERNAS } from "@/lib/firmas-externas";

export const runtime = "nodejs";

function fecha(valor: Date | null) {
  return valor ? valor.toLocaleString("es-CL", { timeZone: "America/Santiago", dateStyle: "long", timeStyle: "medium" }) : "-";
}

export async function GET(request: Request) {
  let empresaId: string;
  try {
    empresaId = (await requirePermission("canReadDocumentacion")).empresaId;
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const id = new URL(request.url).searchParams.get("id");
  if (!id || !/^[a-z0-9]{12,40}$/.test(id)) {
    return NextResponse.json({ error: "Documento inválido" }, { status: 400 });
  }
  const documento = await prisma.documentoGeneradoRegistro.findFirst({
    where: { id, empresaId, modulo: MODULO_FIRMAS_EXTERNAS },
    select: { nombre: true, archivoNombreOriginal: true, metadata: true, createdAt: true },
  });
  if (!documento) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  const firma = await prisma.firmaDocumento.findFirst({
    where: { empresaId, documentoId: id, documentoOrigen: "otro", tipoFirmante: "externo", estado: "firmado" },
    select: {
      nombreFirmante: true, rutFirmante: true, emailFirmante: true, firmadoAt: true,
      aceptoLectura: true, firmaSvg: true, firmaTexto: true, hashDocumento: true,
      tokenTrazabilidad: true, ipFirma: true, userAgentFirma: true, createdAt: true,
    },
  });
  if (!firma) return NextResponse.json({ error: "Este documento aún no ha sido firmado" }, { status: 409 });
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  pdf.setFillColor(8, 47, 73);
  pdf.rect(0, 0, 210, 40, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(21);
  pdf.text("NextPrev", 18, 21);
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(11);
  pdf.text("Constancia de firma electronica simple", 18, 30);
  pdf.setTextColor(15, 23, 42);
  let y = 53;
  function linea(etiqueta: string, valor: string) {
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(10);
    pdf.text(etiqueta, 18, y);
    y += 6;
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(10);
    const partes = pdf.splitTextToSize(valor || "-", 174);
    pdf.text(partes, 18, y);
    y += Math.max(8, partes.length * 5 + 4);
  }
  linea("Documento original", documento.nombre);
  linea("Nombre de archivo", documento.archivoNombreOriginal || "-");
  linea("Firmante", (firma.nombreFirmante || "-") + " | RUT: " + (firma.rutFirmante || "-"));
  linea("Correo del firmante", firma.emailFirmante || "-");
  linea("Solicitud creada", fecha(firma.createdAt));
  linea("Fecha y hora de firma (Chile)", fecha(firma.firmadoAt));
  linea("Consentimiento", firma.aceptoLectura ? "Lectura y aceptacion expresamente confirmadas" : "No registrado");
  if (firma.firmaSvg?.startsWith("data:image/png;base64,")) {
    try {
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(10);
      pdf.text("Trazo registrado", 18, y);
      y += 3;
      pdf.addImage(firma.firmaSvg, "PNG", 18, y, 75, 22);
      y += 30;
    } catch {
      linea("Firma ingresada", firma.firmaTexto || "Firma electronica simple");
    }
  } else {
    linea("Firma ingresada", firma.firmaTexto || "Firma electronica simple");
  }
  if (y > 215) { pdf.addPage(); y = 25; }
  linea("SHA-256 del PDF original", firma.hashDocumento || "-");
  linea("Hash de evidencia de firma", firma.tokenTrazabilidad || "-");
  linea("IP registrada", firma.ipFirma || "No disponible");
  linea("Agente del dispositivo", firma.userAgentFirma || "No disponible");
  if (y > 245) { pdf.addPage(); y = 25; }
  pdf.setDrawColor(203, 213, 225); pdf.line(18, y + 2, 192, y + 2);
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor(71, 85, 105);
  const nota = "Esta constancia acredita un proceso de firma electronica simple y se vincula al PDF original mediante su huella SHA-256. El archivo original no se modifica. No es una firma electronica avanzada ni un sello de tiempo acreditado.";
  pdf.text(pdf.splitTextToSize(nota, 174), 18, y + 10);
  pdf.setFontSize(8);
  pdf.text("Generado por NextPrev | Evidencia documental | Uso interno", 18, 286);
  const contenido = pdf.output("arraybuffer");
  return new Response(contenido, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=\"constancia-firma-nextprev.pdf\"",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
