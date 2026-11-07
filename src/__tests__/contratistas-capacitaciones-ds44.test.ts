import { describe, expect, it } from "vitest";
import {
  DS44_CAPACITACION_BASE, DS44_CONTENIDOS, TIPOS_ACTIVIDAD_CONTRATISTA,
  validarActividadFormativa, resumenCursoDs44, type ActividadFormativaEntrada,
} from "@/lib/contratistas/capacitaciones-ds44";

const base: ActividadFormativaEntrada = {
  tipo: "capacitacion", temaCodigo: "riesgos", titulo: "Riesgos de trabajo",
  fecha: "2026-10-01", duracionMinutos: 120, relator: "Prevencionista",
  vinculadaCursoDs44: true, contenidosDs44: ["riesgos"], evaluacion: "aprobada",
};
describe("Contratistas: capacitaciones DS 44", () => {
  it("establece 8 horas, 24 meses y siete materias del artículo 16", () => {
    expect(DS44_CAPACITACION_BASE.horasMinimas).toBe(8);
    expect(DS44_CAPACITACION_BASE.periodicidadMaxMeses).toBe(24);
    expect(DS44_CONTENIDOS).toHaveLength(7);
    expect(TIPOS_ACTIVIDAD_CONTRATISTA.map(x=>x.value)).toEqual(["charla","capacitacion","difusion","taller"]);
  });
  it("valida campos, tipo, temas, duración y contenidos", () => {
    expect(validarActividadFormativa(base)).toBeNull();
    expect(validarActividadFormativa({...base, tipo:"otro"})).toContain("Selecciona");
    expect(validarActividadFormativa({...base, duracionMinutos:0})).toContain("duración");
    expect(validarActividadFormativa({...base, fecha:"2035-01-01"})).toContain("fecha");
    expect(validarActividadFormativa({...base, contenidosDs44:[]})).toContain("contenido");
    expect(validarActividadFormativa({...base, temaCodigo:"otro", titulo:""})).toContain("título");
  });
  it("no confunde actividades informadas con horas acreditadas", () => {
    const cursos = [{
      vinculadaCursoDs44: true, duracionMinutos: 480, contenidosDs44: JSON.stringify(DS44_CONTENIDOS.map(x=>x.codigo)),
      estado: "pendiente_validacion", evaluacion: "aprobada", fecha: "2026-10-01",
    }];
    const pendiente = resumenCursoDs44(cursos, new Date("2026-11-07"));
    expect(pendiente.totalMinutos).toBe(0);
    expect(pendiente.evidenciaSuficienteParaRevision).toBe(false);
    const validada = resumenCursoDs44(cursos.map(x=>({...x,estado:"validada"})), new Date("2026-11-07"));
    expect(validada.totalMinutos).toBe(480);
    expect(validada.evidenciaSuficienteParaRevision).toBe(true);
  });
  it("no suma actividades anteriores a dos años ni evaluaciones pendientes", () => {
    const r = [{
      vinculadaCursoDs44:true, duracionMinutos:480, contenidosDs44:JSON.stringify(DS44_CONTENIDOS.map(x=>x.codigo)),
      estado:"validada", evaluacion:"aprobada", fecha:"2021-01-01",
    }];
    expect(resumenCursoDs44(r,new Date("2026-11-07")).totalMinutos).toBe(0);
    expect(resumenCursoDs44(r.map(x=>({...x,fecha:"2026-10-01",evaluacion:"pendiente"})),new Date("2026-11-07")).totalMinutos).toBe(0);
  });
});
