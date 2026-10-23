import { describe, expect, it } from "vitest";
import type { EstadoHallazgo } from "@/app/dicaprev/cumplimiento/types";
import { coincideTarjetaHallazgo } from "@/lib/hallazgos/filtro-tarjetas";

describe("Tarjetas de estado - Hallazgos DS44", () => {
  const estados: EstadoHallazgo[] = ["abierto", "abierto", "en_proceso", "en_seguimiento", "resuelto", "cerrado"];
  it("la tarjeta Abiertos muestra solamente abiertos", () => {
    expect(estados.filter((x) => coincideTarjetaHallazgo(x, "abierto"))).toHaveLength(2);
  });
  it("En proceso incluye seguimiento y proceso, igual que el KPI", () => {
    expect(estados.filter((x) => coincideTarjetaHallazgo(x, "en_proceso"))).toEqual(["en_proceso", "en_seguimiento"]);
  });
  it("Resueltos y Cerrados se filtran por separado", () => {
    expect(estados.filter((x) => coincideTarjetaHallazgo(x, "resuelto"))).toEqual(["resuelto"]);
    expect(estados.filter((x) => coincideTarjetaHallazgo(x, "cerrado"))).toEqual(["cerrado"]);
  });
  it("Mostrar todos deja ver todos los estados", () => {
    expect(estados.filter((x) => coincideTarjetaHallazgo(x, "todos"))).toHaveLength(estados.length);
  });
});