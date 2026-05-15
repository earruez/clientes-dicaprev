import { jsPDF } from "jspdf";
import type { Worker } from "../types";
import type { DocTrabajadorView } from "./types";

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

function parseIrlSections(contenido: string): { riesgos: string[]; medidas: string[] } {
  const lines = contenido.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const riesgos: string[] = [];
  const medidas: string[] = [];
  let mode: "none" | "riesgos" | "medidas" = "none";

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
    if (/^[-*•]/.test(line)) {
      const clean = line.replace(/^[-*•]\s*/, "").trim();
      if (!clean) return;
      if (mode === "riesgos") riesgos.push(clean);
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

  return { riesgos, medidas };
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

async function drawInstitutionalHeader(
  doc: jsPDF,
  empresa: EmpresaPdfMeta | null | undefined,
  title: string,
  codigo: string,
  elaboracion: string,
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 28;
  const totalWidth = pageWidth - margin * 2;
  const leftWidth = 132;
  const rightWidth = 150;
  const centerWidth = totalWidth - leftWidth - rightWidth;
  const top = 24;
  const h = 74;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(1.15);
  doc.rect(margin, top, totalWidth, h);
  doc.rect(margin, top, leftWidth, h);
  doc.rect(margin + leftWidth, top, centerWidth, h);
  doc.rect(margin + leftWidth + centerWidth, top, rightWidth, h);

  const logoBoxX = margin + 8;
  const logoBoxY = top + 8;
  const logoBoxW = leftWidth - 16;
  const logoBoxH = h - 16;

  if (empresa?.logoUrl) {
    const logo = await loadLogoData(empresa.logoUrl);
    if (logo) {
      doc.addImage(logo.dataUrl, logo.format, logoBoxX, logoBoxY, logoBoxW, logoBoxH, undefined, "FAST");
    } else {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(safeText(empresa.razonSocial ?? empresa.nombre), logoBoxX, top + 30, { maxWidth: logoBoxW });
    }
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(safeText(empresa?.razonSocial ?? empresa?.nombre ?? "EMPRESA"), logoBoxX, top + 30, { maxWidth: logoBoxW });
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.text(title, margin + leftWidth + centerWidth / 2, top + 28, {
    align: "center",
    maxWidth: centerWidth - 14,
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  const rightX = margin + leftWidth + centerWidth + 6;
  let y = top + 14;
  const reviewDate = formatDate(new Date()).split(" ")[0];
  [
    `${codigo}`,
    `Fecha de Elaboracion: ${elaboracion}`,
    "N de revision: 0",
    `Fecha de Revision: ${reviewDate}`,
    "Pagina: 1 de 1",
  ].forEach((line) => {
    doc.text(line, rightX, y);
    y += 11;
  });

  return { margin, top, totalWidth, yAfter: top + h };
}

function drawBoxField(doc: jsPDF, x: number, y: number, w: number, h: number, label: string, value: string) {
  doc.rect(x, y, w, h);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(label, x + 4, y + 11);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(value || "-", x + 86, y + 11, { maxWidth: w - 90 });
}

function drawWrappedInBox(doc: jsPDF, text: string, x: number, y: number, w: number, h: number, fontSize = 8.5) {
  doc.rect(x, y, w, h);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(fontSize);
  const lines = doc.splitTextToSize(text, w - 8) as string[];
  const maxLines = Math.max(1, Math.floor((h - 8) / (fontSize + 2)));
  const clipped = lines.slice(0, maxLines);
  doc.text(clipped, x + 4, y + 12);
}

export async function renderEppPdf(doc: jsPDF, params: ExportTrabajadorDocumentoPdfParams, tipoNombre: string) {
  const { trabajador, contenido } = params;
  const pageWidth = doc.internal.pageSize.getWidth();
  const header = await drawInstitutionalHeader(
    doc,
    params.empresa,
    "REGISTRO DE ENTREGA DE ELEMENTOS DE PROTECCION PERSONAL",
    "NEXTPREV TEMPLATE-02",
    formatDate(new Date()).split(" ")[0],
  );

  const margin = header.margin;
  const totalWidth = pageWidth - margin * 2;
  let y = header.yAfter;

  drawBoxField(doc, margin, y, totalWidth, 22, "NOMBRE DEL TRABAJADOR", `${trabajador.nombre} ${trabajador.apellido}`);
  y += 22;
  drawBoxField(doc, margin, y, totalWidth, 22, "RUN", safeText(trabajador.rut));
  y += 22;
  drawBoxField(doc, margin, y, totalWidth, 22, "AREA", safeText(trabajador.area));
  y += 26;

  const colArticulo = 200;
  const colFecha = 96;
  const colSi = 40;
  const colNo = 40;

  const xArticulo = margin;
  const xFecha = xArticulo + colArticulo;
  const xSi = xFecha + colFecha;
  const xNo = xSi + colSi;
  const xObs = xNo + colNo;

  doc.rect(margin, y, totalWidth, 20);
  doc.line(xFecha, y, xFecha, y + 20);
  doc.line(xSi, y, xSi, y + 20);
  doc.line(xNo, y, xNo, y + 20);
  doc.line(xObs, y, xObs, y + 20);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("DESCRIPCION DEL ARTICULO", xArticulo + 4, y + 13);
  doc.text("ENTREGA FECHA", xFecha + 4, y + 13);
  doc.text("SI", xSi + 14, y + 13);
  doc.text("NO", xNo + 14, y + 13);
  doc.text("OBSERVACIONES", xObs + 4, y + 13);
  y += 20;

  const rows = parseEppItems(contenido);
  const rowHeight = 18;
  const today = formatDate(new Date()).split(" ")[0];

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  for (let i = 0; i < 16; i++) {
    const item = rows[i] ?? "";
    doc.rect(margin, y, totalWidth, rowHeight);
    doc.line(xFecha, y, xFecha, y + rowHeight);
    doc.line(xSi, y, xSi, y + rowHeight);
    doc.line(xNo, y, xNo, y + rowHeight);
    doc.line(xObs, y, xObs, y + rowHeight);

    if (item) {
      doc.text(item.toUpperCase().slice(0, 52), xArticulo + 4, y + 12);
      doc.text(today, xFecha + 4, y + 12);
      doc.text("X", xSi + 15, y + 12);
    }

    y += rowHeight;
  }

  drawWrappedInBox(
    doc,
    contenido || "Sin observaciones registradas.",
    margin,
    y,
    totalWidth,
    66,
    8,
  );
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("OBSERVACIONES GENERALES Y DETALLE OPERACIONAL", margin + 4, y + 11);
  y += 66 + 8;

  const sigLeftW = 190;
  const sigMidW = 190;
  const sigRightW = totalWidth - sigLeftW - sigMidW;
  const sigH = 62;

  doc.rect(margin, y, sigLeftW, sigH);
  doc.rect(margin + sigLeftW, y, sigMidW, sigH);
  doc.rect(margin + sigLeftW + sigMidW, y, sigRightW, sigH);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("FIRMA TRABAJADOR:", margin + 5, y + 12);
  doc.text("ENTREGADO POR:", margin + sigLeftW + 5, y + 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const declaracion =
    "COMO TRABAJADOR DECLARO HABER RECIBIDO E INSTRUIDO SOBRE EL CORRECTO USO, CUIDADO Y MANTENCION DE LOS ELEMENTOS DE PROTECCION PERSONAL.";
  const lines = doc.splitTextToSize(declaracion, sigRightW - 8) as string[];
  doc.text(lines, margin + sigLeftW + sigMidW + 4, y + 12);

  if (normalizeEstado(params.estado) === "firmado") {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(safeText(params.firmadoPor), margin + 5, y + 49);
    doc.text(formatDate(params.firmadoEn), margin + sigLeftW + 5, y + 49);
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Estado documental: ${estadoLabel(params.estado)} | Documento: ${tipoNombre}`, margin, 822);
}

export async function renderIRLPdf(doc: jsPDF, params: ExportTrabajadorDocumentoPdfParams, tipoNombre: string) {
  const { trabajador, contenido } = params;
  const pageWidth = doc.internal.pageSize.getWidth();
  const header = await drawInstitutionalHeader(
    doc,
    params.empresa,
    "ACTA DE INFORMACION DE RIESGOS LABORALES",
    "NEXTPREV TEMPLATE-01",
    formatDate(new Date()).split(" ")[0],
  );

  const margin = header.margin;
  const totalWidth = pageWidth - margin * 2;
  let y = header.yAfter;

  drawBoxField(doc, margin, y, totalWidth, 22, "NOMBRE DEL TRABAJADOR", `${trabajador.nombre} ${trabajador.apellido}`);
  y += 22;
  drawBoxField(doc, margin, y, totalWidth, 22, "RUN", safeText(trabajador.rut));
  y += 22;
  drawBoxField(doc, margin, y, totalWidth, 22, "CARGO / AREA", `${safeText(trabajador.cargo)} / ${safeText(trabajador.area)}`);
  y += 26;

  const sections = parseIrlSections(contenido);
  const rows = Math.max(sections.riesgos.length, sections.medidas.length, 8);
  const colRiesgo = 220;
  const colMedida = totalWidth - colRiesgo;
  const rowHeight = 22;

  doc.rect(margin, y, totalWidth, 20);
  doc.line(margin + colRiesgo, y, margin + colRiesgo, y + 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("RIESGO IDENTIFICADO", margin + 5, y + 13);
  doc.text("MEDIDAS PREVENTIVAS Y CONTROL", margin + colRiesgo + 5, y + 13);
  y += 20;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  for (let i = 0; i < rows; i++) {
    doc.rect(margin, y, totalWidth, rowHeight);
    doc.line(margin + colRiesgo, y, margin + colRiesgo, y + rowHeight);

    const riesgo = sections.riesgos[i] ?? "";
    const medida = sections.medidas[i] ?? "";
    if (riesgo) doc.text(doc.splitTextToSize(riesgo, colRiesgo - 8) as string[], margin + 4, y + 10);
    if (medida) doc.text(doc.splitTextToSize(medida, colMedida - 8) as string[], margin + colRiesgo + 4, y + 10);
    y += rowHeight;
  }

  y += 8;
  drawWrappedInBox(
    doc,
    contenido || "Sin detalle adicional",
    margin,
    y,
    totalWidth,
    78,
    8,
  );
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("DETALLE DOCUMENTAL REGISTRADO", margin + 4, y + 11);
  y += 86;

  const declaracion =
    "El trabajador declara haber recibido informacion clara sobre los riesgos de su puesto y las medidas preventivas obligatorias, comprometiendose a su cumplimiento.";
  drawWrappedInBox(doc, declaracion, margin, y, totalWidth, 42, 8.5);
  y += 48;

  const sigW = totalWidth / 2;
  doc.rect(margin, y, sigW, 58);
  doc.rect(margin + sigW, y, sigW, 58);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("FIRMA TRABAJADOR", margin + 5, y + 12);
  doc.text("FIRMA PREVENCIONISTA / EMPLEADOR", margin + sigW + 5, y + 12);

  if (normalizeEstado(params.estado) === "firmado") {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(safeText(params.firmadoPor), margin + 6, y + 47);
    doc.text(formatDate(params.firmadoEn), margin + sigW + 6, y + 47);
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Estado documental: ${estadoLabel(params.estado)} | Documento: ${tipoNombre}`, margin, 822);
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