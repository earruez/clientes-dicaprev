import * as XLSX from "xlsx";
import JSZip from "jszip";
import { CATALOGO_RIESGOS_ISP } from "@/lib/ds44/miper-catalogo-isp";

type ProcesoTipo = "operacional" | "apoyo" | null;

type ExportMiperMeta = {
  codigo: string;
  version: number;
  nombre: string;
  estado: string;
  versionAnterior: string | null;
  procesoNombre: string | null;
  procesoTipo: ProcesoTipo;
  procesoResponsable: string | null;
  responsableElaboracion: string | null;
  responsableRevision: string | null;
  responsableAprobacion: string | null;
  fechaElaboracion: string | null;
  fechaRevision: string | null;
  fechaAprobacion: string | null;
  fechaProximaRevision: string | null;
  fechaDescarga: string;
  empresaNombre: string | null;
  empresaRut: string | null;
  empresaDireccion: string | null;
  empresaComuna: string | null;
  empresaCorreo: string | null;
  centroNombre: string | null;
  centroTipo: string | null;
  centroDireccion: string | null;
  areaNombre: string | null;
};

type ExportItem = {
  id: string;
  tareaId: string | null;
  actividad: string;
  centroTrabajoNombre?: string | null;
  areaNombre?: string | null;
  cargoNombre: string | null;
  peligro: string;
  riesgo: string;
  consecuencia: string;
  categoriaRiesgo: string | null;
  codigoIsp: string | null;
  metodologiaEvaluacion: "legacy_5x5" | "vep_isp" | "evaluacion_especifica";
  probabilidad: number | null;
  severidad: number | null;
  nivelRiesgo?: number | null;
  clasificacionRiesgo?: string | null;
  magnitudExposicion: string | null;
  nivelRiesgoEspecifico: string | null;
  protocoloAplicable?: string | null;
  estadoEvaluacionEspecifica?: string | null;
  responsableNombre: string | null;
  observacionTecnica: string | null;
  observaciones?: string | null;
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

type Aoa = Array<Array<string | number>>;

function noInfo(value: unknown): string {
  const text = String(value ?? "").trim();
  return text || "No informado";
}

function safeCell(value: unknown): string | number {
  if (typeof value === "number") return value;
  const text = String(value ?? "").trim();
  if (!text) return "";
  if (/^[=+\-@]/.test(text)) return `'${text}`;
  return text;
}

function ymd(value: string | null): string {
  return value ? value.slice(0, 10) : "";
}

function tipoControlLabel(value: string): string {
  if (value === "eliminacion") return "Eliminación";
  if (value === "sustitucion") return "Sustitución";
  if (value === "ingenieria") return "Ingeniería";
  if (value === "administrativo") return "Administrativo";
  if (value === "epp") return "EPP";
  return value;
}

function clasificarVep(vep: number | null): string {
  if (vep === null) return "Evaluación pendiente";
  if (vep <= 2) return "Tolerable";
  if (vep === 4) return "Moderado";
  if (vep === 8) return "Importante";
  return "Intolerable";
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
  const detalle = item.peligroDescripcion?.trim() ?? "";
  if (partes.length === 0 && !detalle) return item.peligro;
  const base = partes.join(" | ");
  return `${base}${detalle ? `${base ? " | " : ""}Detalle: ${detalle}` : ""}`;
}

function medidasTexto(controles: ExportItem["controles"]): string {
  if (!controles.length) return "";
  return controles
    .map((c) => [
      `${tipoControlLabel(c.tipoControl)}: ${c.descripcion}`,
      `Responsable: ${noInfo(c.responsableNombre)}`,
      `Plazo: ${ymd(c.fechaCompromiso) || "Pendiente"}`,
      `Estado: ${noInfo(c.estado)}`,
    ].join("\n"))
    .join("\n\n");
}

function distribucionTexto(value: Record<string, unknown> | null): string {
  if (!value) return "No informado";
  const parts = ["hombre", "mujer", "noBinario"]
    .map((key) => {
      const n = value[key];
      return typeof n === "number" ? `${key}: ${n}` : null;
    })
    .filter(Boolean);
  return parts.length ? parts.join(" | ") : "No informado";
}

function buildMiperSheet(input: ExportInput): XLSX.WorkSheet {
  const riesgosConfirmados = input.items.length;
  const cargosCount = new Set(input.tareas.map((t) => t.cargoNombre)).size;
  const tareasCount = input.tareas.length;
  const evaluacionesPendientes = input.items.filter((i) => i.metodologiaEvaluacion === "vep_isp" && (i.probabilidad === null || i.severidad === null)).length;
  const controlesPendientes = input.items.flatMap((i) => i.controles).filter((c) => c.estado === "pendiente").length;
  const riesgosImportantes = input.items.filter((i) => i.metodologiaEvaluacion === "vep_isp" && i.probabilidad !== null && i.severidad !== null && i.probabilidad * i.severidad === 8).length;
  const riesgosIntolerables = input.items.filter((i) => i.metodologiaEvaluacion === "vep_isp" && i.probabilidad !== null && i.severidad !== null && i.probabilidad * i.severidad >= 16).length;

  const rows: Aoa = [
    ["NEXTPREV", "", "", "Matriz de identificación de peligros y evaluación de riesgos", "", "", "", "", "", "", "", "", "", "", "", ""],
    ["Prevención con trazabilidad", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
    [input.miper.estado === "borrador" ? "BORRADOR — Documento no aprobado" : `ESTADO: ${input.miper.estado.toUpperCase()}`, "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
    ["Código", safeCell(input.miper.codigo), "", "", "Versión", input.miper.version, "", "", "Estado", noInfo(input.miper.estado), "", "", "Fecha elaboración", noInfo(ymd(input.miper.fechaElaboracion) || "Pendiente"), "", ""],
    ["Entidad empleadora", noInfo(input.miper.empresaNombre), "", "", "RUT", noInfo(input.miper.empresaRut), "", "", "Centro de trabajo", noInfo(input.miper.centroNombre), "", "", "Área", noInfo(input.miper.areaNombre), "", ""],
    ["Proceso", noInfo(input.miper.procesoNombre), "", "", "Tipo", noInfo(input.miper.procesoTipo), "", "", "Responsable proceso", noInfo(input.miper.procesoResponsable), "", "", "Próxima revisión", noInfo(ymd(input.miper.fechaProximaRevision) || "Pendiente"), "", ""],
    ["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
    ["Cargos", "", "Tareas", "", "Riesgos confirmados", "", "Evaluaciones pendientes", "", "Controles pendientes", "", "Riesgos importantes", "", "Riesgos intolerables", "", "", ""],
    [cargosCount, "", tareasCount, "", riesgosConfirmados, "", evaluacionesPendientes, "", controlesPendientes, "", riesgosImportantes, "", riesgosIntolerables, "", "", ""],
    ["P = Probabilidad · C = Consecuencia · VEP = Valor estimado de riesgo. Las celdas vacías indican evaluación pendiente.", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
    ["Identificación del trabajo", "", "", "Identificación de peligros", "", "Evaluación de riesgos", "", "", "", "", "", "", "", "", "", "Medidas preventivas"],
    ["", "", "", "", "", "Seguridad y emergencias", "", "", "", "Riesgos higiénicos", "", "Riesgos psicosociales", "", "Riesgos musculoesqueléticos", "", ""],
    ["Proceso", "Puesto de trabajo", "Tarea", "Identificación de peligros/factores de riesgo", "Riesgo y código ISP", "P", "C", "VEP", "Nivel", "Magnitud", "Nivel", "Magnitud", "Nivel", "Magnitud", "Nivel", "Medidas preventivas"],
  ];

  const dataStartRow = rows.length + 1;
  input.items.forEach((item) => {
    const esVep = item.metodologiaEvaluacion === "vep_isp";
    const esEspecifica = item.metodologiaEvaluacion === "evaluacion_especifica";
    const vep = esVep && item.probabilidad !== null && item.severidad !== null ? item.probabilidad * item.severidad : null;
    const nivelVep = esVep ? clasificarVep(vep) : "";
    const riesgoCodigo = `${item.riesgo}${item.codigoIsp ? ` (${item.codigoIsp})` : ""}`;
    const ident = construirIdentificacionPeligros(item);

    const row: Array<string | number> = [
      safeCell(input.miper.procesoNombre ?? "No informado"),
      safeCell(item.cargoNombre ?? "No informado"),
      safeCell(item.actividad),
      safeCell(ident),
      safeCell(riesgoCodigo),
      "", "", "", "", "", "", "", "", "", "", safeCell(medidasTexto(item.controles)),
    ];

    if (esVep && item.probabilidad !== null && item.severidad !== null) {
      row[5] = item.probabilidad;
      row[6] = item.severidad;
      row[7] = vep ?? "";
      row[8] = safeCell(nivelVep);
    }

    if (esEspecifica) {
      const magnitud = safeCell(item.magnitudExposicion ?? "");
      const nivel = safeCell(item.nivelRiesgoEspecifico ?? "");
      if (item.categoriaRiesgo === "higienico") {
        row[9] = magnitud;
        row[10] = nivel;
      } else if (item.categoriaRiesgo === "psicosocial") {
        row[11] = magnitud;
        row[12] = nivel;
      } else if (item.categoriaRiesgo === "musculoesqueletico") {
        row[13] = magnitud;
        row[14] = nivel;
      }
    }

    rows.push(row);
  });

  rows.push([]);
  rows.push(["Firmas y aprobación", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
  rows.push([]);
  rows.push(["Elaborado por", noInfo(input.miper.responsableElaboracion), "", "", "", "Fecha", noInfo(ymd(input.miper.fechaElaboracion) || "Pendiente"), "", "Revisado por", noInfo(input.miper.responsableRevision), "", "", "Fecha", noInfo(ymd(input.miper.fechaRevision) || "Pendiente"), "", ""]);
  rows.push(["Cargo / rol", "Prevención de riesgos", "", "", "", "", "", "", "Cargo / rol", "Pendiente", "", "", "", "", "", ""]);
  rows.push(["Aprobado por", noInfo(input.miper.responsableAprobacion), "", "", "", "Fecha", noInfo(ymd(input.miper.fechaAprobacion) || "Pendiente"), "", "Cargo / rol", input.miper.estado === "vigente" ? "Aprobador autorizado" : "Pendiente", "", "", "", "", "", ""]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const dataEndRow = dataStartRow + Math.max(0, input.items.length - 1);

  ws["!merges"] = [
    "A1:C2", "D1:P2", "A3:P3",
    "B4:D4", "F4:H4", "J4:L4", "N4:P4",
    "B5:D5", "F5:H5", "J5:L5", "N5:P5",
    "B6:D6", "F6:H6", "J6:L6", "N6:P6",
    "A8:B8", "C8:D8", "E8:F8", "G8:H8", "I8:J8", "K8:L8", "M8:N8",
    "A9:B9", "C9:D9", "E9:F9", "G9:H9", "I9:J9", "K9:L9", "M9:N9",
    "A10:P10", "A11:C11", "D11:E11", "F11:O11", "F12:I12", "J12:K12", "L12:M12", "N12:O12",
  ].map(XLSX.utils.decode_range);
  const firmasTitulo = dataEndRow + 2;
  const firmasInicio = dataEndRow + 4;
  ws["!merges"].push(XLSX.utils.decode_range(`A${firmasTitulo}:P${firmasTitulo}`));
  for (let row = firmasInicio; row <= firmasInicio + 2; row += 1) {
    for (const rango of [`B${row}:E${row}`, `G${row}:H${row}`, `J${row}:L${row}`, `N${row}:P${row}`]) ws["!merges"].push(XLSX.utils.decode_range(rango));
  }

  ws["!cols"] = [
    { wch: 18 },
    { wch: 20 },
    { wch: 34 },
    { wch: 44 },
    { wch: 28 },
    { wch: 7 },
    { wch: 7 },
    { wch: 10 },
    { wch: 20 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
    { wch: 16 },
    { wch: 44 },
  ];

  ws["!rows"] = [{ hpt: 26 }, { hpt: 22 }, { hpt: 22 }, { hpt: 22 }, { hpt: 22 }, { hpt: 22 }, { hpt: 8 }, { hpt: 24 }, { hpt: 28 }, { hpt: 24 }, { hpt: 24 }, { hpt: 30 }, { hpt: 48 }];

  input.items.forEach((item, index) => {
    const row = dataStartRow + index;
    if (item.metodologiaEvaluacion === "vep_isp" && item.probabilidad !== null && item.severidad !== null) {
      const vep = item.probabilidad * item.severidad;
      ws[`H${row}`] = { t: "n", v: vep, f: `F${row}*G${row}` };
      ws[`I${row}`] = {
        t: "s",
        v: clasificarVep(vep),
        f: `IF(H${row}<=2,"Tolerable",IF(H${row}=4,"Moderado",IF(H${row}=8,"Importante","Intolerable")))`,
      };
    }
  });

  if (input.items.length > 0) {
    ws["!autofilter"] = { ref: `A13:P${Math.max(13, dataEndRow)}` };
  }

  (ws as XLSX.WorkSheet & { "!freeze"?: { xSplit: number; ySplit: number } })["!freeze"] = { xSplit: 0, ySplit: 13 };
  (ws as XLSX.WorkSheet & { "!printHeader"?: string })["!printHeader"] = "$11:$13";
  (ws as XLSX.WorkSheet & { "!pageSetup"?: Record<string, unknown> })["!pageSetup"] = {
    orientation: "landscape",
    fitToWidth: 1,
    fitToHeight: 0,
    paperSize: 8,
    leftMargin: 0.3,
    rightMargin: 0.3,
    topMargin: 0.4,
    bottomMargin: 0.4,
    footer: `${input.miper.codigo} V${input.miper.version} | ${noInfo(input.miper.estado)} | ${ymd(input.miper.fechaDescarga)} | Página &P de &N`,
  };

  return ws;
}

function buildLevantamientoSheet(input: ExportInput): XLSX.WorkSheet {
  const riesgosPorTarea = new Map<string, ExportItem[]>();
  for (const item of input.items) {
    if (!item.tareaId) continue;
    riesgosPorTarea.set(item.tareaId, [...(riesgosPorTarea.get(item.tareaId) ?? []), item]);
  }

  const rows: Aoa = [];
  rows.push(["Levantamiento por tarea"]);
  rows.push(["Proceso", "Tipo proceso", "Cargo", "Tarea", "Rutinaria", "Lugar", "Población", "Distribución", "GEMA", "Riesgo asociado", "Observaciones"]);

  for (const tarea of input.tareas) {
    const riesgos = riesgosPorTarea.get(tarea.id) ?? [];
    const gema = [...new Set(riesgos.map((r) => construirIdentificacionPeligros(r)).filter(Boolean))].join(" || ");
    const riesgoRef = [...new Set(riesgos.map((r) => `${r.codigoIsp ?? ""} ${r.riesgo}`.trim()))].join(" | ");
    rows.push([
      safeCell(input.miper.procesoNombre ?? "No informado"),
      safeCell(input.miper.procesoTipo ?? "No informado"),
      safeCell(tarea.cargoNombre),
      safeCell(tarea.nombre),
      safeCell(tarea.esRutinaria === null ? "No informado" : tarea.esRutinaria ? "Sí" : "No"),
      safeCell(tarea.lugarEspecifico ?? "No informado"),
      tarea.personasExpuestasTotal ?? "",
      safeCell(distribucionTexto(tarea.distribucionSexogenerica)),
      safeCell(gema || "No informado"),
      safeCell(riesgoRef || "No informado"),
      safeCell(tarea.observaciones ?? ""),
    ]);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!merges"] = [XLSX.utils.decode_range("A1:K1")];
  ws["!cols"] = [{ wch: 20 }, { wch: 14 }, { wch: 18 }, { wch: 30 }, { wch: 12 }, { wch: 26 }, { wch: 12 }, { wch: 28 }, { wch: 48 }, { wch: 38 }, { wch: 30 }];
  ws["!autofilter"] = { ref: `A2:K${Math.max(2, rows.length)}` };
  (ws as XLSX.WorkSheet & { "!freeze"?: { xSplit: number; ySplit: number } })["!freeze"] = { xSplit: 0, ySplit: 2 };
  return ws;
}

function buildControlesSheet(input: ExportInput): XLSX.WorkSheet {
  const rows: Aoa = [];
  rows.push(["Controles planificados"]);
  rows.push(["Proceso", "Cargo", "Tarea", "Código ISP", "Riesgo", "Jerarquía", "Medida", "Responsable", "Fecha", "Estado"]);

  for (const item of input.items) {
    for (const control of item.controles) {
      rows.push([
        safeCell(input.miper.procesoNombre ?? "No informado"),
        safeCell(item.cargoNombre ?? "No informado"),
        safeCell(item.actividad),
        safeCell(item.codigoIsp ?? ""),
        safeCell(item.riesgo),
        safeCell(tipoControlLabel(control.tipoControl)),
        safeCell(control.descripcion),
        safeCell(control.responsableNombre ?? "No informado"),
        safeCell(ymd(control.fechaCompromiso) || "Pendiente"),
        safeCell(control.estado),
      ]);
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!merges"] = [XLSX.utils.decode_range("A1:J1")];
  ws["!cols"] = [{ wch: 18 }, { wch: 18 }, { wch: 24 }, { wch: 10 }, { wch: 26 }, { wch: 16 }, { wch: 40 }, { wch: 24 }, { wch: 14 }, { wch: 14 }];
  ws["!autofilter"] = { ref: `A2:J${Math.max(2, rows.length)}` };
  (ws as XLSX.WorkSheet & { "!freeze"?: { xSplit: number; ySplit: number } })["!freeze"] = { xSplit: 0, ySplit: 2 };
  return ws;
}

function buildCatalogoSheet(input: ExportInput): XLSX.WorkSheet {
  const usados = new Set(input.items.map((i) => i.codigoIsp).filter(Boolean));
  const rows: Aoa = [];
  rows.push(["Catálogo ISP utilizado en esta matriz"]);
  rows.push(["Código ISP", "Familia", "Riesgo", "Definición", "Categoría", "Metodología", "Protocolo"]);

  for (const item of CATALOGO_RIESGOS_ISP.filter((entry) => usados.has(entry.codigoIsp))) {
    rows.push([
      safeCell(item.codigoIsp),
      safeCell(item.familia),
      safeCell(item.riesgoEspecifico),
      safeCell(item.definicion),
      safeCell(item.categoria),
      safeCell(item.metodologiaEvaluacion),
      safeCell(item.protocoloAplicable ?? ""),
    ]);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!merges"] = [XLSX.utils.decode_range("A1:G1")];
  ws["!cols"] = [{ wch: 12 }, { wch: 18 }, { wch: 34 }, { wch: 52 }, { wch: 18 }, { wch: 20 }, { wch: 28 }];
  ws["!autofilter"] = { ref: `A2:G${Math.max(2, rows.length)}` };
  (ws as XLSX.WorkSheet & { "!freeze"?: { xSplit: number; ySplit: number } })["!freeze"] = { xSplit: 0, ySplit: 2 };
  return ws;
}

function buildTrazabilidadSheet(input: ExportInput): XLSX.WorkSheet {
  const legacy = input.items.some((i) => i.metodologiaEvaluacion === "legacy_5x5")
    ? "Existen registros legacy_5x5 sin reinterpretación."
    : "Sin registros legacy_5x5.";

  const rows: Aoa = [];
  rows.push(["Trazabilidad documental y técnica"]);
  rows.push(["Código", safeCell(input.miper.codigo), "Versión", input.miper.version, "Estado", safeCell(input.miper.estado)]);
  rows.push(["Versión anterior", safeCell(input.miper.versionAnterior ?? "No informado"), "Fecha descarga", safeCell(ymd(input.miper.fechaDescarga)), "Nota legacy", safeCell(legacy)]);
  rows.push(["Elaborado por", safeCell(input.miper.responsableElaboracion ?? "Pendiente"), "Revisado por", safeCell(input.miper.responsableRevision ?? "Pendiente"), "Aprobado por", safeCell(input.miper.responsableAprobacion ?? "Pendiente")]);
  rows.push([]);
  rows.push(["ID ítem", "ID tarea", "Metodología", "Motivo sugerencia", "Estado técnico", "Observación interna", "Auditoría"]);

  for (const item of input.items) {
    const auditoria = `Responsable: ${noInfo(item.responsableNombre)} | Protocolo: ${noInfo(item.protocoloAplicable)}`;
    rows.push([
      safeCell(item.id),
      safeCell(item.tareaId ?? "Sin tarea"),
      safeCell(item.metodologiaEvaluacion),
      safeCell(item.motivoSugerencia ?? ""),
      safeCell(item.estadoEvaluacionEspecifica ?? (item.metodologiaEvaluacion === "vep_isp" ? "vep" : "pendiente")),
      safeCell(item.observaciones ?? item.observacionTecnica ?? ""),
      safeCell(auditoria),
    ]);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!merges"] = [XLSX.utils.decode_range("A1:G1")];
  ws["!cols"] = [{ wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 34 }, { wch: 18 }, { wch: 36 }, { wch: 42 }];
  ws["!autofilter"] = { ref: `A6:G${Math.max(6, rows.length)}` };
  (ws as XLSX.WorkSheet & { "!freeze"?: { xSplit: number; ySplit: number } })["!freeze"] = { xSplit: 0, ySplit: 6 };
  return ws;
}

export function generarWorkbookMiperIsp(input: ExportInput): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, buildMiperSheet(input), "MIPER");
  XLSX.utils.book_append_sheet(workbook, buildLevantamientoSheet(input), "LEVANTAMIENTO");
  XLSX.utils.book_append_sheet(workbook, buildControlesSheet(input), "CONTROLES");
  XLSX.utils.book_append_sheet(workbook, buildCatalogoSheet(input), "CATALOGO ISP");
  XLSX.utils.book_append_sheet(workbook, buildTrazabilidadSheet(input), "TRAZABILIDAD");
  return workbook;
}

const ESTILOS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="4">
    <font><sz val="10"/><name val="Aptos"/><family val="2"/></font>
    <font><b/><sz val="10"/><name val="Aptos"/><family val="2"/><color rgb="FF172033"/></font>
    <font><b/><sz val="12"/><name val="Aptos Display"/><family val="2"/><color rgb="FFFFFFFF"/></font>
    <font><b/><sz val="16"/><name val="Aptos Display"/><family val="2"/><color rgb="FFFFFFFF"/></font>
  </fonts>
  <fills count="13">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF0B1F3A"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF143F73"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFE8EDF3"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFEAF3FF"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF2F7D5B"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFDDF3E5"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFFF1C7"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF7F9FC"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF9D8DC"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFFDFC2"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFDCE9F8"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="3">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border><left style="thin"><color rgb="FFD6DEE8"/></left><right style="thin"><color rgb="FFD6DEE8"/></right><top style="thin"><color rgb="FFD6DEE8"/></top><bottom style="thin"><color rgb="FFD6DEE8"/></bottom><diagonal/></border>
    <border><left style="thin"><color rgb="FFD6DEE8"/></left><right style="thin"><color rgb="FFD6DEE8"/></right><top style="medium"><color rgb="FF2F7D5B"/></top><bottom style="thin"><color rgb="FFD6DEE8"/></bottom><diagonal/></border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="31">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="3" fillId="2" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="2" fillId="3" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="2" fillId="10" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="1" fillId="4" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="4" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="1" fillId="5" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="6" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="1" fillId="8" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="9" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="4" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="1" fillId="7" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="1" fillId="8" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="1" fillId="11" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="2" fillId="10" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="5" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="2" fillId="6" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="center"/></xf>
    <xf numFmtId="0" fontId="1" fillId="4" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="6" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="9" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
    <xf numFmtId="14" fontId="0" fillId="8" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="14" fontId="0" fillId="7" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="14" fontId="0" fillId="12" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="4" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="2" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="9" borderId="2" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
  <dxfs count="5">
    <dxf><fill><patternFill patternType="solid"><fgColor rgb="FFE8EDF3"/><bgColor indexed="64"/></patternFill></fill></dxf>
    <dxf><fill><patternFill patternType="solid"><fgColor rgb="FFDDF3E5"/><bgColor indexed="64"/></patternFill></fill><font><b/><color rgb="FF185C37"/></font></dxf>
    <dxf><fill><patternFill patternType="solid"><fgColor rgb="FFFFF1C7"/><bgColor indexed="64"/></patternFill></fill><font><b/><color rgb="FF765400"/></font></dxf>
    <dxf><fill><patternFill patternType="solid"><fgColor rgb="FFFFDFC2"/><bgColor indexed="64"/></patternFill></fill><font><b/><color rgb="FF8A3C00"/></font></dxf>
    <dxf><fill><patternFill patternType="solid"><fgColor rgb="FFF9D8DC"/><bgColor indexed="64"/></patternFill></fill><font><b/><color rgb="FF9B1C2C"/></font></dxf>
  </dxfs>
  <tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/>
</styleSheet>`;

function referencias(rango: string): string[] {
  const decoded = XLSX.utils.decode_range(rango);
  const refs: string[] = [];
  for (let row = decoded.s.r; row <= decoded.e.r; row += 1) {
    for (let col = decoded.s.c; col <= decoded.e.c; col += 1) refs.push(XLSX.utils.encode_cell({ r: row, c: col }));
  }
  return refs;
}

function aplicarEstiloCelda(xml: string, ref: string, estilo: number): string {
  const patron = new RegExp(`(<c\\s+[^>]*r="${ref}"[^>]*)(>)`);
  return xml.replace(patron, (_match, inicio: string, cierre: string) => {
    const actualizado = /\ss="\d+"/.test(inicio) ? inicio.replace(/\ss="\d+"/, ` s="${estilo}"`) : `${inicio} s="${estilo}"`;
    return `${actualizado}${cierre}`;
  });
}

function aplicarEstiloRango(xml: string, rango: string, estilo: number): string {
  return referencias(rango).reduce((result, ref) => aplicarEstiloCelda(result, ref, estilo), xml);
}

function insertarAntesDeCerrar(xml: string, contenido: string): string {
  return xml.replace("</worksheet>", `${contenido}</worksheet>`);
}

function congelar(xml: string, filas: number): string {
  const vista = `<sheetViews><sheetView workbookViewId="0"><pane ySplit="${filas}" topLeftCell="A${filas + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`;
  return xml.replace(/<sheetViews>[\s\S]*?<\/sheetViews>/, vista);
}

function configurarPagina(xml: string, footer: string, paperSize = 8): string {
  const limpio = xml
    .replace(/<printOptions[^>]*\/>/g, "")
    .replace(/<pageMargins[^>]*\/>/g, "")
    .replace(/<pageSetup[^>]*\/>/g, "")
    .replace(/<headerFooter>[\s\S]*?<\/headerFooter>/g, "");
  const pie = footer.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  return insertarAntesDeCerrar(limpio, `<printOptions horizontalCentered="1"/><pageMargins left="0.25" right="0.25" top="0.35" bottom="0.45" header="0.15" footer="0.2"/><pageSetup paperSize="${paperSize}" orientation="landscape" fitToWidth="1" fitToHeight="0"/><headerFooter><oddFooter>${pie}</oddFooter></headerFooter>`);
}

function agregarCondicionalesNivel(xml: string, inicio: number, fin: number): string {
  if (fin < inicio) return xml;
  let reglas = "";
  let priority = 1;
  for (const col of ["I", "K", "M", "O"]) {
    const rango = `${col}${inicio}:${col}${fin}`;
    for (const [texto, dxfId] of [["Evaluación pendiente", 0], ["Tolerable", 1], ["Moderado", 2], ["Importante", 3], ["Intolerable", 4]] as const) {
      reglas += `<conditionalFormatting sqref="${rango}"><cfRule type="expression" dxfId="${dxfId}" priority="${priority}"><formula>EXACT(${col}${inicio},"${texto}")</formula></cfRule></conditionalFormatting>`;
      priority += 1;
    }
  }
  return insertarAntesDeCerrar(xml, reglas);
}

function estilosMiper(xml: string, input: ExportInput): string {
  const fin = 13 + input.items.length;
  xml = aplicarEstiloRango(xml, "A1:C2", 2);
  xml = aplicarEstiloRango(xml, "D1:P2", 1);
  xml = aplicarEstiloRango(xml, "A3:P3", input.miper.estado === "borrador" ? 3 : 8);
  xml = aplicarEstiloRango(xml, "A4:P6", 5);
  for (const ref of ["A4", "E4", "I4", "M4", "A5", "E5", "I5", "M5", "A6", "E6", "I6", "M6"]) xml = aplicarEstiloCelda(xml, ref, 4);
  xml = aplicarEstiloRango(xml, "A8:N8", 6);
  xml = aplicarEstiloRango(xml, "A9:N9", 7);
  xml = aplicarEstiloRango(xml, "A10:P10", 18);
  xml = aplicarEstiloRango(xml, "A11:P11", 8);
  xml = aplicarEstiloRango(xml, "A12:P12", 9);
  xml = aplicarEstiloRango(xml, "A13:P13", 10);
  let anterior = "";
  input.items.forEach((item, index) => {
    const row = 14 + index;
    const clave = `${item.cargoNombre ?? ""}|${item.actividad}`;
    const base = clave !== anterior && index > 0 ? (index % 2 === 0 ? 29 : 30) : (index % 2 === 0 ? 11 : 12);
    xml = aplicarEstiloRango(xml, `A${row}:P${row}`, base);
    if (item.metodologiaEvaluacion === "vep_isp" && (item.probabilidad === null || item.severidad === null)) xml = aplicarEstiloCelda(xml, `I${row}`, 13);
    anterior = clave;
  });
  const firmasTitulo = fin + 2;
  xml = aplicarEstiloRango(xml, `A${firmasTitulo}:P${firmasTitulo}`, 19);
  xml = aplicarEstiloRango(xml, `A${firmasTitulo + 2}:P${firmasTitulo + 4}`, 5);
  for (const col of ["A", "F", "I", "M"]) {
    for (const row of [firmasTitulo + 2, firmasTitulo + 3, firmasTitulo + 4]) xml = aplicarEstiloCelda(xml, `${col}${row}`, 20);
  }
  xml = agregarCondicionalesNivel(xml, 14, fin);
  xml = congelar(xml, 13);
  return configurarPagina(xml, `${input.miper.codigo} V${input.miper.version} | ${input.miper.estado} | ${ymd(input.miper.fechaDescarga)} | Página &P de &N`);
}

function estilosAuxiliares(xml: string, filas: number, columnas: string): string {
  xml = aplicarEstiloRango(xml, `A1:${columnas}1`, 21);
  xml = aplicarEstiloRango(xml, `A2:${columnas}2`, 22);
  for (let row = 3; row <= filas; row += 1) xml = aplicarEstiloRango(xml, `A${row}:${columnas}${row}`, row % 2 === 0 ? 24 : 23);
  xml = congelar(xml, 2);
  return configurarPagina(xml, "NextPrev | Página &P de &N", 9);
}

async function aplicarPresentacionProfesional(buffer: Buffer, input: ExportInput): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  zip.file("xl/styles.xml", ESTILOS_XML);

  const configuraciones = [
    { path: "xl/worksheets/sheet1.xml", apply: (xml: string) => estilosMiper(xml, input) },
    { path: "xl/worksheets/sheet2.xml", apply: (xml: string) => estilosAuxiliares(xml, input.tareas.length + 2, "K") },
    { path: "xl/worksheets/sheet3.xml", apply: (xml: string) => {
      xml = estilosAuxiliares(xml, input.items.flatMap((item) => item.controles).length + 2, "J");
      let row = 3;
      for (const control of input.items.flatMap((item) => item.controles)) {
        const estilo = control.estado === "implementado" ? 26 : control.estado === "en_revision" ? 27 : control.estado === "descartado" ? 28 : 25;
        xml = aplicarEstiloCelda(xml, `J${row}`, estilo);
        row += 1;
      }
      return xml;
    } },
    { path: "xl/worksheets/sheet4.xml", apply: (xml: string) => estilosAuxiliares(xml, new Set(input.items.map((item) => item.codigoIsp).filter(Boolean)).size + 2, "G") },
  ];
  for (const config of configuraciones) {
    const file = zip.file(config.path);
    if (file) zip.file(config.path, config.apply(await file.async("string")));
  }

  const trazFile = zip.file("xl/worksheets/sheet5.xml");
  if (trazFile) {
    let xml = await trazFile.async("string");
    xml = aplicarEstiloRango(xml, "A1:G1", 21);
    xml = aplicarEstiloRango(xml, "A2:G4", 5);
    for (const ref of ["A2", "C2", "E2", "A3", "C3", "E3", "A4", "C4", "E4"]) xml = aplicarEstiloCelda(xml, ref, 4);
    xml = aplicarEstiloRango(xml, "A6:G6", 22);
    for (let row = 7; row <= input.items.length + 6; row += 1) xml = aplicarEstiloRango(xml, `A${row}:G${row}`, row % 2 === 0 ? 24 : 23);
    xml = congelar(xml, 6);
    zip.file("xl/worksheets/sheet5.xml", configurarPagina(xml, "NextPrev | Trazabilidad MIPER | Página &P de &N", 9));
  }

  const workbookFile = zip.file("xl/workbook.xml");
  if (workbookFile) {
    let xml = await workbookFile.async("string");
    const finMiper = 19 + input.items.length;
    const definidos = `<definedNames><definedName name="_xlnm.Print_Titles" localSheetId="0">MIPER!$11:$13</definedName><definedName name="_xlnm.Print_Area" localSheetId="0">MIPER!$A$1:$P$${finMiper}</definedName></definedNames>`;
    xml = xml.includes("<definedNames>") ? xml.replace(/<definedNames>[\s\S]*?<\/definedNames>/, definidos) : xml.replace("</workbook>", `${definidos}</workbook>`);
    zip.file("xl/workbook.xml", xml);
  }

  return zip.generateAsync({ type: "base64", compression: "DEFLATE", compressionOptions: { level: 6 } });
}

export async function generarExcelMiperIsp(input: ExportInput): Promise<{ nombre: string; base64: string }> {
  const nombre = `MIPER-NEXTPREV-${input.miper.codigo}-V${input.miper.version}.xlsx`;
  const workbook = generarWorkbookMiperIsp(input);
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx", compression: true }) as Buffer;
  return { nombre, base64: await aplicarPresentacionProfesional(buffer, input) };
}
