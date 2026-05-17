import { jsPDF } from "jspdf";
import type { Worker } from "../types";
import type { DocTrabajadorView } from "./types";
import { parseDocumentoEstructurado, type DocumentoEppEstructurado, type DocumentoIrlEstructurado } from "@/lib/documentacion/documento-estructurado";

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
  empresa?: EmpresaPdfMeta | null;
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

function detectTemplate(tipoNombre: string): "epp" | "irl" | "generic" {
  const normalized = normalizeEstado(tipoNombre);
  if (normalized.includes("epp") || normalized.includes("entrega")) return "epp";
  if (normalized.includes("irl") || normalized.includes("riesgo") || normalized.includes("odi")) return "irl";
  return "generic";
}

function parseBulletLines(contenido: string): string[] {
  return contenido
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^[-*•]/.test(line))
    .map((line) => line.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean);
}

function parseIrlSections(contenido: string): {
  riesgos: string[];
  consecuencias: string[];
  medidas: string[];
} {
  const lines = contenido.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const riesgos: string[] = [];
  const consecuencias: string[] = [];
  const medidas: string[] = [];
  let mode: "none" | "riesgos" | "consecuencias" | "medidas" = "none";

  lines.forEach((line) => {
    const normalized = normalizeEstado(line);
    if (normalized.includes("riesgos identificados")) {
      mode = "riesgos";
      return;
    }
    if (normalized.includes("medidas preventivas")) {
      mode = "medidas";
      return;
    }
    if (normalized.includes("consecuencias")) {
      mode = "consecuencias";
      return;
    }
    if (/^[-*•]/.test(line)) {
      const clean = line.replace(/^[-*•]\s*/, "").trim();
      if (!clean) return;
      if (mode === "riesgos") riesgos.push(clean);
      if (mode === "consecuencias") consecuencias.push(clean);
      if (mode === "medidas") medidas.push(clean);
    }
  });

  const fallback = parseBulletLines(contenido);
  if (!riesgos.length) riesgos.push(...fallback.slice(0, 5));
  if (!medidas.length) medidas.push(...fallback.slice(5, 10));

  if (!riesgos.length) {
    riesgos.push(
      "Caida al mismo o distinto nivel",
      "Golpes por herramientas o materiales",
      "Sobreesfuerzo por manipulacion manual",
      "Riesgo ergonomico por postura sostenida",
    );
  }

  if (!medidas.length) {
    medidas.push(
      "Uso permanente de EPP segun matriz de riesgos",
      "Cumplimiento estricto de procedimiento de trabajo seguro",
      "Pausas operacionales y tecnica de levantamiento seguro",
      "Reporte inmediato de condiciones inseguras",
    );
  }

  if (!consecuencias.length) {
    riesgos.forEach((riesgo) => {
      const norm = normalizeEstado(riesgo);
      if (norm.includes("caida")) {
        consecuencias.push("Fracturas, contusiones y lesiones incapacitantes");
      } else if (norm.includes("electr")) {
        consecuencias.push("Quemaduras, fibrilacion y riesgo vital");
      } else if (norm.includes("ergonom") || norm.includes("sobreesfuerzo")) {
        consecuencias.push("Lesiones musculoesqueleticas y dolor cronico");
      } else if (norm.includes("golpe") || norm.includes("atrap")) {
        consecuencias.push("Traumatismos y laceraciones");
      } else {
        consecuencias.push("Accidentes laborales y danos a la salud");
      }
    });
  }

  while (consecuencias.length < riesgos.length) {
    consecuencias.push("Accidentes laborales y danos a la salud");
  }

  return { riesgos, consecuencias, medidas };
}

function parseEppItems(contenido: string): string[] {
  const extracted = parseBulletLines(contenido);
  const defaults = [
    "Casco seguridad",
    "Lentes de seguridad",
    "Guantes de proteccion",
    "Zapatos de seguridad",
    "Chaleco reflectante",
    "Protector auditivo",
    "Mascarilla antipolvo",
    "Arnes de seguridad",
    "Bloqueador solar",
    "Ropa de trabajo",
  ];

  return extracted.length ? extracted.slice(0, 16) : defaults;
}

async function loadLogoData(logoUrl: string): Promise<{ dataUrl: string; format: "PNG" | "JPEG" | "WEBP" } | null> {
  try {
    const absolute = logoUrl.startsWith("http")
      ? logoUrl
      : `${window.location.origin}${logoUrl.startsWith("/") ? "" : "/"}${logoUrl}`;

    const response = await fetch(absolute);
    if (!response.ok) return null;

    const blob = await response.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });

    const mime = blob.type.toLowerCase();
    const format: "PNG" | "JPEG" | "WEBP" = mime.includes("png")
      ? "PNG"
      : mime.includes("webp")
      ? "WEBP"
      : "JPEG";

    return { dataUrl, format };
  } catch {
    return null;
  }
}

type CellAlign = "left" | "center" | "right";

type DrawCellOptions = {
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  fontSize?: number;
  bold?: boolean;
  align?: CellAlign;
  padding?: number;
  fillColor?: [number, number, number];
  textColor?: [number, number, number];
};

type RowCell = {
  w: number;
  text: string;
  fontSize?: number;
  bold?: boolean;
  align?: CellAlign;
  padding?: number;
  fillColor?: [number, number, number];
  textColor?: [number, number, number];
};

type LayoutCursor = {
  margin: number;
  pageWidth: number;
  pageHeight: number;
  contentWidth: number;
  y: number;
};

function lineHeight(fontSize: number) {
  return fontSize * 1.24;
}

function wrapText(doc: jsPDF, text: string, maxWidth: number): string[] {
  const normalized = safeText(text).replace(/\s+/g, " ").trim();
  const lines = doc.splitTextToSize(normalized || "-", Math.max(12, maxWidth)) as string[];
  return lines.length ? lines : ["-"];
}

function measureCellHeight(
  doc: jsPDF,
  text: string,
  width: number,
  fontSize: number,
  padding = 4,
): number {
  doc.setFontSize(fontSize);
  const lines = wrapText(doc, text, width - padding * 2);
  return padding * 2 + Math.max(lineHeight(fontSize), lines.length * lineHeight(fontSize));
}

function drawCell(doc: jsPDF, options: DrawCellOptions) {
  const {
    x,
    y,
    w,
    h,
    text,
    fontSize = 8.5,
    bold = false,
    align = "left",
    padding = 4,
    fillColor,
    textColor,
  } = options;

  if (fillColor) {
    doc.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
    doc.rect(x, y, w, h, "FD");
  } else {
    doc.rect(x, y, w, h);
  }
  doc.setFont("helvetica", bold ? "bold" : "normal");
  doc.setFontSize(fontSize);
  if (textColor) {
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  }

  const lines = wrapText(doc, text, w - padding * 2);
  const maxLines = Math.max(1, Math.floor((h - padding * 2) / lineHeight(fontSize)));
  const visible = lines.slice(0, maxLines);
  const startY = y + padding + fontSize;

  visible.forEach((line, index) => {
    const textY = startY + index * lineHeight(fontSize);
    const lineWidth = doc.getTextWidth(line);
    if (align === "center") {
      doc.text(line, x + w / 2, textY, { align: "center" });
      return;
    }
    if (align === "right") {
      doc.text(line, x + w - padding, textY, { align: "right" });
      return;
    }

    const maxX = x + w - padding;
    const safeX = Math.min(x + padding, maxX - lineWidth);
    doc.text(line, Math.max(x + padding, safeX), textY);
  });

  if (textColor) {
    doc.setTextColor(0, 0, 0);
  }
}

function ensurePageSpace(doc: jsPDF, layout: LayoutCursor, requiredHeight: number): boolean {
  const bottomLimit = layout.pageHeight - layout.margin;
  if (layout.y + requiredHeight <= bottomLimit) return false;
  doc.addPage();
  layout.y = layout.margin;
  return true;
}

function drawRow(
  doc: jsPDF,
  layout: LayoutCursor,
  x: number,
  cells: RowCell[],
  opts?: { minHeight?: number; onPageBreak?: () => void },
) {
  const minHeight = opts?.minHeight ?? 18;
  const heights = cells.map((cell) =>
    measureCellHeight(doc, cell.text, cell.w, cell.fontSize ?? 8.5, cell.padding ?? 4),
  );
  const rowHeight = Math.max(minHeight, ...heights);

  const pageChanged = ensurePageSpace(doc, layout, rowHeight);
  if (pageChanged) opts?.onPageBreak?.();

  let cellX = x;
  cells.forEach((cell) => {
    drawCell(doc, {
      x: cellX,
      y: layout.y,
      w: cell.w,
      h: rowHeight,
      text: cell.text,
      fontSize: cell.fontSize,
      bold: cell.bold,
      align: cell.align,
      padding: cell.padding,
    });
    cellX += cell.w;
  });

  layout.y += rowHeight;
  return rowHeight;
}

async function drawInstitutionalHeader(
  doc: jsPDF,
  empresa: EmpresaPdfMeta | null | undefined,
  title: string,
  codigo: string,
  elaboracion: string,
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  const totalWidth = pageWidth - margin * 2;
  const top = margin;
  const headerHeight = 112;
  const leftWidth = totalWidth * 0.34;
  const centerWidth = totalWidth * 0.40;
  const rightWidth = totalWidth - leftWidth - centerWidth;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.9);
  doc.rect(margin, top, totalWidth, headerHeight);
  doc.rect(margin, top, leftWidth, headerHeight);
  doc.rect(margin + leftWidth, top, centerWidth, headerHeight);
  doc.rect(margin + leftWidth + centerWidth, top, rightWidth, headerHeight);

  const leftX = margin;
  const centerX = margin + leftWidth;
  const rightX = centerX + centerWidth;

  const logoBoxX = leftX + 8;
  const logoBoxY = top + 8;
  const logoBoxW = leftWidth - 16;
  const logoBoxH = 52;
  doc.rect(logoBoxX, logoBoxY, logoBoxW, logoBoxH);

  if (empresa?.logoUrl) {
    const logo = await loadLogoData(empresa.logoUrl);
    if (logo) {
      doc.addImage(logo.dataUrl, logo.format, logoBoxX + 2, logoBoxY + 2, logoBoxW - 4, logoBoxH - 4, undefined, "FAST");
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  const empresaNombre = safeText(empresa?.razonSocial ?? empresa?.nombre ?? "EMPRESA");
  const empresaRut = safeText(empresa?.rut);
  const empresaDireccion = safeText(empresa?.direccion);
  const empresaLines = wrapText(
    doc,
    `${empresaNombre} | RUT: ${empresaRut} | Dir: ${empresaDireccion}`,
    leftWidth - 16,
  );
  doc.text(empresaLines.slice(0, 3), leftX + 8, top + 74);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  const titleLines = wrapText(doc, title, centerWidth - 14);
  const titleBlockHeight = titleLines.length * lineHeight(11);
  const titleY = top + headerHeight / 2 - titleBlockHeight / 2 + 11;
  titleLines.forEach((line, idx) => {
    doc.text(line, centerX + centerWidth / 2, titleY + idx * lineHeight(11), { align: "center" });
  });

  const reviewDate = formatDate(new Date()).split(" ")[0];
  const pageNumber = doc.getCurrentPageInfo().pageNumber;
  const rightLines = [
    codigo,
    `Elaboracion: ${elaboracion}`,
    "Revision: 0",
    `Rev. Fecha: ${reviewDate}`,
    `Pagina: ${pageNumber}`,
  ];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  rightLines.forEach((line, idx) => {
    drawCell(doc, {
      x: rightX,
      y: top + idx * 22,
      w: rightWidth,
      h: 22,
      text: line,
      fontSize: 8.2,
      bold: idx === 0,
      align: "left",
      padding: 5,
    });
  });

  return { margin, top, totalWidth, yAfter: top + headerHeight + 10 };
}

function drawFieldRow(doc: jsPDF, layout: LayoutCursor, label: string, value: string) {
  const labelHeight = 12;
  const valueHeight = measureCellHeight(doc, value, layout.contentWidth - 10, 9.5, 4);
  const rowHeight = Math.max(30, labelHeight + valueHeight);
  ensurePageSpace(doc, layout, rowHeight);

  doc.rect(layout.margin, layout.y, layout.contentWidth, rowHeight);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(label, layout.margin + 5, layout.y + 10);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  const valueLines = wrapText(doc, value, layout.contentWidth - 10);
  const startY = layout.y + 22;
  valueLines.forEach((line, idx) => {
    const y = startY + idx * lineHeight(9.5);
    if (y > layout.y + rowHeight - 4) return;
    doc.text(line, layout.margin + 5, y);
  });

  layout.y += rowHeight;
}

function drawLongTextBlock(
  doc: jsPDF,
  layout: LayoutCursor,
  title: string,
  text: string,
  fontSize = 8.5,
  minHeight = 68,
) {
  const titleHeight = 14;
  const contentHeight = measureCellHeight(doc, text, layout.contentWidth - 10, fontSize, 4);
  const blockHeight = Math.max(minHeight, titleHeight + contentHeight + 4);
  ensurePageSpace(doc, layout, blockHeight);

  doc.rect(layout.margin, layout.y, layout.contentWidth, blockHeight);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(title, layout.margin + 5, layout.y + 10);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(fontSize);
  const lines = wrapText(doc, text, layout.contentWidth - 10);
  const startY = layout.y + 24;
  lines.forEach((line, idx) => {
    const y = startY + idx * lineHeight(fontSize);
    if (y > layout.y + blockHeight - 5) return;
    doc.text(line, layout.margin + 5, y);
  });

  layout.y += blockHeight;
}

async function renderStructuredIrlPdf(
  doc: jsPDF,
  params: ExportTrabajadorDocumentoPdfParams,
  tipoNombre: string,
  data: DocumentoIrlEstructurado,
) {
  const c = data.campos;
  const pageWidth = doc.internal.pageSize.getWidth();
  const header = await drawInstitutionalHeader(
    doc,
    params.empresa,
    "ACTA ESTRUCTURADA DE INFORMACION DE RIESGOS LABORALES",
    c.codigo_documento || "NEXTPREV TEMPLATE-01",
    formatDate(new Date()).split(" ")[0],
  );
  const layout: LayoutCursor = {
    margin: header.margin,
    pageWidth,
    pageHeight: doc.internal.pageSize.getHeight(),
    contentWidth: pageWidth - header.margin * 2,
    y: header.yAfter,
  };

  drawFieldRow(doc, layout, "NOMBRE DEL TRABAJADOR", c.trabajador_nombre || safeText(params.trabajador.nombre + " " + params.trabajador.apellido));
  drawFieldRow(doc, layout, "RUN", c.trabajador_rut || safeText(params.trabajador.rut));
  drawFieldRow(doc, layout, "CARGO / AREA", `${safeText(c.trabajador_cargo)} / ${safeText(c.trabajador_area || params.trabajador.area)}`);
  drawFieldRow(doc, layout, "LUGAR DE TRABAJO", safeText(c.lugar_trabajo));

  drawLongTextBlock(doc, layout, "TIPO Y MODALIDAD DE INDUCCION", `Tipo inducción: ${safeText(c.tipo_induccion)}\nModalidad: ${safeText(c.modalidad)}\nActividad: ${safeText(c.tipo_actividad)}`, 8.2, 52);
  drawLongTextBlock(doc, layout, "ESPACIO DE TRABAJO", safeText(c.espacio_trabajo), 8.2, 44);
  drawLongTextBlock(doc, layout, "CONDICIONES AMBIENTALES", safeText(c.condiciones_ambientales), 8.2, 44);
  drawLongTextBlock(doc, layout, "ORDEN Y ASEO", safeText(c.orden_aseo), 8.2, 44);

  const colRiesgo = layout.contentWidth * 0.33;
  const colCons = layout.contentWidth * 0.27;
  const colMedida = layout.contentWidth - colRiesgo - colCons;
  const headerFill: [number, number, number] = [34, 90, 126];
  const headerText: [number, number, number] = [255, 255, 255];

  const drawRiesgoHeader = (titulo: string) => {
    drawRow(doc, layout, layout.margin, [
      { w: colRiesgo + colCons + colMedida, text: titulo, bold: true, align: "center", fillColor: headerFill, textColor: headerText },
    ], { minHeight: 22 });
    drawRow(doc, layout, layout.margin, [
      { w: colRiesgo, text: "RIESGO", bold: true, align: "center", fillColor: [79, 129, 157], textColor: headerText },
      { w: colCons, text: "CONSECUENCIA", bold: true, align: "center", fillColor: [79, 129, 157], textColor: headerText },
      { w: colMedida, text: "MEDIDA PREVENTIVA", bold: true, align: "center", fillColor: [79, 129, 157], textColor: headerText },
    ], { minHeight: 20 });
  };

  drawRiesgoHeader("RIESGOS GENERALES");
  c.riesgos_generales_tabla.forEach((row) => {
    drawRow(doc, layout, layout.margin, [
      { w: colRiesgo, text: row.peligro, fontSize: 8.2 },
      { w: colCons, text: row.consecuencia, fontSize: 8.2 },
      { w: colMedida, text: row.medida, fontSize: 8.2 },
    ], { minHeight: 20 });
  });

  drawRiesgoHeader("RIESGOS ESPECIFICOS");
  c.riesgos_especificos_tabla.forEach((row) => {
    drawRow(doc, layout, layout.margin, [
      { w: colRiesgo, text: row.peligro, fontSize: 8.2 },
      { w: colCons, text: row.consecuencia, fontSize: 8.2 },
      { w: colMedida, text: row.medida, fontSize: 8.2 },
    ], { minHeight: 20 });
  });

  drawLongTextBlock(doc, layout, "NORMAS GENERALES", safeText(c.normas_generales), 8.2, 44);
  drawLongTextBlock(doc, layout, "PROTOCOLOS MINSAL", safeText(c.protocolos_minsal), 8.2, 44);
  drawLongTextBlock(doc, layout, "DOCUMENTOS ASOCIADOS", safeText(c.documentos_asociados), 8.2, 44);
  drawLongTextBlock(doc, layout, "DECLARACION", safeText(c.declaracion), 8.2, 46);

  const sigH = 72;
  ensurePageSpace(doc, layout, sigH);
  const sigW = layout.contentWidth / 2;
  drawCell(doc, { x: layout.margin, y: layout.y, w: sigW, h: sigH, text: `FIRMA TRABAJADOR\n${safeText(c.firma_trabajador)}`, fontSize: 8.2, bold: true });
  drawCell(doc, { x: layout.margin + sigW, y: layout.y, w: sigW, h: sigH, text: `FIRMA RELATOR / PREVENTOR\n${safeText(c.firma_relator)}`, fontSize: 8.2, bold: true });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Estado documental: ${estadoLabel(params.estado)} | Documento: ${tipoNombre}`, layout.margin, layout.pageHeight - 14);
}

async function renderStructuredEppPdf(
  doc: jsPDF,
  params: ExportTrabajadorDocumentoPdfParams,
  tipoNombre: string,
  data: DocumentoEppEstructurado,
) {
  const c = data.campos;
  const pageWidth = doc.internal.pageSize.getWidth();
  const header = await drawInstitutionalHeader(
    doc,
    params.empresa,
    "ACTA ESTRUCTURADA DE ENTREGA DE EPP",
    "NEXTPREV TEMPLATE-02",
    formatDate(new Date()).split(" ")[0],
  );
  const layout: LayoutCursor = {
    margin: header.margin,
    pageWidth,
    pageHeight: doc.internal.pageSize.getHeight(),
    contentWidth: pageWidth - header.margin * 2,
    y: header.yAfter,
  };

  drawFieldRow(doc, layout, "NOMBRE DEL TRABAJADOR", c.trabajador_nombre || safeText(params.trabajador.nombre + " " + params.trabajador.apellido));
  drawFieldRow(doc, layout, "RUN", c.trabajador_rut || safeText(params.trabajador.rut));
  drawFieldRow(doc, layout, "AREA", safeText(c.area || params.trabajador.area));
  drawFieldRow(doc, layout, "FECHA", safeText(c.fecha));

  const colDescripcion = layout.contentWidth * 0.20;
  const colMarca = layout.contentWidth * 0.12;
  const colModelo = layout.contentWidth * 0.12;
  const colColorTalla = layout.contentWidth * 0.12;
  const colFecha = layout.contentWidth * 0.11;
  const colSi = layout.contentWidth * 0.06;
  const colNo = layout.contentWidth * 0.06;
  const colObs = layout.contentWidth - colDescripcion - colMarca - colModelo - colColorTalla - colFecha - colSi - colNo;
  const headerFill: [number, number, number] = [34, 90, 126];
  const headerText: [number, number, number] = [255, 255, 255];

  const drawHeader = () => {
    drawRow(doc, layout, layout.margin, [
      { w: colDescripcion, text: "DESCRIPCION", bold: true, fontSize: 8, align: "center", fillColor: headerFill, textColor: headerText },
      { w: colMarca, text: "MARCA", bold: true, fontSize: 8, align: "center", fillColor: headerFill, textColor: headerText },
      { w: colModelo, text: "MODELO", bold: true, fontSize: 8, align: "center", fillColor: headerFill, textColor: headerText },
      { w: colColorTalla, text: "COLOR/TALLA", bold: true, fontSize: 8, align: "center", fillColor: headerFill, textColor: headerText },
      { w: colFecha, text: "FECHA ENTREGA", bold: true, fontSize: 8, align: "center", fillColor: headerFill, textColor: headerText },
      { w: colSi, text: "SI", bold: true, fontSize: 8, align: "center", fillColor: headerFill, textColor: headerText },
      { w: colNo, text: "NO", bold: true, fontSize: 8, align: "center", fillColor: headerFill, textColor: headerText },
      { w: colObs, text: "OBSERVACIONES", bold: true, fontSize: 8, align: "center", fillColor: headerFill, textColor: headerText },
    ], { minHeight: 24 });
  };

  drawHeader();
  c.epp_tabla.forEach((row) => {
    drawRow(doc, layout, layout.margin, [
      { w: colDescripcion, text: row.descripcion, fontSize: 8.2 },
      { w: colMarca, text: row.marca, fontSize: 8.2 },
      { w: colModelo, text: row.modelo, fontSize: 8.2 },
      { w: colColorTalla, text: row.color_talla, fontSize: 8.2 },
      { w: colFecha, text: row.fecha_entrega, fontSize: 8.2, align: "center" },
      { w: colSi, text: row.si ? "X" : "", fontSize: 9, align: "center" },
      { w: colNo, text: row.no ? "X" : "", fontSize: 9, align: "center" },
      { w: colObs, text: row.observaciones, fontSize: 8.2 },
    ], { minHeight: 22, onPageBreak: drawHeader });
  });

  drawLongTextBlock(doc, layout, "OBSERVACIONES GENERALES", c.observaciones_generales || "Sin observaciones.", 8.2, 42);
  drawLongTextBlock(doc, layout, "DECLARACION", c.declaracion, 8.2, 46);

  const sigH = 72;
  ensurePageSpace(doc, layout, sigH);
  const sigW = layout.contentWidth / 2;
  drawCell(doc, { x: layout.margin, y: layout.y, w: sigW, h: sigH, text: `FIRMA TRABAJADOR\n${safeText(c.firma_trabajador)}`, fontSize: 8.2, bold: true });
  drawCell(doc, { x: layout.margin + sigW, y: layout.y, w: sigW, h: sigH, text: `ENTREGADO POR\n${safeText(c.entregado_por)}`, fontSize: 8.2, bold: true });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Estado documental: ${estadoLabel(params.estado)} | Documento: ${tipoNombre}`, layout.margin, layout.pageHeight - 14);
}

export async function renderEppPdf(doc: jsPDF, params: ExportTrabajadorDocumentoPdfParams, tipoNombre: string) {
  const structured = parseDocumentoEstructurado(params.contenido);
  if (structured?.plantillaCodigo === "EPP") {
    await renderStructuredEppPdf(doc, params, tipoNombre, structured);
    return;
  }

  const { trabajador, contenido } = params;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const header = await drawInstitutionalHeader(
    doc,
    params.empresa,
    "REGISTRO DE ENTREGA DE ELEMENTOS DE PROTECCION PERSONAL",
    "NEXTPREV TEMPLATE-02",
    formatDate(new Date()).split(" ")[0],
  );

  const layout: LayoutCursor = {
    margin: header.margin,
    pageWidth,
    pageHeight,
    contentWidth: pageWidth - header.margin * 2,
    y: header.yAfter,
  };

  drawFieldRow(doc, layout, "NOMBRE DEL TRABAJADOR", `${trabajador.nombre} ${trabajador.apellido}`);
  drawFieldRow(doc, layout, "RUN", safeText(trabajador.rut));
  drawFieldRow(doc, layout, "AREA", safeText(trabajador.area));
  layout.y += 8;

  const colArticulo = layout.contentWidth * 0.40;
  const colFecha = layout.contentWidth * 0.18;
  const colSi = layout.contentWidth * 0.08;
  const colNo = layout.contentWidth * 0.08;
  const colObs = layout.contentWidth - colArticulo - colFecha - colSi - colNo;

  const drawHeader = () => {
    drawRow(
      doc,
      layout,
      layout.margin,
      [
        { w: colArticulo, text: "DESCRIPCION ARTICULO", bold: true, fontSize: 8, align: "center" },
        { w: colFecha, text: "FECHA ENTREGA", bold: true, fontSize: 8, align: "center" },
        { w: colSi, text: "SI", bold: true, fontSize: 8, align: "center" },
        { w: colNo, text: "NO", bold: true, fontSize: 8, align: "center" },
        { w: colObs, text: "OBSERVACIONES", bold: true, fontSize: 8, align: "center" },
      ],
      { minHeight: 24 },
    );
  };

  drawHeader();

  const rows = parseEppItems(contenido);
  const today = formatDate(new Date()).split(" ")[0];

  for (let i = 0; i < 16; i++) {
    const item = rows[i] ?? "";
    drawRow(
      doc,
      layout,
      layout.margin,
      [
        { w: colArticulo, text: item.toUpperCase(), fontSize: 8.2, align: "left" },
        { w: colFecha, text: item ? today : "", fontSize: 8.2, align: "center" },
        { w: colSi, text: item ? "X" : "", fontSize: 9, align: "center" },
        { w: colNo, text: "", fontSize: 9, align: "center" },
        { w: colObs, text: "", fontSize: 8, align: "left" },
      ],
      {
        minHeight: 19,
        onPageBreak: () => {
          drawHeader();
        },
      },
    );
  }

  layout.y += 8;
  drawLongTextBlock(
    doc,
    layout,
    "OBSERVACIONES GENERALES Y DETALLE OPERACIONAL",
    contenido || "Sin observaciones registradas.",
    8,
  );

  const declaracion =
    "COMO TRABAJADOR DECLARO HABER RECIBIDO E INSTRUIDO SOBRE EL CORRECTO USO, CUIDADO Y MANTENCION DE LOS ELEMENTOS DE PROTECCION PERSONAL.";
  drawLongTextBlock(doc, layout, "DECLARACION", declaracion, 8.2, 54);

  const sigH = 70;
  ensurePageSpace(doc, layout, sigH);
  const sigW = layout.contentWidth / 2;
  drawCell(doc, {
    x: layout.margin,
    y: layout.y,
    w: sigW,
    h: sigH,
    text:
      normalizeEstado(params.estado) === "firmado"
        ? `FIRMA TRABAJADOR\n${safeText(params.firmadoPor)}`
        : "FIRMA TRABAJADOR",
    fontSize: 8.4,
    bold: true,
    align: "left",
  });
  drawCell(doc, {
    x: layout.margin + sigW,
    y: layout.y,
    w: sigW,
    h: sigH,
    text:
      normalizeEstado(params.estado) === "firmado"
        ? `ENTREGADO POR\n${safeText(params.firmadoPor)}\n${formatDate(params.firmadoEn)}`
        : "ENTREGADO POR",
    fontSize: 8.4,
    bold: true,
    align: "left",
  });
  layout.y += sigH;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(
    `Estado documental: ${estadoLabel(params.estado)} | Documento: ${tipoNombre}`,
    layout.margin,
    layout.pageHeight - 14,
  );
}

export async function renderIRLPdf(doc: jsPDF, params: ExportTrabajadorDocumentoPdfParams, tipoNombre: string) {
  const structured = parseDocumentoEstructurado(params.contenido);
  if (structured?.plantillaCodigo === "IRL") {
    await renderStructuredIrlPdf(doc, params, tipoNombre, structured);
    return;
  }

  const { trabajador, contenido } = params;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const header = await drawInstitutionalHeader(
    doc,
    params.empresa,
    "ACTA DE INFORMACION DE RIESGOS LABORALES",
    "NEXTPREV TEMPLATE-01",
    formatDate(new Date()).split(" ")[0],
  );

  const layout: LayoutCursor = {
    margin: header.margin,
    pageWidth,
    pageHeight,
    contentWidth: pageWidth - header.margin * 2,
    y: header.yAfter,
  };

  drawFieldRow(doc, layout, "NOMBRE DEL TRABAJADOR", `${trabajador.nombre} ${trabajador.apellido}`);
  drawFieldRow(doc, layout, "RUN", safeText(trabajador.rut));
  drawFieldRow(
    doc,
    layout,
    "CARGO / AREA",
    `${safeText(trabajador.cargo)} / ${safeText(trabajador.area)}`,
  );
  layout.y += 8;

  const sections = parseIrlSections(contenido);
  const rows = Math.max(
    sections.riesgos.length,
    sections.consecuencias.length,
    sections.medidas.length,
    8,
  );
  const colRiesgo = layout.contentWidth * 0.33;
  const colCons = layout.contentWidth * 0.25;
  const colMedida = layout.contentWidth - colRiesgo - colCons;

  const drawHeader = () => {
    drawRow(
      doc,
      layout,
      layout.margin,
      [
        { w: colRiesgo, text: "RIESGO IDENTIFICADO", bold: true, fontSize: 8, align: "center" },
        { w: colCons, text: "CONSECUENCIAS", bold: true, fontSize: 8, align: "center" },
        {
          w: colMedida,
          text: "MEDIDAS PREVENTIVAS Y CONTROL",
          bold: true,
          fontSize: 8,
          align: "center",
        },
      ],
      { minHeight: 24 },
    );
  };

  drawHeader();

  for (let i = 0; i < rows; i++) {
    const riesgo = sections.riesgos[i] ?? "";
    const consecuencia = sections.consecuencias[i] ?? "";
    const medida = sections.medidas[i] ?? "";
    drawRow(
      doc,
      layout,
      layout.margin,
      [
        { w: colRiesgo, text: riesgo, fontSize: 8.2, align: "left" },
        { w: colCons, text: consecuencia, fontSize: 8.2, align: "left" },
        { w: colMedida, text: medida, fontSize: 8.2, align: "left" },
      ],
      {
        minHeight: 22,
        onPageBreak: () => {
          drawHeader();
        },
      },
    );
  }

  layout.y += 8;
  drawLongTextBlock(
    doc,
    layout,
    "DETALLE DOCUMENTAL REGISTRADO",
    contenido || "Sin detalle adicional",
    8,
  );

  const declaracion =
    "El trabajador declara haber recibido informacion clara sobre los riesgos de su puesto y las medidas preventivas obligatorias, comprometiendose a su cumplimiento.";
  drawLongTextBlock(doc, layout, "DECLARACION", declaracion, 8.3, 56);

  const sigH = 72;
  ensurePageSpace(doc, layout, sigH);
  const sigW = layout.contentWidth / 2;
  drawCell(doc, {
    x: layout.margin,
    y: layout.y,
    w: sigW,
    h: sigH,
    text:
      normalizeEstado(params.estado) === "firmado"
        ? `FIRMA TRABAJADOR\n${safeText(params.firmadoPor)}`
        : "FIRMA TRABAJADOR",
    fontSize: 8.4,
    bold: true,
    align: "left",
  });
  drawCell(doc, {
    x: layout.margin + sigW,
    y: layout.y,
    w: sigW,
    h: sigH,
    text:
      normalizeEstado(params.estado) === "firmado"
        ? `FIRMA PREVENCIONISTA / EMPLEADOR\n${safeText(params.firmadoPor)}\n${formatDate(params.firmadoEn)}`
        : "FIRMA PREVENCIONISTA / EMPLEADOR",
    fontSize: 8.4,
    bold: true,
    align: "left",
  });
  layout.y += sigH;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(
    `Estado documental: ${estadoLabel(params.estado)} | Documento: ${tipoNombre}`,
    layout.margin,
    layout.pageHeight - 14,
  );
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

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Formato generico aplicado por no existir plantilla especializada.", margin, pageHeight - 20);
}

export async function exportTrabajadorDocumentoPdf(params: ExportTrabajadorDocumentoPdfParams) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const tipoNombre = params.documento?.tipo.nombre ?? "Documento de trabajador";
  const template = detectTemplate(tipoNombre);

  if (template === "epp") {
    await renderEppPdf(doc, params, tipoNombre);
  } else if (template === "irl") {
    await renderIRLPdf(doc, params, tipoNombre);
  } else {
    renderGenericPdf(doc, params, tipoNombre);
  }

  doc.save(buildFilename(tipoNombre, params.trabajador));
}