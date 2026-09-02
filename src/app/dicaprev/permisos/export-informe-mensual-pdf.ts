import { jsPDF } from "jspdf";
import { PERMISO_ESTADOS, PermisoEstado } from "./types";
import type { PermisoCliente, PermisoInstalacion, PermisoOrganismo, PermisoResponsable } from "@prisma/client";

type PermisoInforme = PermisoInstalacion & {
  organismo: PermisoOrganismo | null;
  responsable: PermisoResponsable | null;
  cliente: PermisoCliente | null;
};

export interface InformeMensualPermisosData {
  empresaNombre: string;
  anio: number;
  mes: number;
  permisos: PermisoInforme[];
}

// Paleta oficial NextPrev (azul marino + dorado, ver src/components/layout/Sidebar.tsx)
const COLOR_NAVY: [number, number, number] = [7, 54, 111]; // #07366f
const COLOR_NAVY_DARK: [number, number, number] = [5, 42, 87]; // #052a57
const COLOR_GOLD: [number, number, number] = [252, 211, 77]; // amber-300
const COLOR_HEADING: [number, number, number] = [30, 41, 59]; // slate-800
const COLOR_TEXT: [number, number, number] = [71, 85, 105]; // slate-600
const COLOR_MUTED: [number, number, number] = [148, 163, 184]; // slate-400
const COLOR_BORDER: [number, number, number] = [226, 232, 240]; // slate-200
const COLOR_BG_SOFT: [number, number, number] = [248, 250, 252]; // slate-50

const ESTADO_ESTILO: Record<PermisoEstado, { bg: [number, number, number]; text: [number, number, number] }> = {
  PERMISO_CREADO: { bg: [224, 231, 255], text: [55, 48, 163] },
  PREPARANDO_DOCUMENTACION: { bg: [207, 236, 251], text: [7, 89, 133] },
  SOLICITADO: { bg: [219, 234, 254], text: [29, 78, 216] },
  OBSERVADO: { bg: [255, 247, 213], text: [161, 98, 7] },
  APROBADO: { bg: [220, 252, 231], text: [21, 128, 61] },
  CANCELADO: { bg: [241, 245, 249], text: [71, 85, 105] },
};

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function formatDate(value: Date | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function exportInformeMensualPermisosPdf(data: InformeMensualPermisosData) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 40;
  let y = 0;

  const mesNombre = MESES[data.mes - 1] || "";
  const totalPermisos = data.permisos.length;

  const conteos: Record<PermisoEstado, number> = {
    PERMISO_CREADO: 0,
    PREPARANDO_DOCUMENTACION: 0,
    SOLICITADO: 0,
    OBSERVADO: 0,
    APROBADO: 0,
    CANCELADO: 0,
  };
  data.permisos.forEach((p) => {
    const estado = p.estado as PermisoEstado;
    if (conteos[estado] !== undefined) conteos[estado] += 1;
  });

  const aprobados = data.permisos.filter((p) => p.estado === "APROBADO");
  const tiempoPromedioDias =
    aprobados.length > 0
      ? Math.round(
          aprobados.reduce((acc, p) => acc + (p.updatedAt.getTime() - p.createdAt.getTime()) / (1000 * 60 * 60 * 24), 0) /
            aprobados.length,
        )
      : null;

  // ── Header con branding NextPrev (azul marino + acento dorado) ──
  const headerHeight = 96;
  doc.setFillColor(...COLOR_NAVY_DARK);
  doc.rect(0, 0, pageWidth, headerHeight, "F");
  doc.setFillColor(...COLOR_GOLD);
  doc.rect(0, headerHeight, pageWidth, 3, "F");

  // Marca circular "NP"
  doc.setFillColor(...COLOR_GOLD);
  doc.circle(marginX + 14, 30, 14, "F");
  doc.setTextColor(...COLOR_NAVY_DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("NP", marginX + 14, 34, { align: "center" });

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("NextPrev", marginX + 36, 36);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.text("Informe mensual de permisos de instalación", marginX, 62);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(`${mesNombre} ${data.anio}`, marginX, 82);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text(data.empresaNombre, pageWidth - marginX, 36, { align: "right" });
  doc.text(`Emitido el ${formatDate(new Date())}`, pageWidth - marginX, 50, { align: "right" });

  y = headerHeight + 30;

  // ── KPI: total y tiempo promedio ──
  doc.setTextColor(...COLOR_HEADING);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(`Total de permisos creados en el mes: ${totalPermisos}`, marginX, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...COLOR_TEXT);
  doc.text(
    `Tiempo promedio de aprobación: ${tiempoPromedioDias === null ? "sin datos aún" : `${tiempoPromedioDias} días`}`,
    marginX,
    y,
  );
  y += 22;

  // ── Tarjetas por estado ──
  const estados = Object.keys(PERMISO_ESTADOS) as PermisoEstado[];
  const cardGap = 8;
  const cardWidth = (pageWidth - marginX * 2 - cardGap * 2) / 3;
  const cardHeight = 56;

  estados.forEach((estado, index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    const x = marginX + col * (cardWidth + cardGap);
    const cardY = y + row * (cardHeight + cardGap);
    const estilo = ESTADO_ESTILO[estado];

    doc.setFillColor(...estilo.bg);
    doc.roundedRect(x, cardY, cardWidth, cardHeight, 6, 6, "F");
    doc.setDrawColor(...COLOR_BORDER);
    doc.roundedRect(x, cardY, cardWidth, cardHeight, 6, 6, "S");

    doc.setTextColor(...estilo.text);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(19);
    doc.text(String(conteos[estado]), x + 12, cardY + 27);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    const label = doc.splitTextToSize(PERMISO_ESTADOS[estado], cardWidth - 24);
    doc.text(label, x + 12, cardY + 41);
  });

  y += Math.ceil(estados.length / 3) * (cardHeight + cardGap) + 24;

  // ── Tabla de detalle ──
  doc.setDrawColor(...COLOR_BORDER);
  doc.setTextColor(...COLOR_HEADING);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Detalle de permisos", marginX, y);
  y += 6;
  doc.setDrawColor(...COLOR_GOLD);
  doc.setLineWidth(1.5);
  doc.line(marginX, y + 4, marginX + 60, y + 4);
  doc.setLineWidth(1);
  y += 18;

  const columnas = [
    { key: "fechaRecepcionSolicitud", label: "Fecha de solicitud", width: 78 },
    { key: "cliente", label: "Cliente", width: 82 },
    { key: "direccion", label: "Dirección", width: 118 },
    { key: "fechaInstalacion", label: "Fecha de instalación", width: 78 },
    { key: "estado", label: "Estado", width: 78 },
    { key: "responsable", label: "Coordinador", width: 81 },
  ] as const;
  const tableWidth = columnas.reduce((acc, c) => acc + c.width, 0);
  const rowHeight = 22;

  function drawColumnDividers(startY: number, endY: number) {
    let colX = marginX;
    doc.setDrawColor(...COLOR_BORDER);
    columnas.forEach((col) => {
      doc.line(colX, startY, colX, endY);
      colX += col.width;
    });
    doc.line(colX, startY, colX, endY);
  }

  function drawTableHeader() {
    doc.setFillColor(...COLOR_NAVY);
    doc.rect(marginX, y, tableWidth, rowHeight, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    let colX = marginX;
    columnas.forEach((col) => {
      doc.text(col.label, colX + 5, y + 14);
      colX += col.width;
    });
    y += rowHeight;
  }

  function drawFooter(page: number) {
    doc.setDrawColor(...COLOR_BORDER);
    doc.line(marginX, pageHeight - 34, pageWidth - marginX, pageHeight - 34);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...COLOR_MUTED);
    doc.text("Generado por NextPrev", marginX, pageHeight - 20);
    doc.text(`Página ${page}`, pageWidth - marginX - 40, pageHeight - 20);
  }

  drawTableHeader();
  let bodyStartY = y;

  if (data.permisos.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...COLOR_TEXT);
    doc.text("No se registraron permisos creados en este mes.", marginX + 5, y + 15);
    y += rowHeight;
    drawColumnDividers(bodyStartY, y);
  } else {
    data.permisos.forEach((permiso, index) => {
      if (y + rowHeight > pageHeight - 46) {
        drawColumnDividers(bodyStartY, y);
        drawFooter(doc.getNumberOfPages());
        doc.addPage();
        y = 40;
        drawTableHeader();
        bodyStartY = y;
      }

      if (index % 2 === 1) {
        doc.setFillColor(...COLOR_BG_SOFT);
        doc.rect(marginX, y, tableWidth, rowHeight, "F");
      }

      const estilo = ESTADO_ESTILO[permiso.estado as PermisoEstado];
      let colX = marginX;
      const valores: Record<(typeof columnas)[number]["key"], string> = {
        fechaRecepcionSolicitud: formatDate(permiso.fechaRecepcionSolicitud),
        cliente: permiso.cliente?.nombre || "—",
        direccion: permiso.direccion || "—",
        fechaInstalacion: formatDate(permiso.fechaInstalacion),
        estado: PERMISO_ESTADOS[permiso.estado as PermisoEstado] || permiso.estado,
        responsable: permiso.responsable?.nombre || "—",
      };

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      columnas.forEach((col) => {
        if (col.key === "estado" && estilo) {
          doc.setTextColor(...estilo.text);
        } else {
          doc.setTextColor(...COLOR_TEXT);
        }
        const truncado = doc.splitTextToSize(valores[col.key], col.width - 10)[0];
        doc.text(truncado, colX + 5, y + 14);
        colX += col.width;
      });

      doc.setDrawColor(...COLOR_BORDER);
      doc.line(marginX, y + rowHeight, marginX + tableWidth, y + rowHeight);

      y += rowHeight;
    });

    drawColumnDividers(bodyStartY, y);
  }

  drawFooter(doc.getNumberOfPages());

  doc.save(`informe-permisos-${data.anio}-${String(data.mes).padStart(2, "0")}.pdf`);
}
