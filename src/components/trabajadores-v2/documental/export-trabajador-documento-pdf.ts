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
  const pageHeight = doc.internal.pageSize.getHeight();
  const BLU: [number, number, number] = [0, 70, 127];  // Baker blue
  const BLU2: [number, number, number] = [0, 112, 192]; // lighter blue
  const WHT: [number, number, number] = [255, 255, 255];

  // ── Institutional header ─────────────────────────────────────────────────
  const header = await drawInstitutionalHeader(
    doc,
    params.empresa,
    "ACTA DE INFORMACION SOBRE LOS RIESGOS LABORALES, ART. 15 DEL D.S. 44",
    c.codigo_documento || "REG-IRL-03",
    formatDate(new Date()).split(" ")[0],
  );

  const layout: LayoutCursor = {
    margin: header.margin,
    pageWidth,
    pageHeight,
    contentWidth: pageWidth - header.margin * 2,
    y: header.yAfter,
  };

  const cw = layout.contentWidth;
  const ml = layout.margin;

  // Helper: draw a full-width blue section header
  function drawSectionHeader(text: string) {
    ensurePageSpace(doc, layout, 22);
    drawCell(doc, { x: ml, y: layout.y, w: cw, h: 22, text, bold: true, align: "left", fillColor: BLU, textColor: WHT, fontSize: 9, padding: 6 });
    layout.y += 22;
  }

  // Helper: draw a full-width paragraph block (auto-height)
  function drawParagraph(text: string, fontSize = 8.2, minH = 24) {
    const lines = doc.setFontSize(fontSize) && wrapText(doc, text, cw - 12);
    const h = Math.max(minH, lines.length * lineHeight(fontSize) + 10);
    ensurePageSpace(doc, layout, h);
    doc.rect(ml, layout.y, cw, h);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(fontSize);
    let ty = layout.y + 8;
    lines.forEach((line) => {
      doc.text(line, ml + 6, ty);
      ty += lineHeight(fontSize);
    });
    layout.y += h;
  }

  // Helper: draw risk table (3-col) with given rows
  function drawRiskTable(rows: Array<{ peligro: string; consecuencia: string; medida: string }>) {
    if (!rows.length) return;
    const c1 = cw * 0.33;
    const c2 = cw * 0.27;
    const c3 = cw - c1 - c2;
    // column headers
    drawRow(doc, layout, ml, [
      { w: c1, text: "RIESGOS", bold: true, fontSize: 8, align: "center", fillColor: BLU2, textColor: WHT },
      { w: c2, text: "CONSECUENCIAS", bold: true, fontSize: 8, align: "center", fillColor: BLU2, textColor: WHT },
      { w: c3, text: "MEDIDAS PREVENTIVAS Y METODOS DE TRABAJO CORRECTOS", bold: true, fontSize: 8, align: "center", fillColor: BLU2, textColor: WHT },
    ], { minHeight: 22 });
    rows.forEach((row) => {
      drawRow(doc, layout, ml, [
        { w: c1, text: `• ${row.peligro}`, fontSize: 7.5 },
        { w: c2, text: `• ${row.consecuencia}`, fontSize: 7.5 },
        { w: c3, text: `• ${row.medida}`, fontSize: 7.5 },
      ], { minHeight: 18 });
    });
  }

  // Helper: draw a checkbox grid row
  function drawCheckboxRow(options: { label: string; checked: boolean }[][], title: string) {
    drawSectionHeader(title);
    options.forEach((rowOpts) => {
      const colW = cw / rowOpts.length;
      const h = 20;
      ensurePageSpace(doc, layout, h);
      let cx = ml;
      rowOpts.forEach((opt) => {
        drawCell(doc, { x: cx, y: layout.y, w: colW, h, text: `[${opt.checked ? "X" : " "}]  ${opt.label}`, fontSize: 8.2, padding: 5 });
        cx += colW;
      });
      layout.y += h;
    });
  }

  // ── Intro legal ─────────────────────────────────────────────────────────
  const empresaNombrePdf = safeText(params.empresa?.razonSocial ?? params.empresa?.nombre ?? "La empresa");
  const introText = `${empresaNombrePdf}, en conformidad con lo dispuesto en el Decreto Supremo N°44 del Ministerio del Trabajo y Previsión Social, que aprueba el Nuevo Reglamento sobre la Gestión Preventiva de los Riesgos Laborales para un Entorno de Trabajo Seguro y Saludable, establece en su Titulo II: Gestión de la Prevención de Riesgos en los Lugares de Trabajo, Parrafo 4, articulo N°15, la obligación de garantizar que cada persona trabajadora, antes de iniciar sus labores, reciba información clara, oportuna y adecuada sobre:\n- Los riesgos asociados a sus funciones\n- Las medidas preventivas a implementar.\n- Los métodos o procedimientos de trabajo seguros, definidos conforme a la Matriz de Riesgos y el Programa de Trabajo Preventivo`;
  drawParagraph(introText, 8.2, 60);
  drawParagraph("Se deberá actualizar esta información cada vez que se incorpore un nuevo proceso productivo o se produzcan cambios en las tecnologías, materiales o sustancias utilizadas en el desempeño de las labores.", 8.2, 20);

  // ── Sección 1: Tipo de inducción ─────────────────────────────────────────
  const tipoInduccion = (c.tipo_induccion ?? "Persona trabajadora nueva").toLowerCase();
  drawCheckboxRow([
    [
      { label: "Persona trabajadora nueva", checked: tipoInduccion.includes("nueva") },
      { label: "Persona trabajadora con ausencia prolongada", checked: tipoInduccion.includes("ausencia") },
    ],
    [
      { label: "Persona trabajadora reubicada/con nuevo cargo", checked: tipoInduccion.includes("reubicad") || tipoInduccion.includes("nuevo cargo") },
      { label: "Por nuevo proceso productivo, cambio de tecnologias, materiales o sustancias", checked: tipoInduccion.includes("proceso") || tipoInduccion.includes("tecnolog") },
    ],
    [
      { label: "Reinducción del proceso y actividades", checked: tipoInduccion.includes("proceso y actividades") },
      { label: "Reinducción especifica según eventos", checked: tipoInduccion.includes("evento") },
    ],
  ], "1.  TIPO INDUCCION (complete la opcion con una X)");

  // ── Sección 2: Modalidad ─────────────────────────────────────────────────
  const modalidad = (c.modalidad ?? "Presencial").toLowerCase();
  drawCheckboxRow([
    [
      { label: "Presencial", checked: modalidad.includes("presencial") },
      { label: "On Line", checked: modalidad.includes("on line") || modalidad.includes("online") },
    ],
  ], "2.  MODALIDAD DE LA INDUCCION (complete la opcion con una X)");

  // ── Sección 3: Tipo de actividad ─────────────────────────────────────────
  const tipoAct = (c.tipo_actividad ?? "Interna").toLowerCase();
  drawCheckboxRow([
    [
      { label: "Interna", checked: tipoAct.includes("intern") },
      { label: "Externa", checked: tipoAct.includes("extern") },
    ],
  ], "3.  TIPO DE ACTIVIDAD (complete la opcion con una X)");

  // ── Sección 4: Identificación del trabajador ─────────────────────────────
  drawSectionHeader("4.  IDENTIFICACION DE LA PERSONA TRABAJADORA");
  // Row: Nombre | RUT
  const nameW = cw * 0.62;
  const rutW = cw - nameW;
  const rowH4 = 22;
  ensurePageSpace(doc, layout, rowH4);
  drawCell(doc, { x: ml, y: layout.y, w: nameW, h: rowH4, text: `Nombre y Apellidos: ${safeText(c.trabajador_nombre || params.trabajador.nombre + " " + params.trabajador.apellido)}`, fontSize: 8.2, padding: 5 });
  drawCell(doc, { x: ml + nameW, y: layout.y, w: rutW, h: rowH4, text: `R.U.T: ${safeText(c.trabajador_rut || params.trabajador.rut)}`, fontSize: 8.2, padding: 5 });
  layout.y += rowH4;
  // Row: Cargo | Fecha
  const cargoW = cw * 0.5;
  const fechaW = cw - cargoW;
  ensurePageSpace(doc, layout, rowH4);
  drawCell(doc, { x: ml, y: layout.y, w: cargoW, h: rowH4, text: `Cargo: ${safeText(c.trabajador_cargo || c.cargo)}`, fontSize: 8.2, padding: 5 });
  drawCell(doc, { x: ml + cargoW, y: layout.y, w: fechaW, h: rowH4, text: `Fecha: ${safeText(c.fecha)}`, fontSize: 8.2, padding: 5 });
  layout.y += rowH4;
  // Row: Área | Duración
  ensurePageSpace(doc, layout, rowH4);
  drawCell(doc, { x: ml, y: layout.y, w: cargoW, h: rowH4, text: `Area: ${safeText(c.trabajador_area || params.trabajador.area)}`, fontSize: 8.2, padding: 5 });
  drawCell(doc, { x: ml + cargoW, y: layout.y, w: fechaW, h: rowH4, text: `Duración de la capacitación: ${safeText(c.duracion_capacitacion)}`, fontSize: 8.2, padding: 5 });
  layout.y += rowH4;
  // Row: Teléfono full-width
  ensurePageSpace(doc, layout, rowH4);
  drawCell(doc, { x: ml, y: layout.y, w: cw, h: rowH4, text: `Teléfono de emergencias (familiar/contacto): ${safeText(c.telefono_emergencia)}`, fontSize: 8.2, padding: 5 });
  layout.y += rowH4;

  // ── Sección 5: Características del lugar de trabajo ──────────────────────
  drawSectionHeader("5.  CARACTERISTICAS DEL LUGAR DE TRABAJO");
  const labW = cw * 0.22;
  const valW = cw - labW;
  const charFields: [string, string][] = [
    ["Lugar de trabajo especifico", safeText(c.lugar_trabajo)],
    ["Espacio de trabajo", safeText(c.espacio_trabajo)],
    ["Condiciones ambientales del puesto de trabajo", safeText(c.condiciones_ambientales)],
    ["Condiciones de orden y aseo exigidos por el puesto de trabajo", safeText(c.orden_aseo)],
  ];
  charFields.forEach(([label, value]) => {
    const lh = Math.max(40, measureCellHeight(doc, value, valW - 8, 8.2, 4) + 8);
    ensurePageSpace(doc, layout, lh);
    drawCell(doc, { x: ml, y: layout.y, w: labW, h: lh, text: label, bold: true, fontSize: 8, padding: 5 });
    drawCell(doc, { x: ml + labW, y: layout.y, w: valW, h: lh, text: value, fontSize: 8.2, padding: 5 });
    layout.y += lh;
  });

  // ── Sección 6: Riesgos generales ─────────────────────────────────────────
  drawSectionHeader("6.  RIESGOS GENERALES");
  drawRiskTable(c.riesgos_generales_tabla ?? []);

  // ── Sección 6.1: Riesgos por máquinas ────────────────────────────────────
  drawSectionHeader("6.1.  RIESGOS POR EL USO DE MAQUINAS Y/O EQUIPOS");
  drawRiskTable(c.riesgos_maquinas_tabla ?? []);

  // ── Sección 6.2: Riesgos químicos ────────────────────────────────────────
  drawSectionHeader("6.2.  RIESGOS POR USO O EXPOSICION A AGENTES QUIMICOS");
  drawRiskTable(c.riesgos_quimicos_tabla ?? []);

  // ── Sección 6.3: Riesgos psicosociales ───────────────────────────────────
  drawSectionHeader("6.3.  RIESGOS PSICOSOCIALES");
  drawRiskTable(c.riesgos_psicosociales_tabla ?? []);

  // ── Sección 7: Riesgos específicos ───────────────────────────────────────
  drawSectionHeader("7.  RIESGOS ESPECIFICOS");
  drawSectionHeader("7.1.  RIESGOS INHERENTES A LA ACTIVIDAD REALIZADA");

  // Cargo bloque
  const cargoBlkH = 22;
  ensurePageSpace(doc, layout, cargoBlkH);
  drawCell(doc, { x: ml, y: layout.y, w: cw, h: cargoBlkH, text: "CARGO DEL TRABAJADOR (SEGUN CONTRATO)", bold: true, fontSize: 8, fillColor: [230, 230, 230], padding: 6 });
  layout.y += cargoBlkH;
  drawParagraph(safeText(c.trabajador_cargo || c.cargo), 8.2, 22);

  // Descripción de actividad
  drawCell(doc, { x: ml, y: layout.y, w: cw, h: 18, text: "DESCRIPCION DE LA ACTIVIDAD", bold: true, fontSize: 8, fillColor: [230, 230, 230], padding: 5 });
  layout.y += 18;
  drawParagraph(safeText(c.descripcion_actividad), 8.2, 30);

  // Tareas | Lugares
  const half = cw / 2;
  const tareasLines = (c.tareas_realiza ?? "").split("\n").filter(Boolean);
  const lugaresLines = (c.lugares_trabajo_cargo ?? "").split("\n").filter(Boolean);
  const tareasH = Math.max(60, tareasLines.length * lineHeight(8) + 24);
  const lugaresH = Math.max(60, lugaresLines.length * lineHeight(8) + 24);
  const tareasLugaresH = Math.max(tareasH, lugaresH);
  ensurePageSpace(doc, layout, tareasLugaresH + 20);
  // headers
  drawCell(doc, { x: ml, y: layout.y, w: half, h: 18, text: "TAREAS QUE REALIZA", bold: true, fontSize: 8, fillColor: BLU2, textColor: WHT, padding: 5 });
  drawCell(doc, { x: ml + half, y: layout.y, w: half, h: 18, text: "LUGARES DE TRABAJO", bold: true, fontSize: 8, fillColor: BLU2, textColor: WHT, padding: 5 });
  layout.y += 18;
  const tareasText = tareasLines.map((l) => l.replace(/^[•\-]\s*/, "• ")).join("\n");
  const lugaresText = lugaresLines.map((l) => l.replace(/^[•\-]\s*/, "• ")).join("\n");
  drawCell(doc, { x: ml, y: layout.y, w: half, h: tareasLugaresH, text: tareasText, fontSize: 7.5, padding: 5 });
  drawCell(doc, { x: ml + half, y: layout.y, w: half, h: tareasLugaresH, text: lugaresText, fontSize: 7.5, padding: 5 });
  layout.y += tareasLugaresH;

  // Herramientas | EPP requerido
  const herramH = Math.max(60, measureCellHeight(doc, safeText(c.herramientas_equipos), half - 10, 8, 5) + 24);
  const eppInfoH = Math.max(60, measureCellHeight(doc, safeText(c.epp_requerido_info), half - 10, 8, 5) + 24);
  const herramEppH = Math.max(herramH, eppInfoH);
  ensurePageSpace(doc, layout, herramEppH + 20);
  drawCell(doc, { x: ml, y: layout.y, w: half, h: 18, text: "HERRAMIENTAS Y EQUIPOS", bold: true, fontSize: 8, fillColor: BLU2, textColor: WHT, padding: 5 });
  drawCell(doc, { x: ml + half, y: layout.y, w: half, h: 18, text: "ELEMENTOS DE PROTECCION PERSONAL", bold: true, fontSize: 8, fillColor: BLU2, textColor: WHT, padding: 5 });
  layout.y += 18;
  drawCell(doc, { x: ml, y: layout.y, w: half, h: herramEppH, text: safeText(c.herramientas_equipos), fontSize: 7.5, padding: 5 });
  drawCell(doc, { x: ml + half, y: layout.y, w: half, h: herramEppH, text: safeText(c.epp_requerido_info), fontSize: 7.5, padding: 5 });
  layout.y += herramEppH;

  // Riesgos presentes en las tareas (table with 2 cols: Riesgos | Medidas)
  const r7Rows = c.riesgos_tareas_tabla ?? [];
  if (r7Rows.length) {
    const r7SubH = 18;
    ensurePageSpace(doc, layout, r7SubH);
    drawCell(doc, { x: ml, y: layout.y, w: cw, h: r7SubH, text: "RIESGOS PRESENTES EN LAS TAREAS", bold: true, fontSize: 8, fillColor: [230, 230, 230], padding: 5 });
    layout.y += r7SubH;
    drawRow(doc, layout, ml, [
      { w: cw * 0.5, text: "RIESGOS PRESENTES", bold: true, fontSize: 8, align: "center", fillColor: BLU, textColor: WHT },
      { w: cw * 0.5, text: "MEDIDAS PREVENTIVAS", bold: true, fontSize: 8, align: "center", fillColor: BLU, textColor: WHT },
    ], { minHeight: 18 });
    r7Rows.forEach((row) => {
      drawRow(doc, layout, ml, [
        { w: cw * 0.5, text: `• ${row.peligro}`, fontSize: 7.5 },
        { w: cw * 0.5, text: `• ${row.medida}`, fontSize: 7.5 },
      ], { minHeight: 18 });
    });
  }

  // Riesgos en el lugar de trabajo
  const r7LRows = c.riesgos_lugar_tabla ?? [];
  if (r7LRows.length) {
    const r7LhH = 18;
    ensurePageSpace(doc, layout, r7LhH);
    drawCell(doc, { x: ml, y: layout.y, w: cw, h: r7LhH, text: "RIESGOS PRESENTES EN EL LUGAR DE TRABAJO", bold: true, fontSize: 8, fillColor: [230, 230, 230], padding: 5 });
    layout.y += r7LhH;
    drawRow(doc, layout, ml, [
      { w: cw * 0.5, text: "RIESGOS PRESENTES", bold: true, fontSize: 8, align: "center", fillColor: BLU, textColor: WHT },
      { w: cw * 0.5, text: "MEDIDAS PREVENTIVAS", bold: true, fontSize: 8, align: "center", fillColor: BLU, textColor: WHT },
    ], { minHeight: 18 });
    r7LRows.forEach((row) => {
      drawRow(doc, layout, ml, [
        { w: cw * 0.5, text: `• ${row.peligro}`, fontSize: 7.5 },
        { w: cw * 0.5, text: `• ${row.medida}`, fontSize: 7.5 },
      ], { minHeight: 18 });
    });
  }

  // ── Sección 8: Normas generales ──────────────────────────────────────────
  drawSectionHeader("8.  NORMAS GENERALES DE SEGURIDAD");

  const normasSections: [string, string][] = [
    ["a)  Ley de Accidentes del Trabajo y Enfermedades Profesionales, Ley 16.744 y su contenido.", c.normas_ley16744 || c.normas_generales],
    ["b)  Riesgos del Manejo Manual de Materiales y sus medidas preventivas (Ley 20.001; Ley 20.949; D.S. 63).", c.normas_mmc],
    ["c)  Control de Emergencias, Incendios, Uso de Extintores, Primeros Auxilios, Atención de Lesionados.", c.normas_emergencias_control],
    ["d)  Actuación en caso de emergencias.", c.normas_emergencias_actuacion],
    ["e)  Res. Exenta 156 SUSESO (Procedimiento en Caso de Accidentes Graves y Fatales).", c.normas_accidentes_graves],
    ["f)  Elementos de Protección Personal (EPP), tipos requeridos, manejo correcto y obligatoriedad de uso.", c.normas_epp_info],
    ["g)  Posición ergonómica en las estaciones de trabajo.", c.normas_ergonomia],
    ["h)  Capacitación teórica sobre el uso y manejo de extintores.", c.normas_extintores],
    ["i)  Señalizaciones de Seguridad.", c.normas_senalizacion],
    ["j)  Procedimientos de Trabajo Seguro.", c.normas_pts_texto || c.pts],
  ];
  normasSections.forEach(([titulo, texto]) => {
    if (!texto) return;
    // sub-header in bold italic
    ensurePageSpace(doc, layout, 18);
    doc.setFillColor(245, 245, 245);
    doc.rect(ml, layout.y, cw, 16, "FD");
    doc.rect(ml, layout.y, cw, 16);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(titulo, ml + 5, layout.y + 11);
    layout.y += 16;
    drawParagraph(texto, 8, 20);
  });

  // ── Sección 8k: Protocolos MINSAL ────────────────────────────────────────
  ensurePageSpace(doc, layout, 18);
  doc.setFillColor(245, 245, 245);
  doc.rect(ml, layout.y, cw, 16, "FD");
  doc.rect(ml, layout.y, cw, 16);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("k)  Protocolos MINSAL", ml + 5, layout.y + 11);
  layout.y += 16;

  const protocolos = (c.normas_protocolos_tabla ?? []).length > 0 ? c.normas_protocolos_tabla : [
    { protocolo: "Protocolo Psicosocial (CEAL/SM)", aplica: "Sí", detalle: "Aplicable a organizaciones con más de 10 trabajadores. Vigilancia de salud mental." },
    { protocolo: "Protocolo TMERT/MMC", aplica: "Sí", detalle: "Prevención de trastornos musculoesqueléticos. Movimientos repetitivos y manipulación de cargas." },
  ];
  const pw1 = cw * 0.25;
  const pw2 = cw * 0.10;
  const pw3 = cw - pw1 - pw2;
  drawRow(doc, layout, ml, [
    { w: pw1, text: "PROTOCOLO", bold: true, fontSize: 8, align: "center", fillColor: BLU, textColor: WHT },
    { w: pw2, text: "APLICA", bold: true, fontSize: 8, align: "center", fillColor: BLU, textColor: WHT },
    { w: pw3, text: "DETALLE", bold: true, fontSize: 8, align: "center", fillColor: BLU, textColor: WHT },
  ], { minHeight: 20 });
  protocolos.forEach((p) => {
    drawRow(doc, layout, ml, [
      { w: pw1, text: p.protocolo, fontSize: 7.5 },
      { w: pw2, text: p.aplica, fontSize: 7.5, align: "center" },
      { w: pw3, text: p.detalle, fontSize: 7.5 },
    ], { minHeight: 20 });
  });

  // ── Sección 8l: Sustancias químicas ──────────────────────────────────────
  if (c.normas_quimicos) {
    ensurePageSpace(doc, layout, 18);
    doc.setFillColor(245, 245, 245);
    doc.rect(ml, layout.y, cw, 16, "FD");
    doc.rect(ml, layout.y, cw, 16);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("l)  Sustancias Quimicas Peligrosas a utilizar en las areas de trabajo.", ml + 5, layout.y + 11);
    layout.y += 16;
    drawParagraph(c.normas_quimicos, 8, 20);
  }

  // ── Sección 9: Documentos ─────────────────────────────────────────────────
  drawSectionHeader("9.  DOCUMENTOS");
  const ptsList = c.documentos_pts_lista ?? [];
  const hdsList = c.documentos_hds_lista ?? [];
  const otrosList = c.documentos_otros_lista ?? [];

  if (ptsList.length) {
    drawParagraph("PROCEDIMIENTOS DE TRABAJO SEGURO:", 8, 16);
    drawParagraph(ptsList.map((s) => `- ${s}`).join("\n"), 8, 20);
  }
  if (hdsList.length) {
    drawParagraph("HOJAS DE DATOS DE SEGURIDAD DE PRODUCTOS QUIMICOS:", 8, 16);
    drawParagraph(hdsList.map((s) => `- ${s}`).join("\n"), 8, 20);
  }
  if (otrosList.length) {
    drawParagraph("OTROS:", 8, 16);
    drawParagraph(otrosList.map((s) => `- ${s}`).join("\n"), 8, 20);
  }
  // Fallback to legacy documentos_asociados
  if (!ptsList.length && !hdsList.length && !otrosList.length && c.documentos_asociados) {
    drawParagraph(c.documentos_asociados, 8.2, 24);
  }

  // ── Sección 10: Declaración ───────────────────────────────────────────────
  drawSectionHeader("10.  DECLARACION DE RECEPCION DE LA INFORMACION");
  const declText = c.declaracion || `Declaro haber recibido la Información sobre los Riesgos Laborales, impartida por ${empresaNombrePdf}. Dicha actividad contempla todos los puntos indicados en el presente documento y se ha llevado a cabo antes de mi ingreso a las instalaciones. Se me ha informado sobre los riesgos a los cuales estaré expuesto, las medidas de prevención que debo adoptar y las herramientas necesarias para su aplicación. Entiendo y acepto que el incumplimiento de las medidas de control señaladas puede derivar en un proceso sancionatorio según lo estipulado en el Reglamento Interno de Higiene y Seguridad.`;
  drawParagraph(declText, 8.2, 40);

  // Compromisos del trabajador
  if (c.compromisos_trabajador?.length) {
    drawParagraph(c.compromisos_trabajador.map((s, i) => `${i + 1}. ${s}`).join("\n"), 8, 30);
  }

  // ── Sección 11: Firmas ────────────────────────────────────────────────────
  const sigH = 80;
  ensurePageSpace(doc, layout, sigH);

  // Trabajador (firma + huella)
  const sigW3 = cw / 3;
  drawCell(doc, { x: ml, y: layout.y, w: sigW3 * 2, h: sigH, text: `FIRMA DE LA PERSONA TRABAJADORA\n\n\n${safeText(c.firma_trabajador || params.trabajador.nombre + " " + params.trabajador.apellido)}`, fontSize: 8.2, bold: true, padding: 8, fillColor: BLU, textColor: WHT });
  drawCell(doc, { x: ml + sigW3 * 2, y: layout.y, w: sigW3, h: sigH, text: "HUELLA DIGITAL", fontSize: 8.2, bold: true, padding: 8, fillColor: BLU, textColor: WHT });
  layout.y += sigH;

  // Relator
  const relH = 80;
  ensurePageSpace(doc, layout, relH);
  const relW4 = cw / 4;
  drawCell(doc, { x: ml, y: layout.y, w: relW4, h: relH, text: "NOMBRE DEL RELATOR", bold: true, fontSize: 8, fillColor: BLU, textColor: WHT, padding: 6 });
  drawCell(doc, { x: ml + relW4, y: layout.y, w: relW4 * 3, h: relH, text: safeText(c.firma_relator), fontSize: 8.2, padding: 6 });
  layout.y += relH;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  const version = safeText(c.version) ? `Versión: ${c.version}` : "";
  doc.text(`${c.codigo_documento || "REG-IRL-03"}  ${version}  |  ${tipoNombre}`.trim(), ml, layout.pageHeight - 14);
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

  const colDescripcion = layout.contentWidth * 0.19;
  const colMarca = layout.contentWidth * 0.08;
  const colModelo = layout.contentWidth * 0.08;
  const colColorTalla = layout.contentWidth * 0.09;
  const colCantidad = layout.contentWidth * 0.05;
  const colNorma = layout.contentWidth * 0.10;
  const colFecha = layout.contentWidth * 0.09;
  const colVenc = layout.contentWidth * 0.09;
  const colSi = layout.contentWidth * 0.04;
  const colNo = layout.contentWidth * 0.04;
  const colObs = layout.contentWidth - colDescripcion - colMarca - colModelo - colColorTalla - colCantidad - colNorma - colFecha - colVenc - colSi - colNo;
  const headerFill: [number, number, number] = [34, 90, 126];
  const headerText: [number, number, number] = [255, 255, 255];

  const drawHeader = () => {
    drawRow(doc, layout, layout.margin, [
      { w: colDescripcion, text: "DESCRIPCION", bold: true, fontSize: 7, align: "center", fillColor: headerFill, textColor: headerText },
      { w: colMarca, text: "MARCA", bold: true, fontSize: 7, align: "center", fillColor: headerFill, textColor: headerText },
      { w: colModelo, text: "MODELO", bold: true, fontSize: 7, align: "center", fillColor: headerFill, textColor: headerText },
      { w: colColorTalla, text: "COLOR/TALLA", bold: true, fontSize: 7, align: "center", fillColor: headerFill, textColor: headerText },
      { w: colCantidad, text: "CANT.", bold: true, fontSize: 7, align: "center", fillColor: headerFill, textColor: headerText },
      { w: colNorma, text: "NORMA", bold: true, fontSize: 7, align: "center", fillColor: headerFill, textColor: headerText },
      { w: colFecha, text: "F.ENTREGA", bold: true, fontSize: 7, align: "center", fillColor: headerFill, textColor: headerText },
      { w: colVenc, text: "F.VENC.", bold: true, fontSize: 7, align: "center", fillColor: headerFill, textColor: headerText },
      { w: colSi, text: "SI", bold: true, fontSize: 7, align: "center", fillColor: headerFill, textColor: headerText },
      { w: colNo, text: "NO", bold: true, fontSize: 7, align: "center", fillColor: headerFill, textColor: headerText },
      { w: colObs, text: "OBSERVACIONES", bold: true, fontSize: 7, align: "center", fillColor: headerFill, textColor: headerText },
    ], { minHeight: 24 });
  };

  drawHeader();
  c.epp_tabla.forEach((row) => {
    const colorTalla = [row.color, row.talla].filter(Boolean).join("/") || "-";
    drawRow(doc, layout, layout.margin, [
      { w: colDescripcion, text: row.descripcion, fontSize: 7 },
      { w: colMarca, text: row.marca, fontSize: 7 },
      { w: colModelo, text: row.modelo, fontSize: 7 },
      { w: colColorTalla, text: colorTalla, fontSize: 7 },
      { w: colCantidad, text: String(row.cantidad ?? 1), fontSize: 7, align: "center" },
      { w: colNorma, text: row.norma_tecnica || "-", fontSize: 7 },
      { w: colFecha, text: row.fecha_entrega, fontSize: 7, align: "center" },
      { w: colVenc, text: row.fecha_vencimiento_epp || "-", fontSize: 7, align: "center" },
      { w: colSi, text: row.si ? "X" : "", fontSize: 8, align: "center" },
      { w: colNo, text: row.no ? "X" : "", fontSize: 8, align: "center" },
      { w: colObs, text: row.observaciones, fontSize: 7 },
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