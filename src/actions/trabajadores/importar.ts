"use server";

import { revalidatePath } from "next/cache";
import * as XLSX from "xlsx";
import { evaluarDocumentosPendientesPorEvento } from "@/actions/trabajadores/documentos";
import { evaluarCapacitacionesPorEvento } from "@/lib/capacitacion/evaluar-capacitaciones";
import { prisma } from "@/lib/prisma";
import {
  ESTADOS_TRABAJADOR,
  MAX_ARCHIVO_TRABAJADORES_BYTES,
  MAX_FILAS_TRABAJADORES,
  TIPOS_CONTRATO,
  normalizarClave,
  validarFilas,
  type CatalogosCarga,
  type FilaExcel,
  type FilaNormalizada,
  type IncidenciaCarga,
} from "@/lib/trabajadores/carga-masiva";
import { leerMatrizXlsxSegura } from "@/lib/xlsx/secure-xlsx-reader";
import { requirePermission } from "@/server/auth/permissions";

const COLUMNAS = [
  { campo: "rut", titulo: "RUT *", aliases: ["rut"] },
  { campo: "nombres", titulo: "Nombres *", aliases: ["nombres", "nombre"] },
  { campo: "apellidos", titulo: "Apellidos *", aliases: ["apellidos", "apellido"] },
  { campo: "email", titulo: "Correo *", aliases: ["correo", "email"] },
  { campo: "telefono", titulo: "Teléfono", aliases: ["telefono", "teléfono"] },
  { campo: "fechaNacimiento", titulo: "Fecha de nacimiento *", aliases: ["fecha de nacimiento", "fechanacimiento"] },
  { campo: "fechaIngreso", titulo: "Fecha de ingreso *", aliases: ["fecha de ingreso", "fechaingreso"] },
  { campo: "cargo", titulo: "Cargo *", aliases: ["cargo"] },
  { campo: "area", titulo: "Área *", aliases: ["area", "área"] },
  { campo: "centroTrabajo", titulo: "Centro de trabajo *", aliases: ["centro de trabajo", "centrotrabajo", "centro"] },
  { campo: "tipoContrato", titulo: "Tipo de contrato *", aliases: ["tipo de contrato", "tipocontrato", "contrato"] },
  { campo: "estado", titulo: "Estado", aliases: ["estado"] },
] as const;

const CAMPOS_OBLIGATORIOS = new Set([
  "rut", "nombres", "apellidos", "email", "fechaNacimiento", "fechaIngreso",
  "cargo", "area", "centroTrabajo", "tipoContrato",
]);

export type ResumenValidacionCarga = {
  totalFilas: number;
  filasValidas: number;
  filasConError: number;
  advertencias: number;
  puedeImportar: boolean;
  incidencias: IncidenciaCarga[];
  vistaPrevia: FilaNormalizada[];
};

export type ResultadoImportacionCarga = {
  creados: number;
  documentosEvaluados: number;
  advertencias: string[];
};

function normalizarEncabezado(value: unknown): string {
  return normalizarClave(value).replace(/\*/g, "").trim();
}

function campoDesdeEncabezado(value: unknown): (typeof COLUMNAS)[number]["campo"] | null {
  const encabezado = normalizarEncabezado(value);
  return COLUMNAS.find((columna) => columna.aliases.some((alias) => normalizarClave(alias) === encabezado))?.campo ?? null;
}

function validarArchivo(file: File) {
  if (!file.name.toLowerCase().endsWith(".xlsx")) throw new Error("Selecciona un archivo Excel con extensión .xlsx.");
  if (file.size <= 0) throw new Error("El archivo está vacío.");
  if (file.size > MAX_ARCHIVO_TRABAJADORES_BYTES) throw new Error("El archivo supera el máximo permitido de 5 MB.");
}

async function cargarCatalogos(empresaId: string): Promise<CatalogosCarga> {
  const [cargos, areas, centros, trabajadores] = await Promise.all([
    prisma.cargo.findMany({ where: { empresaId, estado: "activo" }, select: { id: true, nombre: true, areaId: true }, orderBy: { nombre: "asc" } }),
    prisma.area.findMany({ where: { empresaId }, select: { id: true, nombre: true }, orderBy: { nombre: "asc" } }),
    prisma.centroTrabajo.findMany({ where: { empresaId }, select: { id: true, nombre: true }, orderBy: { nombre: "asc" } }),
    prisma.trabajador.findMany({ where: { empresaId, rut: { not: null } }, select: { rut: true } }),
  ]);
  return { cargos, areas, centros, rutsExistentes: trabajadores.flatMap((item) => item.rut ? [item.rut] : []) };
}

async function leerFilas(file: File) {
  validarArchivo(file);

  let matriz: unknown[][];
  try {
    matriz = await leerMatrizXlsxSegura(await file.arrayBuffer(), "Trabajadores", MAX_FILAS_TRABAJADORES);
  } catch (error) {
    if (error instanceof Error && error.message.includes("Trabajadores")) throw error;
    console.warn("[carga-trabajadores] XLSX rechazado:", error instanceof Error ? error.message : "error desconocido");
    throw new Error("No se pudo leer el Excel de forma segura. Descarga una plantilla nueva y vuelve a intentarlo.");
  }

  if (matriz.length === 0) throw new Error("La hoja Trabajadores está vacía.");
  const encabezados = matriz[0] ?? [];
  const indices = new Map<string, number>();
  encabezados.forEach((value, index) => {
    const campo = campoDesdeEncabezado(value);
    if (campo) indices.set(campo, index);
  });

  const faltantes = [...CAMPOS_OBLIGATORIOS].filter((campo) => !indices.has(campo));
  if (faltantes.length > 0) {
    const titulos = COLUMNAS
      .filter((columna) => faltantes.includes(columna.campo))
      .map((columna) => columna.titulo.replace(" *", ""));
    throw new Error(`Faltan columnas obligatorias: ${titulos.join(", ")}.`);
  }

  const filas: FilaExcel[] = [];
  for (let index = 1; index < matriz.length; index += 1) {
    const row = matriz[index] ?? [];
    if (row.every((value) => String(value ?? "").trim() === "")) continue;
    const valor = (campo: string) => row[indices.get(campo) ?? -1] ?? "";
    if (normalizarClave(valor("rut")) === "ejemplo no importar") continue;
    filas.push({
      fila: index + 1,
      rut: valor("rut"),
      nombres: valor("nombres"),
      apellidos: valor("apellidos"),
      email: valor("email"),
      telefono: valor("telefono"),
      fechaNacimiento: valor("fechaNacimiento"),
      fechaIngreso: valor("fechaIngreso"),
      cargo: valor("cargo"),
      area: valor("area"),
      centroTrabajo: valor("centroTrabajo"),
      tipoContrato: valor("tipoContrato"),
      estado: valor("estado"),
    });
  }

  if (filas.length === 0) throw new Error("No se encontraron trabajadores para validar. Elimina la fila de ejemplo y agrega al menos una fila.");
  if (filas.length > MAX_FILAS_TRABAJADORES) throw new Error("El archivo supera el máximo de 1.000 trabajadores.");
  return filas;
}

async function analizar(file: File, empresaId: string) {
  const filas = await leerFilas(file);
  const catalogos = await cargarCatalogos(empresaId);
  const resultado = validarFilas(filas, catalogos);
  const filasConError = new Set(resultado.incidencias.filter((item) => item.tipo === "error").map((item) => item.fila));
  return {
    ...resultado,
    catalogos,
    resumen: {
      totalFilas: filas.length,
      filasValidas: filas.length - filasConError.size,
      filasConError: filasConError.size,
      advertencias: resultado.incidencias.filter((item) => item.tipo === "advertencia").length,
      puedeImportar: filasConError.size === 0,
      incidencias: resultado.incidencias,
      vistaPrevia: resultado.filas.slice(0, 50),
    } satisfies ResumenValidacionCarga,
  };
}

function archivoDesdeFormData(formData: FormData): File {
  const file = formData.get("archivo");
  if (!(file instanceof File)) throw new Error("Selecciona un archivo antes de continuar.");
  return file;
}

export async function validarArchivoTrabajadores(formData: FormData): Promise<ResumenValidacionCarga> {
  const { empresaId } = await requirePermission("canCreateTrabajador");
  return (await analizar(archivoDesdeFormData(formData), empresaId)).resumen;
}

export async function descargarPlantillaTrabajadores() {
  const { empresaId } = await requirePermission("canCreateTrabajador");
  const catalogos = await cargarCatalogos(empresaId);
  const workbook = XLSX.utils.book_new();
  const encabezados = COLUMNAS.map((columna) => columna.titulo);
  const ejemplo = [
    "EJEMPLO NO IMPORTAR", "María", "González Soto", "maria@empresa.cl", "+56 9 1234 5678",
    "1990-05-20", "2026-01-15", catalogos.cargos[0]?.nombre ?? "Cargo existente",
    catalogos.areas[0]?.nombre ?? "Área existente", catalogos.centros[0]?.nombre ?? "Centro existente",
    "Indefinido", "Activo",
  ];
  const trabajadores = XLSX.utils.aoa_to_sheet([encabezados, ejemplo]);
  trabajadores["!cols"] = [16, 20, 22, 28, 18, 20, 18, 24, 24, 28, 20, 16].map((wch) => ({ wch }));
  trabajadores["!autofilter"] = { ref: "A1:L2" };

  const instrucciones = XLSX.utils.aoa_to_sheet([
    ["Plantilla de carga masiva de trabajadores"],
    ["Complete la hoja Trabajadores y elimine la fila de ejemplo antes de validar."],
    ["Los campos marcados con * son obligatorios."],
    ["Use fechas con formato AAAA-MM-DD, por ejemplo 2026-01-15."],
    ["Máximo permitido: 1.000 trabajadores y 5 MB por archivo."],
    ["Cargo, área y centro deben coincidir exactamente con la hoja Catálogos."],
    ["La carga se realizará únicamente si no existen errores bloqueantes."],
  ]);
  instrucciones["!cols"] = [{ wch: 100 }];

  const max = Math.max(
    catalogos.cargos.length,
    catalogos.areas.length,
    catalogos.centros.length,
    TIPOS_CONTRATO.length,
    ESTADOS_TRABAJADOR.length,
  );
  const catalogRows = [["Cargos", "Áreas", "Centros de trabajo", "Tipos de contrato", "Estados"]];
  for (let i = 0; i < max; i += 1) {
    catalogRows.push([
      catalogos.cargos[i]?.nombre ?? "",
      catalogos.areas[i]?.nombre ?? "",
      catalogos.centros[i]?.nombre ?? "",
      TIPOS_CONTRATO[i] ?? "",
      ESTADOS_TRABAJADOR[i] ?? "",
    ]);
  }
  const catalogosSheet = XLSX.utils.aoa_to_sheet(catalogRows);
  catalogosSheet["!cols"] = [{ wch: 30 }, { wch: 30 }, { wch: 36 }, { wch: 24 }, { wch: 18 }];

  XLSX.utils.book_append_sheet(workbook, trabajadores, "Trabajadores");
  XLSX.utils.book_append_sheet(workbook, instrucciones, "Instrucciones");
  XLSX.utils.book_append_sheet(workbook, catalogosSheet, "Catalogos");
  return {
    nombre: "plantilla-carga-trabajadores.xlsx",
    base64: XLSX.write(workbook, { type: "base64", bookType: "xlsx" }) as string,
  };
}

const estadoDb = (estado: FilaNormalizada["estado"]) => estado.toLowerCase();

export async function importarArchivoTrabajadores(formData: FormData): Promise<ResultadoImportacionCarga> {
  const { empresaId, usuarioId, email } = await requirePermission("canCreateTrabajador");
  const analisis = await analizar(archivoDesdeFormData(formData), empresaId);
  if (!analisis.resumen.puedeImportar) {
    throw new Error("El archivo cambió o contiene errores. Vuelve a validarlo antes de importar.");
  }

  const cargos = new Map(analisis.catalogos.cargos.map((item) => [normalizarClave(item.nombre), item]));
  const areas = new Map(analisis.catalogos.areas.map((item) => [normalizarClave(item.nombre), item]));
  const centros = new Map(analisis.catalogos.centros.map((item) => [normalizarClave(item.nombre), item]));
  const ruts = analisis.filas.map((fila) => fila.rut);

  const existentes = await prisma.trabajador.findMany({
    where: { empresaId, rut: { in: ruts } },
    select: { rut: true },
  });
  if (existentes.length > 0) {
    throw new Error("Uno o más trabajadores ya fueron importados. Vuelve a validar el archivo.");
  }

  const combinaciones = new Set<string>();
  for (const fila of analisis.filas) {
    const cargo = cargos.get(normalizarClave(fila.cargo));
    const centro = centros.get(normalizarClave(fila.centroTrabajo));
    if (cargo && centro) combinaciones.add(`${cargo.id}::${centro.id}`);
  }

  const posicionesActivas = await prisma.posicionDotacion.findMany({
    where: { empresaId, estado: "activa" },
    select: { id: true, cargoId: true, centroTrabajoId: true },
  });
  const posicionPorCombinacion = new Map<string, string>();
  for (const posicion of posicionesActivas) {
    const key = `${posicion.cargoId}::${posicion.centroTrabajoId}`;
    if (combinaciones.has(key) && !posicionPorCombinacion.has(key)) posicionPorCombinacion.set(key, posicion.id);
  }

  const data = analisis.filas.map((fila) => {
    const cargo = cargos.get(normalizarClave(fila.cargo))!;
    const area = areas.get(normalizarClave(fila.area))!;
    const centro = centros.get(normalizarClave(fila.centroTrabajo))!;
    const posicionKey = `${cargo.id}::${centro.id}`;
    return {
      empresaId,
      rut: fila.rut,
      nombres: fila.nombres,
      apellidos: fila.apellidos,
      email: fila.email,
      telefono: fila.telefono || null,
      fechaNacimiento: new Date(`${fila.fechaNacimiento}T00:00:00.000Z`),
      fechaIngreso: new Date(`${fila.fechaIngreso}T00:00:00.000Z`),
      tipoContrato: fila.tipoContrato,
      estado: estadoDb(fila.estado),
      cargoId: cargo.id,
      areaId: area.id,
      centroTrabajoId: centro.id,
      posicionDotacionId: posicionPorCombinacion.get(posicionKey) ?? null,
    };
  });

  try {
    await prisma.trabajador.createMany({ data });
  } catch {
    throw new Error("No fue posible completar la importación. Revisa si hay trabajadores ya existentes y vuelve a validar el archivo.");
  }

  const creados = await prisma.trabajador.findMany({
    where: { empresaId, rut: { in: ruts } },
    select: { id: true, rut: true, cargoId: true, areaId: true, centroTrabajoId: true },
  });

  const advertencias: string[] = [];
  let documentosEvaluados = 0;
  const LIMITE_EVALUACION_DOCUMENTAL = 150;
  const trabajadoresParaEvaluar = creados.slice(0, LIMITE_EVALUACION_DOCUMENTAL);
  for (const trabajador of trabajadoresParaEvaluar) {
    try {
      await evaluarDocumentosPendientesPorEvento({
        empresaId,
        evento: "trabajador_creado",
        trabajadorId: trabajador.id,
        usuarioId,
        email,
      });
      documentosEvaluados += 1;
    } catch (error) {
      console.error("No se pudo evaluar documentación del trabajador importado:", error);
      advertencias.push(`No se pudo completar la evaluación documental para el RUT ${trabajador.rut ?? "sin RUT"}.`);
    }

    try {
      await evaluarCapacitacionesPorEvento({
        trabajadorId: trabajador.id,
        empresaId,
        cargoId: trabajador.cargoId,
        areaId: trabajador.areaId,
        centroTrabajoId: trabajador.centroTrabajoId,
      });
    } catch (error) {
      console.error("No se pudo evaluar capacitaciones del trabajador importado:", error);
      advertencias.push(`No se pudo completar la evaluación de capacitaciones para el RUT ${trabajador.rut ?? "sin RUT"}.`);
    }
  }

  if (creados.length > LIMITE_EVALUACION_DOCUMENTAL) {
    const omitidos = creados.length - LIMITE_EVALUACION_DOCUMENTAL;
    advertencias.push(`Se omitió la evaluación documental automática para ${omitidos} trabajador(es) para evitar timeout en la carga masiva.`);
  }

  revalidatePath("/dicaprev/trabajadores");
  return { creados: creados.length, documentosEvaluados, advertencias };
}
