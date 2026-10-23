import { fechaCompromisoHallazgo, fechaLegibleHallazgo, type DestinatarioAvisoHallazgo } from "@/lib/hallazgos/avisos-utils";

function escapeHtml(texto: string): string {
  return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export type DatosCorreoHallazgo = {
  id: string;
  asunto: "nuevo" | "vencimiento";
  nombreEmpresa: string;
  creadorNombre: string;
  descripcion: string;
  prioridad: string;
  estado: string;
  centro: string;
  responsable: string;
  fechaCompromiso: Date;
  destinatario: DestinatarioAvisoHallazgo;
  appUrl: string;
};

export function generarCorreoHallazgo(datos: DatosCorreoHallazgo) {
  const vence = fechaLegibleHallazgo(fechaCompromisoHallazgo(datos.fechaCompromiso));
  const vencido = datos.asunto === "vencimiento";
  const titulo = vencido ? "Hallazgo pendiente de cierre" : "Nuevo hallazgo registrado";
  const subtitulo = vencido
    ? "La fecha de compromiso se alcanzó y el hallazgo todavía no está cerrado."
    : "Se registró un nuevo hallazgo que requiere seguimiento.";
  const enlace = datos.appUrl.replace(/\/$/, "") + "/dicaprev/cumplimiento/hallazgos";
  const descripcion = escapeHtml(datos.descripcion);
  const partes = [
    ["Empresa", datos.nombreEmpresa],
    ["Hallazgo", datos.id.slice(0, 8).toUpperCase()],
    ["Creado por", datos.creadorNombre],
    ["Responsable", datos.responsable],
    ["Centro", datos.centro],
    ["Prioridad", datos.prioridad],
    ["Estado", datos.estado.replace(/_/g, " ")],
    ["Compromiso", vence],
  ];
  const filas = partes.map(([label, value]) =>
    '<tr><td style="padding:8px 0;color:#64748b;width:145px;border-bottom:1px solid #f1f5f9">' +
    escapeHtml(label) + '</td><td style="padding:8px 0;font-weight:600;color:#0f172a;border-bottom:1px solid #f1f5f9">' +
    escapeHtml(value) + '</td></tr>',
  ).join("");
  const subject = "NextPrev · " + (vencido ? "Hallazgo sin cerrar al compromiso" : "Nuevo hallazgo") +
    " · " + datos.id.slice(0, 8);
  const html = [
    '<!doctype html><html lang="es"><body style="margin:0;background:#f1f5f9;color:#0f172a;font-family:Arial,Helvetica,sans-serif">',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:30px 12px;background:#f1f5f9"><tr><td align="center">',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;background:#ffffff">',
    '<tr><td style="background:#071f42;padding:25px 28px;border-bottom:4px solid #facc15">',
    '<div style="font-size:12px;font-weight:700;letter-spacing:2px;color:#93c5fd">NEXTPREV · SST</div>',
    '<div style="margin-top:9px;font-weight:700;font-size:23px;color:#ffffff">', escapeHtml(titulo), '</div>',
    '<div style="margin-top:8px;color:#cbd5e1;font-size:13px;line-height:1.5">', escapeHtml(subtitulo), '</div></td></tr>',
    '<tr><td style="padding:26px 28px">',
    '<p style="margin:0 0 17px;font-size:14px">Hola <strong>', escapeHtml(datos.destinatario.nombre), '</strong>:</p>',
    '<p style="color:#475569;font-size:14px;line-height:1.6">',
    vencido ? "Este hallazgo sigue pendiente de cierre y requiere revisión de las medidas correctivas." :
      "Este hallazgo fue ingresado a NextPrev. Revisa los antecedentes y las medidas correctivas.",
    '</p><div style="background:', vencido ? "#fff7ed" : "#eff6ff",
    ';padding:15px;border-radius:10px;border:1px solid ', vencido ? "#fed7aa" : "#bfdbfe",
    ';font-size:14px;line-height:1.6;margin:18px 0">',
    '<strong>Descripción</strong><div style="margin-top:5px;white-space:pre-wrap;overflow-wrap:anywhere">',
    descripcion, '</div></div>',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px">',
    filas, '</table>',
    '<a href="', escapeHtml(enlace),
    '" style="display:inline-block;margin-top:22px;background:#07549e;color:#ffffff;padding:12px 18px;border-radius:9px;text-decoration:none;font-size:14px;font-weight:bold">Ver hallazgos en NextPrev</a>',
    '<p style="margin-top:22px;font-size:11px;line-height:1.6;color:#94a3b8">',
    'Destinatario por rol: ', escapeHtml(datos.destinatario.roles.join(", ")),
    '. Aviso automático · Generado por NextPrev.</p></td></tr></table></td></tr></table></body></html>',
  ].join("");
  const text = [
    titulo, subtitulo, "", datos.descripcion, "",
    ...partes.map(([key, value]) => key + ": " + value), "",
    "Revisar: " + enlace, "Generado por NextPrev.",
  ].join("\n");
  return { subject, html, text };
}
