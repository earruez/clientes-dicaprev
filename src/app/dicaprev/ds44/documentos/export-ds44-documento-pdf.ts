import { jsPDF } from "jspdf";
import type { Ds44DocumentoPdfSnapshot } from "./types";

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

function parseSections(snapshot: Ds44DocumentoPdfSnapshot): Array<{ title: string; body: string }> {
  let contenido = snapshot.contenidoTexto.trim();
  for (const prefix of [snapshot.empresaNombre, snapshot.plantillaNombre]) {
    if (prefix && contenido.startsWith(`${prefix}\n`)) contenido = contenido.slice(prefix.length + 1).trimStart();
  }
  const blocks = contenido.split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean);
  return blocks.flatMap((block) => {
    if (block === "Generado por NextPrev") return [];
    const lines = block.split("\n");
    const first = lines[0]?.trim() ?? "";
    if (first.endsWith(":")) return [{ title: first.slice(0, -1), body: lines.slice(1).join("\n").trim() || "-" }];
    return [{ title: "Contenido", body: block }];
  });
}

export async function exportDs44DocumentoPdf(snapshot: Ds44DocumentoPdfSnapshot): Promise<Blob> {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 48;
  const contentWidth = pageWidth - marginX * 2;
  const footerY = pageHeight - 28;
  let y = 48;

  function drawHeader(): void {
    doc.setFillColor(22, 50, 79);
    doc.rect(0, 0, pageWidth, 32, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text("NEXTPREV | DOCUMENTO DS44", marginX, 21);
  }

  function drawFooter(page: number): void {
    doc.setDrawColor(203, 213, 225);
    doc.line(marginX, footerY - 12, pageWidth - marginX, footerY - 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("Generado por NextPrev | Documento DS44 | Uso interno SST", marginX, footerY);
    doc.text(`Pagina ${page}`, pageWidth - marginX - 38, footerY);
  }

  function newPage(): void {
    drawFooter(doc.getNumberOfPages());
    doc.addPage("a4", "portrait");
    doc.setPage(doc.getNumberOfPages());
    drawHeader();
    y = 56;
  }

  function ensureSpace(required: number): void {
    if (y + required > footerY - 20) newPage();
  }

  function paragraph(text: string, options?: { bold?: boolean; size?: number; color?: [number, number, number] }): void {
    const size = options?.size ?? 10;
    doc.setFont("helvetica", options?.bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(...(options?.color ?? [30, 41, 59]));
    const lines = doc.splitTextToSize(text || "-", contentWidth) as string[];
    const lineHeight = size * 1.45;
    lines.forEach((line) => {
      ensureSpace(lineHeight + 2);
      doc.setFont("helvetica", options?.bold ? "bold" : "normal");
      doc.setFontSize(size);
      doc.setTextColor(...(options?.color ?? [30, 41, 59]));
      doc.text(line, marginX, y);
      y += lineHeight;
    });
  }

  drawHeader();
  y = 60;
  paragraph(snapshot.plantillaNombre, { bold: true, size: 18, color: [15, 23, 42] });
  y += 5;
  paragraph(snapshot.empresaNombre || "Empresa", { bold: true, size: 11, color: [61, 90, 115] });
  paragraph(`Tipo de plantilla: ${snapshot.plantillaCodigo}`, { size: 9, color: [71, 85, 105] });
  paragraph(`Fecha de generacion: ${formatDate(snapshot.generadoEn)}`, { size: 9, color: [71, 85, 105] });
  y += 12;

  for (const section of parseSections(snapshot)) {
    ensureSpace(46);
    doc.setFillColor(241, 245, 249);
    doc.rect(marginX, y - 13, contentWidth, 22, "F");
    paragraph(section.title, { bold: true, size: 11, color: [22, 50, 79] });
    y += 4;
    paragraph(section.body);
    y += 12;
  }

  ensureSpace(112);
  y += 4;
  doc.setDrawColor(193, 137, 62);
  doc.setLineWidth(1.2);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 20;
  paragraph("Trazabilidad documental", { bold: true, size: 12, color: [22, 50, 79] });
  paragraph(`Codigo plantilla: ${snapshot.plantillaCodigo}`, { size: 9 });
  paragraph(`Fecha generacion: ${formatDate(snapshot.generadoEn)}`, { size: 9 });
  paragraph("Fuente: DS44", { size: 9 });
  paragraph("Sistema: NextPrev", { size: 9 });
  if (snapshot.usuarioNombre) paragraph(`Generado por: ${snapshot.usuarioNombre}`, { size: 9 });

  drawFooter(doc.getNumberOfPages());
  return doc.output("blob");
}
