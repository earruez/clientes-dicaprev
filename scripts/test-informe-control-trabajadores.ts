import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { calcularInformeTrabajadores, calcularFilaTrabajador, type TrabajadorInformeInput } from "../src/lib/documentacion/informe-control-trabajadores";
import { generarInformeControlTrabajadoresPdf } from "../src/lib/documentacion/generar-informe-control-trabajadores-pdf";

const corte = new Date("2026-07-31T12:00:00.000Z");
const base: TrabajadorInformeInput = { id: "synthetic-1", nombre: "Persona de Prueba Uno", rut: "11.111.111-1", cargo: "Especialista de Operaciones con Nombre Extenso", area: "Operaciones", centro: "Centro Sintetico Norte", requisitos: [
  { id: "laboral", categoria: "Documentacion laboral", nombre: "Contrato de trabajo", condicion: "Perfil configurado" },
  { id: "sst", categoria: "Documentos SST", nombre: "Informacion de riesgos laborales", condicion: "Cargo configurado" },
  { id: "examen", categoria: "Evaluaciones ocupacionales", nombre: "Examen ocupacional", condicion: "Asignacion individual" },
  { id: "pts", categoria: "Procedimientos de trabajo seguro", nombre: "PTS operacion segura", condicion: "Cargo configurado" },
  { id: "na", categoria: "Protocolos", nombre: "Protocolo excluido", condicion: "Exclusion configurada" },
], documentos: [
  { id: "d1", requisitoId: "laboral", estado: "aprobado", creadoEn: "2026-01-01" },
  { id: "d2", requisitoId: "sst", estado: "aprobado", fechaVencimiento: "2026-08-20" },
  { id: "d3", requisitoId: "examen", estado: "aprobado", fechaVencimiento: "2026-07-01" },
  { id: "d4", requisitoId: "pts", estado: "en_revision" },
  { id: "d5", requisitoId: "na", estado: "no_aplica" },
] };

const fila = calcularFilaTrabajador(base, corte);
assert.equal(fila.vigente, 1); assert.equal(fila.porVencer, 1); assert.equal(fila.vencido, 1); assert.equal(fila.enRevision, 1); assert.equal(fila.exigibles, 4); assert.equal(fila.cumplimiento, 50);
assert.equal(calcularFilaTrabajador({ ...base, requisitos: [], documentos: [] }, corte).cumplimiento, null);
const duplicate = calcularFilaTrabajador({ ...base, requisitos: [base.requisitos[0]], documentos: [{ id: "old", requisitoId: "laboral", estado: "vencido", versionNumero: 1 }, { id: "new", requisitoId: "laboral", estado: "aprobado", versionNumero: 2 }] }, corte);
assert.equal(duplicate.vigente, 1, "debe preferir el aprobado vigente mas reciente");

const workers = Array.from({ length: 36 }, (_, index): TrabajadorInformeInput => ({ ...base, id: `synthetic-${index}`, nombre: `Persona Sintetica ${String(index + 1).padStart(2, "0")}`, rut: `11.111.${String(index).padStart(3,"0")}-${index % 10}`, requisitos: index === 35 ? [] : base.requisitos, documentos: index === 35 ? [] : base.documentos }));
const informe = calcularInformeTrabajadores(workers, corte);
assert.equal(informe.resumen.trabajadores, 36); assert.equal(informe.resumen.sinConfigurar, 1);
const pdf = generarInformeControlTrabajadoresPdf({ id: "ICDT-SYNTHETIC", version: "1.0", generadoEn: corte.toISOString(), generadoPor: "usuario.prueba@nextprev.local", empresa: { nombre: "Empresa Sintetica de Pruebas SpA", rut: "76.000.000-0" }, alcance: "Todos los centros", filtros: "Sin filtros", filas: informe.filas, resumen: informe.resumen });
async function main() {
  await mkdir("output/pdf", { recursive: true });
  await writeFile("output/pdf/informe-control-documental-prueba-sintetica.pdf", pdf);
  console.log(`OK: calculos y PDF sintetico (${pdf.byteLength} bytes)`);
}

void main();
