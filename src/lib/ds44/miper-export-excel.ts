import * as XLSX from "xlsx";
import { CATALOGO_RIESGOS_ISP } from "@/lib/ds44/miper-catalogo-isp";

type ProcesoTipo = "operacional" | "apoyo" | null;

type ExportMiperMeta = {
  codigo: string;
  version: number;
  nombre: string;
  procesoNombre: string | null;
  procesoTipo: ProcesoTipo;
  procesoResponsable: string | null;
  responsableElaboracion: string | null;
};

type ExportItem = {
  id: string;
  tareaId: string | null;
  actividad: string;
  centroTrabajoNombre: string | null;
  areaNombre: string | null;
  cargoNombre: string | null;
  peligro: string;
  riesgo: string;
  consecuencia: string;
  categoriaRiesgo: string | null;
  codigoIsp: string | null;
  metodologiaEvaluacion: "legacy_5x5" | "vep_isp" | "evaluacion_especifica";
  probabilidad: number | null;
  severidad: number | null;
  nivelRiesgo: number | null;
  clasificacionRiesgo: string | null;
  magnitudExposicion: string | null;
  nivelRiesgoEspecifico: string | null;
  protocoloAplicable: string | null;
  estadoEvaluacionEspecifica: string | null;
  observacionTecnica: string | null;
  responsableNombre: string | null;
  observaciones: string | null;
  motivoSugerencia: string | null;
  peligroGente: string | null;
  peligroEquipos: string | null;
  peligroMateriales: string | null;
  peligroAmbiente: string | null;
  peligroDescripcion: string | null;
  controles: Array<{
    tipoControl: string;
    descripcion: string;
    responsableNombre: string | null;
    fechaCompromiso: string | null;
    estado: string;
  }>;
};

type ExportTarea = {
  id: string;
  cargoNombre: string;
  nombre: string;
  esRutinaria: boolean | null;
  lugarEspecifico: string | null;
  personasExpuestasTotal: number | null;
  distribucionSexogenerica: Record<string, unknown> | null;
  observaciones: string | null;
  origen: "manual" | "ia";
};

type ExportInput = {
  miper: ExportMiperMeta;
  items: ExportItem[];
  tareas: ExportTarea[];
};

function safeCell(value: unknown): string | number {
  if (typeof value === "number") return value;
  const text = String(value ?? "").trim();
  if (!text) return "";
  if (/^[=+\-@]/.test(text)) return `'${text}`;
  return text;
}

function fechaIsoCorta(value: string | null): string {
  return value ? value.slice(0, 10) : "";
}

function serializarDistribucionSexogenerica(value: Record<string, unknown> | null): string {
  if (!value) return "No informado";
  const entries = Object.entries(value)
    .filter(([, cantidad]) => typeof cantidad === "number" && Number.isFinite(cantidad))
    .map(([clave, cantidad]) => `${clave}: ${cantidad}`);
  return entries.length > 0 ? entries.join(" | ") : "No informado";
}

export function construirIdentificacionPeligros(item: {
  peligro: string;
  peligroGente: string | null;
  peligroEquipos: string | null;
  peligroMateriales: string | null;
  peligroAmbiente: string | null;
  peligroDescripcion: string | null;
}): string {
  const partes = [
    item.peligroGente ? `Gente: ${item.peligroGente}` : null,
    item.peligroEquipos ? `Equipos: ${item.peligroEquipos}` : null,
    item.peligroMateriales ? `Materiales: ${item.peligroMateriales}` : null,
    item.peligroAmbiente ? `Ambiente: ${item.peligroAmbiente}` : null,
  ].filter(Boolean);
  const consolidada = item.peligroDescripcion?.trim() ?? "";
  if (partes.length === 0 && !consolidada) return item.peligro;
  const base = partes.join(" | ");
  return consolidada ? `${base}${base ? " | " : ""}Detalle: ${consolidada}` : base;
}

export function generarExcelMiperIsp(input: ExportInput): { nombre: string; base64: string } {
  const workbook = XLSX.utils.book_new();
  const nombre = `MIPER-NEXTPREV-${input.miper.codigo}-V${input.miper.version}.xlsx`;

  const miperRows = input.items.map((item) => ({
    "Codigo matriz": safeCell(input.miper.codigo),
    "Version": input.miper.version,
    "Nombre matriz": safeCell(input.miper.nombre),
    "Proceso": safeCell(input.miper.procesoNombre ?? ""),
    "Tipo proceso": safeCell(input.miper.procesoTipo ?? ""),
    "Responsable proceso": safeCell(input.miper.procesoResponsable ?? ""),
    "Centro": safeCell(item.centroTrabajoNombre ?? ""),
    "Area": safeCell(item.areaNombre ?? ""),
    "Cargo": safeCell(item.cargoNombre ?? ""),
    "Tarea": safeCell(item.actividad),
    "Identificacion de peligros/factores de riesgo": safeCell(construirIdentificacionPeligros(item)),
    "Riesgo": safeCell(item.riesgo),
    "Consecuencia": safeCell(item.consecuencia),
    "Categoria ISP": safeCell(item.categoriaRiesgo ?? ""),
    "Codigo ISP": safeCell(item.codigoIsp ?? ""),
    "Metodologia": safeCell(item.metodologiaEvaluacion),
    "Probabilidad": item.probabilidad ?? "",
    "Severidad": item.severidad ?? "",
    "Nivel riesgo": item.nivelRiesgo ?? "",
    "Clasificacion": safeCell(item.clasificacionRiesgo ?? ""),
    "Magnitud exposicion": safeCell(item.magnitudExposicion ?? ""),
    "Nivel especifico": safeCell(item.nivelRiesgoEspecifico ?? ""),
    "Protocolo aplicable": safeCell(item.protocoloAplicable ?? ""),
    "Estado evaluacion especifica": safeCell(item.estadoEvaluacionEspecifica ?? ""),
    "Observacion tecnica": safeCell(item.observacionTecnica ?? ""),
    "Responsable": safeCell(item.responsableNombre ?? ""),
    "Observaciones": safeCell(item.observaciones ?? ""),
  }));

  const levantamientoRows = input.tareas.map((tarea) => ({
    "Codigo matriz": safeCell(input.miper.codigo),
    "Proceso": safeCell(input.miper.procesoNombre ?? ""),
    "Tipo proceso": safeCell(input.miper.procesoTipo ?? ""),
    "Responsable proceso": safeCell(input.miper.procesoResponsable ?? ""),
    "Cargo": safeCell(tarea.cargoNombre),
    "Tarea": safeCell(tarea.nombre),
    "Rutinaria": safeCell(tarea.esRutinaria === null ? "No informado" : tarea.esRutinaria ? "Si" : "No"),
    "Lugar especifico": safeCell(tarea.lugarEspecifico ?? ""),
    "Personas expuestas total": tarea.personasExpuestasTotal ?? "",
    "Distribucion sexogenerica": safeCell(serializarDistribucionSexogenerica(tarea.distribucionSexogenerica)),
    "Observaciones": safeCell(tarea.observaciones ?? ""),
    "Origen": safeCell(tarea.origen),
  }));

  const controlesRows = input.items.flatMap((item) => item.controles.map((control) => ({
    "Codigo matriz": safeCell(input.miper.codigo),
    "Item ID": safeCell(item.id),
    "Tarea": safeCell(item.actividad),
    "Codigo ISP": safeCell(item.codigoIsp ?? ""),
    "Riesgo": safeCell(item.riesgo),
    "Tipo control": safeCell(control.tipoControl),
    "Descripcion": safeCell(control.descripcion),
    "Responsable": safeCell(control.responsableNombre ?? ""),
    "Fecha compromiso": safeCell(fechaIsoCorta(control.fechaCompromiso)),
    "Estado": safeCell(control.estado),
  })));

  const catalogoRows = CATALOGO_RIESGOS_ISP.map((item) => ({
    "Codigo ISP": safeCell(item.codigoIsp),
    "Familia": safeCell(item.familia),
    "Riesgo especifico": safeCell(item.riesgoEspecifico),
    "Categoria": safeCell(item.categoria),
    "Metodologia": safeCell(item.metodologiaEvaluacion),
    "Protocolo": safeCell(item.protocoloAplicable ?? ""),
    "Definicion": safeCell(item.definicion),
  }));

  const trazabilidadRows = input.items.map((item) => ({
    "Item ID": safeCell(item.id),
    "Tarea ID": safeCell(item.tareaId ?? ""),
    "Codigo ISP": safeCell(item.codigoIsp ?? ""),
    "Motivo sugerencia": safeCell(item.motivoSugerencia ?? ""),
    "Metodologia": safeCell(item.metodologiaEvaluacion),
    "Nota legado": safeCell(item.metodologiaEvaluacion === "legacy_5x5" ? "Registro historico 5x5: no reinterpretar como metodologia ISP." : ""),
  }));

  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(miperRows), "MIPER");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(levantamientoRows), "LEVANTAMIENTO");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(controlesRows), "CONTROLES");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(catalogoRows), "CATALOGO ISP");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(trazabilidadRows), "TRAZABILIDAD");

  return {
    nombre,
    base64: XLSX.write(workbook, { type: "base64", bookType: "xlsx" }) as string,
  };
}
