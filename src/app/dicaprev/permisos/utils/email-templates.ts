import {
  PermisoInstalacion,
  PermisoResponsable,
  PermisoOrganismo,
} from "@prisma/client";
import { PERMISO_ESTADOS, PERMISO_RIESGOS, RIESGO_ICONS } from "../types";
import { formatearFecha } from "./calculos";

interface PermisoConRelaciones extends PermisoInstalacion {
  organismo?: PermisoOrganismo | null;
}

/**
 * Genera HTML profesional para email de permiso
 */
export function generarEmailPermiso(
  permiso: PermisoConRelaciones,
  responsable: PermisoResponsable,
  tipo: "PERMISO_CREADO" | "CAMBIO_ESTADO",
  metadatos?: { estadoAnterior?: string; comentario?: string },
): string {
  const estadoLabel = PERMISO_ESTADOS[permiso.estado as keyof typeof PERMISO_ESTADOS] || permiso.estado;
  const riesgoLabel = PERMISO_RIESGOS[permiso.nivelRiesgo as keyof typeof PERMISO_RIESGOS] || permiso.nivelRiesgo;
  const riesgoIcon = RIESGO_ICONS[permiso.nivelRiesgo as keyof typeof RIESGO_ICONS] || "•";

  let titulo = "";
  let mensajePrincipal = "";

  if (tipo === "PERMISO_CREADO") {
    titulo = "✓ Nuevo Permiso Registrado";
    mensajePrincipal = "Se ha registrado un nuevo permiso de instalación en NextPrev.";
  } else {
    titulo = "📋 Cambio de Estado";
    mensajePrincipal = "El estado del permiso ha sido actualizado.";
  }

  const riesgoAlerta =
    permiso.nivelRiesgo === "EN_RIESGO"
      ? `
      <div style="margin-top: 20px; padding: 15px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
        <p style="margin: 0; font-weight: bold; color: #92400e;">⚠️ Atención con la fecha de instalación</p>
        <p style="margin: 10px 0 0 0; color: #78350f; font-size: 14px;">
          El organismo seleccionado registra un plazo aproximado de ${permiso.plazoDiasSnapshot || "N/A"} días ${permiso.tipoPlazoSnapshot === "HABILES" ? "hábiles" : "corridos"}.
          Considerando que la solicitud fue presentada el ${permiso.fechaPresentacion ? formatearFecha(permiso.fechaPresentacion) : "N/A"}, 
          la resolución se estima aproximadamente para el ${formatearFecha(permiso.fechaEstimadaResolucion)}.
        </p>
        <p style="margin: 10px 0 0 0; color: #78350f; font-size: 14px;">
          La instalación actualmente está programada para el ${formatearFecha(permiso.fechaInstalacion)}, 
          por lo que existe riesgo de que el permiso no se encuentre aprobado a tiempo.
        </p>
        <p style="margin: 10px 0 0 0; color: #78350f; font-size: 14px;">
          Se recomienda revisar la programación de la instalación.
        </p>
      </div>
    `
      : permiso.nivelRiesgo === "ATENCION"
        ? `
      <div style="margin-top: 20px; padding: 15px; background-color: #fef08a; border-left: 4px solid #eab308; border-radius: 4px;">
        <p style="margin: 0; font-weight: bold; color: #78350f;">⚠️ Plazo próximo a la instalación</p>
        <p style="margin: 10px 0 0 0; color: #78350f; font-size: 14px;">
          La fecha estimada de resolución está muy próxima a la fecha de instalación.
          Se recomienda seguimiento activo del trámite.
        </p>
      </div>
    `
        : permiso.nivelRiesgo === "EN_PLAZO"
          ? `
      <div style="margin-top: 20px; padding: 15px; background-color: #dcfce7; border-left: 4px solid #22c55e; border-radius: 4px;">
        <p style="margin: 0; font-weight: bold; color: #15803d;">✓ Plazo compatible con la instalación</p>
        <p style="margin: 10px 0 0 0; color: #15803d; font-size: 14px;">
          La fecha estimada de resolución (${formatearFecha(permiso.fechaEstimadaResolucion)}) 
          ocurre antes de la instalación programada (${formatearFecha(permiso.fechaInstalacion)}).
        </p>
      </div>
    `
          : `
      <div style="margin-top: 20px; padding: 15px; background-color: #f3f4f6; border-left: 4px solid #9ca3af; border-radius: 4px;">
        <p style="margin: 0; font-weight: bold; color: #374151;">ℹ️ Plazo no informado</p>
        <p style="margin: 10px 0 0 0; color: #374151; font-size: 14px;">
          No existe información de plazo para este organismo. 
          Se recomienda verificar los plazos antes de comprometer definitivamente la fecha de instalación.
        </p>
      </div>
    `;

  const bloqueCambioEstado =
    tipo === "CAMBIO_ESTADO" && metadatos?.estadoAnterior
      ? `
      <div style="margin-top: 20px; padding: 15px; background-color: #e0e7ff; border-left: 4px solid #6366f1; border-radius: 4px;">
        <p style="margin: 0; font-weight: bold; color: #312e81;">Cambio de Estado</p>
        <p style="margin: 10px 0 0 0; color: #312e81; font-size: 14px;">
          <strong>Anterior:</strong> ${PERMISO_ESTADOS[metadatos.estadoAnterior as keyof typeof PERMISO_ESTADOS] || metadatos.estadoAnterior}<br/>
          <strong>Nuevo:</strong> ${estadoLabel}
        </p>
        ${metadatos.comentario ? `<p style="margin: 10px 0 0 0; color: #312e81; font-size: 14px;"><strong>Comentario:</strong> ${metadatos.comentario}</p>` : ""}
      </div>
    `
      : "";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #333; line-height: 1.6; }
    .container { max-width: 600px; margin: 0 auto; padding: 0; background-color: #ffffff; }
    .header { background-color: #0f172a; padding: 30px; text-align: center; }
    .logo { color: white; font-size: 24px; font-weight: bold; }
    .content { padding: 30px; }
    .titulo { font-size: 20px; font-weight: bold; color: #1f2937; margin-bottom: 10px; }
    .subtitulo { font-size: 14px; color: #6b7280; margin-bottom: 20px; }
    .seccion { margin-bottom: 30px; }
    .seccion-titulo { font-size: 14px; font-weight: bold; color: #374151; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
    .dato { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
    .dato:last-child { border-bottom: none; }
    .etiqueta { color: #6b7280; font-weight: 500; }
    .valor { color: #1f2937; font-weight: 600; }
    .badge { display: inline-block; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .footer { padding: 20px 30px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center; }
    a { color: #3b82f6; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="logo">NextPrev</div>
    </div>

    <!-- Contenido -->
    <div class="content">
      <div class="titulo">${titulo}</div>
      <div class="subtitulo">${mensajePrincipal}</div>

      <!-- Información de Instalación -->
      <div class="seccion">
        <div class="seccion-titulo">Instalación</div>
        <div class="dato">
          <span class="etiqueta">Cliente</span>
          <span class="valor">${permiso.clienteId || "—"}</span>
        </div>
        <div class="dato">
          <span class="etiqueta">Dirección</span>
          <span class="valor">${permiso.direccion}</span>
        </div>
        <div class="dato">
          <span class="etiqueta">Fecha de Instalación</span>
          <span class="valor">${formatearFecha(permiso.fechaInstalacion)}</span>
        </div>
      </div>

      <!-- Información del Permiso -->
      <div class="seccion">
        <div class="seccion-titulo">Permiso</div>
        <div class="dato">
          <span class="etiqueta">Estado</span>
          <span class="valor"><span class="badge" style="background-color: #dbeafe; color: #1e40af;">${estadoLabel}</span></span>
        </div>
        <div class="dato">
          <span class="etiqueta">Riesgo</span>
          <span class="valor">${riesgoIcon} ${riesgoLabel}</span>
        </div>
        <div class="dato">
          <span class="etiqueta">Organismo</span>
          <span class="valor">${permiso.nombreOrganismoSnapshot || "—"}</span>
        </div>
        <div class="dato">
          <span class="etiqueta">Modalidad</span>
          <span class="valor">${permiso.modalidadSnapshot || "No informada"}</span>
        </div>
        <div class="dato">
          <span class="etiqueta">Fecha de Recepción</span>
          <span class="valor">${formatearFecha(permiso.fechaRecepcionSolicitud)}</span>
        </div>
        <div class="dato">
          <span class="etiqueta">Fecha de Presentación</span>
          <span class="valor">${permiso.fechaPresentacion ? formatearFecha(permiso.fechaPresentacion) : "Pendiente"}</span>
        </div>
        <div class="dato">
          <span class="etiqueta">Plazo</span>
          <span class="valor">${permiso.plazoDiasSnapshot ? `${permiso.plazoDiasSnapshot} días ${permiso.tipoPlazoSnapshot === "HABILES" ? "hábiles" : "corridos"}` : "No informado"}</span>
        </div>
        <div class="dato">
          <span class="etiqueta">Fecha Estimada de Resolución</span>
          <span class="valor">${permiso.fechaEstimadaResolucion ? formatearFecha(permiso.fechaEstimadaResolucion) : "No calculada"}</span>
        </div>
      </div>

      <!-- Información del Responsable -->
      <div class="seccion">
        <div class="seccion-titulo">Responsable</div>
        <div class="dato">
          <span class="etiqueta">Nombre</span>
          <span class="valor">${responsable.nombre}</span>
        </div>
        <div class="dato">
          <span class="etiqueta">Cargo</span>
          <span class="valor">${responsable.cargo}</span>
        </div>
        <div class="dato">
          <span class="etiqueta">Email</span>
          <span class="valor"><a href="mailto:${responsable.email}">${responsable.email}</a></span>
        </div>
        ${responsable.telefono ? `
        <div class="dato">
          <span class="etiqueta">Teléfono</span>
          <span class="valor">${responsable.telefono}</span>
        </div>
        ` : ""}
      </div>

      <!-- Alerta de Riesgo -->
      ${riesgoAlerta}

      <!-- Cambio de Estado -->
      ${bloqueCambioEstado}

      <!-- Observaciones -->
      ${permiso.observaciones ? `
      <div class="seccion">
        <div class="seccion-titulo">Observaciones</div>
        <p style="font-size: 14px; color: #374151; margin: 0; padding: 10px; background-color: #f9fafb; border-radius: 4px;">
          ${permiso.observaciones}
        </p>
      </div>
      ` : ""}
    </div>

    <!-- Footer -->
    <div class="footer">
      <p style="margin: 0;">Generado por NextPrev • ${new Date().toLocaleDateString("es-CL")}</p>
      <p style="margin: 5px 0 0 0; font-size: 11px;">Este es un correo automático. Por favor, no responda a este mensaje.</p>
    </div>
  </div>
</body>
</html>
  `;
}
