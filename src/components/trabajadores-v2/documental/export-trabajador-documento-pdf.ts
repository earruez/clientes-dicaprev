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
  if (normalized.includes("irl") || normalized.includes("riesgo") || normalized.includes("odi")) return "irl";
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

  drawFirmaTrazabilidad(doc, layout, params);

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

// ========== FORM-IRL 03 Helpers ==========

function drawFormTableHeader(
  doc: jsPDF,
  layout: Layout,
  title: string,
  height = 16,
) {
  ensurePage(doc, layout, height);
  doc.setFillColor(245, 245, 245);
  doc.rect(layout.margin, layout.y, layout.width, height, "F");
  doc.rect(layout.margin, layout.y, layout.width, height);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(title, layout.margin + 4, layout.y + 11);
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
  const lines = wrap(doc, text, width - 6);
  doc.setFont("helvetica", bold ? "bold" : "normal");
  doc.setFontSize(7.5);
  let textY = y + 9;
  lines.forEach((line) => {
    const textX =
      align === "center"
        ? x + width / 2
        : x + 3;
    doc.text(line, textX, textY, { align });
    textY += 8;
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
  const rowH = 20;

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

  // Motivo checkboxes
  ensurePage(doc, layout, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(
    "Marque con una cruz (X):",
    layout.margin + 4,
    layout.y + 10,
  );
  layout.y += 12;

  const checkboxW = layout.width / 3 - 2;
  const cbY = layout.y + 8;
  
  doc.rect(layout.margin, layout.y, layout.width, 10);
  drawCheckbox(doc, layout.margin + 4, cbY, c.colaborador_nuevo ?? false);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("Colaborador nuevo", layout.margin + 12, cbY + 4);

  drawCheckbox(doc, layout.margin + checkboxW + 4, cbY, c.cambio_proceso_puesto ?? false);
  doc.text("Cambio en proceso o puesto de trabajo", layout.margin + checkboxW + 12, cbY + 4);

  drawCheckbox(doc, layout.margin + checkboxW * 2 + 4, cbY, c.nuevas_actividades ?? false);
  doc.text("Nuevas actividades", layout.margin + checkboxW * 2 + 12, cbY + 4);

  layout.y += 10;
  layout.y += 6;
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
  ensurePage(doc, layout, 8);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(title, layout.margin, layout.y + 6);
  layout.y += 10;
}

function drawFirmaTrazabilidad(
  doc: jsPDF,
  layout: Layout,
  params: ExportTrabajadorDocumentoPdfParams,
) {
  if (params.estado !== "firmado" || !params.firmadoPor) return;

  const boxHeight = 34;
  ensurePage(doc, layout, boxHeight + 6);
  doc.setDrawColor(160, 160, 160);
  doc.rect(layout.margin, layout.y, layout.width, boxHeight);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("Trazabilidad de firma", layout.margin + 6, layout.y + 11);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Firmado por: ${safeText(params.firmadoPor)}`, layout.margin + 6, layout.y + 21);
  doc.text(`Fecha firma: ${formatDate(params.firmadoEn)}`, layout.margin + 6, layout.y + 30);
  layout.y += boxHeight + 6;
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
  doc.setFontSize(7.5);
  doc.text("3.1 CARACTERÍSTICAS DEL LUGAR DE TRABAJO", layout.margin, layout.y + 6);
  layout.y += 10;

  // 3.1a) Descripción del cargo
  ensurePage(doc, layout, 30);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("a) Descripción del cargo:", layout.margin + 4, layout.y + 6);
  layout.y += 8;
  const descLines = wrap(doc, safeText(c.descripcion_cargo || c.descripcion_actividad), layout.width - 8);
  const descH = Math.max(24, 6 + descLines.length * 8);
  ensurePage(doc, layout, descH);
  doc.rect(layout.margin, layout.y, layout.width, descH);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  descLines.forEach((line, i) => {
    doc.text(line, layout.margin + 4, layout.y + 8 + i * 8);
  });
  layout.y += descH + 4;

  // 3.1b) Tareas
  ensurePage(doc, layout, 30);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("b) Tareas que realiza:", layout.margin + 4, layout.y + 6);
  layout.y += 8;
  const tareasLines = wrap(doc, safeText(c.tareas_realiza), layout.width - 8);
  const tareasH = Math.max(20, 6 + tareasLines.length * 8);
  ensurePage(doc, layout, tareasH);
  doc.rect(layout.margin, layout.y, layout.width, tareasH);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  tareasLines.forEach((line, i) => {
    doc.text(line, layout.margin + 4, layout.y + 8 + i * 8);
  });
  layout.y += tareasH + 4;

  // 3.1c) Espacio de trabajo
  ensurePage(doc, layout, 24);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("c) Espacio de trabajo:", layout.margin + 4, layout.y + 6);
  layout.y += 8;
  const espacioLines = wrap(doc, safeText(c.espacio_trabajo || c.lugar_trabajo), layout.width - 8);
  const espacioH = Math.max(16, 6 + espacioLines.length * 8);
  ensurePage(doc, layout, espacioH);
  doc.rect(layout.margin, layout.y, layout.width, espacioH);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  espacioLines.forEach((line, i) => {
    doc.text(line, layout.margin + 4, layout.y + 8 + i * 8);
  });
  layout.y += espacioH + 4;

  // 3.1d) Condiciones ambientales (CHECKLIST)
  ensurePage(doc, layout, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("d) Condiciones ambientales del puesto de trabajo:", layout.margin + 4, layout.y + 6);
  layout.y += 10;

  const conditions = c.condiciones_amb_obj || {};
  const physicalAgents = [
    { label: "Ruido", value: conditions.ruido },
    { label: "Iluminación", value: conditions.iluminacion },
    { label: "Temperaturas extremas", value: conditions.temperaturas_extremas },
    { label: "Vibraciones", value: conditions.vibraciones },
  ];

  const biologicalAgents = [
    { label: "Virus/Bacterias/Hongos", value: conditions.virus_bacterias_hongos },
  ];

  const chemicalAgents = [
    { label: "Sustancias peligrosas", value: conditions.sustancias_peligrosas },
    { label: "Polvos/Humos/Nieblas", value: conditions.polvos_humos_nieblas },
    { label: "Vapores orgánicos", value: conditions.vapores_organicos },
  ];

  const riskAgents = [
    { label: "Eléctrico", value: conditions.electrico },
    { label: "Altura", value: conditions.altura_fisica },
    { label: "Caída al mismo nivel", value: conditions.caida_mismo_nivel },
    { label: "Caída a distinto nivel", value: conditions.caida_distinto_nivel },
  ];

  const ergonomicAgents = [
    { label: "Posturas forzadas", value: conditions.posturas_forzadas },
    { label: "Movimientos repetitivos", value: conditions.movimientos_repetitivos },
  ];

  const drawAgentGroup = (title: string, agents: Array<{ label: string; value: boolean | undefined }>) => {
    ensurePage(doc, layout, 10);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.text(`${title}:`, layout.margin + 4, layout.y + 6);
    layout.y += 8;

    const itemsPerRow = 2;
    const colW = layout.width / itemsPerRow;
    let currentRow = 0;
    let currentCol = 0;

    agents.forEach((agent, idx) => {
      const x = layout.margin + currentCol * colW;
      const y = layout.y + currentRow * 8;

      if (idx > 0 && idx % itemsPerRow === 0) {
        currentRow++;
        currentCol = 0;
        ensurePage(doc, layout, 8);
      }

      drawCheckbox(doc, x + 2, y, agent.value ?? false);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.text(agent.label, x + 10, y + 4);

      currentCol++;
      if ((idx + 1) % itemsPerRow === 0) {
        layout.y += 8;
      }
    });

    if (agents.length % itemsPerRow !== 0) {
      layout.y += 8;
    }
  };

  drawAgentGroup("AGENTES FÍSICOS", physicalAgents);
  drawAgentGroup("AGENTES BIOLÓGICOS", biologicalAgents);
  drawAgentGroup("AGENTES QUÍMICOS", chemicalAgents);
  drawAgentGroup("AGENTES DE RIESGO", riskAgents);
  drawAgentGroup("AGENTES ERGONÓMICOS", ergonomicAgents);

  layout.y += 4;

  // 3.1e) Orden y aseo
  ensurePage(doc, layout, 24);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("e) Condiciones de orden y aseo exigidas en el puesto:", layout.margin + 4, layout.y + 6);
  layout.y += 8;
  const ordenLines = wrap(doc, safeText(c.orden_aseo), layout.width - 8);
  const ordenH = Math.max(16, 6 + ordenLines.length * 8);
  ensurePage(doc, layout, ordenH);
  doc.rect(layout.margin, layout.y, layout.width, ordenH);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  ordenLines.forEach((line, i) => {
    doc.text(line, layout.margin + 4, layout.y + 8 + i * 8);
  });
  layout.y += ordenH + 4;

  // 3.1f) Máquinas y herramientas (TABLE)
  ensurePage(doc, layout, 18);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("f) Máquinas y herramientas de trabajo:", layout.margin + 4, layout.y + 6);
  layout.y += 10;

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
  ensurePage(doc, layout, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("g) Elementos de Protección Personal:", layout.margin + 4, layout.y + 6);
  layout.y += 8;
  const eppLines = wrap(doc, safeText(c.epp_requerido_info), layout.width - 8);
  const eppH = Math.max(12, 6 + eppLines.length * 8);
  ensurePage(doc, layout, eppH);
  doc.rect(layout.margin, layout.y, layout.width, eppH);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  eppLines.forEach((line, i) => {
    doc.text(line, layout.margin + 4, layout.y + 8 + i * 8);
  });
  layout.y += eppH + 6;
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
    ensurePage(doc, layout, 8);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text(subtitle, layout.margin + 4, layout.y + 6);
    layout.y += 8;

    if (!rows || rows.length === 0) {
      ensurePage(doc, layout, 10);
      doc.rect(layout.margin, layout.y, layout.width, 10);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(6.5);
      doc.text("Sin información registrada", layout.margin + 4, layout.y + 8);
      layout.y += 10;
      return;
    }

    const col1 = layout.width * 0.25;
    const col2 = layout.width * 0.25;
    const col3 = layout.width * 0.25;
    const col4 = layout.width * 0.25;

    ensurePage(doc, layout, 14);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.rect(layout.margin, layout.y, col1, 12);
    doc.text("RIESGOS", layout.margin + 2, layout.y + 8);
    doc.rect(layout.margin + col1, layout.y, col2, 12);
    doc.text("CONSECUENCIAS", layout.margin + col1 + 2, layout.y + 8);
    doc.rect(layout.margin + col1 + col2, layout.y, col3, 12);
    doc.text("MEDIDAS PREVENTIVAS", layout.margin + col1 + col2 + 2, layout.y + 8);
    doc.rect(layout.margin + col1 + col2 + col3, layout.y, col4, 12);
    doc.text("MÉTODOS/PROCEDIMIENTOS", layout.margin + col1 + col2 + col3 + 2, layout.y + 8);
    layout.y += 12;

    rows.forEach((row) => {
      const t1 = wrap(doc, safeText(row.peligro), col1 - 4);
      const t2 = wrap(doc, safeText(row.consecuencia), col2 - 4);
      const t3 = wrap(doc, safeText(row.medida), col3 - 4);
      const t4: string[] = []; // métodos (placeholder)
      const h = Math.max(12, 6 + Math.max(t1.length, t2.length, t3.length, t4.length) * 6);
      ensurePage(doc, layout, h);

      doc.rect(layout.margin, layout.y, col1, h);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6);
      t1.forEach((line, i) => {
        doc.text(line, layout.margin + 2, layout.y + 8 + i * 6);
      });

      doc.rect(layout.margin + col1, layout.y, col2, h);
      t2.forEach((line, i) => {
        doc.text(line, layout.margin + col1 + 2, layout.y + 8 + i * 6);
      });

      doc.rect(layout.margin + col1 + col2, layout.y, col3, h);
      t3.forEach((line, i) => {
        doc.text(line, layout.margin + col1 + col2 + 2, layout.y + 8 + i * 6);
      });

      doc.rect(layout.margin + col1 + col2 + col3, layout.y, col4, h);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(6);
      doc.text("(vacío)", layout.margin + col1 + col2 + col3 + 2, layout.y + 8);

      layout.y += h;
    });

    layout.y += 4;
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
    ensurePage(doc, layout, 10);
    const cbY = layout.y + 4;
    drawCheckbox(doc, layout.margin + 2, cbY, false);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text(
      `${norma.num}.- ${norma.title}`,
      layout.margin + 12,
      cbY + 4,
    );
    layout.y += 10;

    if (safeText(norma.text) !== "-") {
      ensurePage(doc, layout, 14);
      const lines = wrap(doc, safeText(norma.text), layout.width - 16);
      const h = Math.max(12, 6 + lines.length * 6);
      doc.rect(layout.margin + 8, layout.y, layout.width - 8, h);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6);
      lines.forEach((line, i) => {
        doc.text(line, layout.margin + 12, layout.y + 8 + i * 6);
      });
      layout.y += h + 2;
    }
  });

  layout.y += 4;
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
  drawSectionTitle(doc, layout, "8. CONSENTIMIENTO Y FIRMA DE LA PERSONA TRABAJADORA");

  const declaracionText =
    c.declaracion ||
    `Declaro haber recibido la Información sobre los Riesgos Laborales, impartida por ${safeText(params.empresa?.razonSocial ?? params.empresa?.nombre ?? "la Empresa")}. Dicha actividad contempla todos los puntos indicados en el presente documento y se ha llevado a cabo antes de mi ingreso a las instalaciones. Se me ha informado sobre los riesgos a los cuales estaré expuesto, las medidas de prevención que debo adoptar y las herramientas necesarias para su aplicación. Entiendo y acepto que el incumplimiento de las medidas de control señaladas puede derivar en un proceso sancionatorio.`;

  const lines = wrap(doc, declaracionText, layout.width - 8);
  const h = Math.max(36, 6 + lines.length * 7);
  ensurePage(doc, layout, h);
  doc.rect(layout.margin, layout.y, layout.width, h);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  lines.forEach((line, i) => {
    doc.text(line, layout.margin + 4, layout.y + 8 + i * 7);
  });
  layout.y += h + 8;

  // Firma table
  ensurePage(doc, layout, 50);
  const sigW = layout.width / 2;
  doc.rect(layout.margin, layout.y, sigW, 40);
  doc.rect(layout.margin + sigW, layout.y, sigW, 40);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("PERSONA TRABAJADORA", layout.margin + 4, layout.y + 32);
  doc.text(`${safeText(c.trabajador_nombre || "Nombre")}`, layout.margin + 4, layout.y + 36);

  doc.text("RELATOR (PREVENCIONISTA)", layout.margin + sigW + 4, layout.y + 32);
  doc.text(`${safeText(c.relator_nombre || "Nombre")}`, layout.margin + sigW + 4, layout.y + 36);

  layout.y += 44;
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

  // ===== HEADER SECTION =====
  ensurePage(doc, layout, 28);
  doc.setFillColor(240, 240, 240);
  doc.rect(layout.margin, layout.y, layout.width, 28, "F");
  doc.rect(layout.margin, layout.y, layout.width, 28);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(
    "REGISTRO INFORMACIÓN DE LOS RIESGOS LABORALES",
    layout.margin + layout.width / 2,
    layout.y + 8,
    { align: "center" },
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(
    `Código: ${safeText(c.codigo_documento || "FORM-IRL 03")} | Aprobación: ${safeText(c.aprobacion_fecha || "01.12.2025")} | VER: ${safeText(c.version || "01")}`,
    layout.margin + layout.width / 2,
    layout.y + 16,
    { align: "center" },
  );
  doc.text(
    `Página 1 de ${doc.getNumberOfPages()}`,
    layout.margin + layout.width / 2,
    layout.y + 24,
    { align: "center" },
  );

  layout.y += 32;

  // Subtitle
  ensurePage(doc, layout, 14);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("SISTEMA DE GESTIÓN DE SEGURIDAD Y SALUD EN EL TRABAJO", layout.margin + layout.width / 2, layout.y + 6, {
    align: "center",
  });
  doc.text("REGISTRO INFORMACIÓN DE LOS RIESGOS LABORALES", layout.margin + layout.width / 2, layout.y + 12, {
    align: "center",
  });
  layout.y += 16;

  // ===== SECTIONS =====
  drawIdentificationTable(doc, layout, c, params);
  drawRelatorTable(doc, layout, c);
  drawPuesto3Section(doc, layout, c);
  drawRiesgos4Section(doc, layout, c);
  drawNormas5Section(doc, layout, c);
  drawAntecedentes6Section(doc, layout, c);
  drawMaterial7Section(doc, layout, c);
  drawConsentimiento8Section(doc, layout, c, params);
  drawFirmaTrazabilidad(doc, layout, params);

  // ===== FOOTER =====
  const totalPages = doc.getNumberOfPages();
  const footer = `${safeText(c.codigo_documento || "FORM-IRL 03")} | VER:${safeText(c.version || "01")} | REGISTRO INFORMACION DE LOS RIESGOS LABORALES`;
  for (let p = 1; p <= totalPages; p += 1) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(footer, layout.margin, layout.pageHeight - 10);
    doc.text("Generado por NextPrev", layout.margin + layout.width - 118, layout.pageHeight - 10);
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

  drawFirmaTrazabilidad(doc, layout, params);

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

export async function renderIRLPdf(doc: jsPDF, params: ExportTrabajadorDocumentoPdfParams, tipoNombre: string) {
  const structured = parseDocumentoEstructurado(params.contenido);
  if (structured?.plantillaCodigo === "IRL") {
    await renderStructuredIrlPdf(doc, params, tipoNombre, structured);
    return;
  }

  renderMarkdownLikeIrlPdf(doc, params, tipoNombre, {
    headerTitle: "ACTA DE INFORMACION DE RIESGOS LABORALES",
    headerSubtitle: "NEXTPREV TEMPLATE-IRL",
    footerPrefix: "Estado documental",
  });
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
  
  // Firma section if signed
  if (params.estado === "firmado" && params.firmadoPor) {
    y = pageHeight - 60;
    doc.setDrawColor(100, 100, 100);
    doc.rect(margin, y, contentWidth, 40);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("INFORMACIÓN DE FIRMA", margin + 6, y + 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Firmado por: ${params.firmadoPor}`, margin + 6, y + 24);
    doc.text(`Fecha y hora: ${formatDate(params.firmadoEn)}`, margin + 6, y + 34);
  }

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

  doc.save(buildFilename(tipoNombre, params.trabajador));
}
