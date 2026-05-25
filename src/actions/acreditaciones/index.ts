"use server";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/server/auth/permissions";
import { detectarAlertas } from "@/lib/acreditaciones/calcular-duraciones";

type EstadoAcreditacion =
  | "en_preparacion"
  | "listo_para_enviar"
  | "enviado"
  | "observada"
  | "aprobado"
  | "rechazado"
  | "cerrada"
  | "vencido";

type UrgenciaFiltro = "alta" | "media" | "baja";

type OpsAcreditacion = {
  id: string;
  estado: string;
  mandanteId: string;
  mandante: { nombre: string };
  nombreProyecto: string | null;
  obraFaena: string | null;
  responsableId: string | null;
  responsable: { nombre: string } | null;
  documentos: Array<{ estado: string; fechaVencimiento: Date | null }>;
  trabajadores: unknown[];
  vehiculos: unknown[];
  fechaVencimiento: Date | null;
  updatedAt: Date;
  observaciones: string | null;
};

// ─────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────

async function getEmpresaId(): Promise<string> {
  const context = await requireAuth();
  return context.empresaId;
}

async function getContext() {
  return requireAuth();
}

function toDateOnly(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function computeUrgencia(args: {
  estado: string;
  fechaVencimiento: Date | null;
  documentosVencidos: number;
  documentosFaltantes: number;
}) {
  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const vencePronto = Boolean(args.fechaVencimiento && args.fechaVencimiento <= in7Days);

  if (args.estado === "rechazado" || args.estado === "observada" || args.estado === "vencido") {
    return "alta" as const;
  }
  if (args.documentosVencidos > 0 || vencePronto) {
    return "alta" as const;
  }
  if (args.documentosFaltantes > 0) {
    return "media" as const;
  }
  return "baja" as const;
}

function buildMotivo(args: {
  estado: string;
  fechaVencimiento: Date | null;
  documentosVencidos: number;
  documentosFaltantes: number;
}) {
  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  if (args.estado === "rechazado") return "Rechazada por mandante";
  if (args.estado === "observada") return "Observaciones pendientes";
  if (args.estado === "vencido") return "Acreditacion vencida";
  if (args.documentosVencidos > 0) return "Documentos vencidos";
  if (args.fechaVencimiento && args.fechaVencimiento <= in7Days) return "Fecha limite proxima";
  if (args.documentosFaltantes > 0) return "Documentacion incompleta";
  return "Seguimiento operativo";
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function buildCodigoDocumento(nombreDocumento: string, categoria: string, aplicaA: string) {
  const base = normalizeText(nombreDocumento) || "documento";
  return `${normalizeText(categoria) || "general"}_${normalizeText(aplicaA) || "empresa"}_${base}`;
}

function isDocumentoAprobado(estado?: string | null) {
  const normalized = (estado ?? "").trim().toLowerCase();
  return ["aprobado", "completo", "vigente", "validado", "firmado"].includes(normalized);
}

function resolveEstadoDesdeFuente(args: { estado?: string | null; fechaVencimiento?: Date | null }) {
  if (!isDocumentoAprobado(args.estado)) return "faltante" as const;

  if (args.fechaVencimiento && args.fechaVencimiento.getTime() < Date.now()) {
    return "vencido" as const;
  }

  return "completo" as const;
}

function mapAcreditacionRow(a: OpsAcreditacion) {
  const totalDocs = a.documentos.length;
  const completos = a.documentos.filter((d) => d.estado === "completo").length;
  const faltantes = a.documentos.filter((d) => d.estado === "faltante").length;
  const vencidos = a.documentos.filter((d) => d.estado === "vencido").length;
  const observados = a.documentos.filter((d) => d.estado === "rechazado" || d.estado === "en_revision").length;
  const progreso = totalDocs === 0 ? 0 : Math.round((completos / totalDocs) * 100);
  const urgencia = computeUrgencia({
    estado: a.estado,
    fechaVencimiento: a.fechaVencimiento,
    documentosVencidos: vencidos,
    documentosFaltantes: faltantes,
  });

  return {
    id: a.id,
    estado: a.estado,
    mandanteId: a.mandanteId,
    mandante: a.mandante.nombre,
    proyecto: a.nombreProyecto || a.obraFaena || "Sin proyecto",
    obraFaena: a.obraFaena,
    responsableId: a.responsableId,
    responsable: a.responsable?.nombre || "Sin asignar",
    trabajadores: a.trabajadores.length,
    vehiculos: a.vehiculos.length,
    faltantes,
    vencidos,
    observados,
    totalDocs,
    progreso,
    urgencia,
    motivo: buildMotivo({
      estado: a.estado,
      fechaVencimiento: a.fechaVencimiento,
      documentosVencidos: vencidos,
      documentosFaltantes: faltantes,
    }),
    fechaVencimiento: a.fechaVencimiento,
    updatedAt: a.updatedAt,
    observaciones: a.observaciones,
  };
}

type HistorialResultado = "aprobado" | "rechazado" | "con_observaciones";

export interface HistorialAcreditacionFila {
  id: string;
  acreditacionId: string;
  mandanteId: string;
  mandante: string;
  tipo: string;
  estado: string;
  proyecto: string;
  obraFaena: string | null;
  responsableId: string | null;
  responsable: string;
  trabajadores: number;
  vehiculos: number;
  fechaCreacion: string;
  fechaEnvio: string | null;
  fechaRespuesta: string | null;
  fechaVencimiento: string | null;
  resultado: HistorialResultado | null;
  causaClave: string | null;
  causaEtiqueta: string | null;
  observaciones: string | null;
  diasGestion: number;
  diasPreparacion: number | null;
  diasRespuesta: number | null;
  diasAprobacion: number | null;
  totalDocumentos: number;
  documentosCompletos: number;
  documentosFaltantes: number;
  documentosVencidos: number;
  documentosObservados: number;
  alertasActivas: number;
  tieneAlerta: boolean;
  ultimaActividad: string;
}

export interface HistorialAcreditacionesTasaMandante {
  mandanteId: string;
  mandante: string;
  total: number;
  aprobadas: number;
  tasa: number;
}

export interface HistorialAcreditacionesCausa {
  causa: string;
  etiqueta: string;
  count: number;
  pct: number;
}

export interface HistorialAcreditacionesKpis {
  creadas: number;
  enviadas: number;
  aprobadas: number;
  rechazadasObservadas: number;
  cerradas: number;
  porcentajeExito: number;
  diasPromedioGestion: number;
  diasPromedioPreparacion: number | null;
  diasPromedioRespuesta: number | null;
  diasPromedioAprobacion: number | null;
  alertasActivas: number;
}

export interface HistorialAcreditacionesResumen {
  kpis: HistorialAcreditacionesKpis;
  filas: HistorialAcreditacionFila[];
  mandantes: Array<{ id: string; nombre: string }>;
  tasaPorMandante: HistorialAcreditacionesTasaMandante[];
  causasRechazo: HistorialAcreditacionesCausa[];
  alertas: {
    total: number;
    criticas: number;
    porTipo: {
      preparacionLenta: number;
      sinRespuesta: number;
      aprobacionLenta: number;
    };
  };
  mandantesLentos: Array<{ mandanteId: string; mandante: string; promedio: number; n: number }>;
  procesosLentosMes: Array<{
    id: string;
    mandante: string;
    tipo: string;
    estado: string;
    responsable: string;
    diasGestion: number;
  }>;
}

function diffDays(from: string, to: string): number {
  const start = new Date(from).getTime();
  const end = new Date(to).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.max(0, Math.round((end - start) / (1000 * 60 * 60 * 24)));
}

function toIsoOrNull(date: Date | null | undefined): string | null {
  return date ? date.toISOString() : null;
}

function formatNombreCompleto(nombre?: string | null, email?: string | null) {
  if (nombre && nombre.trim().length > 0) return nombre.trim();
  if (email && email.trim().length > 0) return email.trim();
  return "Sin asignar";
}

function normalizarTexto(value: string | null | undefined) {
  return (value ?? "").toLowerCase();
}

function detectarCausaHistorial(a: HistorialAcreditacionesDbRow): { causa: string | null; etiqueta: string | null } {
  const observaciones = normalizarTexto(a.observaciones);
  const detalles = a.historial
    .map((item: HistorialAcreditacionesDbRow["historial"][number]) => `${item.accion ?? ""} ${item.detalle ?? ""} ${item.estadoNuevo ?? ""}`)
    .join(" ")
    .toLowerCase();
  const texto = `${observaciones} ${detalles}`;

  const tieneVehiculoObservado = a.documentos.some((doc: HistorialAcreditacionesDbRow["documentos"][number]) => doc.titularTipo === "vehiculo" && ["faltante", "vencido", "rechazado", "en_revision"].includes(doc.estado));
  const tieneEmpresaObservada = a.documentos.some((doc: HistorialAcreditacionesDbRow["documentos"][number]) => doc.titularTipo === "empresa" && ["faltante", "vencido", "rechazado", "en_revision"].includes(doc.estado));
  const tieneTrabajadorObservado = a.documentos.some((doc: HistorialAcreditacionesDbRow["documentos"][number]) => doc.titularTipo === "trabajador" && ["faltante", "vencido", "rechazado", "en_revision"].includes(doc.estado));

  if (texto.includes("formato") || texto.includes("plantilla") || texto.includes("mandante")) {
    return { causa: "formato_mandante", etiqueta: "Formato mandante" };
  }
  if (texto.includes("sec") || texto.includes("licencia") || texto.includes("vencid")) {
    return { causa: "licencias_vencidas", etiqueta: "Licencias vencidas" };
  }
  if (texto.includes("altura") || texto.includes("examen")) {
    return { causa: "examenes_salud_altura", etiqueta: "Exámenes salud/altura" };
  }
  if (tieneVehiculoObservado) {
    return { causa: "documentos_vehiculo", etiqueta: "Docs. vehículo" };
  }
  if (tieneEmpresaObservada) {
    return { causa: "documentos_empresa", etiqueta: "Docs. empresa" };
  }
  if (tieneTrabajadorObservado || a.documentos.some((doc: HistorialAcreditacionesDbRow["documentos"][number]) => doc.estado === "faltante")) {
    return { causa: "expediente_incompleto", etiqueta: "Expediente incompleto" };
  }

  if (texto.trim().length > 0) {
    return { causa: "otro", etiqueta: "Otro motivo" };
  }

  return { causa: null, etiqueta: null };
}

function getResultadoFromEstado(estado: string): HistorialResultado | null {
  if (estado === "aprobado") return "aprobado";
  if (estado === "rechazado") return "rechazado";
  if (estado === "observada") return "con_observaciones";
  return null;
}

async function fetchHistorialAcreditaciones(empresaId: string) {
  return prisma.acreditacion.findMany({
    where: { empresaId },
    include: {
      mandante: true,
      plantilla: {
        include: {
          requisitos: {
            orderBy: { orden: "asc" },
          },
        },
      },
      responsable: {
        select: { id: true, nombre: true, email: true },
      },
      trabajadores: {
        include: {
          trabajador: {
            select: {
              id: true,
              nombres: true,
              apellidos: true,
              rut: true,
            },
          },
        },
      },
      vehiculos: {
        include: {
          vehiculo: {
            select: {
              id: true,
              patente: true,
              marca: true,
              modelo: true,
            },
          },
        },
      },
      documentos: {
        include: {
          requisito: {
            select: {
              id: true,
              nombreDocumento: true,
              categoria: true,
              aplicaA: true,
            },
          },
        },
      },
      historial: {
        include: {
          usuario: {
            select: { id: true, nombre: true, email: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 1000,
  });
}

type HistorialAcreditacionesDbRow = Awaited<ReturnType<typeof fetchHistorialAcreditaciones>>[number];

function mapHistorialAcreditacionRow(a: HistorialAcreditacionesDbRow): HistorialAcreditacionFila {
  const fechaCreacion = a.createdAt.toISOString();
  const historyAsc = [...a.historial].sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
  const lastHistory = historyAsc.at(-1) ?? null;

  const fechaEnvio = a.fechaEnvio ?? historyAsc.find((item) => item.estadoNuevo === "enviado")?.createdAt ?? historyAsc.find((item) => item.estadoNuevo === "listo_para_enviar")?.createdAt ?? null;
  const fechaRespuesta = a.fechaRespuesta ?? historyAsc.find((item) => item.estadoNuevo === "aprobado" || item.estadoNuevo === "rechazado" || item.estadoNuevo === "observada")?.createdAt ?? null;
  const fechaAprobacion = historyAsc.find((item) => item.estadoNuevo === "aprobado")?.createdAt ?? a.estado === "aprobado" ? fechaRespuesta : null;

  const documentosCompletos = a.documentos.filter((doc) => doc.estado === "completo").length;
  const documentosFaltantes = a.documentos.filter((doc) => doc.estado === "faltante").length;
  const documentosVencidos = a.documentos.filter((doc) => doc.estado === "vencido").length;
  const documentosObservados = a.documentos.filter((doc) => doc.estado === "en_revision" || doc.estado === "rechazado").length;
  const totalDocumentos = a.documentos.length;

  const diasPreparacion = fechaEnvio ? diffDays(fechaCreacion, fechaEnvio.toISOString()) : null;
  const diasRespuesta = fechaEnvio && fechaRespuesta ? diffDays(fechaEnvio.toISOString(), fechaRespuesta.toISOString()) : null;
  const diasAprobacion = fechaAprobacion ? diffDays(fechaCreacion, fechaAprobacion.toISOString()) : null;
  const diasGestion = fechaRespuesta ? diffDays(fechaCreacion, fechaRespuesta.toISOString()) : diffDays(fechaCreacion, a.updatedAt.toISOString());

  const resultado = getResultadoFromEstado(a.estado);
  const causa = resultado && resultado !== "aprobado" ? detectarCausaHistorial(a) : { causa: null, etiqueta: null };
  const alertas = detectarAlertas({
    estado: a.estado,
    fechaCreacion,
    fechaEnvio: fechaEnvio?.toISOString(),
    fechaRespuesta: fechaRespuesta?.toISOString(),
    resultado: resultado ?? undefined,
    diasGestion,
  });

  return {
    id: a.id,
    acreditacionId: a.id,
    mandanteId: a.mandanteId,
    mandante: a.mandante.nombre,
    tipo: a.plantilla.tipo || a.mandante.tipo || "mandante_general",
    estado: a.estado,
    proyecto: a.nombreProyecto || a.obraFaena || a.plantilla.nombre,
    obraFaena: a.obraFaena,
    responsableId: a.responsableId,
    responsable: formatNombreCompleto(a.responsable?.nombre, a.responsable?.email) || historyAsc.find((item) => item.usuario)?.usuario?.nombre || "Sin asignar",
    trabajadores: a.trabajadores.length,
    vehiculos: a.vehiculos.length,
    fechaCreacion,
    fechaEnvio: toIsoOrNull(fechaEnvio),
    fechaRespuesta: toIsoOrNull(fechaRespuesta),
    fechaVencimiento: toIsoOrNull(a.fechaVencimiento),
    resultado,
    causaClave: causa.causa,
    causaEtiqueta: causa.etiqueta,
    observaciones: a.observaciones,
    diasGestion,
    diasPreparacion,
    diasRespuesta,
    diasAprobacion,
    totalDocumentos,
    documentosCompletos,
    documentosFaltantes,
    documentosVencidos,
    documentosObservados,
    alertasActivas: alertas.length,
    tieneAlerta: alertas.length > 0,
    ultimaActividad: lastHistory
      ? `${lastHistory.accion}${lastHistory.detalle ? `: ${lastHistory.detalle}` : ""}`
      : `Actualizado ${a.updatedAt.toLocaleDateString("es-CL")}`,
  };
}

function calcularPromedio(valores: Array<number | null>): number | null {
  const definidos = valores.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (definidos.length === 0) return null;
  return Math.round(definidos.reduce((suma, value) => suma + value, 0) / definidos.length);
}

function construirResumenHistorial(rows: HistorialAcreditacionFila[]): HistorialAcreditacionesResumen {
  const creadas = rows.length;
  const enviadas = rows.filter((row) => row.fechaEnvio !== null || row.estado === "enviado").length;
  const aprobadas = rows.filter((row) => row.resultado === "aprobado" || row.estado === "aprobado").length;
  const rechazadasObservadas = rows.filter((row) => row.resultado === "rechazado" || row.resultado === "con_observaciones" || row.estado === "rechazado" || row.estado === "observada").length;
  const cerradas = rows.filter((row) => row.estado === "cerrada").length;
  const respuestas = rows.filter((row) => Boolean(row.resultado) || ["aprobado", "rechazado", "observada"].includes(row.estado)).length;
  const porcentajeExito = respuestas > 0 ? Math.round((aprobadas / respuestas) * 100) : 0;

  const diasPromedioGestion = calcularPromedio(rows.map((row) => (row.diasGestion > 0 ? row.diasGestion : null))) ?? 0;
  const diasPromedioPreparacion = calcularPromedio(rows.map((row) => row.diasPreparacion));
  const diasPromedioRespuesta = calcularPromedio(rows.map((row) => row.diasRespuesta));
  const diasPromedioAprobacion = calcularPromedio(rows.map((row) => row.diasAprobacion));

  const alertasActivas = rows.filter((row) => row.tieneAlerta).length;

  const mandantes = Array.from(new Map(rows.map((row) => [row.mandanteId, row.mandante])).entries())
    .map(([id, nombre]) => ({ id, nombre }))
    .sort((left, right) => left.nombre.localeCompare(right.nombre, "es"));

  const tasaPorMandante = Array.from(
    rows.reduce((map, row) => {
      const current = map.get(row.mandanteId) ?? { mandanteId: row.mandanteId, mandante: row.mandante, total: 0, aprobadas: 0 };
      if (Boolean(row.resultado) || ["aprobado", "rechazado", "observada"].includes(row.estado)) {
        current.total += 1;
        if (row.resultado === "aprobado" || row.estado === "aprobado") {
          current.aprobadas += 1;
        }
      }
      map.set(row.mandanteId, current);
      return map;
    }, new Map<string, { mandanteId: string; mandante: string; total: number; aprobadas: number }>() ).values()
  )
    .filter((item) => item.total > 0)
    .map((item) => ({
      ...item,
      tasa: Math.round((item.aprobadas / item.total) * 100),
    }))
    .sort((left, right) => right.tasa - left.tasa);

  const causaMap = new Map<string, { etiqueta: string; count: number }>();
  for (const row of rows) {
    if (!row.causaClave) continue;
    const entry = causaMap.get(row.causaClave) ?? { etiqueta: row.causaEtiqueta ?? row.causaClave, count: 0 };
    entry.count += 1;
    causaMap.set(row.causaClave, entry);
  }
  const totalCausas = Array.from(causaMap.values()).reduce((sum, item) => sum + item.count, 0);
  const causasRechazo = Array.from(causaMap.entries())
    .map(([causa, value]) => ({
      causa,
      etiqueta: value.etiqueta,
      count: value.count,
      pct: totalCausas > 0 ? Math.round((value.count / totalCausas) * 100) : 0,
    }))
    .sort((left, right) => right.count - left.count);

  const alertasPorTipo = rows.reduce(
    (acc, row) => {
      if (row.estado === "en_preparacion" && row.diasPreparacion !== null && row.diasPreparacion > 30) {
        acc.preparacionLenta += 1;
      }
      if (row.fechaEnvio && !row.fechaRespuesta && row.estado === "enviado") {
        acc.sinRespuesta += 1;
      }
      if (row.resultado === "aprobado" && row.diasGestion > 60) {
        acc.aprobacionLenta += 1;
      }
      return acc;
    },
    { preparacionLenta: 0, sinRespuesta: 0, aprobacionLenta: 0 }
  );

  const mandantesLentos = Array.from(
    rows.reduce((map, row) => {
      if (row.diasRespuesta === null) return map;
      const current = map.get(row.mandanteId) ?? { mandanteId: row.mandanteId, mandante: row.mandante, dias: [] as number[] };
      current.dias.push(row.diasRespuesta);
      map.set(row.mandanteId, current);
      return map;
    }, new Map<string, { mandanteId: string; mandante: string; dias: number[] }>() ).values()
  )
    .map((item) => ({
      mandanteId: item.mandanteId,
      mandante: item.mandante,
      promedio: Math.round(item.dias.reduce((sum, value) => sum + value, 0) / item.dias.length),
      n: item.dias.length,
    }))
    .sort((left, right) => right.promedio - left.promedio)
    .slice(0, 5);

  const mesActual = new Date().toISOString().slice(0, 7);
  const procesosLentosMes = rows
    .filter((row) => row.fechaCreacion.startsWith(mesActual) && row.diasGestion > 0)
    .sort((left, right) => right.diasGestion - left.diasGestion)
    .slice(0, 5)
    .map((row) => ({
      id: row.id,
      mandante: row.mandante,
      tipo: row.tipo,
      estado: row.estado,
      responsable: row.responsable,
      diasGestion: row.diasGestion,
    }));

  return {
    kpis: {
      creadas,
      enviadas,
      aprobadas,
      rechazadasObservadas,
      cerradas,
      porcentajeExito,
      diasPromedioGestion,
      diasPromedioPreparacion,
      diasPromedioRespuesta,
      diasPromedioAprobacion,
      alertasActivas,
    },
    filas: rows,
    mandantes,
    tasaPorMandante,
    causasRechazo,
    alertas: {
      total: alertasActivas,
      criticas: rows.filter((row) => row.estado === "rechazado" || row.estado === "observada" || row.estado === "vencido").length,
      porTipo: alertasPorTipo,
    },
    mandantesLentos,
    procesosLentosMes,
  };
}

export async function getHistorialAcreditaciones(): Promise<HistorialAcreditacionesResumen> {
  const empresaId = await getEmpresaId();
  const acreditaciones = await fetchHistorialAcreditaciones(empresaId);
  const filas = acreditaciones.map((acreditacion) => mapHistorialAcreditacionRow(acreditacion));

  return construirResumenHistorial(filas);
}

// ─────────────────────────────────────────────────────────────────────
// ACREDITACIONES — LECTURA
// ─────────────────────────────────────────────────────────────────────

export async function getAcreditacionesResumen() {
  const empresaId = await getEmpresaId();

  const [acreditaciones, total, enPreparacion, listasEnviar, observadas, rechazadas] = await Promise.all([
    prisma.acreditacion.findMany({
      where: { empresaId },
      include: {
        mandante: true,
        plantilla: true,
        responsable: { select: { nombre: true } },
        documentos: { select: { estado: true, fechaVencimiento: true } },
        trabajadores: true,
        vehiculos: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 500,
    }),
    prisma.acreditacion.count({ where: { empresaId } }),
    prisma.acreditacion.count({ where: { empresaId, estado: "en_preparacion" } }),
    prisma.acreditacion.count({ where: { empresaId, estado: "listo_para_enviar" } }),
    prisma.acreditacion.count({ where: { empresaId, estado: "observada" } }),
    prisma.acreditacion.count({ where: { empresaId, estado: "rechazado" } }),
  ]);

  const rows = acreditaciones.map(mapAcreditacionRow);
  const now = toDateOnly(new Date());
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const promedioAvance = rows.length > 0
    ? Math.round(rows.reduce((acc, row) => acc + row.progreso, 0) / rows.length)
    : 0;

  const vencenEstaSemana = rows.filter((row) => {
    if (!row.fechaVencimiento) return false;
    const d = toDateOnly(row.fechaVencimiento);
    return d >= now && d <= in7Days;
  }).length;

  const colaPrioritaria = rows
    .filter((row) => row.urgencia === "alta")
    .sort((a, b) => {
      const score = (r: typeof a) => {
        if (r.estado === "rechazado") return 100;
        if (r.estado === "observada") return 90;
        if (r.estado === "vencido") return 80;
        return r.vencidos > 0 ? 70 : 60;
      };
      return score(b) - score(a);
    })
    .slice(0, 5);

  return {
    kpis: {
      totalActivas: total,
      enPreparacion,
      listasParaEnviar: listasEnviar,
      observadasRechazadas: observadas + rechazadas,
      vencenEstaSemana,
      promedioAvance,
    },
    total,
    colaPrioritaria,
    rows,
    resumen: {
      totalDocumentos: rows.reduce((acc, row) => acc + row.totalDocs, 0),
      documentosFaltantes: rows.reduce((acc, row) => acc + row.faltantes, 0),
      documentosVencidos: rows.reduce((acc, row) => acc + row.vencidos, 0),
    },
  };
}

export async function getAcreditaciones(filters?: {
  estado?: EstadoAcreditacion;
  mandanteId?: string;
  responsableId?: string;
  search?: string;
  urgencia?: UrgenciaFiltro;
  soloObservaciones?: boolean;
  soloVencimientos?: boolean;
  skip?: number;
  take?: number;
}) {
  const empresaId = await getEmpresaId();

  const where: Prisma.AcreditacionWhereInput = { empresaId };

  if (filters?.estado) where.estado = filters.estado;
  if (filters?.mandanteId) where.mandanteId = filters.mandanteId;
  if (filters?.responsableId) where.responsableId = filters.responsableId;

  if (filters?.search && filters.search.trim().length > 0) {
    const search = filters.search.trim();
    where.OR = [
      { nombreProyecto: { contains: search, mode: "insensitive" } },
      { obraFaena: { contains: search, mode: "insensitive" } },
      { observaciones: { contains: search, mode: "insensitive" } },
      { mandante: { nombre: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [acreditaciones, totalBase] = await Promise.all([
    prisma.acreditacion.findMany({
      where,
      include: {
        mandante: true,
        plantilla: true,
        responsable: { select: { nombre: true } },
        documentos: { select: { estado: true, fechaVencimiento: true } },
        trabajadores: { include: { trabajador: true } },
        vehiculos: { include: { vehiculo: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 800,
    }),
    prisma.acreditacion.count({ where }),
  ]);

  let mapped = acreditaciones.map((a) => {
    const row = mapAcreditacionRow(a);
    return {
      ...a,
      trabajadores: a.trabajadores.map((t) => t.trabajador),
      vehiculos: a.vehiculos.map((v) => v.vehiculo),
      _ops: row,
    };
  });

  if (filters?.urgencia) {
    mapped = mapped.filter((item) => item._ops.urgencia === filters.urgencia);
  }
  if (filters?.soloObservaciones) {
    mapped = mapped.filter((item) => item.estado === "observada" || item.estado === "rechazado" || item._ops.observados > 0);
  }
  if (filters?.soloVencimientos) {
    mapped = mapped.filter((item) => item._ops.vencidos > 0 || item.estado === "vencido");
  }

  const skip = filters?.skip || 0;
  const take = filters?.take || 50;
  const sliced = mapped.slice(skip, skip + take);

  return {
    data: sliced,
    total: mapped.length,
    totalBase,
    hasMore: skip + take < mapped.length,
  };
}

export async function getAcreditacionById(id: string) {
  const empresaId = await getEmpresaId();

  const acreditacion = await prisma.acreditacion.findUnique({
    where: { id },
    include: {
      mandante: true,
      plantilla: {
        include: { requisitos: { orderBy: { orden: "asc" } } },
      },
      responsable: true,
      documentos: {
        include: { requisito: true },
        orderBy: { requisito: { orden: "asc" } },
      },
      trabajadores: { include: { trabajador: true } },
      vehiculos: { include: { vehiculo: true } },
      historial: {
        include: { usuario: { select: { nombre: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (acreditacion?.empresaId !== empresaId) throw new Error("Unauthorized");
  return { id: acreditacion.id };
}

// ─────────────────────────────────────────────────────────────────────
// MANDANTES — LECTURA
// ─────────────────────────────────────────────────────────────────────

export async function getMandantesAcreditacion() {
  const empresaId = await getEmpresaId();

  return prisma.mandanteAcreditacion.findMany({
    where: { empresaId, activo: true },
    orderBy: { nombre: "asc" },
  });
}

// ─────────────────────────────────────────────────────────────────────
// PLANTILLAS — LECTURA
// ─────────────────────────────────────────────────────────────────────

export async function getPlantillasAcreditacion(filtros?: { activas?: boolean; tipo?: string; search?: string }) {
  const empresaId = await getEmpresaId();

  return prisma.plantillaAcreditacion.findMany({
    where: {
      empresaId,
      ...(filtros?.activas !== undefined && { activa: filtros.activas }),
      ...(filtros?.tipo && { tipo: filtros.tipo }),
      ...(filtros?.search && {
        OR: [
          { nombre: { contains: filtros.search, mode: "insensitive" } },
          { descripcion: { contains: filtros.search, mode: "insensitive" } },
          { mandante: { nombre: { contains: filtros.search, mode: "insensitive" } } },
        ],
      }),
    },
    include: {
      mandante: true,
      requisitos: { orderBy: { orden: "asc" } },
      _count: { select: { requisitos: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getPlantillaAcreditacionById(id: string) {
  const empresaId = await getEmpresaId();

  const plantilla = await prisma.plantillaAcreditacion.findUnique({
    where: { id },
    include: {
      mandante: true,
      requisitos: { orderBy: { orden: "asc" } },
    },
  });
  if (plantilla?.empresaId !== empresaId) throw new Error("Unauthorized");
  return plantilla;
}

// ─────────────────────────────────────────────────────────────────────
// PLANTILLAS — ESCRITURA
// ─────────────────────────────────────────────────────────────────────

export async function crearPlantillaAcreditacion(data: {
  nombre: string;
  tipo: string;
  descripcion: string;
  mandanteId?: string;
  requisitos?: Array<{
    nombreDocumento: string;
    categoria: string;
    aplicaA: string;
    obligatorio: boolean;
    codigoDocumento?: string;
    documentoRequeridoEmpresaId?: string;
    documentoTipoTrabajadorId?: string;
  }>;
}) {
  const empresaId = await getEmpresaId();

  if (data.mandanteId) {
    const mandante = await prisma.mandanteAcreditacion.findFirst({
      where: { id: data.mandanteId, empresaId },
    });
    if (!mandante) throw new Error("Mandante not found or not authorized");
  }

  return prisma.plantillaAcreditacion.create({
    data: {
      nombre: data.nombre,
      tipo: data.tipo,
      descripcion: data.descripcion,
      empresa: { connect: { id: empresaId } },
      ...(data.mandanteId && { mandante: { connect: { id: data.mandanteId } } }),
      origen: "nextprev",
      activa: true,
      version: 1,
      ...(data.requisitos && data.requisitos.length > 0
        ? {
            requisitos: {
              create: data.requisitos.map((r, index) => ({
                nombreDocumento: r.nombreDocumento,
                codigoDocumento: r.codigoDocumento ?? buildCodigoDocumento(r.nombreDocumento, r.categoria, r.aplicaA),
                categoria: r.categoria,
                aplicaA: r.aplicaA,
                obligatorio: r.obligatorio,
                documentoRequeridoEmpresaId: r.documentoRequeridoEmpresaId,
                documentoTipoTrabajadorId: r.documentoTipoTrabajadorId,
                orden: index + 1,
                activo: true,
              })),
            },
          }
        : {}),
    },
    include: { mandante: true, requisitos: true },
  });
}

export async function actualizarPlantillaAcreditacion(data: {
  id: string;
  nombre: string;
  tipo: string;
  descripcion: string;
  mandanteId?: string;
  requisitos: Array<{
    id?: string;
    nombreDocumento: string;
    categoria: string;
    aplicaA: string;
    obligatorio: boolean;
    codigoDocumento?: string;
    documentoRequeridoEmpresaId?: string | null;
    documentoTipoTrabajadorId?: string | null;
  }>;
}) {
  const empresaId = await getEmpresaId();

  const plantilla = await prisma.plantillaAcreditacion.findFirst({
    where: { id: data.id, empresaId },
    include: { requisitos: true },
  });

  if (!plantilla) throw new Error("Plantilla not found or not authorized");

  if (data.mandanteId) {
    const mandante = await prisma.mandanteAcreditacion.findFirst({
      where: { id: data.mandanteId, empresaId },
    });
    if (!mandante) throw new Error("Mandante not found or not authorized");
  }

  const requisitosLimpios = data.requisitos
    .map((r) => ({
      ...r,
      nombreDocumento: r.nombreDocumento.trim(),
    }))
    .filter((r) => r.nombreDocumento.length > 0);

  await prisma.$transaction(async (tx) => {
    await tx.plantillaAcreditacion.update({
      where: { id: data.id },
      data: {
        nombre: data.nombre,
        tipo: data.tipo,
        descripcion: data.descripcion,
        ...(data.mandanteId
          ? { mandante: { connect: { id: data.mandanteId } } }
          : { mandante: { disconnect: true } }),
      },
    });

    const existentes = await tx.requisitoPlantillaAcreditacion.findMany({
      where: { plantillaId: data.id },
      select: { id: true },
    });

    const existentesIds = new Set(existentes.map((r) => r.id));
    const incomingIds = new Set(
      requisitosLimpios
        .map((r) => r.id)
        .filter((id): id is string => typeof id === "string" && id.length > 0)
    );

    const idsEliminar = Array.from(existentesIds).filter((id) => !incomingIds.has(id));

    if (idsEliminar.length > 0) {
      await tx.requisitoPlantillaAcreditacion.deleteMany({
        where: { id: { in: idsEliminar }, plantillaId: data.id },
      });
    }

    for (let index = 0; index < requisitosLimpios.length; index++) {
      const req = requisitosLimpios[index];
      if (req.id && existentesIds.has(req.id)) {
        await tx.requisitoPlantillaAcreditacion.update({
          where: { id: req.id },
          data: {
            nombreDocumento: req.nombreDocumento,
            codigoDocumento: req.codigoDocumento ?? buildCodigoDocumento(req.nombreDocumento, req.categoria, req.aplicaA),
            categoria: req.categoria,
            aplicaA: req.aplicaA,
            obligatorio: req.obligatorio,
            documentoRequeridoEmpresaId: req.documentoRequeridoEmpresaId ?? null,
            documentoTipoTrabajadorId: req.documentoTipoTrabajadorId ?? null,
            orden: index + 1,
            activo: true,
          },
        });
      } else {
        await tx.requisitoPlantillaAcreditacion.create({
          data: {
            plantillaId: data.id,
            nombreDocumento: req.nombreDocumento,
            codigoDocumento: req.codigoDocumento ?? buildCodigoDocumento(req.nombreDocumento, req.categoria, req.aplicaA),
            categoria: req.categoria,
            aplicaA: req.aplicaA,
            obligatorio: req.obligatorio,
            documentoRequeridoEmpresaId: req.documentoRequeridoEmpresaId ?? null,
            documentoTipoTrabajadorId: req.documentoTipoTrabajadorId ?? null,
            orden: index + 1,
            activo: true,
          },
        });
      }
    }
  });

  return prisma.plantillaAcreditacion.findUnique({
    where: { id: data.id },
    include: {
      mandante: true,
      requisitos: { orderBy: { orden: "asc" } },
      _count: { select: { requisitos: true } },
    },
  });
}

export async function duplicarPlantillaAcreditacion(id: string) {
  const empresaId = await getEmpresaId();

  const plantilla = await prisma.plantillaAcreditacion.findUnique({
    where: { id },
    include: { requisitos: true },
  });

  if (!plantilla || plantilla.empresaId !== empresaId) throw new Error("Plantilla not found or not authorized");

  const newPlantilla = await prisma.plantillaAcreditacion.create({
    data: {
      nombre: `${plantilla.nombre} (copia)`,
      tipo: plantilla.tipo,
      descripcion: plantilla.descripcion,
      origen: plantilla.origen,
      activa: false,
      version: plantilla.version + 1,
      empresaId,
      mandanteId: plantilla.mandanteId,
      requisitos: {
        create: plantilla.requisitos.map((r) => ({
          nombreDocumento: r.nombreDocumento,
          codigoDocumento: r.codigoDocumento,
          documentoRequeridoEmpresaId: r.documentoRequeridoEmpresaId,
          documentoTipoTrabajadorId: r.documentoTipoTrabajadorId,
          categoria: r.categoria,
          aplicaA: r.aplicaA,
          obligatorio: r.obligatorio,
          permiteMultiples: r.permiteMultiples,
          requiereVencimiento: r.requiereVencimiento,
          requiereRevisionManual: r.requiereRevisionManual,
          orden: r.orden,
          observacionAyuda: r.observacionAyuda,
          activo: r.activo,
        })),
      },
    },
    include: { mandante: true, requisitos: true },
  });

  return newPlantilla;
}

export async function activarDesactivarPlantillaAcreditacion(id: string, activa: boolean) {
  const empresaId = await getEmpresaId();

  const plantilla = await prisma.plantillaAcreditacion.findUnique({
    where: { id },
  });

  if (!plantilla || plantilla.empresaId !== empresaId) throw new Error("Plantilla not found or not authorized");

  return prisma.plantillaAcreditacion.update({
    where: { id },
    data: { activa },
    include: { mandante: true, requisitos: true },
  });
}

// ─────────────────────────────────────────────────────────────────────
// ACREDITACIONES — ESCRITURA
// ─────────────────────────────────────────────────────────────────────

export async function crearAcreditacion(data: {
  mandanteId: string;
  plantillaId: string;
  nombreProyecto?: string;
  obraFaena?: string;
  trabajadorIds?: string[];
  vehiculoIds?: string[];
}) {
  const context = await getContext();
  const empresaId = context.empresaId;
  const usuarioId = context.usuarioId;

  // Validaciones
  const mandante = await prisma.mandanteAcreditacion.findFirst({
    where: { id: data.mandanteId, empresaId },
  });
  if (!mandante) throw new Error("Mandante not found");

  const plantilla = await prisma.plantillaAcreditacion.findFirst({
    where: {
      id: data.plantillaId,
      empresaId,
      OR: [{ mandanteId: data.mandanteId }, { mandante: null }],
    },
    include: { requisitos: true },
  });
  if (!plantilla) throw new Error("Plantilla not found");

  const trabajadorIds = Array.from(new Set(data.trabajadorIds ?? []));
  const vehiculoIds = Array.from(new Set(data.vehiculoIds ?? []));

  if (trabajadorIds.length > 0) {
    const workers = await prisma.trabajador.count({
      where: { id: { in: trabajadorIds }, empresaId },
    });
    if (workers !== trabajadorIds.length) {
      throw new Error("Trabajadores invalidos para la empresa");
    }
  }

  if (vehiculoIds.length > 0) {
    const vehiculos = await prisma.vehiculo.count({
      where: { id: { in: vehiculoIds }, empresaId },
    });
    if (vehiculos !== vehiculoIds.length) {
      throw new Error("Vehiculos invalidos para la empresa");
    }
  }

  const trabajadoresData = trabajadorIds.length > 0
    ? await prisma.trabajador.findMany({
        where: { id: { in: trabajadorIds }, empresaId },
        select: { id: true, nombres: true, apellidos: true },
      })
    : [];

  const vehiculosData = vehiculoIds.length > 0
    ? await prisma.vehiculo.findMany({
        where: { id: { in: vehiculoIds }, empresaId },
        select: { id: true, patente: true, modelo: true },
      })
    : [];

  const requisitosEmpresaCatalogo = plantilla.requisitos.filter((req) => req.aplicaA === "empresa");
  const requisitosTrabajadorCatalogo = plantilla.requisitos.filter((req) => req.aplicaA === "trabajador");

  const documentoRequeridoIds = Array.from(
    new Set(
      requisitosEmpresaCatalogo
        .map((req) => req.documentoRequeridoEmpresaId)
        .filter((id): id is string => Boolean(id))
    )
  );

  const tipoTrabajadorIds = Array.from(
    new Set(
      requisitosTrabajadorCatalogo
        .map((req) => req.documentoTipoTrabajadorId)
        .filter((id): id is string => Boolean(id))
    )
  );

  const [documentosEmpresaCatalogo, documentosTrabajadorCatalogo, tiposTrabajadorCatalogo] = await Promise.all([
    prisma.documentoEmpresa.findMany({
      where: {
        empresaId,
        OR: [
          ...(documentoRequeridoIds.length > 0
            ? [{ documentoRequeridoId: { in: documentoRequeridoIds } }]
            : []),
          {
            nombre: {
              in: requisitosEmpresaCatalogo.map((req) => req.nombreDocumento),
            },
          },
          {
            tipo: {
              in: requisitosEmpresaCatalogo
                .map((req) => req.codigoDocumento)
                .filter((value): value is string => Boolean(value)),
            },
          },
        ],
      },
      select: {
        id: true,
        documentoRequeridoId: true,
        nombre: true,
        tipo: true,
        estado: true,
        archivoUrl: true,
        archivoNombre: true,
        fechaEmision: true,
        fechaVencimiento: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
    }),
    trabajadorIds.length > 0
      ? prisma.trabajadorDocumento.findMany({
          where: {
            empresaId,
            trabajadorId: { in: trabajadorIds },
            esVigente: true,
          },
          select: {
            id: true,
            trabajadorId: true,
            nombre: true,
            tipo: true,
            estado: true,
            archivoUrl: true,
            archivoNombre: true,
            fechaEmision: true,
            fechaVencimiento: true,
            updatedAt: true,
          },
          orderBy: { updatedAt: "desc" },
        })
      : Promise.resolve([]),
    tipoTrabajadorIds.length > 0
      ? prisma.documentoTipoTrabajador.findMany({
          where: { empresaId, id: { in: tipoTrabajadorIds } },
          select: { id: true, codigo: true, nombre: true },
        })
      : Promise.resolve([]),
  ]);

  const tipoTrabajadorById = new Map(tiposTrabajadorCatalogo.map((doc) => [doc.id, doc]));

  const docsEmpresaByRequeridoId = new Map<string, (typeof documentosEmpresaCatalogo)[number]>();
  for (const doc of documentosEmpresaCatalogo) {
    if (doc.documentoRequeridoId && !docsEmpresaByRequeridoId.has(doc.documentoRequeridoId)) {
      docsEmpresaByRequeridoId.set(doc.documentoRequeridoId, doc);
    }
  }

  const docsTrabajadorByTrabajador = new Map<string, Array<(typeof documentosTrabajadorCatalogo)[number]>>();
  for (const doc of documentosTrabajadorCatalogo) {
    const existing = docsTrabajadorByTrabajador.get(doc.trabajadorId) ?? [];
    existing.push(doc);
    docsTrabajadorByTrabajador.set(doc.trabajadorId, existing);
  }

  const documentosCreate: Array<{
    requisitoId: string;
    nombreDocumento: string;
    categoria: string;
    obligatorio: boolean;
    titularTipo: string;
    titularId?: string;
    titularNombre?: string;
    estado: "faltante" | "completo" | "vencido";
    fuenteTipo?: string;
    fuenteId?: string;
    archivoUrl?: string;
    archivoNombre?: string;
    fechaEmision?: Date;
    fechaVencimiento?: Date;
  }> = [];

  const seenKeys = new Set<string>();

  for (const req of plantilla.requisitos) {
    if (!req.activo) continue;

    const keyEmpresa = `${req.id}::empresa::__empresa__`;

    if (req.aplicaA === "empresa") {
      const sourceEmpresa = req.documentoRequeridoEmpresaId
        ? docsEmpresaByRequeridoId.get(req.documentoRequeridoEmpresaId) ?? null
        : documentosEmpresaCatalogo.find((doc) => {
            const byCode = req.codigoDocumento && normalizeText(doc.tipo) === normalizeText(req.codigoDocumento);
            const byName = normalizeText(doc.nombre) === normalizeText(req.nombreDocumento);
            return Boolean(byCode || byName);
          }) ?? null;

      const estadoEmpresa = resolveEstadoDesdeFuente({
        estado: sourceEmpresa?.estado,
        fechaVencimiento: sourceEmpresa?.fechaVencimiento,
      });

      if (!seenKeys.has(keyEmpresa)) {
        seenKeys.add(keyEmpresa);
        documentosCreate.push({
          requisitoId: req.id,
          nombreDocumento: req.nombreDocumento,
          categoria: req.categoria,
          obligatorio: req.obligatorio,
          titularTipo: "empresa",
          estado: sourceEmpresa ? estadoEmpresa : "faltante",
          fuenteTipo: sourceEmpresa ? "documento_empresa" : undefined,
          fuenteId: sourceEmpresa?.id,
          archivoUrl: sourceEmpresa?.archivoUrl ?? undefined,
          archivoNombre: sourceEmpresa?.archivoNombre ?? undefined,
          fechaEmision: sourceEmpresa?.fechaEmision ?? undefined,
          fechaVencimiento: sourceEmpresa?.fechaVencimiento ?? undefined,
        });
      }

      continue;
    }

    if (req.aplicaA === "trabajador") {
      for (const trabajador of trabajadoresData) {
        const keyTrabajador = `${req.id}::trabajador::${trabajador.id}`;
        if (seenKeys.has(keyTrabajador)) continue;

        const docsTrabajador = docsTrabajadorByTrabajador.get(trabajador.id) ?? [];
        const tipoTrabajador = req.documentoTipoTrabajadorId
          ? tipoTrabajadorById.get(req.documentoTipoTrabajadorId)
          : null;

        const sourceTrabajador = docsTrabajador.find((doc) => {
          if (tipoTrabajador) {
            const matchTipoCodigo = normalizeText(doc.tipo) === normalizeText(tipoTrabajador.codigo);
            const matchTipoNombre = normalizeText(doc.tipo) === normalizeText(tipoTrabajador.nombre);
            const matchNombre = normalizeText(doc.nombre) === normalizeText(tipoTrabajador.nombre);
            if (matchTipoCodigo || matchTipoNombre || matchNombre) return true;
          }

          if (req.codigoDocumento && normalizeText(doc.tipo) === normalizeText(req.codigoDocumento)) {
            return true;
          }

          return normalizeText(doc.nombre) === normalizeText(req.nombreDocumento)
            || normalizeText(doc.tipo) === normalizeText(req.nombreDocumento);
        }) ?? null;

        const estadoTrabajador = resolveEstadoDesdeFuente({
          estado: sourceTrabajador?.estado,
          fechaVencimiento: sourceTrabajador?.fechaVencimiento,
        });

        seenKeys.add(keyTrabajador);
        documentosCreate.push({
          requisitoId: req.id,
          nombreDocumento: req.nombreDocumento,
          categoria: req.categoria,
          obligatorio: req.obligatorio,
          titularTipo: "trabajador",
          titularId: trabajador.id,
          titularNombre: `${trabajador.nombres} ${trabajador.apellidos}`.trim(),
          estado: sourceTrabajador ? estadoTrabajador : "faltante",
          fuenteTipo: sourceTrabajador ? "documento_trabajador" : undefined,
          fuenteId: sourceTrabajador?.id,
          archivoUrl: sourceTrabajador?.archivoUrl ?? undefined,
          archivoNombre: sourceTrabajador?.archivoNombre ?? undefined,
          fechaEmision: sourceTrabajador?.fechaEmision ?? undefined,
          fechaVencimiento: sourceTrabajador?.fechaVencimiento ?? undefined,
        });
      }
      continue;
    }

    for (const vehiculo of vehiculosData) {
      const keyVehiculo = `${req.id}::vehiculo::${vehiculo.id}`;
      if (seenKeys.has(keyVehiculo)) continue;
      seenKeys.add(keyVehiculo);
      documentosCreate.push({
        requisitoId: req.id,
        nombreDocumento: req.nombreDocumento,
        categoria: req.categoria,
        obligatorio: req.obligatorio,
        titularTipo: "vehiculo",
        titularId: vehiculo.id,
        titularNombre: `${vehiculo.modelo} (${vehiculo.patente})`,
        estado: "faltante",
      });
    }
  }

  // Crear acreditación
  const acreditacion = await prisma.acreditacion.create({
    data: {
      empresaId,
      mandanteId: data.mandanteId,
      plantillaId: data.plantillaId,
      nombreProyecto: data.nombreProyecto,
      obraFaena: data.obraFaena,
      estado: "en_preparacion",

      // Agregar trabajadores
      ...(trabajadorIds.length > 0 && {
        trabajadores: {
          create: trabajadorIds.map((wId) => ({
            trabajadorId: wId,
          })),
        },
      }),

      // Agregar vehículos
      ...(vehiculoIds.length > 0 && {
        vehiculos: {
          create: vehiculoIds.map((vId) => ({
            vehiculoId: vId,
          })),
        },
      }),

      // Crear documentos desde los requisitos de la plantilla
      documentos: {
        create: documentosCreate,
      },

      // Registrar en historial
      historial: {
        create: {
          accion: "crear",
          detalle: `Acreditación creada desde plantilla "${plantilla.nombre}"`,
          usuarioId: usuarioId,
        },
      },
    },
    include: {
      mandante: true,
      plantilla: true,
      documentos: true,
      trabajadores: { include: { trabajador: true } },
      vehiculos: { include: { vehiculo: true } },
    },
  });

  return acreditacion;
}

export async function actualizarEstadoAcreditacion(id: string, estado: EstadoAcreditacion, comentario?: string) {
  const context = await getContext();
  const empresaId = context.empresaId;

  const acreditacion = await prisma.acreditacion.findFirst({
    where: { id, empresaId },
  });

  if (!acreditacion) throw new Error("Acreditacion not found");

  const updated = await prisma.acreditacion.update({
    where: { id },
    data: {
      estado,
      historial: {
        create: {
          accion: "cambiar_estado",
          detalle: comentario,
          estadoAnterior: acreditacion.estado,
          estadoNuevo: estado,
          usuarioId: context.usuarioId,
        },
      },
    },
    include: {
      mandante: true,
      documentos: true,
      historial: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });

  return updated;
}

export async function generarDocumentosAcreditacion(acreditacionId: string) {
  const empresaId = await getEmpresaId();

  const acreditacion = await prisma.acreditacion.findFirst({
    where: { id: acreditacionId, empresaId },
    include: {
      plantilla: { include: { requisitos: { where: { activo: true }, orderBy: { orden: "asc" } } } },
      trabajadores: { include: { trabajador: { select: { id: true, nombres: true, apellidos: true } } } },
      vehiculos: { include: { vehiculo: { select: { id: true, patente: true, modelo: true } } } },
    },
  });

  if (!acreditacion) throw new Error("Acreditacion not found");

  const expectedDocs: Array<{
    requisitoId: string;
    nombreDocumento: string;
    categoria: string;
    obligatorio: boolean;
    titularTipo: string;
    titularId: string | null;
    titularNombre: string | null;
  }> = [];

  for (const req of acreditacion.plantilla.requisitos) {
    if (req.aplicaA === "empresa") {
      expectedDocs.push({
        requisitoId: req.id,
        nombreDocumento: req.nombreDocumento,
        categoria: req.categoria,
        obligatorio: req.obligatorio,
        titularTipo: "empresa",
        titularId: null,
        titularNombre: null,
      });
      continue;
    }

    if (req.aplicaA === "trabajador") {
      for (const tw of acreditacion.trabajadores) {
        expectedDocs.push({
          requisitoId: req.id,
          nombreDocumento: req.nombreDocumento,
          categoria: req.categoria,
          obligatorio: req.obligatorio,
          titularTipo: "trabajador",
          titularId: tw.trabajador.id,
          titularNombre: `${tw.trabajador.nombres} ${tw.trabajador.apellidos}`.trim(),
        });
      }
      continue;
    }

    for (const tv of acreditacion.vehiculos) {
      expectedDocs.push({
        requisitoId: req.id,
        nombreDocumento: req.nombreDocumento,
        categoria: req.categoria,
        obligatorio: req.obligatorio,
        titularTipo: "vehiculo",
        titularId: tv.vehiculo.id,
        titularNombre: `${tv.vehiculo.modelo} (${tv.vehiculo.patente})`,
      });
    }
  }

  const existing = await prisma.documentoAcreditacion.findMany({
    where: { acreditacionId },
    select: { id: true, requisitoId: true, titularTipo: true, titularId: true },
  });

  const toKey = (doc: { requisitoId: string; titularTipo: string; titularId: string | null }) =>
    `${doc.requisitoId}::${doc.titularTipo}::${doc.titularId ?? "__null__"}`;

  const existingByKey = new Map(existing.map((doc) => [toKey(doc), doc]));
  const expectedKeys = new Set(expectedDocs.map((doc) => toKey(doc)));

  const creates = expectedDocs.filter((doc) => !existingByKey.has(toKey(doc))).map((doc) => ({
    acreditacionId,
    requisitoId: doc.requisitoId,
    titularTipo: doc.titularTipo,
    titularId: doc.titularId,
    titularNombre: doc.titularNombre,
    nombreDocumento: doc.nombreDocumento,
    categoria: doc.categoria,
    obligatorio: doc.obligatorio,
    estado: "faltante" as const,
  }));

  const deletes = existing
    .filter((doc) => !expectedKeys.has(toKey(doc)))
    .map((doc) => doc.id);

  const createResult = creates.length > 0
    ? await prisma.documentoAcreditacion.createMany({ data: creates })
    : { count: 0 };

  if (deletes.length > 0) {
    await prisma.documentoAcreditacion.deleteMany({ where: { id: { in: deletes } } });
  }

  return {
    created: createResult.count,
    totalEsperados: expectedDocs.length,
    eliminados: deletes.length,
  };
}
