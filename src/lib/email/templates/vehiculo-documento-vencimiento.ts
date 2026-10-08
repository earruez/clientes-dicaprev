function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function fechaCl(iso: string): string {
  const date = new Date(`${iso}T12:00:00Z`);
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "America/Santiago",
  }).format(date);
}

export type VehiculoDocumentoVencimientoEmailInput = {
  responsableNombre: string;
  empresaNombre: string;
  vehiculoNombre: string;
  patente: string;
  documentoNombre: string;
  fechaVencimiento: string;
  diasRestantes: number;
  appUrl: string;
};

export function generarEmailVencimientoDocumentoVehiculo(
  input: VehiculoDocumentoVencimientoEmailInput,
): { subject: string; html: string; text: string } {
  const dias = Math.max(0, input.diasRestantes);
  const subject = `NextPrev · ${input.documentoNombre} vence en ${dias} día${dias === 1 ? "" : "s"}`;
  const detalleUrl = `${input.appUrl.replace(/\/$/, "")}/dicaprev/empresa/vehiculos`;

  const responsable = escapeHtml(input.responsableNombre);
  const empresa = escapeHtml(input.empresaNombre);
  const vehiculo = escapeHtml(input.vehiculoNombre);
  const patente = escapeHtml(input.patente);
  const documento = escapeHtml(input.documentoNombre);
  const vencimiento = escapeHtml(fechaCl(input.fechaVencimiento));
  const href = escapeHtml(detalleUrl);

  const html = `
<!doctype html>
<html lang="es">
  <body style="margin:0;padding:0;background:#f1f5f9;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 8px 24px rgba(15,23,42,.06);">
            <tr>
              <td style="background:#0f172a;padding:24px 28px;">
                <div style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#94a3b8;font-weight:700;">NextPrev</div>
                <div style="font-size:22px;line-height:1.25;color:#ffffff;font-weight:700;margin-top:6px;">Documento próximo a vencer</div>
                <div style="font-size:13px;color:#cbd5e1;margin-top:6px;">Control documental de vehículos y equipos</div>
              </td>
            </tr>
            <tr>
              <td style="padding:26px 28px 12px;">
                <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Hola <strong>${responsable}</strong>,</p>
                <p style="margin:0;font-size:14px;line-height:1.65;color:#475569;">
                  NextPrev detectó que un documento bajo tu responsabilidad está próximo a vencer.
                </p>

                <div style="margin:22px 0;background:#fff7ed;border:1px solid #fed7aa;border-radius:14px;padding:18px;">
                  <div style="font-size:12px;color:#9a3412;font-weight:700;text-transform:uppercase;letter-spacing:.08em;">Vence en</div>
                  <div style="font-size:34px;line-height:1;color:#c2410c;font-weight:800;margin-top:6px;">${dias} días</div>
                </div>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0 8px;font-size:14px;">
                  <tr>
                    <td style="color:#64748b;width:155px;">Empresa</td>
                    <td style="font-weight:600;color:#0f172a;">${empresa}</td>
                  </tr>
                  <tr>
                    <td style="color:#64748b;">Vehículo / equipo</td>
                    <td style="font-weight:600;color:#0f172a;">${vehiculo}</td>
                  </tr>
                  <tr>
                    <td style="color:#64748b;">Patente</td>
                    <td style="font-weight:600;color:#0f172a;">${patente}</td>
                  </tr>
                  <tr>
                    <td style="color:#64748b;">Documento</td>
                    <td style="font-weight:600;color:#0f172a;">${documento}</td>
                  </tr>
                  <tr>
                    <td style="color:#64748b;">Fecha de vencimiento</td>
                    <td style="font-weight:700;color:#c2410c;">${vencimiento}</td>
                  </tr>
                </table>

                <div style="margin:24px 0 8px;">
                  <a href="${href}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:12px 18px;border-radius:10px;">
                    Revisar en NextPrev
                  </a>
                </div>
                <p style="margin:18px 0 0;font-size:12px;line-height:1.6;color:#94a3b8;">
                  Este aviso es automático. NextPrev enviará un recordatorio adicional a los 15 días previos al vencimiento si el documento aún mantiene la misma fecha.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px 24px;border-top:1px solid #f1f5f9;font-size:11px;color:#94a3b8;">
                Generado por NextPrev · Gestión preventiva y cumplimiento documental
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    `Hola ${input.responsableNombre},`,
    "",
    `El documento ${input.documentoNombre} del vehículo/equipo ${input.vehiculoNombre} (${input.patente}) vence en ${dias} días.`,
    `Fecha de vencimiento: ${fechaCl(input.fechaVencimiento)}.`,
    `Empresa: ${input.empresaNombre}.`,
    "",
    `Revisar en NextPrev: ${detalleUrl}`,
    "",
    "Generado por NextPrev.",
  ].join("\n");

  return { subject, html, text };
}
