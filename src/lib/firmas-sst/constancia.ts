import { jsPDF } from "jspdf";

export type DatosConstanciaSst = {
  empresa: string;
  rutEmpresa: string;
  titulo: string;
  archivoOriginal: string;
  tipoEvidencia: string;
  modalidadContrato: string;
  fechaInicioContrato: string;
  fechaTerminoContrato: string;
  nombreFirmante: string;
  rutFirmante: string;
  correoParticular: string;
  solicitadoAt: Date;
  firmadoAt: Date;
  correoValidadoAt: Date | null;
  firmaImagen?: string | null;
  firmaTexto?: string | null;
  hashDocumento: string;
  hashEvidencia: string;
  ip: string | null;
  userAgent: string | null;
  verificacionUrl: string;
};

export function crearConstanciaFirmaSst(d: DatosConstanciaSst): Buffer {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const pageHeight = 297;
  let y = 47;
  const space = (height: number) => {
    if (y + height > pageHeight - 25) {
      pdf.addPage();
      y = 22;
    }
  };
  const campo = (etiqueta: string, valor: string) => {
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(9);
    const lines = pdf.splitTextToSize(valor || "-", 174) as string[];
    space(6 + lines.length * 4.7);
    pdf.setTextColor(71, 85, 105);
    pdf.text(etiqueta, 18, y);
    y += 5;
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(9);
    pdf.setTextColor(15, 23, 42);
    pdf.text(lines, 18, y);
    y += lines.length * 4.7 + 4;
  };
  pdf.setFillColor(8, 47, 73);
  pdf.rect(0, 0, 210, 36, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(20);
  pdf.text("NextPrev", 18, 18);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text("CONSTANCIA DE FIRMA ELECTRONICA SIMPLE | SST", 18, 27);
  campo("Empleador / RUT", d.empresa + " | " + d.rutEmpresa);
  campo("Documento", d.titulo + " (" + d.tipoEvidencia + ")");
  campo("Archivo original", d.archivoOriginal);
  campo("Contrato y periodo", d.modalidadContrato + " | " + d.fechaInicioContrato + " a " + d.fechaTerminoContrato);
  campo("Trabajador / RUT", d.nombreFirmante + " | " + d.rutFirmante);
  campo("Correo particular de copia", d.correoParticular);
  campo("Solicitud", d.solicitadoAt.toISOString());
  campo("Firma y aceptacion de modalidad electronica", d.firmadoAt.toISOString());
  campo("Validacion de correo personal mediante codigo de un solo uso", d.correoValidadoAt?.toISOString() || "No registrada");
  space(29);
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(9);
  pdf.text("Firma simple del trabajador", 18, y);
  y += 4;
  if (d.firmaImagen?.startsWith("data:image/png;base64,")) {
    try {
      pdf.addImage(d.firmaImagen, "PNG", 18, y, 78, 22);
    } catch {
      pdf.setFont("helvetica", "normal");
      pdf.text(d.firmaTexto || "Firma electronica simple", 18, y + 9);
    }
  } else {
    pdf.setFont("helvetica", "normal");
    pdf.text((d.firmaTexto || d.nombreFirmante).slice(0, 100), 18, y + 9);
  }
  y += 27;
  campo("SHA-256 del archivo original (integridad)", d.hashDocumento);
  campo("SHA-256 de evidencia de firma", d.hashEvidencia);
  campo("IP registrada", d.ip || "No informada");
  campo("Dispositivo", d.userAgent || "No informado");
  campo("Comprobar esta constancia", d.verificacionUrl);
  space(20);
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(8); pdf.setTextColor(71, 85, 105);
  pdf.text(pdf.splitTextToSize(
    "El trabajador declara haber revisado el PDF identificado, acepta la modalidad electronica y firmo por firma electronica simple. " +
    "El archivo original se conserva sin alteraciones. Esta constancia no reemplaza evidencias de una capacitacion practica presencial " +
    "ni constituye firma electronica avanzada o sello de tiempo acreditado.", 173), 18, y);
  const total = pdf.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    pdf.setPage(i);
    pdf.setDrawColor(203, 213, 225); pdf.line(18, 278, 192, 278);
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(8); pdf.setTextColor(100, 116, 139);
    pdf.text("Generado por NextPrev | Registro documental SST", 18, 285);
    pdf.text(i + "/" + total, 190, 285, { align: "right" });
  }
  return Buffer.from(pdf.output("arraybuffer"));
}
