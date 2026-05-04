import { jsPDF } from "jspdf";
import type { ActividadPlan } from "./mock-data";
import type { PlanSnapshot } from "./store";
import { EMPRESA_MOCK } from "@/lib/empresa/empresa-store";

async function loadImageDataUrl(src: string): Promise<string | null> {
  if (!src || typeof window === "undefined") return null;

  if (src.startsWith("data:image/")) return src;

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

function formatDate(value: Date) {
  return value.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function firstActiveMonth(actividad: ActividadPlan) {
  const month = Object.entries(actividad.meses).find(([, status]) => status !== "no_aplica");
  return month?.[0] ?? "-";
}

function summarizeByField(actividades: ActividadPlan[], field: "normativa" | "categoria") {
  const acc = new Map<string, { total: number; realizadas: number; pendientes: number; vencidas: number }>();

  actividades.forEach((a) => {
    const key = a[field];
    const current = acc.get(key) ?? { total: 0, realizadas: 0, pendientes: 0, vencidas: 0 };
    current.total += 1;
    if (a.estado === "realizada") current.realizadas += 1;
    if (a.estado === "pendiente") current.pendientes += 1;
    if (a.estado === "vencida") current.vencidas += 1;
    acc.set(key, current);
  });

  return Array.from(acc.entries()).map(([nombre, item]) => ({
    nombre,
    total: item.total,
    realizadas: item.realizadas,
    pendientes: item.pendientes,
    vencidas: item.vencidas,
    cumplimiento: item.total ? Math.round((item.realizadas / item.total) * 100) : 0,
  }));
}

function planStateLabel(state: PlanSnapshot["estadoPlan"]) {
  const labels: Record<PlanSnapshot["estadoPlan"], string> = {
    borrador: "Borrador",
    en_revision: "En revisión",
    aprobado: "Aprobado",
    rechazado: "Rechazado",
  };
  return labels[state];
}

export async function exportPlanTrabajoPdf(snapshot: PlanSnapshot, year: string) {
  const actividades = snapshot.actividades;
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const companyName = EMPRESA_MOCK.nombre || "Empresa cliente";
  const companyLogoSrc = (EMPRESA_MOCK as { logoUrl?: string }).logoUrl;
  const companyLogo = companyLogoSrc ? await loadImageDataUrl(companyLogoSrc) : null;

  const marginX = 34;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const usableWidth = pageWidth - marginX * 2;
  let y = 38;

  const realizadas = actividades.filter((a) => a.estado === "realizada").length;
  const pendientes = actividades.filter((a) => a.estado === "pendiente").length;
  const vencidas = actividades.filter((a) => a.estado === "vencida").length;
  const cumplimiento = actividades.length ? Math.round((realizadas / actividades.length) * 100) : 0;

  const summaryNormativa = summarizeByField(actividades, "normativa");
  const summaryCategoria = summarizeByField(actividades, "categoria");

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
    y = 34;
  }

  function ensureSpace(required: number) {
    if (y + required > pageHeight - 30) addNewPage();
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
    doc.text(value, marginX + 130, y);
    y += 14;
  }

  function table(headers: string[], rows: string[][], widths: number[]) {
    const rowHeight = 18;

    const drawHeader = () => {
      ensureSpace(rowHeight + 4);
      doc.setFillColor(241, 245, 249);
      doc.rect(marginX, y - 12, usableWidth, rowHeight, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);

      let x = marginX + 4;
      headers.forEach((h, idx) => {
        doc.text(h, x, y);
        x += widths[idx];
      });

      y += rowHeight;
    };

    drawHeader();

    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);

    rows.forEach((r) => {
      if (y + rowHeight > pageHeight - 30) {
        addNewPage();
        drawHeader();
      }

      let x = marginX + 4;
      r.forEach((cell, idx) => {
        const maxChars = Math.max(6, Math.floor((widths[idx] - 10) / 4.5));
        const safe = cell.length > maxChars ? `${cell.slice(0, maxChars - 3)}...` : cell;
        doc.text(safe, x, y);
        x += widths[idx];
      });

      y += rowHeight;
      doc.setDrawColor(241, 245, 249);
      doc.line(marginX, y - 8, pageWidth - marginX, y - 8);
    });

    y += 8;
  }

  if (companyLogo) {
    try {
      doc.addImage(companyLogo, "PNG", marginX, y - 6, 84, 28);
    } catch {
      // keep fallback with text if image cannot be rendered
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text("Plan de Trabajo Anual", companyLogo ? marginX + 96 : marginX, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  doc.text(companyName, companyLogo ? marginX + 96 : marginX, y + 14);

  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  y += 30;
  doc.text(`Ano del plan: ${year}`, marginX, y);
  y += 14;
  doc.text(`Fecha de generacion: ${formatDate(new Date())}`, marginX, y);
  y += 14;
  doc.text(`Estado del plan: ${planStateLabel(snapshot.estadoPlan)}`, marginX, y);
  y += 14;
  doc.text(`Version del plan: v${snapshot.versionPlan}`, marginX, y);

  if (snapshot.estadoPlan === "aprobado") {
    y += 14;
    doc.text(`Aprobado por: ${snapshot.aprobadoPor ?? "-"}`, marginX, y);
    y += 14;
    doc.text(`Cargo: ${snapshot.aprobadoCargo ?? "-"}`, marginX, y);
    y += 14;
    doc.text(`Fecha de aprobacion: ${snapshot.aprobadoEn ?? "-"}`, marginX, y);
  }

  y += 18;
  sectionTitle("KPIs principales");
  kvLine("Cumplimiento anual", `${cumplimiento}%`);
  kvLine("Actividades realizadas", String(realizadas));
  kvLine("Actividades pendientes", String(pendientes));
  kvLine("Actividades vencidas", String(vencidas));

  sectionTitle("Resumen por normativa");
  table(
    ["Normativa", "Total", "Realizadas", "Pendientes", "Vencidas", "Cumplimiento"],
    summaryNormativa.map((s) => [
      s.nombre,
      String(s.total),
      String(s.realizadas),
      String(s.pendientes),
      String(s.vencidas),
      `${s.cumplimiento}%`,
    ]),
    [220, 58, 78, 78, 72, 88]
  );

  sectionTitle("Resumen por categoria");
  table(
    ["Categoria", "Total", "Realizadas", "Pendientes", "Vencidas", "Cumplimiento"],
    summaryCategoria.map((s) => [
      s.nombre,
      String(s.total),
      String(s.realizadas),
      String(s.pendientes),
      String(s.vencidas),
      `${s.cumplimiento}%`,
    ]),
    [220, 58, 78, 78, 72, 88]
  );

  sectionTitle("Listado de actividades");
  table(
    [
      "Actividad",
      "Normativa",
      "Categoria",
      "Periodicidad",
      "Mes",
      "Responsable",
      "Centro/Contratista",
      "Estado",
      "Req. evidencia",
      "Estado evidencia",
    ],
    actividades.map((a) => [
      a.actividad,
      a.normativa,
      a.categoria,
      a.periodicidad,
      firstActiveMonth(a),
      a.responsable,
      a.centroContratista,
      a.estado,
      a.requiereEvidencia ? "Si" : "No",
      a.evidencia,
    ]),
    [170, 90, 88, 78, 44, 96, 118, 60, 68, 74]
  );

  sectionTitle("Observaciones generales");
  const observations = [
    "Reporte generado automaticamente desde el modulo Plan de Trabajo Anual de NextPrev.",
    `Total de actividades analizadas: ${actividades.length}.`,
    "Este documento resume el estado operativo actual y sirve como respaldo para seguimiento de cumplimiento.",
  ];

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  observations.forEach((line) => {
    ensureSpace(14);
    doc.text(`- ${line}`, marginX, y);
    y += 14;
  });

  drawFooter(doc.getNumberOfPages());

  doc.save(`plan-trabajo-anual-${year}.pdf`);
}
