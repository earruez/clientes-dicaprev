import { describe, it, expect } from "vitest";
import {
  calcularDuracionesAcreditacion,
  detectarAlertas,
  severidadAlertas,
  tieneAlerta,
  UMBRALES,
  type AlertaAcreditacion,
} from "@/lib/acreditaciones/calcular-duraciones";
import type { Acreditacion } from "@/app/dicaprev/acreditaciones/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function diasAntes(base: string, dias: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() - dias);
  return d.toISOString();
}

function acreditacionBase(
  overrides: Partial<Acreditacion> = {}
): Acreditacion {
  return {
    id: "acr-1",
    empresaId: "emp-1",
    empresaNombre: "Empresa Test",
    mandanteId: "mand-1",
    mandante: "Mandante Test",
    tipo: "municipal",
    estado: "en_preparacion",
    plantillaId: "plant-1",
    plantillaNombre: "Plantilla Test",
    trabajadores: [],
    vehiculos: [],
    creadoEl: "2026-01-01T00:00:00.000Z",
    actualizadoEl: "2026-01-01T00:00:00.000Z",
    historialEstados: [],
    ...overrides,
  };
}

// ── calcularDuracionesAcreditacion ────────────────────────────────────────────

describe("calcularDuracionesAcreditacion", () => {
  it("retorna todos null cuando no hay historial", () => {
    const acr = acreditacionBase({ historialEstados: [] });
    const dur = calcularDuracionesAcreditacion(acr);
    expect(dur.diasPreparacion).toBeNull();
    expect(dur.diasHastaEnvio).toBeNull();
    expect(dur.diasHastaRespuesta).toBeNull();
    expect(dur.diasHastaAprobacion).toBeNull();
  });

  it("calcula diasHastaEnvio correctamente", () => {
    const inicio = "2026-01-01T00:00:00.000Z";
    const envio = "2026-01-11T00:00:00.000Z"; // 10 días después
    const acr = acreditacionBase({
      creadoEl: inicio,
      historialEstados: [
        { estado: "enviado", fecha: envio, usuario: "user1" },
      ],
    });
    const dur = calcularDuracionesAcreditacion(acr);
    expect(dur.diasHastaEnvio).toBe(10);
  });

  it("calcula diasHastaAprobacion correctamente", () => {
    const inicio = "2026-01-01T00:00:00.000Z";
    const aprobacion = "2026-02-01T00:00:00.000Z"; // 31 días después
    const acr = acreditacionBase({
      creadoEl: inicio,
      historialEstados: [
        { estado: "aprobado", fecha: aprobacion, usuario: "user1" },
      ],
    });
    const dur = calcularDuracionesAcreditacion(acr);
    expect(dur.diasHastaAprobacion).toBe(31);
  });

  it("calcula diasHastaRespuesta como dias desde envio a primera respuesta", () => {
    const inicio = "2026-01-01T00:00:00.000Z";
    const envio = "2026-01-10T00:00:00.000Z";
    const respuesta = "2026-01-20T00:00:00.000Z"; // 10 dias desde envio
    const acr = acreditacionBase({
      creadoEl: inicio,
      historialEstados: [
        { estado: "enviado", fecha: envio, usuario: "user1" },
        { estado: "aprobado", fecha: respuesta, usuario: "user2" },
      ],
    });
    const dur = calcularDuracionesAcreditacion(acr);
    expect(dur.diasHastaRespuesta).toBe(10);
  });

  it("diasHastaRespuesta es null si se envio pero no hay respuesta aun", () => {
    const inicio = "2026-01-01T00:00:00.000Z";
    const envio = "2026-01-10T00:00:00.000Z";
    const acr = acreditacionBase({
      creadoEl: inicio,
      historialEstados: [
        { estado: "enviado", fecha: envio, usuario: "user1" },
      ],
    });
    const dur = calcularDuracionesAcreditacion(acr);
    expect(dur.diasHastaRespuesta).toBeNull();
  });

  it("calcula diasPreparacion usando listo_para_enviar si está antes que enviado", () => {
    const inicio = "2026-01-01T00:00:00.000Z";
    const listo = "2026-01-05T00:00:00.000Z"; // 4 dias
    const envio = "2026-01-10T00:00:00.000Z"; // 9 dias
    const acr = acreditacionBase({
      creadoEl: inicio,
      historialEstados: [
        { estado: "listo_para_enviar", fecha: listo, usuario: "user1" },
        { estado: "enviado", fecha: envio, usuario: "user1" },
      ],
    });
    const dur = calcularDuracionesAcreditacion(acr);
    // hito = listo_para_enviar (primer encontrado), diasPreparacion = 4
    expect(dur.diasPreparacion).toBe(4);
  });

  it("caso edge: mismo dia, 0 dias de diferencia", () => {
    const inicio = "2026-01-01T00:00:00.000Z";
    const acr = acreditacionBase({
      creadoEl: inicio,
      historialEstados: [
        { estado: "enviado", fecha: inicio, usuario: "user1" },
      ],
    });
    const dur = calcularDuracionesAcreditacion(acr);
    expect(dur.diasHastaEnvio).toBe(0);
  });

  it("un dia de diferencia da exactamente 1 dia", () => {
    const inicio = "2026-01-01T00:00:00.000Z";
    const mañana = "2026-01-02T00:00:00.000Z";
    const acr = acreditacionBase({
      creadoEl: inicio,
      historialEstados: [
        { estado: "enviado", fecha: mañana, usuario: "user1" },
      ],
    });
    const dur = calcularDuracionesAcreditacion(acr);
    expect(dur.diasHastaEnvio).toBe(1);
  });

  it("usa solo el primer evento de cada tipo (no el ultimo)", () => {
    const inicio = "2026-01-01T00:00:00.000Z";
    const primerEnvio = "2026-01-10T00:00:00.000Z"; // 9 dias
    const segundoEnvio = "2026-01-20T00:00:00.000Z"; // 19 dias
    const acr = acreditacionBase({
      creadoEl: inicio,
      historialEstados: [
        { estado: "enviado", fecha: primerEnvio, usuario: "user1" },
        { estado: "enviado", fecha: segundoEnvio, usuario: "user1" }, // segundo reenvio
      ],
    });
    const dur = calcularDuracionesAcreditacion(acr);
    expect(dur.diasHastaEnvio).toBe(9); // usa el primero
  });
});

// ── detectarAlertas ────────────────────────────────────────────────────────────

describe("detectarAlertas", () => {
  it("no detecta alertas en un registro recien creado sin enviar", () => {
    const hoy = new Date().toISOString();
    const alertas = detectarAlertas({
      estado: "en_preparacion",
      fechaCreacion: hoy, // creado hoy
      diasGestion: 0,
    });
    expect(alertas).toHaveLength(0);
  });

  it("detecta preparacion_lenta cuando lleva mas de 30 dias sin envio", () => {
    const hace31Dias = diasAntes(new Date().toISOString(), 31);
    const alertas = detectarAlertas({
      estado: "en_preparacion",
      fechaCreacion: hace31Dias,
      diasGestion: 31,
    });
    const tipos = alertas.map((a) => a.tipo);
    expect(tipos).toContain("preparacion_lenta");
  });

  it("no detecta preparacion_lenta exactamente en el umbral (30 dias)", () => {
    const hace30Dias = diasAntes(new Date().toISOString(), 30);
    const alertas = detectarAlertas({
      estado: "en_preparacion",
      fechaCreacion: hace30Dias,
      diasGestion: 30,
    });
    const tienePrep = alertas.some((a) => a.tipo === "preparacion_lenta");
    // 30 dias NO supera el umbral (> 30), no debe alertar
    expect(tienePrep).toBe(false);
  });

  it("detecta sin_respuesta cuando lleva mas de 21 dias enviada sin respuesta", () => {
    const hace22Dias = diasAntes(new Date().toISOString(), 22);
    const alertas = detectarAlertas({
      estado: "enviado",
      fechaCreacion: hace22Dias,
      fechaEnvio: hace22Dias,
      diasGestion: 22,
    });
    const tipos = alertas.map((a) => a.tipo);
    expect(tipos).toContain("sin_respuesta");
  });

  it("no detecta sin_respuesta cuando ya hay resultado", () => {
    const hace30Dias = diasAntes(new Date().toISOString(), 30);
    const alertas = detectarAlertas({
      estado: "aprobado",
      fechaCreacion: hace30Dias,
      fechaEnvio: hace30Dias,
      fechaRespuesta: new Date().toISOString(),
      resultado: "aprobado",
      diasGestion: 30,
    });
    const tienesinResp = alertas.some((a) => a.tipo === "sin_respuesta");
    expect(tienesinResp).toBe(false);
  });

  it("detecta aprobacion_lenta cuando diasGestion supera el umbral", () => {
    const alertas = detectarAlertas({
      estado: "aprobado",
      fechaCreacion: diasAntes(new Date().toISOString(), 70),
      resultado: "aprobado",
      diasGestion: 61, // supera umbral 60
    });
    const tipos = alertas.map((a) => a.tipo);
    expect(tipos).toContain("aprobacion_lenta");
  });

  it("alerta incluye los dias y el umbral correcto", () => {
    const alertas = detectarAlertas({
      estado: "aprobado",
      fechaCreacion: diasAntes(new Date().toISOString(), 70),
      resultado: "aprobado",
      diasGestion: 65,
    });
    const aprobLenta = alertas.find((a) => a.tipo === "aprobacion_lenta");
    expect(aprobLenta?.dias).toBe(65);
    expect(aprobLenta?.umbral).toBe(UMBRALES.aprobacionLenta);
  });
});

// ── severidadAlertas ──────────────────────────────────────────────────────────

describe("severidadAlertas", () => {
  it("retorna null cuando no hay alertas", () => {
    expect(severidadAlertas([])).toBeNull();
  });

  it("retorna critica cuando hay alerta sin_respuesta", () => {
    const alertas: AlertaAcreditacion[] = [
      { tipo: "sin_respuesta", dias: 25, umbral: 21 },
    ];
    expect(severidadAlertas(alertas)).toBe("critica");
  });

  it("retorna advertencia para alertas que no son sin_respuesta", () => {
    const alertas: AlertaAcreditacion[] = [
      { tipo: "preparacion_lenta", dias: 35, umbral: 30 },
    ];
    expect(severidadAlertas(alertas)).toBe("advertencia");
  });

  it("retorna critica cuando hay mezcla que incluye sin_respuesta", () => {
    const alertas: AlertaAcreditacion[] = [
      { tipo: "preparacion_lenta", dias: 35, umbral: 30 },
      { tipo: "sin_respuesta", dias: 25, umbral: 21 },
    ];
    expect(severidadAlertas(alertas)).toBe("critica");
  });
});

// ── tieneAlerta ────────────────────────────────────────────────────────────────

describe("tieneAlerta", () => {
  it("retorna false para registro reciente sin alertas", () => {
    const hoy = new Date().toISOString();
    const resultado = tieneAlerta({
      estado: "en_preparacion",
      fechaCreacion: hoy,
      diasGestion: 0,
    });
    expect(resultado).toBe(false);
  });

  it("retorna true para registro con alerta activa", () => {
    const hace31Dias = diasAntes(new Date().toISOString(), 31);
    const resultado = tieneAlerta({
      estado: "en_preparacion",
      fechaCreacion: hace31Dias,
      diasGestion: 31,
    });
    expect(resultado).toBe(true);
  });
});
