import { jsPDF } from "jspdf";
import type { Worker } from "../types";
import type { DocTrabajadorView } from "./types";
import {
  parseDocumentoEstructurado,
  type DocumentoEppEstructurado,
  type DocumentoIrlEstructurado,
  type DocumentoIrlCampos,
  type IrlMaquinaFila,
} from "@/lib/documentacion/documento-estructurado";

type EmpresaPdfMeta = {
  nombre: string;
  razonSocial: string | null;
  rut: string | null;
  direccion: string | null;
  logoUrl: string | null;
};

export type ExportTrabajadorDocumentoPdfParams = {
  documento: DocTrabajadorView | null;
  trabajador: Worker;
  contenido: string;
  estado: string;
  firmadoPor?: string | null;
  firmadoEn?: string | Date | null;
  firmas?: {
    prevencionista: {
      nombreFirmante: string | null;
      rutFirmante: string | null;
      fechaHora: string | null;
      tokenTrazabilidad: string | null;
      estado: "firmado" | "pendiente" | "enviado_firma" | "expirado" | "rechazado";
    } | null;
    trabajador: {
      nombreFirmante: string | null;
      rutFirmante: string | null;
      fechaHora: string | null;
      tokenTrazabilidad: string | null;
      estado: "firmado" | "pendiente" | "enviado_firma" | "expirado" | "rechazado";
    } | null;
  };
  empresa?: EmpresaPdfMeta | null;
};

type Layout = {
  margin: number;
  width: number;
  pageHeight: number;
  y: number;
};

function safeText(value: unknown) {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : "-";
}

function normalizeText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function estadoLabel(estado: string) {
  const normalized = normalizeText(estado);
  if (normalized === "firmado") return "Firmado";
  if (normalized === "en_revision") return "En revisión";
  if (normalized === "validado") return "Validado";
  if (normalized === "enviado_firma") return "Enviado a firma";
  if (normalized === "pendiente") return "Pendiente";
  if (normalized === "vencido") return "Vencido";
  return safeText(estado);
}

function formatDate(value: string | Date | null | undefined) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

function buildFilename(tipoNombre: string, trabajador: Worker) {
  const raw = `${tipoNombre}-${trabajador.nombre}-${trabajador.apellido}`.toLowerCase();
  const normalized = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
  return `nextprev-${normalized || "documento"}.pdf`;
}

function detectTemplate(documento: DocTrabajadorView | null, tipoNombre: string): "epp" | "irl" | "induccion" | "generic" {
  if (documento?.origen === "induccion") return "induccion";

  const normalized = normalizeText(tipoNombre);
  if (normalized.includes("induccion") || (normalized.includes("capacitacion") && normalized.includes("inicial"))) return "induccion";
  if (normalized.includes("epp") || normalized.includes("entrega")) return "epp";
  if (normalized.includes("irl") || normalized.includes("riesgo")) return "irl";
  return "generic";
}

type MarkdownSection = {
  title: string;
  bodyLines: string[];
};

function parseMarkdownSections(content: string): MarkdownSection[] {
  const lines = content.split(/\r?\n/);
  const sections: MarkdownSection[] = [];
  let current: MarkdownSection | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    const headerMatch = trimmed.match(/^#{1,6}\s+(.+)$/);
    if (headerMatch) {
      current = { title: headerMatch[1], bodyLines: [] };
      sections.push(current);
      continue;
    }

    if (!current) continue;
    if (trimmed === "" && current.bodyLines.length === 0) continue;
    current.bodyLines.push(line);
  }

  return sections;
}

function drawMarkdownSection(doc: jsPDF, layout: Layout, section: MarkdownSection) {
  ensurePage(doc, layout, 36);
  drawFormTableHeader(doc, layout, section.title.toUpperCase(), 18);
  const body = section.bodyLines.join("\n").trim() || "Sin contenido";
  drawParagraph(doc, layout, body, Math.max(28, Math.min(120, 16 + section.bodyLines.length * 10)));
}

function renderMarkdownLikeIrlPdf(
  doc: jsPDF,
  params: ExportTrabajadorDocumentoPdfParams,
  tipoNombre: string,
  options?: {
    headerTitle?: string;
    headerSubtitle?: string;
    footerPrefix?: string;
  },
) {
  const contenidoMarkdown = (params.documento?.contenidoMarkdown ?? params.contenido ?? "").trim();
  const headerTitle = options?.headerTitle ?? "REGISTRO DE CAPACITACION INICIAL";
  const headerSubtitle = options?.headerSubtitle ?? "NEXTPREV TEMPLATE-INDUCCION";
  const footerPrefix = options?.footerPrefix ?? "Estado documental";
  const pageWidth = doc.internal.pageSize.getWidth();
  const layout: Layout = {
    margin: 28,
    width: pageWidth - 56,
    pageHeight: doc.internal.pageSize.getHeight(),
    y: 20,
  };

  drawHeader(doc, layout, headerTitle, headerSubtitle);
  drawLabelValue(doc, layout, "Trabajador", safeText(`${params.trabajador.nombre} ${params.trabajador.apellido}`));
  drawLabelValue(doc, layout, "RUN", safeText(params.trabajador.rut));
  drawLabelValue(doc, layout, "Cargo", safeText(params.trabajador.cargo));
  drawLabelValue(doc, layout, "Area", safeText(params.trabajador.area));
  drawLabelValue(doc, layout, "Estado", estadoLabel(params.estado));

  const sections = parseMarkdownSections(contenidoMarkdown).filter(
    (section) => section.title.toLowerCase() !== "identificacion del trabajador",
  );

  if (sections.length === 0) {
    drawParagraph(doc, layout, contenidoMarkdown || "Sin contenido", 120);
  } else {
    sections.forEach((section) => {
      drawMarkdownSection(doc, layout, section);
    });
  }

  const sigH = 72;
  ensurePage(doc, layout, sigH);
  const sigW = layout.width / 2;
  doc.rect(layout.margin, layout.y, sigW, sigH);
  doc.rect(layout.margin + sigW, layout.y, sigW, sigH);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(`Firma trabajador\n${safeText(params.firmadoPor ?? params.trabajador.nombre)}`, layout.margin + 6, layout.y + 14);
  doc.text(`Responsable SST\n${safeText(params.empresa?.nombre ?? params.empresa?.razonSocial ?? "Empresa")}`, layout.margin + sigW + 6, layout.y + 14);

  drawBloqueFirmasDocumentoTrabajador(doc, layout, params);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`${footerPrefix}: ${estadoLabel(params.estado)} | Documento: ${tipoNombre}`, layout.margin, layout.pageHeight - 14);
}

function wrap(doc: jsPDF, text: string, width: number) {
  return doc.splitTextToSize(safeText(text), Math.max(width, 16)) as string[];
}

function ensurePage(doc: jsPDF, layout: Layout, requiredHeight: number) {
  const bottom = layout.pageHeight - layout.margin;
  if (layout.y + requiredHeight <= bottom) return;
  doc.addPage();
  layout.y = layout.margin;
}

function drawHeader(doc: jsPDF, layout: Layout, title: string, subtitle: string) {
  ensurePage(doc, layout, 48);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.rect(layout.margin, layout.y, layout.width, 20);
  doc.text(title, layout.margin + 6, layout.y + 14);
  layout.y += 20;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.rect(layout.margin, layout.y, layout.width, 18);
  doc.text(subtitle, layout.margin + 6, layout.y + 12);
  layout.y += 22;
}

function drawLabelValue(doc: jsPDF, layout: Layout, label: string, value: string) {
  const lines = wrap(doc, value, layout.width - 130);
  const h = Math.max(20, 8 + lines.length * 10);
  ensurePage(doc, layout, h);
  doc.rect(layout.margin, layout.y, 120, h);
  doc.rect(layout.margin + 120, layout.y, layout.width - 120, h);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(label, layout.margin + 6, layout.y + 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  lines.forEach((line, i) => {
    doc.text(line, layout.margin + 126, layout.y + 12 + i * 10);
  });
  layout.y += h;
}

function drawParagraph(doc: jsPDF, layout: Layout, text: string, minHeight = 24) {
  const lines = wrap(doc, text, layout.width - 12);
  const h = Math.max(minHeight, 10 + lines.length * 10);
  ensurePage(doc, layout, h);
  doc.rect(layout.margin, layout.y, layout.width, h);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  lines.forEach((line, i) => {
    doc.text(line, layout.margin + 6, layout.y + 12 + i * 10);
  });
  layout.y += h;
}

function drawIrlHeaderCorporativo(
  doc: jsPDF,
  layout: Layout,
  params: ExportTrabajadorDocumentoPdfParams,
  codigoDocumento?: string | null,
  version?: string | null,
  fecha?: string | null,
) {
  const headerH = 48;
  ensurePage(doc, layout, headerH);

  const logoColW = layout.width * 0.18;
  const midColW = layout.width * 0.52;
  const rightColW = layout.width * 0.30;

  doc.rect(layout.margin, layout.y, logoColW, headerH);
  if (params.empresa?.logoUrl) {
    try {
      doc.addImage(params.empresa.logoUrl, "PNG", layout.margin + 4, layout.y + 4, logoColW - 8, headerH - 8);
    } catch {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text("[LOGO]", layout.margin + logoColW / 2, layout.y + headerH / 2, { align: "center" });
      doc.setTextColor(0, 0, 0);
    }
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("[LOGO\nCLIENTE]", layout.margin + logoColW / 2, layout.y + 18, { align: "center" });
    doc.setTextColor(0, 0, 0);
  }

  const midX = layout.margin + logoColW;
  doc.rect(midX, layout.y, midColW, headerH / 2);
  doc.rect(midX, layout.y + headerH / 2, midColW, headerH / 2);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("EMPRESA", midX + 4, layout.y + 9);
  doc.setFont("helvetica", "normal");
  doc.text(safeText(params.empresa?.razonSocial ?? params.empresa?.nombre), midX + 68, layout.y + 9);

  doc.setFont("helvetica", "bold");
  doc.text("DOCUMENTO", midX + 4, layout.y + headerH / 2 + 9);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text("ACTA DE INFORMACIÓN\nSOBRE LOS RIESGOS\nLABORALES", midX + 68, layout.y + headerH / 2 + 7);

  const rightX = layout.margin + logoColW + midColW;
  doc.rect(rightX, layout.y, rightColW, headerH / 2);
  doc.rect(rightX, layout.y + headerH / 2, rightColW, headerH / 2);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text(safeText(codigoDocumento || "REG-IRL-03"), rightX + 4, layout.y + 9);
  doc.text(`VER: ${safeText(version || "01")}`, rightX + 4, layout.y + 17);
  doc.text(`Fecha: ${safeText(fecha || formatDate(new Date()))}`, rightX + 4, layout.y + headerH / 2 + 9);
  doc.setFont("helvetica", "normal");
  doc.text("Página: 1", rightX + 4, layout.y + headerH / 2 + 17);

  layout.y += headerH + 8;

  const titleBarH = 32;
  ensurePage(doc, layout, titleBarH);
  doc.setFillColor(26, 82, 118);
  doc.rect(layout.margin, layout.y, layout.width, titleBarH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text("INFORME DE RIESGOS LABORALES (IRL)", layout.margin + layout.width / 2, layout.y + 14, { align: "center" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Acta de información conforme DS 44 - inducción de trabajador", layout.margin + layout.width / 2, layout.y + 24, { align: "center" });
  doc.setTextColor(0, 0, 0);
  layout.y += titleBarH + 8;
}

// ========== FORM-IRL 03 Helpers ==========

function drawFormTableHeader(
  doc: jsPDF,
  layout: Layout,
  title: string,
  height = 18,
) {
  ensurePage(doc, layout, height);
  doc.setFillColor(26, 82, 118);
  doc.rect(layout.margin, layout.y, layout.width, height, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(title, layout.margin + 6, layout.y + 12);
  doc.setTextColor(0, 0, 0);
  layout.y += height;
}

function drawTableCell(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  text: string,
  bold = false,
  align: "left" | "center" = "left",
) {
  doc.rect(x, y, width, height);
  const lines = wrap(doc, text, width - 12);
  doc.setFont("helvetica", bold ? "bold" : "normal");
  doc.setFontSize(8);
  let textY = y + 11;
  lines.forEach((line) => {
    const textX =
      align === "center"
        ? x + width / 2
        : x + 6;
    doc.text(line, textX, textY, { align });
    textY += 9;
  });
}

function drawCheckbox(
  doc: jsPDF,
  x: number,
  y: number,
  checked: boolean,
) {
  const size = 5;
  doc.rect(x, y, size, size);
  if (checked) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.text("✓", x + 1, y + 4);
  }
}

function drawIdentificationTable(
  doc: jsPDF,
  layout: Layout,
  c: DocumentoIrlCampos,
  params: ExportTrabajadorDocumentoPdfParams,
) {
  // Header: 1. IDENTIFICACIÓN DE LA PERSONA TRABAJADORA
  drawFormTableHeader(doc, layout, "1. IDENTIFICACIÓN DE LA PERSONA TRABAJADORA");

  const colW1 = layout.width * 0.33;
  const colW2 = layout.width * 0.33;
  const colW3 = layout.width * 0.34;
  const rowH = 24;

  // Row 1: Nombre, RUT, Cargo
  ensurePage(doc, layout, rowH + 2);
  drawTableCell(
    doc,
    layout.margin,
    layout.y,
    colW1,
    rowH,
    `NOMBRE Y APELLIDOS\n${safeText(c.trabajador_nombre || `${params.trabajador.nombre} ${params.trabajador.apellido}`)}`,
    true,
  );
  drawTableCell(
    doc,
    layout.margin + colW1,
    layout.y,
    colW2,
    rowH,
    `RUT\n${safeText(c.trabajador_rut || params.trabajador.rut)}`,
    true,
  );
  drawTableCell(
    doc,
    layout.margin + colW1 + colW2,
    layout.y,
    colW3,
    rowH,
    `CARGO\n${safeText(c.trabajador_cargo || c.cargo)}`,
    true,
  );
  layout.y += rowH;

  // Row 2: Área, Proyecto, Fecha
  ensurePage(doc, layout, rowH);
  drawTableCell(
    doc,
    layout.margin,
    layout.y,
    colW1,
    rowH,
    `ÁREA\n${safeText(c.trabajador_area || params.trabajador.area)}`,
    true,
  );
  drawTableCell(
    doc,
    layout.margin + colW1,
    layout.y,
    colW2,
    rowH,
    `PROYECTO\n${safeText(c.proyecto)}`,
    true,
  );
  drawTableCell(
    doc,
    layout.margin + colW1 + colW2,
    layout.y,
    colW3,
    rowH,
    `FECHA\n${safeText(c.fecha)}`,
    true,
  );
  layout.y += rowH;

  // Row 3: Hora inicio, Hora término, Duración
  ensurePage(doc, layout, rowH);
  drawTableCell(
    doc,
    layout.margin,
    layout.y,
    colW1,
    rowH,
    `HORA DE INICIO\n${safeText(c.hora_inicio)}`,
    true,
  );
  drawTableCell(
    doc,
    layout.margin + colW1,
    layout.y,
    colW2,
    rowH,
    `HORA DE TÉRMINO\n${safeText(c.hora_termino)}`,
    true,
  );
  drawTableCell(
    doc,
    layout.margin + colW1 + colW2,
    layout.y,
    colW3,
    rowH,
    `DURACIÓN\n${safeText(c.duracion_capacitacion)}`,
    true,
  );
  layout.y += rowH;

  // Row 4: Contacto, Teléfono, Parentesco
  ensurePage(doc, layout, rowH);
  drawTableCell(
    doc,
    layout.margin,
    layout.y,
    colW1,
    rowH,
    `CONTACTO DE EMERGENCIA\n${safeText(c.contacto_emergencia)}`,
    true,
  );
  drawTableCell(
    doc,
    layout.margin + colW1,
    layout.y,
    colW2,
    rowH,
    `TELÉFONO\n${safeText(c.telefono_emergencia)}`,
    true,
  );
  drawTableCell(
    doc,
    layout.margin + colW1 + colW2,
    layout.y,
    colW3,
    rowH,
    `PARENTESCO\n${safeText(c.parentesco)}`,
    true,
  );
  layout.y += rowH;

  // Motivo checkboxes — tabla de 3 columnas
  const cbRowH = 20;
  ensurePage(doc, layout, cbRowH + 14);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Marque con una cruz (X):", layout.margin + 6, layout.y + 10);
  layout.y += 14;

  const cbColW = layout.width / 3;
  doc.rect(layout.margin, layout.y, cbColW, cbRowH);
  doc.rect(layout.margin + cbColW, layout.y, cbColW, cbRowH);
  doc.rect(layout.margin + cbColW * 2, layout.y, cbColW, cbRowH);

  const cbItems = [
    { label: "Colaborador nuevo", checked: c.colaborador_nuevo ?? false },
    { label: "Cambio en proceso\no puesto de trabajo", checked: c.cambio_proceso_puesto ?? false },
    { label: "Nuevas actividades", checked: c.nuevas_actividades ?? false },
  ];

  cbItems.forEach((item, i) => {
    const cellX = layout.margin + cbColW * i;
    drawCheckbox(doc, cellX + 8, layout.y + 6, item.checked);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(item.label, cellX + 16, layout.y + 10, { maxWidth: cbColW - 22 });
  });

  layout.y += cbRowH + 8;
}

function drawRelatorTable(
  doc: jsPDF,
  layout: Layout,
  c: DocumentoIrlCampos,
) {
  drawFormTableHeader(doc, layout, "2. INFORMADO POR: (DATOS DEL RELATOR)");

  const colW1 = layout.width * 0.35;
  const colW2 = layout.width * 0.25;
  const colW3 = layout.width * 0.2;
  const colW4 = layout.width * 0.2;
  const rowH = 20;

  ensurePage(doc, layout, rowH);
  drawTableCell(
    doc,
    layout.margin,
    layout.y,
    colW1,
    rowH,
    `NOMBRE Y APELLIDOS\n${safeText(c.relator_nombre || c.prevencionista_nombre)}`,
    true,
  );
  drawTableCell(
    doc,
    layout.margin + colW1,
    layout.y,
    colW2,
    rowH,
    `RUT\n${safeText(c.relator_rut)}`,
    true,
  );
  drawTableCell(
    doc,
    layout.margin + colW1 + colW2,
    layout.y,
    colW3,
    rowH,
    `CARGO\n${safeText(c.relator_cargo || c.prevencionista_cargo)}`,
    true,
  );
  drawTableCell(
    doc,
    layout.margin + colW1 + colW2 + colW3,
    layout.y,
    colW4,
    rowH,
    "FIRMA\n",
    true,
    "center",
  );
  layout.y += rowH + 6;
}

function drawSectionTitle(
  doc: jsPDF,
  layout: Layout,
  title: string,
) {
  ensurePage(doc, layout, 16);
  layout.y += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(title, layout.margin, layout.y + 10);
  layout.y += 16;
}

function drawBloqueFirmasDocumentoTrabajador(
  doc: jsPDF,
  layout: Layout,
  params: ExportTrabajadorDocumentoPdfParams,
) {
  const firmaTrabajador = params.firmas?.trabajador
    ?? (params.firmadoPor
      ? {
          nombreFirmante: params.firmadoPor,
          rutFirmante: params.trabajador.rut ?? null,
          fechaHora: params.firmadoEn ? new Date(params.firmadoEn).toISOString() : null,
          tokenTrazabilidad: null,
          estado: "firmado" as const,
        }
      : null);

  const firmaPrevencionista = params.firmas?.prevencionista ?? null;

  const boxHeight = 64;
  const colWidth = layout.width / 2;
  ensurePage(doc, layout, boxHeight + 8);

  doc.setDrawColor(160, 160, 160);
  doc.rect(layout.margin, layout.y, colWidth, boxHeight);
  doc.rect(layout.margin + colWidth, layout.y, colWidth, boxHeight);

  const drawCol = (
    x: number,
    titulo: string,
    firma: {
      nombreFirmante: string | null;
      rutFirmante: string | null;
      fechaHora: string | null;
      tokenTrazabilidad: string | null;
      estado: "firmado" | "pendiente" | "enviado_firma" | "expirado" | "rechazado";
    } | null,
  ) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(titulo, x + 5, layout.y + 10);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);

    if (!firma || firma.estado !== "firmado") {
      doc.text("Pendiente de firma", x + 5, layout.y + 22);
      return;
    }

    doc.text(`Nombre: ${safeText(firma.nombreFirmante)}`, x + 5, layout.y + 22);
    doc.text(`RUT: ${safeText(firma.rutFirmante)}`, x + 5, layout.y + 31);
    doc.text(`Fecha: ${formatDate(firma.fechaHora)}`, x + 5, layout.y + 40);
    doc.text(`Trazabilidad: ${safeText(firma.tokenTrazabilidad)}`, x + 5, layout.y + 49, {
      maxWidth: colWidth - 10,
    });
  };

  drawCol(layout.margin, "Firma trabajador", firmaTrabajador);
  drawCol(layout.margin + colWidth, "Firma prevencionista", firmaPrevencionista);

  layout.y += boxHeight + 8;
}

function drawPuesto3Section(
  doc: jsPDF,
  layout: Layout,
  c: DocumentoIrlCampos,
) {
  drawSectionTitle(
    doc,
    layout,
    "3. DESCRIPCIÓN DEL PUESTO O CARGO DE TRABAJO Y EL LUGAR DE TRABAJO",
  );

  ensurePage(doc, layout, 16);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("3.1 CARACTERÍSTICAS DEL LUGAR DE TRABAJO", layout.margin, layout.y + 8);
  layout.y += 14;

  const drawContentBox = (label: string, text: string) => {
    ensurePage(doc, layout, 30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text(label, layout.margin + 6, layout.y + 8);
    layout.y += 12;
    const contentLines = wrap(doc, safeText(text), layout.width - 16);
    const lineH = 9;
    const boxH = Math.max(20, 10 + contentLines.length * lineH);
    ensurePage(doc, layout, boxH);
    doc.rect(layout.margin, layout.y, layout.width, boxH);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    contentLines.forEach((line, i) => {
      doc.text(line, layout.margin + 8, layout.y + 10 + i * lineH);
    });
    layout.y += boxH + 6;
  };

  drawContentBox("a) Descripción del cargo:", safeText(c.descripcion_cargo || c.descripcion_actividad));
  drawContentBox("b) Tareas que realiza:", safeText(c.tareas_realiza));
  drawContentBox("c) Espacio de trabajo:", safeText(c.espacio_trabajo || c.lugar_trabajo));

  // 3.1d) Condiciones ambientales (CHECKLIST)
  ensurePage(doc, layout, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("d) Condiciones ambientales del puesto de trabajo:", layout.margin + 6, layout.y + 8);
  layout.y += 12;

  const conditions = c.condiciones_amb_obj || {};
  const agentGroups: Array<{ title: string; agents: Array<{ label: string; value: boolean | undefined }> }> = [
    { title: "AGENTES FÍSICOS", agents: [
      { label: "Ruido", value: conditions.ruido },
      { label: "Iluminación", value: conditions.iluminacion },
      { label: "Temp. extremas", value: conditions.temperaturas_extremas },
      { label: "Vibraciones", value: conditions.vibraciones },
    ]},
    { title: "AGENTES BIOLÓGICOS", agents: [
      { label: "Virus/Bacterias/Hongos", value: conditions.virus_bacterias_hongos },
    ]},
    { title: "AGENTES QUÍMICOS", agents: [
      { label: "Sust. peligrosas", value: conditions.sustancias_peligrosas },
      { label: "Polvos/Humos/Nieblas", value: conditions.polvos_humos_nieblas },
      { label: "Vapores orgánicos", value: conditions.vapores_organicos },
    ]},
    { title: "AGENTES DE RIESGO", agents: [
      { label: "Eléctrico", value: conditions.electrico },
      { label: "Altura", value: conditions.altura_fisica },
      { label: "Caída mismo nivel", value: conditions.caida_mismo_nivel },
      { label: "Caída distinto nivel", value: conditions.caida_distinto_nivel },
    ]},
    { title: "AGENTES ERGONÓMICOS", agents: [
      { label: "Posturas forzadas", value: conditions.posturas_forzadas },
      { label: "Mov. repetitivos", value: conditions.movimientos_repetitivos },
    ]},
  ];

  agentGroups.forEach((group) => {
    const itemsPerRow = 3;
    const rowCount = Math.ceil(group.agents.length / itemsPerRow);
    const groupH = 12 + rowCount * 12;
    ensurePage(doc, layout, groupH);

    doc.setFillColor(240, 244, 248);
    doc.rect(layout.margin, layout.y, layout.width, groupH, "F");
    doc.rect(layout.margin, layout.y, layout.width, groupH);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text(group.title, layout.margin + 6, layout.y + 9);

    const agentColW = (layout.width - 12) / itemsPerRow;
    group.agents.forEach((agent, idx) => {
      const col = idx % itemsPerRow;
      const row = Math.floor(idx / itemsPerRow);
      const ax = layout.margin + 6 + col * agentColW;
      const ay = layout.y + 14 + row * 12;

      drawCheckbox(doc, ax, ay, agent.value ?? false);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.text(agent.label, ax + 8, ay + 4);
    });

    layout.y += groupH + 2;
  });

  layout.y += 4;

  // 3.1e) Orden y aseo
  drawContentBox("e) Condiciones de orden y aseo exigidas en el puesto:", safeText(c.orden_aseo));

  // 3.1f) Máquinas y herramientas (TABLE)
  ensurePage(doc, layout, 18);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("f) Máquinas y herramientas de trabajo:", layout.margin + 6, layout.y + 8);
  layout.y += 14;

  const maquinas = c.maquinas_herramientas_tabla ?? [];
  if (maquinas.length > 0) {
    const col1 = layout.width * 0.1;
    const col2 = layout.width * 0.45;
    const col3 = layout.width * 0.45;

    ensurePage(doc, layout, 14);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.rect(layout.margin, layout.y, col1, 12);
    doc.text("N°", layout.margin + 2, layout.y + 8, { align: "center" });
    doc.rect(layout.margin + col1, layout.y, col2, 12);
    doc.text("Equipos y Herramientas", layout.margin + col1 + 2, layout.y + 8);
    doc.rect(layout.margin + col1 + col2, layout.y, col3, 12);
    doc.text("Medidas de Seguridad", layout.margin + col1 + col2 + 2, layout.y + 8);
    layout.y += 12;

    maquinas.forEach((maq: IrlMaquinaFila) => {
      const eqLines = wrap(doc, safeText(maq.equipo_herramienta), col2 - 4);
      const msLines = wrap(doc, safeText(maq.medidas_seguridad), col3 - 4);
      const h = Math.max(12, 6 + Math.max(eqLines.length, msLines.length) * 6);
      ensurePage(doc, layout, h);

      doc.rect(layout.margin, layout.y, col1, h);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.text(String(maq.numero || ""), layout.margin + 2, layout.y + 8, { align: "center" });

      doc.rect(layout.margin + col1, layout.y, col2, h);
      eqLines.forEach((line, i) => {
        doc.text(line, layout.margin + col1 + 2, layout.y + 8 + i * 6);
      });

      doc.rect(layout.margin + col1 + col2, layout.y, col3, h);
      msLines.forEach((line, i) => {
        doc.text(line, layout.margin + col1 + col2 + 2, layout.y + 8 + i * 6);
      });

      layout.y += h;
    });
  } else {
    ensurePage(doc, layout, 12);
    doc.rect(layout.margin, layout.y, layout.width, 12);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    doc.text("Sin máquinas/herramientas registradas", layout.margin + 4, layout.y + 8);
    layout.y += 12;
  }

  layout.y += 4;

  // 3.1g) EPP requerido
  drawContentBox("g) Elementos de Protección Personal:", safeText(c.epp_requerido_info));
}

function drawRiesgos4Section(
  doc: jsPDF,
  layout: Layout,
  c: DocumentoIrlCampos,
) {
  drawSectionTitle(doc, layout, "4. RIESGOS Y MEDIDAS PREVENTIVAS");

  const drawRiskSubsection = (
    subtitle: string,
    rows: Array<{ peligro: string; consecuencia: string; medida: string }>,
  ) => {
    ensurePage(doc, layout, 12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text(subtitle, layout.margin + 4, layout.y + 8);
    layout.y += 12;

    if (!rows || rows.length === 0) {
      ensurePage(doc, layout, 14);
      doc.setFillColor(248, 249, 250);
      doc.rect(layout.margin, layout.y, layout.width, 14, "F");
      doc.rect(layout.margin, layout.y, layout.width, 14);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7.5);
      doc.text("Sin información registrada", layout.margin + 8, layout.y + 9);
      layout.y += 14;
      return;
    }

    const col1 = layout.width * 0.28;
    const col2 = layout.width * 0.28;
    const col3 = layout.width * 0.28;
    const col4 = layout.width * 0.16;
    const headerH = 14;

    ensurePage(doc, layout, headerH);
    doc.setFillColor(26, 82, 118);
    doc.rect(layout.margin, layout.y, layout.width, headerH, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text("RIESGOS", layout.margin + 4, layout.y + 9);
    doc.text("CONSECUENCIAS", layout.margin + col1 + 4, layout.y + 9);
    doc.text("MEDIDAS PREVENTIVAS", layout.margin + col1 + col2 + 4, layout.y + 9);
    doc.text("MÉTODOS", layout.margin + col1 + col2 + col3 + 4, layout.y + 9);
    doc.setTextColor(0, 0, 0);
    layout.y += headerH;

    rows.forEach((row, rowIdx) => {
      const t1 = wrap(doc, safeText(row.peligro), col1 - 10);
      const t2 = wrap(doc, safeText(row.consecuencia), col2 - 10);
      const t3 = wrap(doc, safeText(row.medida), col3 - 10);
      const lineH = 7.5;
      const h = Math.max(18, 8 + Math.max(t1.length, t2.length, t3.length) * lineH);
      ensurePage(doc, layout, h);

      if (rowIdx % 2 === 0) {
        doc.setFillColor(248, 249, 250);
        doc.rect(layout.margin, layout.y, layout.width, h, "F");
      }
      doc.rect(layout.margin, layout.y, col1, h);
      doc.rect(layout.margin + col1, layout.y, col2, h);
      doc.rect(layout.margin + col1 + col2, layout.y, col3, h);
      doc.rect(layout.margin + col1 + col2 + col3, layout.y, col4, h);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      t1.forEach((line, i) => { doc.text(line, layout.margin + 4, layout.y + 10 + i * lineH); });
      t2.forEach((line, i) => { doc.text(line, layout.margin + col1 + 4, layout.y + 10 + i * lineH); });
      t3.forEach((line, i) => { doc.text(line, layout.margin + col1 + col2 + 4, layout.y + 10 + i * lineH); });

      layout.y += h;
    });

    layout.y += 6;
  };

  drawRiskSubsection("4.1 Riesgos generales", c.riesgos_generales_tabla ?? []);
  drawRiskSubsection("4.2 Riesgos con herramientas y equipos", c.riesgos_maquinas_tabla ?? []);
  drawRiskSubsection("4.3 Riesgos por agentes químicos", c.riesgos_quimicos_tabla ?? []);
  drawRiskSubsection("4.4 Riesgos psicosociales", c.riesgos_psicosociales_tabla ?? []);
  drawRiskSubsection("4.5 Riesgos derivados de emergencias, catástrofes y desastres", c.riesgos_emergencias_tabla ?? []);
}

function drawNormas5Section(
  doc: jsPDF,
  layout: Layout,
  c: DocumentoIrlCampos,
) {
  drawSectionTitle(doc, layout, "5. NORMAS GENERALES DE SEGURIDAD");

  const normas = [
    { num: 1, title: "Ley 16.744", text: c.normas_ley16744 },
    { num: 2, title: "Manejo manual de materiales", text: c.normas_mmc },
    { num: 3, title: "Emergencias, incendios, extintores y primeros auxilios", text: c.normas_emergencias_control },
    { num: 4, title: "Resolución Exenta 156 SUSESO", text: c.normas_accidentes_graves },
    { num: 5, title: "Elementos de Protección Personal", text: c.normas_epp_info },
    { num: 6, title: "Posición ergonómica", text: c.normas_ergonomia },
    { num: 7, title: "Uso y manejo de extintores", text: c.normas_extintores },
    { num: 8, title: "Señalizaciones de seguridad", text: c.normas_senalizacion },
    { num: 9, title: "Análisis de Riesgos en el Trabajo (AST/ART)", text: c.normas_ast },
    { num: 10, title: "Procedimientos Seguros de Trabajo (PST)", text: c.normas_pts_texto || c.pts },
    { num: 11, title: "Sistema de Bloqueo y Etiquetado", text: c.normas_bloqueo_etiquetado },
    { num: 12, title: "Protocolos MINSAL", text: c.normas_protocolos_minsal_texto || c.protocolos_minsal },
    { num: 13, title: "Sustancias Químicas Peligrosas", text: c.normas_quimicos },
  ];

  normas.forEach((norma) => {
    const hasText = safeText(norma.text) !== "-";
    const titleH = 14;
    ensurePage(doc, layout, titleH + (hasText ? 20 : 0));

    doc.setFillColor(240, 244, 248);
    doc.rect(layout.margin, layout.y, layout.width, titleH, "F");
    doc.rect(layout.margin, layout.y, layout.width, titleH);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(`${norma.num}.- ${norma.title}`, layout.margin + 6, layout.y + 9);
    layout.y += titleH;

    if (hasText) {
      const lines = wrap(doc, safeText(norma.text), layout.width - 16);
      const lineH = 7.5;
      const h = Math.max(16, 8 + lines.length * lineH);
      ensurePage(doc, layout, h);
      doc.rect(layout.margin, layout.y, layout.width, h);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      lines.forEach((line, i) => {
        doc.text(line, layout.margin + 8, layout.y + 10 + i * lineH);
      });
      layout.y += h;
    }

    layout.y += 3;
  });

  layout.y += 6;
}

function drawAntecedentes6Section(
  doc: jsPDF,
  layout: Layout,
  c: DocumentoIrlCampos,
) {
  drawSectionTitle(doc, layout, "6. ANTECEDENTES MÉDICOS DEL TRABAJADOR");

  const drawAntecedentesSubtable = (
    subtitle: string,
    rows: Array<{
      numero?: number;
      condicion: string;
      si: boolean;
      no: boolean;
      observaciones: string;
    }>,
  ) => {
    ensurePage(doc, layout, 8);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text(subtitle, layout.margin + 4, layout.y + 6);
    layout.y += 8;

    if (!rows || rows.length === 0) return;

    const col1 = layout.width * 0.08;
    const col2 = layout.width * 0.35;
    const col3 = layout.width * 0.12;
    const col4 = layout.width * 0.12;
    const col5 = layout.width * 0.33;

    ensurePage(doc, layout, 12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.rect(layout.margin, layout.y, col1, 10);
    doc.text("N°", layout.margin + 1, layout.y + 7, { align: "center" });
    doc.rect(layout.margin + col1, layout.y, col2, 10);
    doc.text("Condición/Enfermedad", layout.margin + col1 + 1, layout.y + 7);
    doc.rect(layout.margin + col1 + col2, layout.y, col3, 10);
    doc.text("Sí", layout.margin + col1 + col2 + 1, layout.y + 7, { align: "center" });
    doc.rect(layout.margin + col1 + col2 + col3, layout.y, col4, 10);
    doc.text("No", layout.margin + col1 + col2 + col3 + 1, layout.y + 7, { align: "center" });
    doc.rect(layout.margin + col1 + col2 + col3 + col4, layout.y, col5, 10);
    doc.text("Observaciones", layout.margin + col1 + col2 + col3 + col4 + 1, layout.y + 7);
    layout.y += 10;

    rows.forEach((row, idx) => {
      const h = 10;
      ensurePage(doc, layout, h);

      doc.rect(layout.margin, layout.y, col1, h);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.text(String(row.numero || idx + 1), layout.margin + 1, layout.y + 7, { align: "center" });

      doc.rect(layout.margin + col1, layout.y, col2, h);
      doc.text(safeText(row.condicion), layout.margin + col1 + 2, layout.y + 7);

      doc.rect(layout.margin + col1 + col2, layout.y, col3, h);
      drawCheckbox(doc, layout.margin + col1 + col2 + 2, layout.y + 3, row.si ?? false);

      doc.rect(layout.margin + col1 + col2 + col3, layout.y, col4, h);
      drawCheckbox(doc, layout.margin + col1 + col2 + col3 + 2, layout.y + 3, row.no ?? false);

      doc.rect(layout.margin + col1 + col2 + col3 + col4, layout.y, col5, h);
      doc.text(safeText(row.observaciones), layout.margin + col1 + col2 + col3 + col4 + 2, layout.y + 7);

      layout.y += h;
    });

    layout.y += 4;
  };

  drawAntecedentesSubtable(
    "A) ENFERMEDADES",
    c.antecedentes_enfermedades ?? [],
  );
  drawAntecedentesSubtable(
    "B) ANTECEDENTES GENERALES",
    c.antecedentes_generales_tabla ?? [],
  );
  drawAntecedentesSubtable(
    "C) OTRAS CONSIDERACIONES",
    c.antecedentes_otras_consideraciones ?? [],
  );

  layout.y += 4;
}

function drawMaterial7Section(
  doc: jsPDF,
  layout: Layout,
  c: DocumentoIrlCampos,
) {
  drawSectionTitle(doc, layout, "7. LA ENTIDAD EMPLEADORA ENTREGA MATERIAL ADJUNTO A ESTE DOCUMENTO");

  const items = [
    { title: "PROCEDIMIENTOS DE TRABAJO SEGURO (PTS)", content: c.material_adjunto_pts },
    { title: "PRODUCTOS Y SUSTANCIAS A MANIPULAR", content: c.material_adjunto_productos },
    { title: "COBERTURA EN CASO DE ACCIDENTES", content: c.material_adjunto_cobertura },
  ];

  items.forEach((item) => {
    ensurePage(doc, layout, 8);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text(`• ${item.title}`, layout.margin + 4, layout.y + 6);
    layout.y += 8;

    const lines = wrap(doc, safeText(item.content), layout.width - 8);
    const h = Math.max(12, 6 + lines.length * 6);
    ensurePage(doc, layout, h);
    doc.rect(layout.margin, layout.y, layout.width, h);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    lines.forEach((line, i) => {
      doc.text(line, layout.margin + 4, layout.y + 8 + i * 6);
    });
    layout.y += h + 4;
  });
}

function drawConsentimiento8Section(
  doc: jsPDF,
  layout: Layout,
  c: DocumentoIrlCampos,
  params: ExportTrabajadorDocumentoPdfParams,
) {
  drawSectionTitle(doc, layout, "8. DECLARACIÓN Y FIRMAS");

  const declaracionText =
    c.declaracion ||
    `Declaro haber recibido, leído y comprendido la información entregada en este Informe de Riesgos Laborales, comprometiéndome a cumplir las medidas preventivas, procedimientos y normas indicadas.`;

  const lines = wrap(doc, declaracionText, layout.width - 8);
  const h = Math.max(28, 6 + lines.length * 7);
  ensurePage(doc, layout, h);
  doc.rect(layout.margin, layout.y, layout.width, h);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  lines.forEach((line, i) => {
    doc.text(line, layout.margin + 4, layout.y + 8 + i * 7);
  });
  layout.y += h + 6;

  const firmaTrabajador = params.firmas?.trabajador
    ?? (params.firmadoPor
      ? {
          nombreFirmante: params.firmadoPor,
          rutFirmante: params.trabajador.rut ?? null,
          fechaHora: params.firmadoEn ? new Date(params.firmadoEn).toISOString() : null,
          tokenTrazabilidad: null,
          estado: "firmado" as const,
        }
      : null);
  const firmaPrevencionista = params.firmas?.prevencionista ?? null;

  const colW = layout.width / 3;
  const sigBoxH = 72;
  ensurePage(doc, layout, sigBoxH + 14);

  // Header row
  const headerH = 14;
  doc.setFillColor(26, 82, 118);
  doc.rect(layout.margin, layout.y, layout.width, headerH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text("Persona trabajadora", layout.margin + colW * 0.5, layout.y + 9, { align: "center" });
  doc.text("Relator / prevencionista", layout.margin + colW * 1.5, layout.y + 9, { align: "center" });
  doc.text("Representante empresa", layout.margin + colW * 2.5, layout.y + 9, { align: "center" });
  doc.setTextColor(0, 0, 0);
  layout.y += headerH;

  // Signature boxes
  for (let i = 0; i < 3; i++) {
    doc.rect(layout.margin + colW * i, layout.y, colW, sigBoxH);
  }

  const drawFirmaCol = (
    colIndex: number,
    nombre: string,
    subtitulo: string,
    firma: typeof firmaTrabajador,
  ) => {
    const x = layout.margin + colW * colIndex + 5;
    const maxW = colW - 10;
    let ly = layout.y + 10;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.text(`Nombre: ${safeText(nombre)}`, x, ly, { maxWidth: maxW });
    ly += 8;
    doc.text(subtitulo, x, ly, { maxWidth: maxW });
    ly += 12;

    if (firma?.estado === "firmado") {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6);
      doc.setTextColor(26, 82, 118);
      doc.text("Firmado electrónicamente", x, ly);
      doc.setTextColor(0, 0, 0);
      ly += 8;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6);
      if (firma.rutFirmante) {
        doc.text(`RUN: ${safeText(firma.rutFirmante)}`, x, ly);
        ly += 7;
      }
      doc.text(`Fecha: ${formatDate(firma.fechaHora)}`, x, ly);
    } else if (firma) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(6.5);
      doc.text("Pendiente de firma", x, ly);
    } else {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.text("Firma: ____________________", x, ly);
      ly += 10;
      doc.text(`Fecha: ${safeText(c.fecha || formatDate(new Date()))}`, x, ly);
    }
  };

  drawFirmaCol(
    0,
    c.trabajador_nombre || `${params.trabajador.nombre} ${params.trabajador.apellido}`,
    `RUN: ${safeText(c.trabajador_rut || params.trabajador.rut)}`,
    firmaTrabajador,
  );
  drawFirmaCol(
    1,
    c.relator_nombre || c.prevencionista_nombre || "",
    `Cargo: ${safeText(c.relator_cargo || c.prevencionista_cargo || "Prevencionista de Riesgos")}`,
    firmaPrevencionista,
  );
  drawFirmaCol(
    2,
    params.empresa?.nombre ?? params.empresa?.razonSocial ?? "",
    `RUT: ${safeText(params.empresa?.rut)}`,
    null,
  );

  layout.y += sigBoxH + 6;
}

function drawTrazabilidad9Section(
  doc: jsPDF,
  layout: Layout,
  params: ExportTrabajadorDocumentoPdfParams,
) {
  drawSectionTitle(doc, layout, "9. TRAZABILIDAD DIGITAL NEXTPREV");

  const firmaTrabajador = params.firmas?.trabajador ?? null;
  const firmaPrevencionista = params.firmas?.prevencionista ?? null;

  const rows = [
    { label: "Estado documental", value: estadoLabel(params.estado) },
    {
      label: "Firma trabajador",
      value: firmaTrabajador?.estado === "firmado"
        ? `Firmado | ${formatDate(firmaTrabajador.fechaHora)}`
        : "Pendiente de firma",
    },
    {
      label: "Firma prevencionista",
      value: firmaPrevencionista?.estado === "firmado"
        ? `Firmado | ${formatDate(firmaPrevencionista.fechaHora)}`
        : "Pendiente de firma",
    },
    {
      label: "Token trazabilidad",
      value: safeText(firmaPrevencionista?.tokenTrazabilidad || firmaTrabajador?.tokenTrazabilidad),
    },
  ];

  const labelW = layout.width * 0.35;
  const valueW = layout.width * 0.65;
  const rowH = 14;

  rows.forEach((row) => {
    ensurePage(doc, layout, rowH);
    doc.setFillColor(245, 245, 245);
    doc.rect(layout.margin, layout.y, labelW, rowH, "F");
    doc.rect(layout.margin, layout.y, labelW, rowH);
    doc.rect(layout.margin + labelW, layout.y, valueW, rowH);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text(row.label, layout.margin + 4, layout.y + 9);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(row.value, layout.margin + labelW + 4, layout.y + 9, { maxWidth: valueW - 8 });

    layout.y += rowH;
  });

  layout.y += 6;
}

async function renderStructuredIrlPdf(
  doc: jsPDF,
  params: ExportTrabajadorDocumentoPdfParams,
  tipoNombre: string,
  data: DocumentoIrlEstructurado,
) {
  const c = data.campos;
  const pageWidth = doc.internal.pageSize.getWidth();
  const layout: Layout = {
    margin: 28,
    width: pageWidth - 56,
    pageHeight: doc.internal.pageSize.getHeight(),
    y: 20,
  };

  // ===== HEADER CORPORATIVO =====
  drawIrlHeaderCorporativo(doc, layout, params, c.codigo_documento, c.version, c.fecha);

  // ===== SECTIONS =====
  drawIdentificationTable(doc, layout, c, params);
  drawRelatorTable(doc, layout, c);
  drawPuesto3Section(doc, layout, c);
  drawRiesgos4Section(doc, layout, c);
  drawNormas5Section(doc, layout, c);
  drawAntecedentes6Section(doc, layout, c);
  drawMaterial7Section(doc, layout, c);
  drawConsentimiento8Section(doc, layout, c, params);
  drawTrazabilidad9Section(doc, layout, params);

  // ===== FOOTER WITH CORRECT PAGE NUMBERS =====
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p += 1) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text("Generado por NextPrev | Documento de inducción IRL | Uso interno SST", layout.margin + layout.width / 2, layout.pageHeight - 14, { align: "center" });
  }
}

async function renderStructuredEppPdf(
  doc: jsPDF,
  params: ExportTrabajadorDocumentoPdfParams,
  tipoNombre: string,
  data: DocumentoEppEstructurado,
) {
  const c = data.campos;
  const pageWidth = doc.internal.pageSize.getWidth();
  const layout: Layout = {
    margin: 32,
    width: pageWidth - 64,
    pageHeight: doc.internal.pageSize.getHeight(),
    y: 36,
  };

  drawHeader(doc, layout, "ACTA ESTRUCTURADA DE ENTREGA DE EPP", "NEXTPREV TEMPLATE-02");
  drawLabelValue(
    doc,
    layout,
    "Trabajador",
    safeText(c.trabajador_nombre || `${params.trabajador.nombre} ${params.trabajador.apellido}`),
  );
  drawLabelValue(doc, layout, "RUN", safeText(c.trabajador_rut || params.trabajador.rut));
  drawLabelValue(doc, layout, "Area", safeText(c.area || params.trabajador.area));
  drawLabelValue(doc, layout, "Fecha", safeText(c.fecha));

  const rows = c.epp_tabla ?? [];
  rows.forEach((row) => {
    drawLabelValue(
      doc,
      layout,
      `EPP (${safeText(row.cantidad)})`,
      `${safeText(row.descripcion)} | Marca: ${safeText(row.marca)} | Modelo: ${safeText(row.modelo)} | Norma: ${safeText(row.norma_tecnica)}`,
    );
  });

  drawParagraph(doc, layout, safeText(c.observaciones_generales), 30);
  drawParagraph(doc, layout, safeText(c.declaracion), 36);

  const sigH = 72;
  ensurePage(doc, layout, sigH);
  const sigW = layout.width / 2;
  doc.rect(layout.margin, layout.y, sigW, sigH);
  doc.rect(layout.margin + sigW, layout.y, sigW, sigH);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(`Firma trabajador\n${safeText(c.firma_trabajador)}`, layout.margin + 6, layout.y + 14);
  doc.text(`Entregado por\n${safeText(c.entregado_por)}`, layout.margin + sigW + 6, layout.y + 14);

  drawBloqueFirmasDocumentoTrabajador(doc, layout, params);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Estado documental: ${estadoLabel(params.estado)} | Documento: ${tipoNombre}`, layout.margin, layout.pageHeight - 14);
  doc.text("Generado por NextPrev", layout.margin + layout.width - 118, layout.pageHeight - 14);
}

export async function renderEppPdf(doc: jsPDF, params: ExportTrabajadorDocumentoPdfParams, tipoNombre: string) {
  const structured = parseDocumentoEstructurado(params.contenido);
  if (structured?.plantillaCodigo === "EPP") {
    await renderStructuredEppPdf(doc, params, tipoNombre, structured);
    return;
  }

  const pageWidth = doc.internal.pageSize.getWidth();
  const layout: Layout = {
    margin: 32,
    width: pageWidth - 64,
    pageHeight: doc.internal.pageSize.getHeight(),
    y: 36,
  };
  drawHeader(doc, layout, "REGISTRO DE ENTREGA DE EPP", "Formato simplificado");
  drawParagraph(doc, layout, params.contenido || "Sin contenido", 80);
}

function renderMarkdownIrlPdfConDiseñoCorporativo(
  doc: jsPDF,
  params: ExportTrabajadorDocumentoPdfParams,
  tipoNombre: string,
) {
  const contenidoMarkdown = (params.documento?.contenidoMarkdown ?? params.contenido ?? "").trim();
  const pageWidth = doc.internal.pageSize.getWidth();
  const layout: Layout = {
    margin: 28,
    width: pageWidth - 56,
    pageHeight: doc.internal.pageSize.getHeight(),
    y: 20,
  };

  // ===== HEADER CORPORATIVO =====
  drawIrlHeaderCorporativo(doc, layout, params);

  // ===== IDENTIFICATION =====
  drawFormTableHeader(doc, layout, "1. IDENTIFICACIÓN DE LA PERSONA TRABAJADORA");
  const colW1 = layout.width * 0.33;
  const colW2 = layout.width * 0.33;
  const colW3 = layout.width * 0.34;
  const rowH = 20;

  ensurePage(doc, layout, rowH);
  drawTableCell(doc, layout.margin, layout.y, colW1, rowH, `NOMBRE Y APELLIDOS\n${safeText(`${params.trabajador.nombre} ${params.trabajador.apellido}`)}`, true);
  drawTableCell(doc, layout.margin + colW1, layout.y, colW2, rowH, `RUT\n${safeText(params.trabajador.rut)}`, true);
  drawTableCell(doc, layout.margin + colW1 + colW2, layout.y, colW3, rowH, `CARGO\n${safeText(params.trabajador.cargo)}`, true);
  layout.y += rowH;

  ensurePage(doc, layout, rowH);
  drawTableCell(doc, layout.margin, layout.y, colW1, rowH, `ÁREA\n${safeText(params.trabajador.area)}`, true);
  drawTableCell(doc, layout.margin + colW1, layout.y, colW2, rowH, `ESTADO\n${estadoLabel(params.estado)}`, true);
  drawTableCell(doc, layout.margin + colW1 + colW2, layout.y, colW3, rowH, `FECHA\n${formatDate(new Date())}`, true);
  layout.y += rowH + 8;

  // ===== CONTENIDO MARKDOWN =====
  const sections = parseMarkdownSections(contenidoMarkdown).filter(
    (section) => section.title.toLowerCase() !== "identificacion del trabajador",
  );

  if (sections.length === 0) {
    drawParagraph(doc, layout, contenidoMarkdown || "Sin contenido", 120);
  } else {
    sections.forEach((section) => {
      drawMarkdownSection(doc, layout, section);
    });
  }

  // ===== FIRMAS Y TRAZABILIDAD =====
  drawConsentimiento8Section(doc, layout, {
    trabajador_nombre: `${params.trabajador.nombre} ${params.trabajador.apellido}`,
    trabajador_rut: params.trabajador.rut ?? "",
    relator_nombre: params.firmas?.prevencionista?.nombreFirmante ?? "",
    prevencionista_nombre: params.firmas?.prevencionista?.nombreFirmante ?? "",
    relator_cargo: "",
    prevencionista_cargo: "Prevencionista de Riesgos",
    fecha: formatDate(new Date()),
  } as DocumentoIrlCampos, params);

  drawTrazabilidad9Section(doc, layout, params);

  // ===== FOOTER =====
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p += 1) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text("Generado por NextPrev | Documento de inducción IRL | Uso interno SST", layout.margin + layout.width / 2, layout.pageHeight - 14, { align: "center" });
  }
}

export async function renderIRLPdf(doc: jsPDF, params: ExportTrabajadorDocumentoPdfParams, tipoNombre: string) {
  const structured = parseDocumentoEstructurado(params.contenido);
  if (structured?.plantillaCodigo === "IRL") {
    await renderStructuredIrlPdf(doc, params, tipoNombre, structured);
    return;
  }

  renderMarkdownIrlPdfConDiseñoCorporativo(doc, params, tipoNombre);
}

function renderGenericPdf(doc: jsPDF, params: ExportTrabajadorDocumentoPdfParams, tipoNombre: string) {
  const margin = 34;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - margin * 2;
  let y = 44;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(tipoNombre, margin, y);
  y += 18;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Trabajador: ${params.trabajador.nombre} ${params.trabajador.apellido}`, margin, y);
  y += 14;
  doc.text(`RUT: ${safeText(params.trabajador.rut)} | Cargo: ${safeText(params.trabajador.cargo)}`, margin, y);
  y += 14;
  doc.text(`Estado: ${estadoLabel(params.estado)} | Fecha: ${formatDate(new Date())}`, margin, y);
  y += 20;

  doc.setFont("helvetica", "bold");
  doc.text("Contenido registrado", margin, y);
  y += 12;
  doc.setFont("helvetica", "normal");
  const lines = doc.splitTextToSize(params.contenido || "Sin contenido", contentWidth) as string[];
  doc.text(lines, margin, y);
  
  y = pageHeight - 88;
  const genericLayout: Layout = {
    margin,
    width: contentWidth,
    pageHeight,
    y,
  };
  drawBloqueFirmasDocumentoTrabajador(doc, genericLayout, params);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Formato generico aplicado por no existir plantilla especializada.", margin, pageHeight - 20);
  doc.text("Generado por NextPrev", margin + contentWidth - 118, pageHeight - 20);
}

export async function exportTrabajadorDocumentoPdf(params: ExportTrabajadorDocumentoPdfParams) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const tipoNombre = params.documento?.tipo.nombre ?? "Documento de trabajador";
  const template = detectTemplate(params.documento, tipoNombre);

  if (template === "epp") {
    await renderEppPdf(doc, params, tipoNombre);
  } else if (template === "irl") {
    await renderIRLPdf(doc, params, tipoNombre);
  } else if (template === "induccion") {
    renderMarkdownLikeIrlPdf(doc, params, tipoNombre);
  } else {
    renderGenericPdf(doc, params, tipoNombre);
  }

  const blob = doc.output("blob");
  doc.save(buildFilename(tipoNombre, params.trabajador));
  return blob;
}
