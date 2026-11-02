import { describe, expect, it } from "vitest";
import {
  periodoResumenSemanalHallazgos,
  resumirHallazgos,
  type HallazgoResumenItem,
} from "@/lib/hallazgos/resumen-semanal";
import { generarCorreoResumenSemanalHallazgos } from "@/lib/email/templates/hallazgos-resumen-semanal";

const hallazgo = (data: Partial<HallazgoResumenItem> = {}): HallazgoResumenItem => ({
  id: "12345678-aaaa-bbbb-cccc-012345678900",
  descripcion: "Riesgo identificado",
  prioridad: "media",
  estado: "abierto",
  fechaCompromiso: new Date("2026-10-30T00:00:00.000Z"),
  createdAt: new Date("2026-10-28T15:00:00.000Z"),
  centro: "Obra principal",
  responsable: "Responsable",
  ...data,
});

describe("Resumen semanal de hallazgos NextPrev", () => {
  it("reúne la semana completa anterior de lunes a domingo en Chile", () => {
    expect(periodoResumenSemanalHallazgos(new Date("2026-11-02T13:00:00Z"))).toMatchObject({
      desde: "2026-10-26", hasta: "2026-11-01", hoy: "2026-11-02",
    });
    expect(periodoResumenSemanalHallazgos(new Date("2026-11-06T12:00:00Z"))).toMatchObject({
      desde: "2026-10-26", hasta: "2026-11-01",
    });
  });

  it("mantiene el mismo período en horario de verano y horario de invierno", () => {
    expect(periodoResumenSemanalHallazgos(new Date("2026-07-06T12:00:00Z"))).toMatchObject({
      desde: "2026-06-29", hasta: "2026-07-05",
    });
  });

  it("distingue novedades de semana, atrasos actuales, próximos y resueltos", () => {
    const p = periodoResumenSemanalHallazgos(new Date("2026-11-02T13:00:00Z"));
    const s = resumirHallazgos([
      hallazgo(),
      hallazgo({ id: "b", descripcion: "Próximo", fechaCompromiso: new Date("2026-11-07T00:00:00Z"), createdAt: new Date("2026-10-03T15:00:00Z") }),
      hallazgo({ id: "c", descripcion: "Cerrado", estado: "cerrado" }),
      hallazgo({ id: "d", descripcion: "Muy antiguo", createdAt: new Date("2026-09-01T15:00:00Z") }),
    ], p);
    expect(s).toMatchObject({ nuevos: 2, abiertos: 3, vencidos: 2, proximos: 1, total: 4 });
  });

  it("escapa contenido del hallazgo y mantiene enlace y marca NextPrev", () => {
    const p = periodoResumenSemanalHallazgos(new Date("2026-11-02T13:00:00Z"));
    const correo = generarCorreoResumenSemanalHallazgos({
      nombreEmpresa: "Empresa <A>", destinatarioNombre: "Coordinador",
      hallazgos: [hallazgo({ descripcion: '<script>alert("test")</script>' })],
      periodo: p, appUrl: "https://app.nextprev.cl",
    });
    expect(correo.subject).toContain("Resumen semanal");
    expect(correo.html).toContain("NEXTPREV");
    expect(correo.html).toContain("26-10-2026 al 01-11-2026");
    expect(correo.html).toContain("&lt;script&gt;");
    expect(correo.html).not.toContain("<script>");
    expect(correo.html).toContain("https://app.nextprev.cl/dicaprev/cumplimiento/hallazgos");
    expect(correo.text).toContain("Vencidos: 1");
  });
});
