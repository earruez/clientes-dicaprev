import { jsPDF } from "jspdf";
import type { Worker } from "../types";
import type { DocTrabajadorView } from "./types";

export type ExportTrabajadorDocumentoPdfParams = {
  documento: DocTrabajadorView | null;
  trabajador: Worker;
  contenido: string;
  estado: string;
  firmadoPor?: string | null;
  firmadoEn?: string | Date | null;
  empresa?: string | null;
};

function safeText(value: string | number | Date | null | undefined) {
  if (value === null || value === undefined) return "-";
  const text = String(value).trim();
  return text.length > 0 ? text : "-";
}

function normalizeEstado(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function estadoLabel(estado: string) {
  const normalized = normalizeEstado(estado);

  if (normalized === "firmado") return "Firmado";
  if (normalized === "en_revision") return "En revision";
  if (normalized === "validado") return "Validado";
  if (normalized === "enviado_firma") return "Enviado a firma";
  if (normalized === "pendiente") return "Pendiente";
  if (normalized === "vencido") return "Vencido";
  return safeText(estado);
}

function formatDate(value: string | Date | null | undefined) {
  if (!value) return "-";

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return safeText(value);

  return date.toLocaleString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildFilename(tipoNombre: string, trabajador: Worker) {
  const rawName = `${tipoNombre}-${trabajador.nombre}-${trabajador.apellido}`.toLowerCase();
  const normalized = rawName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");

  return `nextprev-${normalized || "documento"}.pdf`;
}

export async function exportTrabajadorDocumentoPdf(params: ExportTrabajadorDocumentoPdfParams) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const marginX = 34;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - marginX * 2 - 24;
  const lineHeight = 14;
  let y = 36;

  const documento = params.documento;
  const tipoNombre = documento?.tipo.nombre ?? "Documento de trabajador";
  const estado = params.estado;
  const esFirmado = normalizeEstado(estado) === "firmado";

  function drawFooter(page: number) {
    doc.setDrawColor(226, 232, 240);
    doc.line(marginX, pageHeight - 24, pageWidth - marginX, pageHeight - 24);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("Generado por NextPrev", marginX, pageHeight - 10);
    doc.text(`Pagina ${page}`, pageWidth - marginX - 44, pageHeight - 10);
  }

  function addNewPage() {
    drawFooter(doc.getNumberOfPages());
    doc.addPage();
    y = 36;
  }

  function ensureSpace(required: number) {
    if (y + required > pageHeight - 34) addNewPage();
  }

  function sectionTitle(title: string) {
    ensureSpace(26);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text(title, marginX, y);
    y += 14;
    doc.setDrawColor(203, 213, 225);
    doc.line(marginX, y, pageWidth - marginX, y);
    y += 10;
  }

  function kvLine(label: string, value: string) {
    ensureSpace(16);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text(label, marginX, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    doc.text(value, marginX + 150, y);
    y += 14;
  }

  function drawChip(label: string, x: number, yTop: number, width: number, fill: [number, number, number], text: [number, number, number]) {
    doc.setFillColor(fill[0], fill[1], fill[2]);
    doc.roundedRect(x, yTop, width, 16, 8, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(text[0], text[1], text[2]);
    doc.text(label, x + 6, yTop + 10.5);
  }

  function drawWrappedText(text: string) {
    const paragraphs = text.split(/\r?\n/);
    paragraphs.forEach((paragraph, index) => {
      if (!paragraph.trim()) {
        ensureSpace(lineHeight);
        y += lineHeight;
        if (index < paragraphs.length - 1) y += 2;
        return;
      }

      const lines = doc.splitTextToSize(paragraph, contentWidth) as string[];
      lines.forEach((line) => {
        ensureSpace(lineHeight);
        doc.text(line, marginX + 12, y);
        y += lineHeight;
      });

      if (index < paragraphs.length - 1) {
        y += 2;
      }
    });
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42);
  doc.text(tipoNombre, marginX, y);
  y += 18;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text("Documento de trabajador generado desde Control Documental", marginX, y);
  y += 18;

  drawChip(estadoLabel(estado), pageWidth - marginX - 92, 34, 92, esFirmado ? [220, 252, 231] : [241, 245, 249], esFirmado ? [22, 101, 52] : [51, 65, 85]);

  if (esFirmado) {
    const sealX = pageWidth - marginX - 170;
    const sealY = 60;
    doc.setFillColor(220, 252, 231);
    doc.setDrawColor(134, 239, 172);
    doc.roundedRect(sealX, sealY, 170, 54, 10, 10, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(22, 101, 52);
    doc.text("DOCUMENTO FIRMADO", sealX + 12, sealY + 18);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Estado final registrado", sealX + 12, sealY + 32);
    y = Math.max(y, sealY + 68);
  } else {
    y += 8;
  }

  sectionTitle("Resumen");
  kvLine("Trabajador", `${params.trabajador.nombre} ${params.trabajador.apellido}`);
  kvLine("RUT", params.trabajador.rut);
  kvLine("Cargo", params.trabajador.cargo);
  kvLine("Area", params.trabajador.area);
  if (params.empresa) {
    kvLine("Empresa", params.empresa);
  }
  kvLine("Fecha generacion", formatDate(new Date()));
  kvLine("Estado", estadoLabel(estado));

  sectionTitle("Contenido editable");
  const contenido = params.contenido.trim();
  if (!contenido) {
    kvLine("Contenido", "No disponible");
  } else {
    drawWrappedText(contenido);
  }

  if (esFirmado) {
    sectionTitle("Firma");
    kvLine("Firmado por", safeText(params.firmadoPor));
    kvLine("Firmado en", formatDate(params.firmadoEn));
  }

  drawFooter(doc.getNumberOfPages());
  doc.save(buildFilename(tipoNombre, params.trabajador));
}