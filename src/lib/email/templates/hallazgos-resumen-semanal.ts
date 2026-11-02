import { fechaCompromisoHallazgo, fechaLegibleHallazgo } from "@/lib/hallazgos/avisos-utils";
import { periodoResumenSemanalHallazgos, resumirHallazgos, type HallazgoResumenItem } from "@/lib/hallazgos/resumen-semanal";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

export type DatosResumenHallazgos = {
  nombreEmpresa: string;
  destinatarioNombre: string;
  hallazgos: HallazgoResumenItem[];
  periodo: ReturnType<typeof periodoResumenSemanalHallazgos>;
  appUrl: string;
};

export function generarCorreoResumenSemanalHallazgos(datos: DatosResumenHallazgos) {
  const resumen = resumirHallazgos(datos.hallazgos, datos.periodo);
  const rango = `${fechaLegibleHallazgo(datos.periodo.desde)} al ${fechaLegibleHallazgo(datos.periodo.hasta)}`;
  const url = datos.appUrl.replace(/\/$/, "") + "/dicaprev/cumplimiento/hallazgos";
  const subject = `NextPrev · Resumen semanal de hallazgos · ${datos.nombreEmpresa}`;
  const kpis: Array<[string, number, string]> = [
    ["Nuevos en la semana", resumen.nuevos, "#dbeafe"],
    ["Pendientes actuales", resumen.abiertos, "#f1f5f9"],
    ["Vencidos", resumen.vencidos, "#fee2e2"],
    ["Próximos 7 días", resumen.proximos, "#fef3c7"],
  ];
  const estadisticas = kpis.map(([nombre, valor, fondo]) => `
    <td style="padding:8px;vertical-align:top;width:25%"><div style="padding:14px 9px;background:${fondo};border-radius:10px;text-align:center">
      <div style="font-size:25px;font-weight:800;color:#0f172a">${valor}</div>
      <div style="font-size:11px;color:#334155;line-height:1.35">${esc(nombre)}</div>
    </div></td>`).join("");
  const filas = resumen.destacados.map((h) => {
    const descripcion = h.descripcion.length > 155 ? h.descripcion.slice(0, 152) + "…" : h.descripcion;
    return `<tr>
      <td style="padding:10px 7px;border-bottom:1px solid #e2e8f0;color:#334155;font-size:12px">${esc(h.id.slice(0, 8).toUpperCase())}</td>
      <td style="padding:10px 7px;border-bottom:1px solid #e2e8f0;color:#0f172a;font-size:12px;word-break:break-word">${esc(descripcion)}<br><span style="color:#64748b;font-size:11px">${esc(h.centro)}</span></td>
      <td style="padding:10px 7px;border-bottom:1px solid #e2e8f0;color:#334155;font-size:12px">${esc(h.prioridad)}</td>
      <td style="padding:10px 7px;border-bottom:1px solid #e2e8f0;color:#334155;font-size:12px">${esc(h.estado.replace(/_/g, " "))}</td>
      <td style="padding:10px 7px;border-bottom:1px solid #e2e8f0;color:#334155;font-size:12px">${esc(fechaLegibleHallazgo(fechaCompromisoHallazgo(h.fechaCompromiso)))}</td>
    </tr>`;
  }).join("");
  const tabla = resumen.destacados.length ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:12px">
      <thead><tr style="background:#f8fafc;color:#475569;font-size:11px;text-align:left">
        <th style="padding:10px 7px">ID</th><th style="padding:10px 7px">Hallazgo</th>
        <th style="padding:10px 7px">Prioridad</th><th style="padding:10px 7px">Estado</th>
        <th style="padding:10px 7px">Compromiso</th>
      </tr></thead><tbody>${filas}</tbody>
    </table>` : '<p style="color:#64748b;font-size:13px">No hay hallazgos para este período.</p>';
  const html = `<!doctype html><html lang="es"><body style="margin:0;background:#f1f5f9;color:#0f172a;font-family:Arial,Helvetica,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 10px;background:#f1f5f9"><tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:720px;border:1px solid #e2e8f0;border-radius:15px;overflow:hidden;background:#fff">
  <tr><td style="background:#071f42;padding:26px 28px;border-bottom:4px solid #facc15">
    <div style="color:#93c5fd;letter-spacing:2px;font-size:12px;font-weight:700">NEXTPREV · SST</div>
    <h1 style="color:#fff;font-size:23px;line-height:1.3;margin:10px 0">Resumen semanal de hallazgos</h1>
    <div style="color:#cbd5e1;font-size:13px">${esc(datos.nombreEmpresa)} · ${esc(rango)}</div>
  </td></tr><tr><td style="padding:24px 25px">
    <p style="font-size:14px;color:#334155">Hola <strong>${esc(datos.destinatarioNombre)}</strong>:</p>
    <p style="font-size:13px;line-height:1.6;color:#475569">Este es tu resumen consolidado. Incluye los hallazgos asignados a tu responsabilidad, creados por ti o bajo tu administración, según tus roles. Los pendientes y vencidos reflejan su estado actual.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${estadisticas}</tr></table>
    <h2 style="font-size:16px;margin:25px 0 7px;color:#0f172a">Hallazgos que requieren atención</h2>
    <p style="font-size:12px;color:#64748b;margin:0">Hasta 12 destacados, priorizados por criticidad y vencimiento. Consulta el listado completo en NextPrev.</p>
    ${tabla}
    <a href="${esc(url)}" style="display:inline-block;margin-top:23px;padding:13px 20px;background:#07549e;border-radius:9px;color:#fff;text-decoration:none;font-size:13px;font-weight:bold">Ver hallazgos en NextPrev</a>
    <p style="margin-top:24px;font-size:11px;line-height:1.5;color:#94a3b8">Un correo semanal por empresa y destinatario. Las alertas críticas pueden generar un aviso inmediato adicional. Generado por NextPrev.</p>
  </td></tr></table></td></tr></table></body></html>`;
  const text = [
    `NextPrev · Resumen semanal de hallazgos · ${datos.nombreEmpresa}`,
    rango, "",
    `Nuevos: ${resumen.nuevos} | Pendientes: ${resumen.abiertos} | Vencidos: ${resumen.vencidos} | Próximos 7 días: ${resumen.proximos}`,
    "", ...resumen.destacados.map(h => `${h.id.slice(0,8)} · ${h.prioridad} · ${h.estado} · ${h.descripcion} · ${fechaLegibleHallazgo(fechaCompromisoHallazgo(h.fechaCompromiso))}`),
    "", "Ver todos: " + url, "Generado por NextPrev.",
  ].join("\n");
  return { subject, html, text };
}
