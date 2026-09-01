import {
  PermisoCliente,
  PermisoInstalacion,
  PermisoOrganismo,
  PermisoResponsable,
} from "@prisma/client";
import { PERMISO_ESTADOS } from "../types";
import { formatearFecha } from "./calculos";

interface PermisoConRelaciones extends PermisoInstalacion {
  organismo?: PermisoOrganismo | null;
  cliente?: PermisoCliente | null;
}

const ESTADO_EMAIL_ESTILOS: Record<string, { fondo: string; borde: string; texto: string }> = {
  PERMISO_CREADO: { fondo: "#dbeafe", borde: "#2563eb", texto: "#1d4ed8" },
  SOLICITADO: { fondo: "#e0e7ff", borde: "#4f46e5", texto: "#3730a3" },
  APROBADO: { fondo: "#dcfce7", borde: "#16a34a", texto: "#15803d" },
  CANCELADO: { fondo: "#fee2e2", borde: "#dc2626", texto: "#b91c1c" },
};

export function generarEmailPermiso(
  permiso: PermisoConRelaciones,
  responsable: PermisoResponsable,
  tipo: "PERMISO_CREADO" | "CAMBIO_ESTADO",
  _metadatos?: { estadoAnterior?: string; comentario?: string; tokenRespuestaObservacion?: string },
): string {
  void _metadatos;
  const estado = permiso.estado as keyof typeof PERMISO_ESTADOS;
  const estadoLabel = PERMISO_ESTADOS[estado] || permiso.estado;
  const estilo = ESTADO_EMAIL_ESTILOS[estado] || ESTADO_EMAIL_ESTILOS.PERMISO_CREADO;
  const titulo = tipo === "PERMISO_CREADO" ? "Nuevo permiso de instalación" : "Actualización de permiso";

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;background:#f1f5f9;color:#172033;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;background:#f1f5f9;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border:1px solid #dbe3ee;border-radius:12px;overflow:hidden;">
        <tr><td style="padding:28px 32px;background:#0f2747;">
          <div style="color:#ffffff;font-size:22px;font-weight:800;letter-spacing:0;">NEXTPREV</div>
          <div style="margin-top:5px;color:#bfdbfe;font-size:12px;font-weight:600;letter-spacing:0;">SEGURIDAD Y CUMPLIMIENTO</div>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 8px;color:#64748b;font-size:14px;">${titulo}</p>
          <div style="margin:0 0 28px;padding:18px 20px;background:${estilo.fondo};border-left:6px solid ${estilo.borde};border-radius:8px;color:${estilo.texto};font-size:25px;font-weight:800;line-height:1.2;">
            ${estadoLabel}
          </div>
          <h2 style="margin:0 0 14px;color:#172033;font-size:16px;font-weight:800;">Datos de la instalación</h2>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #e2e8f0;font-size:14px;">
            <tr><td style="padding:12px 0;color:#64748b;border-bottom:1px solid #e2e8f0;">Cliente</td><td align="right" style="padding:12px 0;color:#172033;font-weight:700;border-bottom:1px solid #e2e8f0;">${permiso.cliente?.nombre || "Sin cliente"}</td></tr>
            <tr><td style="padding:12px 0;color:#64748b;border-bottom:1px solid #e2e8f0;">Dirección</td><td align="right" style="padding:12px 0;color:#172033;font-weight:700;border-bottom:1px solid #e2e8f0;">${permiso.direccion}</td></tr>
            <tr><td style="padding:12px 0;color:#64748b;border-bottom:1px solid #e2e8f0;">Municipalidad</td><td align="right" style="padding:12px 0;color:#172033;font-weight:700;border-bottom:1px solid #e2e8f0;">${permiso.nombreOrganismoSnapshot || permiso.organismo?.nombre || "-"}</td></tr>
            <tr><td style="padding:12px 0;color:#64748b;border-bottom:1px solid #e2e8f0;">Fecha de instalación</td><td align="right" style="padding:12px 0;color:#172033;font-weight:700;border-bottom:1px solid #e2e8f0;">${formatearFecha(permiso.fechaInstalacion)}</td></tr>
          </table>
          <h2 style="margin:28px 0 14px;color:#172033;font-size:16px;font-weight:800;">Coordinador</h2>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #e2e8f0;font-size:14px;">
            <tr><td style="padding:12px 0;color:#64748b;border-bottom:1px solid #e2e8f0;">Nombre</td><td align="right" style="padding:12px 0;color:#172033;font-weight:700;border-bottom:1px solid #e2e8f0;">${responsable.nombre}</td></tr>
            <tr><td style="padding:12px 0;color:#64748b;border-bottom:1px solid #e2e8f0;">Cargo</td><td align="right" style="padding:12px 0;color:#172033;font-weight:700;border-bottom:1px solid #e2e8f0;">${responsable.cargo}</td></tr>
            <tr><td style="padding:12px 0;color:#64748b;border-bottom:1px solid #e2e8f0;">Email</td><td align="right" style="padding:12px 0;color:#2563eb;font-weight:700;border-bottom:1px solid #e2e8f0;">${responsable.email}</td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;color:#64748b;font-size:12px;text-align:center;">Generado por NextPrev</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
