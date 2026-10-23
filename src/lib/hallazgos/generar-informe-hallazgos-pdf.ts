import { jsPDF } from "jspdf";
import type { Hallazgo } from "@/app/dicaprev/cumplimiento/types";
import type { HallazgoDetalle } from "@/app/dicaprev/cumplimiento/hallazgos/actions";
import {
  agruparHallazgosPorEstado, estaVencidoInforme, fechaChile, rangoInformeHallazgos,
  type TipoInformeHallazgos,
} from "./informe-periodico";

// Formato corporativo NextPrev: vectores y texto seleccionable (sin html2canvas).
const NAVY: [number, number, number] = [5, 42, 87];
const BLUE: [number, number, number] = [7, 54, 111];
const GOLD: [number, number, number] = [252, 211, 77];
const INK: [number, number, number] = [24, 39, 59];
const MUTED: [number, number, number] = [96, 109, 126];
const LINE: [number, number, number] = [224, 231, 239];
const PALE: [number, number, number] = [247, 249, 252];
const WHITE: [number, number, number] = [255, 255, 255];
const AMBER: [number, number, number] = [180, 83, 9];
const GREEN: [number, number, number] = [21, 128, 61];
const RED: [number, number, number] = [185, 28, 28];
const W = 841.89;
const H = 595.28;
const M = 34;
const CONTENT = W - 2 * M;
const LOWER = H - 45;

const LABEL_ESTADO: Record<string, string> = {
  abierto: "Abierto", en_seguimiento: "En seguimiento", en_proceso: "En proceso",
  resuelto: "Resuelto", cerrado: "Cerrado",
};
const LABEL_TIPO: Record<string, string> = {
  documental: "Documental", condicion_insegura: "Condición insegura", acto_inseguro: "Acto inseguro",
  estructural: "Estructural", capacitacion: "Capacitación", evidencia: "Evidencia",
  procedimiento: "Procedimiento", comite_paritario: "Comité paritario",
  plan_trabajo: "Plan de trabajo", accidente_incidente: "Accidente/incidente",
  emergencia: "Emergencia", otro: "Otro", seguridad: "Seguridad",
  conducta: "Conducta", equipos: "Equipos", emergencias: "Emergencias",
};
const LABEL_PRIORIDAD: Record<string, string> = {
  critica: "Crítica", alta: "Alta", media: "Media", baja: "Baja",
};

function dia(value: string): string {
  if (!value) return "-";
  const str = value.slice(0, 10);
  const parts = str.split("-");
  return parts.length === 3 ? parts[2] + "-" + parts[1] + "-" + parts[0] : str;
}
function limpia(value: string | null | undefined, fallback = "-"): string {
  return (value || "").trim().replace(/[\r\n]+/g, " ") || fallback;
}
function colorear(doc: jsPDF, color: [number, number, number]): void { doc.setTextColor(...color); }
function fondo(doc: jsPDF, color: [number, number, number]): void { doc.setFillColor(...color); }

function encabezado(doc: jsPDF, titulo: string, subtitulo: string, empresa: string, emitido: string) {
  fondo(doc, NAVY);
  doc.rect(0, 0, W, 89, "F");
  fondo(doc, GOLD);
  doc.rect(0, 88, W, 3, "F");
  doc.roundedRect(M, 19, 34, 34, 8, 8, "F");
  colorear(doc, NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("NP", M + 17, 41, { align: "center" });
  colorear(doc, WHITE);
  doc.setFontSize(17);
  doc.text("NextPrev", M + 44, 41);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(titulo, M, 69);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(subtitulo, M + 255, 69);
  const empresaReducida = doc.splitTextToSize(limpia(empresa, "Empresa activa"), 245)[0];
  doc.text(empresaReducida, W - M, 28, { align: "right" });
  doc.setTextColor(192, 204, 220);
  doc.setFontSize(8.5);
  doc.text("Emisión: " + emitido, W - M, 44, { align: "right" });
}

function numerar(doc: jsPDF, nombre: string) {
  const paginas = doc.getNumberOfPages();
  for (let i = 1; i <= paginas; i += 1) {
    doc.setPage(i);
    doc.setDrawColor(...LINE);
    doc.line(M, H - 32, W - M, H - 32);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    colorear(doc, MUTED);
    doc.text("Generado por NextPrev  |  " + nombre + "  |  Uso interno SST", M, H - 17);
    doc.text("Página " + i + " de " + paginas, W - M, H - 17, { align: "right" });
  }
}
function tipoRiesgo(h: Hallazgo): string {
  return LABEL_TIPO[h.tipo] || h.tipo.replace(/_/g, " ");
}
function prioridad(h: Hallazgo): string {
  return LABEL_PRIORIDAD[h.prioridad] || h.prioridad;
}
function colorPrioridad(h: Hallazgo): [number, number, number] {
  if (h.prioridad === "critica" || h.prioridad === "alta") return RED;
  if (h.prioridad === "media") return AMBER;
  return BLUE;
}
function iniciarPagina(doc: jsPDF, titulo: string, subtitulo: string, empresa: string, emitido: string): number {
  doc.addPage();
  encabezado(doc, titulo, subtitulo, empresa, emitido);
  return 113;
}
function tituloSeccion(doc: jsPDF, y: number, titulo: string, total?: number, color: [number, number, number] = BLUE) {
  fondo(doc, color);
  doc.roundedRect(M, y, CONTENT, 26, 5, 5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  colorear(doc, WHITE);
  doc.text(titulo.toUpperCase(), M + 12, y + 17);
  if (total !== undefined) {
    doc.text(total + " hallazgo(s)", W - M - 12, y + 17, { align: "right" });
  }
}
function cajaResumen(doc: jsPDF, x: number, y: number, w: number, numero: string, etiqueta: string, color: [number, number, number]) {
  fondo(doc, PALE);
  doc.setDrawColor(...LINE);
  doc.roundedRect(x, y, w, 66, 8, 8, "FD");
  fondo(doc, color);
  doc.roundedRect(x + 10, y + 12, 3, 43, 1, 1, "F");
  colorear(doc, INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(25);
  doc.text(numero, x + 23, y + 35);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  colorear(doc, MUTED);
  doc.text(etiqueta, x + 23, y + 51);
}

const COLS = [
  { label: "Fecha", w: 64 },
  { label: "Hallazgo / referencia", w: 257 },
  { label: "Centro", w: 119 },
  { label: "Responsable", w: 111 },
  { label: "Prioridad", w: 67 },
  { label: "Compromiso", w: 77 },
  { label: "Situación", w: CONTENT - 695 },
];

function encabezadoTabla(doc: jsPDF, y: number) {
  fondo(doc, [235, 240, 247]);
  doc.rect(M, y, CONTENT, 29, "F");
  doc.setFontSize(8.4);
  doc.setFont("helvetica", "bold");
  colorear(doc, NAVY);
  let x = M;
  for (const c of COLS) {
    doc.text(c.label, x + 7, y + 18);
    x += c.w;
  }
}

export type DatosInformeHallazgosPdf = {
  empresaNombre: string;
  tipo: TipoInformeHallazgos;
  referencia: string;
  hallazgos: Hallazgo[];
};

export function construirInformeHallazgosPdf(data: DatosInformeHallazgosPdf): jsPDF {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4", compress: true });
  doc.setProperties({ title: "Informe de Hallazgos | NextPrev", subject: "Control de hallazgos por estado", author: "NextPrev" });
  const hoy = fechaChile(new Date());
  const emitido = dia(hoy);
  const rango = data.tipo === "seleccion" ? null : rangoInformeHallazgos(data.tipo, data.referencia);
  const subtitulo = rango ? dia(rango.desde) + " al " + dia(rango.hasta) : "Hallazgos seleccionados";
  const titulo = (rango ? rango.titulo : "Informe de hallazgos") + " · DS 44";
  encabezado(doc, titulo, subtitulo, data.empresaNombre, emitido);

  const grupos = agruparHallazgosPorEstado(data.hallazgos);
  const total = data.hallazgos.length;
  const vencidos = data.hallazgos.filter((h) => estaVencidoInforme(h, hoy)).length;
  const counts = [
    { nombre: "Total", valor: total, color: BLUE },
    { nombre: "Abiertos", valor: grupos[0].hallazgos.length, color: AMBER },
    { nombre: "Seguimiento", valor: grupos[1].hallazgos.length, color: [15, 118, 110] as [number,number,number] },
    { nombre: "En proceso", valor: grupos[2].hallazgos.length, color: BLUE },
    { nombre: "Cerrados", valor: grupos[4].hallazgos.length, color: GREEN },
    { nombre: "Vencidos", valor: vencidos, color: RED },
  ];
  const w = (CONTENT - 5 * 9) / 6;
  for (let i = 0; i < counts.length; i += 1) {
    const c = counts[i];
    cajaResumen(doc, M + i * (w + 9), 109, w, String(c.valor), c.nombre, c.color);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  colorear(doc, INK);
  doc.text("REGISTRO DOCUMENTAL Y CONTROL OPERACIONAL", M, 196);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  colorear(doc, MUTED);
  const nota = rango
    ? "Hallazgos registrados entre " + subtitulo + "; estado actual a la fecha de emisión. Vencido = compromiso superado y hallazgo sin resolver."
    : "Informe de selección; estado actual a la fecha de emisión. Vencido = compromiso superado y hallazgo sin resolver.";
  doc.text(nota, M, 211, { maxWidth: CONTENT });
  doc.setDrawColor(...LINE);
  doc.line(M, 220, W - M, 220);

  let y = 235;
  const crearPagina = () => { y = iniciarPagina(doc, titulo, subtitulo, data.empresaNombre, emitido); };

  for (const grupo of grupos) {
    if (y > LOWER - 96) crearPagina();
    const colorGrupo: [number,number,number] = grupo.clave === "abierto" ? AMBER
      : grupo.clave === "cerrado" ? GREEN
      : grupo.clave === "resuelto" ? [15, 118, 110] : BLUE;
    tituloSeccion(doc, y, grupo.nombre, grupo.hallazgos.length, colorGrupo);
    y += 31;
    encabezadoTabla(doc, y);
    y += 29;

    if (grupo.hallazgos.length === 0) {
      fondo(doc, WHITE);
      doc.setDrawColor(...LINE);
      doc.rect(M, y, CONTENT, 34, "S");
      colorear(doc, MUTED);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.text("No se registran hallazgos en este estado para el alcance seleccionado.", M + 10, y + 21);
      y += 48;
      continue;
    }
    for (let i = 0; i < grupo.hallazgos.length; i += 1) {
      const h = grupo.hallazgos[i];
      const estadoVencido = estaVencidoInforme(h, hoy);
      const valores = [
        dia(fechaChile(h.fechaCreacion)),
        limpia(h.descripcion) + "  [ID " + h.id.slice(0, 8) + "]  ·  " + tipoRiesgo(h),
        limpia(h.centroNombre),
        limpia(h.responsableNombre, "Por asignar"),
        prioridad(h),
        dia(h.fechaCompromiso),
        estadoVencido ? "VENCIDO" : (h.estado === "cerrado" ? "Cerrado" : h.estado === "resuelto" ? "Resuelto" : "En plazo"),
      ];
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.25);
      const lineas = valores.map((v, index) => doc.splitTextToSize(v, COLS[index].w - 13) as string[]);
      const maxLineas = Math.max(...lineas.map((v) => v.length));
      const altoTotal = Math.max(37, maxLineas * 10.5 + 12);
      // Una fila normal se conserva íntegra; descripciones largas se dividen
      // en bloques para no exceder el pie de página ni perder información.
      if (y + altoTotal > LOWER && altoTotal <= LOWER - 173) {
        crearPagina();
        tituloSeccion(doc, y, grupo.nombre + " (continuación)", grupo.hallazgos.length, colorGrupo);
        y += 31;
        encabezadoTabla(doc, y);
        y += 29;
      }
      const restantes = lineas.map((grupoLineas) => [...grupoLineas]);
      let parte = 0;
      while (restantes.some((grupoLineas) => grupoLineas.length > 0)) {
        if (y + 37 > LOWER) {
          crearPagina();
          tituloSeccion(doc, y, grupo.nombre + " (continuación)", grupo.hallazgos.length, colorGrupo);
          y += 31;
          encabezadoTabla(doc, y);
          y += 29;
        }
        const capacidad = Math.max(1, Math.floor((LOWER - y - 12) / 10.5));
        const segmento = restantes.map((grupoLineas) => grupoLineas.splice(0, capacidad));
        const altoSegmento = Math.max(37, Math.max(...segmento.map((lineasCol) => lineasCol.length)) * 10.5 + 12);
        fondo(doc, i % 2 === 0 ? WHITE : PALE);
        doc.rect(M, y, CONTENT, altoSegmento, "F");
        doc.setDrawColor(...LINE);
        doc.line(M, y + altoSegmento, W - M, y + altoSegmento);
        let x = M;
        for (let c = 0; c < valores.length; c += 1) {
          doc.setFont("helvetica", c === 1 || c === 4 || (c === 6 && estadoVencido) ? "bold" : "normal");
          doc.setFontSize(c === 1 ? 8.2 : 8);
          colorear(doc, c === 4 ? colorPrioridad(h) : c === 6 && estadoVencido ? RED : INK);
          if (parte > 0 && c === 1 && !segmento[c].length) {
            doc.text("ID " + h.id.slice(0, 8) + " · continuación", x + 7, y + 13);
          } else if (segmento[c].length) {
            doc.text(segmento[c], x + 7, y + 13, { lineHeightFactor: 1.15 });
          }
          x += COLS[c].w;
        }
        y += altoSegmento;
        parte += 1;
      }
    }
    y += 17;
  }

  if (!total) {
    if (y > LOWER - 48) crearPagina();
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    colorear(doc, MUTED);
    doc.text("No se encontraron hallazgos registrados en el período indicado.", M, y + 10);
  }
  numerar(doc, "Informe de hallazgos");
  return doc;
}

export function guardarInformeHallazgosPdf(data: DatosInformeHallazgosPdf) {
  const doc = construirInformeHallazgosPdf(data);
  const sufijo = data.tipo === "seleccion" ? "Seleccion" : data.tipo + "_" + data.referencia;
  doc.save("NextPrev_Hallazgos_" + sufijo + ".pdf");
}

export type DatosFichaHallazgoPdf = {
  hallazgo: Hallazgo;
  detalle: HallazgoDetalle | null;
  empresaNombre: string;
  fotos: Array<{ titulo: string; src: string }>;
};

/** Ficha individual compacta, con evidencia fotográfica opcional y todas las medidas. */
export function guardarFichaHallazgoPdf(data: DatosFichaHallazgoPdf) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4", compress: true });
  const h = data.hallazgo;
  const emitido = dia(fechaChile(new Date()));
  const titulo = "Ficha de hallazgo · DS 44";
  const subtitulo = "Identificador " + h.id.slice(0, 12);
  encabezado(doc, titulo, subtitulo, data.empresaNombre, emitido);
  let y = 110;
  const siguientePagina = () => { y = iniciarPagina(doc, titulo, subtitulo, data.empresaNombre, emitido); };
  const ensure = (height: number) => { if (y + height > LOWER) siguientePagina(); };
  const metadatos = [
    ["Estado", LABEL_ESTADO[h.estado] || h.estado],
    ["Prioridad", prioridad(h)],
    ["Fecha de hallazgo", dia(fechaChile(h.fechaCreacion))],
    ["Compromiso", dia(h.fechaCompromiso)],
    ["Centro", limpia(h.centroNombre)],
    ["Responsable", limpia(h.responsableNombre, "Por asignar")],
    ["Creado por", limpia(h.creadoPor)],
    ["Tipo", tipoRiesgo(h)],
  ];
  const anchoMeta = (CONTENT - 3 * 10) / 4;
  for (let i = 0; i < metadatos.length; i += 1) {
    const x = M + (i % 4) * (anchoMeta + 10);
    const yy = y + Math.floor(i / 4) * 59;
    fondo(doc, PALE);
    doc.setDrawColor(...LINE);
    doc.roundedRect(x, yy, anchoMeta, 50, 6, 6, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    colorear(doc, MUTED);
    doc.text(metadatos[i][0].toUpperCase(), x + 11, yy + 17);
    doc.setFontSize(9.5);
    colorear(doc, INK);
    const texto = doc.splitTextToSize(metadatos[i][1], anchoMeta - 20) as string[];
    doc.text(texto.slice(0, 2), x + 11, yy + 32, { lineHeightFactor: 1.05 });
  }
  y += 132;

  const bloque = (nombre: string, contenido: string) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    const lineas = doc.splitTextToSize(contenido, CONTENT - 30) as string[];
    const altura = Math.max(57, lineas.length * 13 + 47);
    ensure(altura + 10);
    tituloSeccion(doc, y, nombre);
    y += 30;
    fondo(doc, PALE);
    doc.setDrawColor(...LINE);
    doc.roundedRect(M, y, CONTENT, altura - 30, 6, 6, "FD");
    colorear(doc, INK);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.text(lineas, M + 14, y + 17, { lineHeightFactor: 1.34 });
    y += altura - 16;
  };
  bloque("Descripción del hallazgo", limpia(h.descripcion, "Sin descripción"));

  const medidas = data.detalle?.medidasCorrectivas || [];
  if (medidas.length) {
    ensure(78);
    tituloSeccion(doc, y, "Medidas correctivas", medidas.length);
    y += 31;
    for (let i = 0; i < medidas.length; i += 1) {
      const m = medidas[i];
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const lines = doc.splitTextToSize(m.descripcion, CONTENT - 32) as string[];
      const alto = Math.max(64, lines.length * 11 + 38);
      ensure(alto + 8);
      fondo(doc, i % 2 ? PALE : WHITE);
      doc.setDrawColor(...LINE);
      doc.roundedRect(M, y, CONTENT, alto, 5, 5, "FD");
      colorear(doc, INK);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("MEDIDA " + (i + 1) + " · " + m.estado.replace(/_/g, " ").toUpperCase(), M + 12, y + 15);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.8);
      doc.text(lines, M + 12, y + 29);
      doc.setFontSize(8);
      colorear(doc, MUTED);
      doc.text("Responsable: " + limpia(m.responsable) + "  |  Compromiso: " + dia(m.fechaCompromiso), M + 12, y + alto - 9);
      y += alto + 8;
    }
  }

  for (let i = 0; i < data.fotos.length; i += 1) {
    const foto = data.fotos[i];
    try {
      const info = doc.getImageProperties(foto.src);
      const width = Math.min(CONTENT, 480);
      const height = Math.min(285, width * info.height / info.width);
      ensure(height + 60);
      tituloSeccion(doc, y, "Evidencia fotográfica " + (i + 1));
      y += 32;
      doc.addImage(foto.src, "JPEG", M, y, width, height, undefined, "FAST");
      y += height + 5;
      colorear(doc, MUTED);
      doc.setFontSize(8);
      doc.text(limpia(foto.titulo, "Fotografía de hallazgo"), M, y + 6, { maxWidth: CONTENT });
      y += 28;
    } catch {
      // Un archivo ilegible no debe impedir la descarga del informe restante.
    }
  }
  numerar(doc, "Ficha individual de hallazgo");
  doc.save("NextPrev_Hallazgo_" + h.id.slice(0, 10) + ".pdf");
}
