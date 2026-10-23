import { describe, it, expect } from "vitest";
import {
  agruparDestinatariosHallazgo, fechaHoyChile, fechaCompromisoHallazgo,
  correspondeAvisarHallazgo,
} from "@/lib/hallazgos/avisos-utils";
import { generarCorreoHallazgo } from "@/lib/email/templates/hallazgo-aviso";

describe("Alertas de hallazgos", () => {
  it("reconoce el día en Chile aunque UTC ya sea mañana", () => {
    expect(fechaHoyChile(new Date("2026-10-24T01:30:00Z"))).toBe("2026-10-23");
    expect(fechaCompromisoHallazgo(new Date("2026-10-23T00:00:00Z"))).toBe("2026-10-23");
  });
  it("avisa en compromiso y atraso, pero no cuando está cerrado", () => {
    const fecha = new Date("2026-10-23T00:00:00Z");
    expect(correspondeAvisarHallazgo("abierto", fecha, "2026-10-22")).toBe(false);
    expect(correspondeAvisarHallazgo("abierto", fecha, "2026-10-23")).toBe(true);
    expect(correspondeAvisarHallazgo("en_proceso", fecha, "2026-10-25")).toBe(true);
    expect(correspondeAvisarHallazgo("resuelto", fecha, "2026-10-25")).toBe(true);
    expect(correspondeAvisarHallazgo("cerrado", fecha, "2026-10-25")).toBe(false);
  });
  it("envía una sola notificación a la persona que cumple tres roles", () => {
    const candidatos = agruparDestinatariosHallazgo([
      { email: "  Prevencion@empresa.cl ", nombre: "Creador", rol: "creador" },
      { email: "prevencion@empresa.cl", nombre: "Responsable", rol: "responsable" },
      { email: "PREVENCION@EMPRESA.CL", nombre: "Administrador", rol: "administrador" },
      { email: "", nombre: "Sin correo", rol: "administrador" },
    ]);
    expect(candidatos).toHaveLength(1);
    expect(candidatos[0].roles).toHaveLength(3);
  });
  it("genera correo corporativo sin permitir HTML inyectado en descripción", () => {
    const destinatario = agruparDestinatariosHallazgo([
      { email: "test@ejemplo.cl", nombre: "Persona", rol: "creador" },
    ])[0];
    const correo = generarCorreoHallazgo({
      id: "a12345678", asunto: "vencimiento", nombreEmpresa: "Empresa de prueba",
      creadorNombre: "Creador", descripcion: "<script>alert(1)</script>",
      prioridad: "alta", estado: "abierto", centro: "Bodega",
      responsable: "Persona", fechaCompromiso: new Date("2026-10-23T00:00:00Z"),
      destinatario, appUrl: "https://app.nextprev.cl",
    });
    expect(correo.subject).toContain("sin cerrar");
    expect(correo.html).toContain("&lt;script&gt;");
    expect(correo.html).not.toContain("<script>");
    expect(correo.text).toContain("23-10-2026");
    expect(correo.html).toContain("NextPrev");
  });
});
