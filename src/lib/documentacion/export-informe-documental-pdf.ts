import { jsPDF } from "jspdf";

export type InformeDocumentalItemPdf = {
  id: string;
  nombre: string;
  tipo: string | null;
  categoria: string;
  estado: string;
  firmado: boolean;
  firmadoPor: string | null;
  firmadoEn: string | null;
  fechaEmision: string | null;
  fechaVencimiento: string | null;
  trabajadorId?: string;
  trabajadorNombre?: string;
};

export type InformeDocumentalEmpresaPdf = {
  meta: {
    version: string;
    generadoEn: string;
  };
  empresa: {
    id: string;
    nombre: string;
    rut: string | null;
    razonSocial: string | null;
    giro: string | null;
    cantidadTrabajadores: number | null;
  };
  cumplimiento: {
    porcentajeCumplimiento: number;
    totalAplicables: number;
    totalCumple: number;
    totalFaltantes: number;
    totalIncompletos: number;
  };
  resumenDocumentos: {
    totalEmpresa: number;
    totalTrabajador: number;
    totalFirmados: number;
    totalPendientesFirma: number;
    totalVencidos: number;
  };
  documentos: {
    empresa: InformeDocumentalItemPdf[];
    trabajador: InformeDocumentalItemPdf[];
    firmados: InformeDocumentalItemPdf[];
    pendientesFirma: InformeDocumentalItemPdf[];
    vencidos: InformeDocumentalItemPdf[];
  };
};

type TableColumn = {
  key: string;
  title: string;
  width: number;
  kind?: "text" | "date" | "estado" | "firmado";
  align?: "left" | "center" | "right";
};

type TableRow = Record<string, string | boolean | null | undefined>;

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function safeText(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "-";
  const text = String(value).trim();
  return text.length > 0 ? text : "-";
}

function estadoLabel(estado: string) {
  return safeText(estado).replaceAll("_", " ");
}

function normalizeEstado(value: string | null | undefined) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function estadoVisual(estado: string) {
  const normalized = normalizeEstado(estado);

  if (normalized === "cumple" || normalized === "aprobado" || normalized === "vigente") {
    return {
      label: "Cumple",
      bg: [220, 252, 231] as const,
      fg: [22, 101, 52] as const,
    };
  }

  if (normalized === "firmado") {
    return {
      label: "Firmado ✓",
      bg: [220, 252, 231] as const,
      fg: [22, 101, 52] as const,
    };
  }

  if (normalized === "incompleto" || normalized === "en_revision" || normalized === "pendiente_firma") {
    return {
      label: "Incompleto",
      bg: [254, 243, 199] as const,
      fg: [146, 64, 14] as const,
    };
  }

  if (normalized === "faltante" || normalized === "pendiente" || normalized === "pendiente_carga") {
    return {
      label: "Faltante",
      bg: [254, 226, 226] as const,
      fg: [153, 27, 27] as const,
    };
  }

  if (normalized === "vencido") {
    return {
      label: "Vencido",
      bg: [254, 226, 226] as const,
      fg: [153, 27, 27] as const,
    };
  }

  return {
    label: estadoLabel(estado),
    bg: [241, 245, 249] as const,
    fg: [51, 65, 85] as const,
  };
}

function porcentajeColor(value: number) {
  if (value < 60) {
    return {
      bg: [254, 226, 226] as const,
      fg: [153, 27, 27] as const,
      accent: [220, 38, 38] as const,
    };
  }

  if (value < 85) {
    return {
      bg: [254, 243, 199] as const,
      fg: [146, 64, 14] as const,
      accent: [217, 119, 6] as const,
    };
  }

  return {
    bg: [220, 252, 231] as const,
    fg: [22, 101, 52] as const,
    accent: [22, 163, 74] as const,
  };
}

async function loadImageDataUrl(src: string | null | undefined): Promise<string | null> {
  if (!src || typeof window === "undefined") return null;

  if (src.startsWith("data:image/")) return src;

  try {
    const parsed = new URL(src, "https://app.nextprev.cl");
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    src = parsed.toString();
  } catch {
    return null;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function buildRowsEmpresa(items: InformeDocumentalItemPdf[]): TableRow[] {
  return items.map((item) => ({
    nombre: safeText(item.nombre),
    tipo: safeText(item.tipo),
    estado: safeText(item.estado),
    firmado: item.firmado,
    vencimiento: formatDate(item.fechaVencimiento),
  }));
}

function buildRowsTrabajador(items: InformeDocumentalItemPdf[]): TableRow[] {
  return items.map((item) => ({
    trabajador: safeText(item.trabajadorNombre),
    nombre: safeText(item.nombre),
    tipo: safeText(item.tipo),
    estado: safeText(item.estado),
    firmado: item.firmado,
    vencimiento: formatDate(item.fechaVencimiento),
  }));
}

function buildRowsFirmas(items: InformeDocumentalItemPdf[]): TableRow[] {
  return items.map((item) => ({
    nombre: safeText(item.nombre),
    tipo: safeText(item.tipo),
    estado: safeText(item.estado),
    firmado: item.firmado,
    vencimiento: formatDate(item.fechaVencimiento),
  }));
}

export async function exportarInformeDocumentalPdf(informe: InformeDocumentalEmpresaPdf) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const marginX = 34;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const usableWidth = pageWidth - marginX * 2;
  let y = 36;
  const empresaLogoDataUrl = await loadImageDataUrl(
    (informe.empresa as { logoUrl?: string | null; logoDataUrl?: string | null }).logoDataUrl
      ?? (informe.empresa as { logoUrl?: string | null }).logoUrl
      ?? null,
  );

  function drawFooter(page: number) {
    doc.setDrawColor(226, 232, 240);
    doc.line(marginX, pageHeight - 24, pageWidth - marginX, pageHeight - 24);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("Generado por NextPrev", marginX, pageHeight - 10);
    doc.text(formatDate(informe.meta.generadoEn), pageWidth / 2 - 36, pageHeight - 10);
    doc.text(`Pagina ${page}`, pageWidth - marginX - 44, pageHeight - 10);
  }

  function addNewPage() {
    drawFooter(doc.getNumberOfPages());
    doc.addPage();
    y = 34;
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
    doc.text(value, marginX + 160, y);
    y += 14;
  }

  function drawKpiCard(params: {
    x: number;
    yTop: number;
    width: number;
    height: number;
    title: string;
    value: string;
    bg: readonly [number, number, number];
    fg: readonly [number, number, number];
  }) {
    doc.setFillColor(params.bg[0], params.bg[1], params.bg[2]);
    doc.roundedRect(params.x, params.yTop, params.width, params.height, 8, 8, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(params.fg[0], params.fg[1], params.fg[2]);
    doc.text(params.title, params.x + 10, params.yTop + 16);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(params.value, params.x + 10, params.yTop + 40);
  }

  function drawStatusChip(label: string, x: number, yTop: number, width: number) {
    const status = estadoVisual(label);
    doc.setFillColor(status.bg[0], status.bg[1], status.bg[2]);
    doc.roundedRect(x, yTop + 2, width, 12, 6, 6, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(status.fg[0], status.fg[1], status.fg[2]);
    doc.text(status.label, x + 5, yTop + 10);
  }

  function drawFirmadoChip(isFirmado: boolean, x: number, yTop: number, width: number) {
    if (!isFirmado) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("No", x + 5, yTop + 10);
      return;
    }

    doc.setFillColor(220, 252, 231);
    doc.roundedRect(x, yTop + 2, width, 12, 6, 6, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(22, 101, 52);
    doc.text("Firmado ✓", x + 5, yTop + 10);
  }

  function table(columns: TableColumn[], rows: TableRow[]) {
    const rowPadding = 5;
    const defaultRowHeight = 20;

    const computeRowHeight = (row: TableRow) => {
      let maxLines = 1;
      for (const col of columns) {
        if (col.kind === "estado" || col.kind === "firmado") continue;
        const raw = row[col.key];
        const value =
          col.kind === "date"
            ? safeText(raw as string | null | undefined)
            : safeText(raw as string | null | undefined);
        const wrapped = doc.splitTextToSize(value, Math.max(20, col.width - 10));
        maxLines = Math.max(maxLines, Math.min(4, wrapped.length));
      }
      return Math.max(defaultRowHeight, maxLines * 10 + rowPadding * 2);
    };

    const drawHeader = () => {
      ensureSpace(defaultRowHeight + 4);
      doc.setFillColor(241, 245, 249);
      doc.rect(marginX, y - 14, usableWidth, defaultRowHeight, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);

      let x = marginX + 4;
      columns.forEach((col) => {
        doc.text(col.title, x, y - 1);
        x += col.width;
      });

      y += defaultRowHeight;
    };

    drawHeader();

    if (rows.length === 0) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text("Sin registros", marginX + 4, y);
      y += defaultRowHeight;
      doc.setDrawColor(241, 245, 249);
      doc.line(marginX, y - 8, pageWidth - marginX, y - 8);
      y += 8;
      return;
    }

    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);

    rows.forEach((row) => {
      const rowHeight = computeRowHeight(row);
      if (y + rowHeight > pageHeight - 34) {
        addNewPage();
        drawHeader();
      }

      doc.setDrawColor(241, 245, 249);
      doc.rect(marginX, y - 12, usableWidth, rowHeight);

      let x = marginX + 4;
      columns.forEach((col) => {
        const raw = row[col.key];

        if (col.kind === "estado") {
          drawStatusChip(safeText(raw as string | null | undefined), x + 1, y - 10, col.width - 10);
          x += col.width;
          return;
        }

        if (col.kind === "firmado") {
          drawFirmadoChip(Boolean(raw), x + 1, y - 10, col.width - 10);
          x += col.width;
          return;
        }

        const value = safeText(raw as string | number | null | undefined);
        const wrapped = doc.splitTextToSize(value, Math.max(20, col.width - 10)).slice(0, 4);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(15, 23, 42);

        if (col.align === "right") {
          const text = wrapped[0] ?? "-";
          const textWidth = doc.getTextWidth(text);
          doc.text(text, x + col.width - textWidth - 8, y);
        } else if (col.align === "center") {
          const text = wrapped[0] ?? "-";
          const textWidth = doc.getTextWidth(text);
          doc.text(text, x + col.width / 2 - textWidth / 2, y);
        } else {
          doc.text(wrapped, x, y);
        }

        x += col.width;
      });

      y += rowHeight;
      doc.setDrawColor(241, 245, 249);
      doc.line(marginX, y - 8, pageWidth - marginX, y - 8);
    });

    y += 8;
  }

  // Header profesional
  if (empresaLogoDataUrl) {
    try {
      doc.addImage(empresaLogoDataUrl, "PNG", marginX, y - 4, 76, 30);
    } catch {
      // Si falla render de logo, continuar sin imagen
    }
  }

  const headerLeft = empresaLogoDataUrl ? marginX + 86 : marginX;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(safeText(informe.empresa.nombre), headerLeft, y + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`RUT: ${safeText(informe.empresa.rut)}`, headerLeft, y + 18);
  doc.text(`Fecha: ${formatDate(informe.meta.generadoEn)}`, headerLeft + 150, y + 18);

  y += 48;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(15, 23, 42);
  doc.text("Informe de Cumplimiento SST", marginX, y);

  doc.setDrawColor(203, 213, 225);
  doc.line(marginX, y + 8, pageWidth - marginX, y + 8);

  y += 26;

  // KPI visual
  const colorKpi = porcentajeColor(informe.cumplimiento.porcentajeCumplimiento);
  drawKpiCard({
    x: marginX,
    yTop: y,
    width: 180,
    height: 56,
    title: "Cumplimiento",
    value: `${informe.cumplimiento.porcentajeCumplimiento}%`,
    bg: colorKpi.bg,
    fg: colorKpi.fg,
  });

  doc.setFillColor(colorKpi.accent[0], colorKpi.accent[1], colorKpi.accent[2]);
  doc.rect(marginX, y + 52, 180 * Math.max(0, Math.min(1, informe.cumplimiento.porcentajeCumplimiento / 100)), 4, "F");

  y += 72;

  y += 18;
  sectionTitle("Datos empresa");
  kvLine("Nombre", safeText(informe.empresa.nombre));
  kvLine("Razon social", safeText(informe.empresa.razonSocial));
  kvLine("RUT", safeText(informe.empresa.rut));
  kvLine("Giro", safeText(informe.empresa.giro));
  kvLine("Cantidad trabajadores", safeText(informe.empresa.cantidadTrabajadores));

  sectionTitle("Resumen ejecutiva");
  kvLine("Porcentaje cumplimiento", `${informe.cumplimiento.porcentajeCumplimiento}%`);
  kvLine("Total aplicables", String(informe.cumplimiento.totalAplicables));
  kvLine("Total cumple", String(informe.cumplimiento.totalCumple));
  kvLine("Total faltantes", String(informe.cumplimiento.totalFaltantes));
  kvLine("Total incompletos", String(informe.cumplimiento.totalIncompletos));

  sectionTitle("Resumen documental");
  kvLine("Total documentos empresa", String(informe.resumenDocumentos.totalEmpresa));
  kvLine("Total documentos trabajador", String(informe.resumenDocumentos.totalTrabajador));
  kvLine("Total firmados", String(informe.resumenDocumentos.totalFirmados));
  kvLine("Pendientes de firma", String(informe.resumenDocumentos.totalPendientesFirma));
  kvLine("Total vencidos", String(informe.resumenDocumentos.totalVencidos));

  sectionTitle("Tabla documentos empresa");
  table([
    { key: "nombre", title: "Nombre", width: 230, kind: "text" },
    { key: "tipo", title: "Tipo", width: 80, kind: "text" },
    { key: "estado", title: "Estado", width: 95, kind: "estado" },
    { key: "firmado", title: "Firmado", width: 70, kind: "firmado", align: "center" },
    { key: "vencimiento", title: "Vencimiento", width: 89, kind: "date" },
  ], buildRowsEmpresa(informe.documentos.empresa));

  sectionTitle("Tabla documentos trabajador");
  table([
    { key: "trabajador", title: "Trabajador", width: 120, kind: "text" },
    { key: "nombre", title: "Nombre", width: 190, kind: "text" },
    { key: "tipo", title: "Tipo", width: 75, kind: "text" },
    { key: "estado", title: "Estado", width: 85, kind: "estado" },
    { key: "firmado", title: "Firmado", width: 94, kind: "firmado", align: "center" },
  ], buildRowsTrabajador(informe.documentos.trabajador));

  sectionTitle("Seccion firmados");
  table([
    { key: "nombre", title: "Nombre", width: 245, kind: "text" },
    { key: "tipo", title: "Tipo", width: 90, kind: "text" },
    { key: "estado", title: "Estado", width: 95, kind: "estado" },
    { key: "firmado", title: "Firmado", width: 64, kind: "firmado", align: "center" },
    { key: "vencimiento", title: "Vencimiento", width: 70, kind: "date" },
  ], buildRowsFirmas(informe.documentos.firmados));

  sectionTitle("Seccion pendientes de firma");
  table([
    { key: "nombre", title: "Nombre", width: 245, kind: "text" },
    { key: "tipo", title: "Tipo", width: 90, kind: "text" },
    { key: "estado", title: "Estado", width: 95, kind: "estado" },
    { key: "firmado", title: "Firmado", width: 64, kind: "firmado", align: "center" },
    { key: "vencimiento", title: "Vencimiento", width: 70, kind: "date" },
  ], buildRowsFirmas(informe.documentos.pendientesFirma));

  sectionTitle("Seccion vencidos");
  table([
    { key: "nombre", title: "Nombre", width: 245, kind: "text" },
    { key: "tipo", title: "Tipo", width: 90, kind: "text" },
    { key: "estado", title: "Estado", width: 95, kind: "estado" },
    { key: "firmado", title: "Firmado", width: 64, kind: "firmado", align: "center" },
    { key: "vencimiento", title: "Vencimiento", width: 70, kind: "date" },
  ], buildRowsFirmas(informe.documentos.vencidos));

  drawFooter(doc.getNumberOfPages());
  const blob = doc.output("blob");
  doc.save(`informe-documental-${informe.empresa.nombre.replace(/\s/g, "_")}.pdf`);
  return blob;
}
