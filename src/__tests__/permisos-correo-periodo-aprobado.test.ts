import { describe, expect, it } from "vitest";
import type { PermisoInstalacion, PermisoResponsable } from "@prisma/client";
import { generarEmailPermiso } from "@/app/dicaprev/permisos/utils/email-templates";
import { formatearFecha } from "@/app/dicaprev/permisos/utils/calculos";

const desde = new Date("2026-11-03T12:00:00.000Z");
const hasta = new Date("2026-11-10T12:00:00.000Z");
const base = {
  estado: "APROBADO",
  direccion: "Local comercial de prueba",
  fechaInstalacion: desde,
  fechaTrabajoAutorizadoDesde: desde,
  fechaTrabajoAutorizadoHasta: hasta,
  fechaRecepcionSolicitud: new Date("2026-10-22T12:00:00.000Z"),
  nivelRiesgo: "EN_PLAZO",
  nombreOrganismoSnapshot: "Municipalidad de prueba",
  plazoDiasSnapshot: 5,
  tipoPlazoSnapshot: "HABILES",
  fechaEstimadaResolucion: desde,
} as unknown as PermisoInstalacion;
const responsable = {
  nombre: "Coordinador de prueba",
  cargo: "Prevencionista",
  email: "prueba@example.com",
} as PermisoResponsable;

describe("Correo de permiso aprobado y período de trabajos", () => {
  it("incluye ambas fechas en el aviso de aprobación", () => {
    const html = generarEmailPermiso(base, responsable, "CAMBIO_ESTADO");
    expect(html).toContain("Período autorizado para trabajar");
    expect(html).toContain(formatearFecha(desde));
    expect(html).toContain(formatearFecha(hasta));
  });

  it("no muestra fechas autorizadas en correos de estados distintos de APROBADO", () => {
    const html = generarEmailPermiso({ ...base, estado: "SOLICITADO" }, responsable, "CAMBIO_ESTADO");
    expect(html).not.toContain("Período autorizado para trabajar");
  });

  it("omite el período en aprobaciones históricas que no tienen fechas", () => {
    const html = generarEmailPermiso({
      ...base, fechaTrabajoAutorizadoDesde: null, fechaTrabajoAutorizadoHasta: null,
    }, responsable, "CAMBIO_ESTADO");
    expect(html).not.toContain("Período autorizado para trabajar");
  });
});
