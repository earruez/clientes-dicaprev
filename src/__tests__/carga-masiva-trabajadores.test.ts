import { describe, expect, it } from "vitest";
import {
  esRutChilenoValido,
  normalizarFechaExcel,
  normalizarRut,
  validarFilas,
  type CatalogosCarga,
  type FilaExcel,
} from "@/lib/trabajadores/carga-masiva";

const catalogos: CatalogosCarga = {
  cargos: [{ id: "cargo-1", nombre: "Analista", areaId: "area-1" }],
  areas: [{ id: "area-1", nombre: "Administración" }],
  centros: [{ id: "centro-1", nombre: "Casa Matriz" }],
  rutsExistentes: [],
};

function fila(overrides: Partial<FilaExcel> = {}): FilaExcel {
  return {
    fila: 2,
    rut: "12.345.678-5",
    nombres: "María",
    apellidos: "González",
    email: "maria@empresa.cl",
    telefono: "+56 9 1234 5678",
    fechaNacimiento: "1990-05-20",
    fechaIngreso: "2026-01-15",
    cargo: "Analista",
    area: "Administración",
    centroTrabajo: "Casa Matriz",
    tipoContrato: "Indefinido",
    estado: "Activo",
    ...overrides,
  };
}

describe("RUT chileno", () => {
  it("normaliza y acepta un RUT válido", () => {
    expect(normalizarRut("12345678-5")).toBe("12.345.678-5");
    expect(esRutChilenoValido("12.345.678-5")).toBe(true);
  });

  it("rechaza un RUT inválido", () => {
    expect(esRutChilenoValido("12.345.678-9")).toBe(false);
  });
});

describe("fechas Excel", () => {
  it("acepta fechas ISO y rechaza fechas imposibles", () => {
    expect(normalizarFechaExcel("2026-01-15")).toBe("2026-01-15");
    expect(normalizarFechaExcel("2026-02-30")).toBeNull();
  });
});

describe("validación de filas", () => {
  it("acepta una fila completa", () => {
    const result = validarFilas([fila()], catalogos);
    expect(result.incidencias).toHaveLength(0);
    expect(result.filas[0].rut).toBe("12.345.678-5");
  });

  it("detecta duplicados dentro del archivo", () => {
    const result = validarFilas([fila(), fila({ fila: 3 })], catalogos);
    expect(result.incidencias.some((item) => item.mensaje.includes("repetido dentro"))).toBe(true);
  });

  it("bloquea un trabajador ya existente en la empresa", () => {
    const result = validarFilas([fila()], { ...catalogos, rutsExistentes: ["12.345.678-5"] });
    expect(result.incidencias.some((item) => item.mensaje.includes("Ya existe"))).toBe(true);
  });

  it("informa campos obligatorios faltantes", () => {
    const result = validarFilas([fila({ nombres: "", email: "" })], catalogos);
    expect(result.incidencias.some((item) => item.campo === "Nombres")).toBe(true);
    expect(result.incidencias.some((item) => item.campo === "Correo")).toBe(true);
  });

  it("rechaza relaciones que no pertenecen a los catálogos de la empresa", () => {
    const result = validarFilas([fila({ cargo: "Cargo de otra empresa", centroTrabajo: "Centro externo" })], catalogos);
    expect(result.incidencias.some((item) => item.campo === "Cargo")).toBe(true);
    expect(result.incidencias.some((item) => item.campo === "Centro de trabajo")).toBe(true);
  });

  it("bloquea un área que no corresponde al cargo", () => {
    const result = validarFilas([fila()], { ...catalogos, areas: [{ id: "area-2", nombre: "Administración" }] });
    expect(result.incidencias.some((item) => item.mensaje.includes("no corresponde al cargo"))).toBe(true);
  });
});
