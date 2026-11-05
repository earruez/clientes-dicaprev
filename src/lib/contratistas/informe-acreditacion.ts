import { jsPDF } from "jspdf";
import { prisma } from "@/lib/prisma";
import { estadoAcreditacionDocumental, etiquetaInformeDocumento, resumenDocumentosInforme, type RequisitoInforme } from "@/lib/contratistas/resumen-informe";

const fechaChile = (date: Date) => new Intl.DateTimeFormat("es-CL", {
  timeZone: "America/Santiago", dateStyle: "short", timeStyle: "short",
}).format(date);
const status = (docs: readonly RequisitoInforme[]) => estadoAcreditacionDocumental(docs);

export async function obtenerDatosInformeContratista(empresaId: string, solicitudId: string) {
  const solicitud = await prisma.contratistaSolicitud.findFirst({
    where: { empresaId, id: solicitudId },
    include: {
      contratista: { select: { nombre: true, razonSocial: true, rut: true } },
      centroTrabajo: { select: { nombre: true } },
      recursos: { orderBy: { nombre: "asc" }, select: { id: true, nombre: true, identificador: true, cargo: true, tipo: true } },
      requisitos: {
        orderBy: [{ categoria: "asc" }, { nombre: "asc" }],
        select: {
          nombre: true, categoria: true, recursoId: true, obligatorio: true, estado: true,
          archivoNombre: true, archivoOriginal: true, fechaEmision: true,
          fechaVencimiento: true, vigenciaMeses: true, observacionRevision: true,
          revisadoAt: true, revisadoPorId: true,
        },
      },
    },
  });
  if (!solicitud) throw new Error("Expediente no encontrado o no autorizado.");

  const empresa = solicitud.requisitos.filter((r) => r.categoria === "empresa");
  const trabajadores = solicitud.recursos.filter((r) => r.tipo === "trabajador").map((r) => {
    const documentos = solicitud.requisitos.filter((d) => d.categoria === "trabajador" && d.recursoId === r.id);
    const exigibles = [
      ...empresa.filter((d) => d.obligatorio),
      ...documentos.filter((d) => d.obligatorio),
    ];
    return {
      id: r.id, nombre: r.nombre, rut: r.identificador || "Sin RUT",
      cargo: r.cargo || "Sin cargo", documentos,
      resumen: resumenDocumentosInforme(documentos),
      estado: status(exigibles),
    };
  });
  const pendientesSinAsignar = solicitud.requisitos.filter((r) => r.categoria === "trabajador" &&
    (!r.recursoId || !trabajadores.some((t) => t.id === r.recursoId)));
  const resumen = resumenDocumentosInforme(solicitud.requisitos);
  return {
    id: solicitud.id,
    empresa: solicitud.contratista.razonSocial || solicitud.contratista.nombre,
    rut: solicitud.contratista.rut || "Sin RUT",
    faena: solicitud.centroTrabajo?.nombre || solicitud.faena || solicitud.nombre,
    servicio: solicitud.servicio || "Sin servicio informado",
    contactoEmail: solicitud.contactoEmail,
    estado: status(solicitud.requisitos),
    fecha: new Date(),
    resumen, empresaDocs: empresa, trabajadores, pendientesSinAsignar,
    recursosExtra: solicitud.requisitos.filter((d) => !["empresa", "trabajador"].includes(d.categoria)),
  };
}

type Datos = Awaited<ReturnType<typeof obtenerDatosInformeContratista>>;

/** PDF de estado documental (no autorización administrativa ni ingreso a faena). */
export function crearPdfInformeContratista(data: Datos): Buffer {
  const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const dark: [number, number, number] = [15, 23, 42];
  const teal: [number, number, number] = [5, 110, 95];
  let y = 49;
  const newPage = () => { pdf.addPage(); y = 26; };
  const ensure = (height: number) => { if (y + height > 270) newPage(); };
  const section = (heading: string, subtitle?: string) => {
    ensure(subtitle ? 19 : 13);
    pdf.setFillColor(242, 246, 250);
    pdf.roundedRect(15, y, 180, subtitle ? 17 : 11, 2, 2, "F");
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(11); pdf.setTextColor(...dark);
    pdf.text(pdf.splitTextToSize(heading, 166)[0], 20, y + 6.5);
    if (subtitle) {
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(8); pdf.setTextColor(100, 116, 139);
      pdf.text(pdf.splitTextToSize(subtitle, 165)[0], 20, y + 12);
    }
    y += subtitle ? 20 : 14;
  };
  const paragraph = (value: string, color: [number, number, number] = [77, 92, 110]) => {
    pdf.setFontSize(8.8); pdf.setFont("helvetica", "normal"); pdf.setTextColor(...color);
    const lines: string[] = pdf.splitTextToSize(value, 178);
    for (const l of lines) {
      ensure(5); pdf.text(l, 17, y); y += 4.4;
    }
    y += 2;
  };
  const item = (doc: RequisitoInforme) => {
    const badge = etiquetaInformeDocumento(doc);
    const titleLines = pdf.splitTextToSize((doc.obligatorio ? "• " : "○ ") + doc.nombre, 117) as string[];
    const note = doc.observacionRevision?.trim()
      ? "Motivo: " + doc.observacionRevision.trim() : !doc.archivoNombre ? "Falta subir el archivo" : "";
    const noteLines = note ? pdf.splitTextToSize(note, 169) as string[] : [];
    const height = Math.max(9, 5 * titleLines.length + 3) + (noteLines.length ? 4 * noteLines.length + 2 : 0);
    ensure(height);
    pdf.setDrawColor(226, 232, 240); pdf.line(17, y - 3, 193, y - 3);
    pdf.setTextColor(...dark); pdf.setFont("helvetica", "normal"); pdf.setFontSize(8.4);
    pdf.text(titleLines, 18, y);
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(8); pdf.setTextColor(...(badge === "Aprobado" ? teal : badge === "Sin cargar" ? [148, 69, 17] as [number, number, number] : [165, 74, 10] as [number, number, number]));
    pdf.text(badge, 191, y, { align: "right" });
    y += Math.max(9, 5 * titleLines.length + 3);
    if (noteLines.length) {
      ensure(4 * noteLines.length + 3);
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(7.6); pdf.setTextColor(149, 71, 24);
      pdf.text(noteLines, 19, y - 2); y += 4 * noteLines.length + 2;
    }
  };

  pdf.setFillColor(...dark); pdf.rect(0, 0, 210, 38, "F");
  pdf.setFontSize(21); pdf.setFont("helvetica", "bold"); pdf.setTextColor(255, 255, 255);
  pdf.text("NextPrev", 16, 18);
  pdf.setFontSize(9); pdf.setFont("helvetica", "normal"); pdf.setTextColor(202, 226, 226);
  pdf.text("INFORME DE ACREDITACIÓN DOCUMENTAL · CONTRATISTAS", 16, 28);
  section(data.empresa, "Obra / faena: " + data.faena);
  paragraph("RUT empresa: " + data.rut + "    |    Fecha del informe: " + fechaChile(data.fecha));
  paragraph("Servicio: " + data.servicio);
  section("Resumen de documentos");
  const r = data.resumen;
  paragraph("Subidos: " + r.cargados + "/" + r.total +
    "   ·   Aprobados: " + r.aprobados +
    "   ·   Pendientes de validación: " + r.porValidar +
    "   ·   Sin cargar: " + r.sinArchivo +
    "   ·   Observados / rechazados: " + r.observados +
    "   ·   Vencidos: " + r.vencidos);
  paragraph("Obligatorios aprobados: " + r.obligatoriosAprobados + "/" + r.obligatorios +
    "   ·   Estado documental global: " + data.estado, teal);
  section("1 · Documentación de empresa", data.empresaDocs.length + " requisitos");
  if (!data.empresaDocs.length) paragraph("Sin requisitos corporativos configurados.");
  data.empresaDocs.forEach(item);

  section("2 · Trabajadores", data.trabajadores.length + " carpetas individuales");
  if (!data.trabajadores.length) paragraph("No hay trabajadores incorporados a esta obra.");
  for (const t of data.trabajadores) {
    const res = t.resumen;
    section(t.nombre + " · " + t.rut, t.cargo + "   |   " + t.estado);
    paragraph(
      "Documentos subidos: " + res.cargados + "/" + res.total +
      "   ·   Aprobados: " + res.aprobados +
      "   ·   Por validar: " + res.porValidar +
      "   ·   Faltan subir: " + res.sinArchivo +
      "   ·   Observados: " + res.observados +
      "   ·   Obligatorios conformes: " + res.obligatoriosAprobados + "/" + res.obligatorios,
    );
    if (!t.documentos.length) paragraph("Aún no tiene requisitos individuales asociados.");
    t.documentos.forEach(item);
  }
  if (data.pendientesSinAsignar.length) {
    section("Documentos sin trabajador asociado", data.pendientesSinAsignar.length + " registros");
    data.pendientesSinAsignar.forEach(item);
  }
  if (data.recursosExtra.length) {
    section("3 · Vehículos y equipos", data.recursosExtra.length + " requisitos");
    data.recursosExtra.forEach(item);
  }
  ensure(24);
  paragraph("Este informe refleja exclusivamente el estado documental en NextPrev en la fecha indicada. " +
    "La conformidad documental NO constituye autorización de ingreso a la faena ni certificación legal. " +
    "Cada documento se revisa individualmente por la empresa mandante.");
  const total = pdf.getNumberOfPages();
  for(let i = 1; i <= total; i++) {
    pdf.setPage(i);
    pdf.setDrawColor(203, 213, 225); pdf.line(16, 281, 194, 281);
    pdf.setFontSize(8); pdf.setFont("helvetica", "normal"); pdf.setTextColor(94, 110, 129);
    pdf.text("Generado por NextPrev · Informe documental de contratistas", 16, 287);
    pdf.text("Página " + i + " / " + total, 194, 287, { align: "right" });
  }
  return Buffer.from(pdf.output("arraybuffer"));
}

export async function generarInformeContratista(empresaId: string, solicitudId: string) {
  const data = await obtenerDatosInformeContratista(empresaId, solicitudId);
  return { data, pdf: crearPdfInformeContratista(data) };
}
