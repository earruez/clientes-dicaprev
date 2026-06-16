"use server";

import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions-matrix";
import { requireAuth, requirePermission } from "@/server/auth/permissions";
import { calcularEstadoDocumento, esDocumentoAplicable } from "@/lib/documentacion/cumplimiento-documento";
import {
  OBLIGACIONES_EMPRESA_BASE,
  esObligacionEmpresaAplicable,
  type TipoObligacionEmpresa,
} from "@/lib/obligaciones-empresa";
import type { EstadoObligacion } from "../types";

export type EstadoDocumentalReal =
  | "Vigente"
  | "Por vencer"
  | "Vencido"
  | "Pendiente de carga"
  | "No aplica";

export type EstadoManualObligacion = "cumple" | "no_cumple" | "en_revision";

export type ObligacionCumplimientoReal = {
  id: string;
  obligacionClave: string;
  documentoRequeridoId: string | null;
  documentoEmpresaId: string | null;
  nombre: string;
  tipo: string;
  descripcion: string;
  frecuencia: string;
  responsable: string;
  vencimiento?: string;
  tipoObligacion: TipoObligacionEmpresa;
  requiereDocumento: boolean;
  aplicaDesdeTrabajadores: number | null;
  aplicaHastaTrabajadores: number | null;
  aplica: boolean;
  estadoDocumental: EstadoDocumentalReal;
  cumple: boolean;
  estadoObligacion: EstadoObligacion;
  cumplimientoGlobal: number;
  estadosPorCentro: Record<string, EstadoObligacion>;
  fuenteTipo: "documento" | "manual" | "mixta";
  ultimoArchivo: string | null;
  fechaActualizacion: string | null;
  manualEstado: EstadoManualObligacion | null;
  manualCumple: boolean | null;
  manualObservacion: string | null;
};

export type CumplimientoEmpresaPayload = {
  empresaNombre: string;
  cantidadTrabajadores: number;
  centros: Array<{ id: string; nombre: string }>;
  noAplican: number;
  puedeEditarEstado: boolean;
  obligaciones: ObligacionCumplimientoReal[];
};

export type EstadoObligacionEmpresaRow = {
  id: string;
  obligacionClave: string;
  cumple: boolean;
  estado: string;
  observacion: string | null;
  actualizadoPorId: string | null;
  createdAt: string;
  updatedAt: string;
};

function normalizarEstadoDocumento(valor?: string | null): EstadoDocumentalReal {
  switch ((valor ?? "").toLowerCase()) {
    case "vigente":
      return "Vigente";
    case "por vencer":
    case "por_vencer":
      return "Por vencer";
    case "vencido":
      return "Vencido";
    case "no aplica":
    case "no_aplica":
      return "No aplica";
    case "pendiente de carga":
    case "pendiente_carga":
      return "Pendiente de carga";
    default:
      return "Pendiente de carga";
  }
}

function normalizarTexto(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function resolverTipoObligacion(nombre: string): {
  tipoObligacion: TipoObligacionEmpresa;
  requiereDocumento: boolean;
} {
  const n = normalizarTexto(nombre);

  const exacta = OBLIGACIONES_EMPRESA_BASE.find((ob) => normalizarTexto(ob.nombre) === n);
  if (exacta) {
    return {
      tipoObligacion: exacta.tipoObligacion,
      requiereDocumento: exacta.requiereDocumento,
    };
  }

  const aproximada = OBLIGACIONES_EMPRESA_BASE.find((ob) => {
    const obn = normalizarTexto(ob.nombre);
    return obn.includes(n) || n.includes(obn);
  });
  if (aproximada) {
    return {
      tipoObligacion: aproximada.tipoObligacion,
      requiereDocumento: aproximada.requiereDocumento,
    };
  }

  if (
    n.includes("comite paritario") ||
    n.includes("departamento de prevencion") ||
    n.includes("encargado") ||
    n.includes("reglamento interno")
  ) {
    return { tipoObligacion: "mixta", requiereDocumento: true };
  }

  return { tipoObligacion: "documental", requiereDocumento: true };
}

function tipoDesdeCategoria(categoria: string): string {
  switch (categoria) {
    case "legales_empresa":
      return "Legal empresa";
    case "laborales_previsionales":
      return "Laboral / previsional";
    case "mutualidad_ley_16744":
      return "Mutualidad / Ley 16.744";
    case "protocolos":
      return "Protocolos";
    case "plantillas_formatos":
      return "Plantilla / formato";
    case "sst":
    default:
      return "SST";
  }
}

function responsablePorDefecto(tipoObligacion: TipoObligacionEmpresa): string {
  if (tipoObligacion === "estructural") return "Gestion / Administracion";
  if (tipoObligacion === "mixta") return "Prevencion / RRHH";
  return "Prevencion";
}

function estadoDesdeDocumental(
  estadoDocumental: EstadoDocumentalReal,
  aplica: boolean
): { cumpleDocumento: boolean; estadoObligacion: EstadoObligacion; cumplimientoGlobal: number } {
  if (!aplica) {
    return { cumpleDocumento: false, estadoObligacion: "no_aplica", cumplimientoGlobal: 0 };
  }

  if (estadoDocumental === "Vigente") {
    return { cumpleDocumento: true, estadoObligacion: "cumplida", cumplimientoGlobal: 100 };
  }

  if (estadoDocumental === "Por vencer") {
    return { cumpleDocumento: true, estadoObligacion: "con_brechas", cumplimientoGlobal: 70 };
  }

  return { cumpleDocumento: false, estadoObligacion: "no_cumplida", cumplimientoGlobal: 0 };
}

function estadoManualPorDefecto(aplica: boolean): EstadoManualObligacion {
  if (!aplica) return "no_cumple";
  return "en_revision";
}

function combinarEstado(
  tipoObligacion: TipoObligacionEmpresa,
  aplica: boolean,
  estadoDocumental: { cumpleDocumento: boolean; estadoObligacion: EstadoObligacion; cumplimientoGlobal: number },
  estadoManual: EstadoManualObligacion
): { cumple: boolean; estadoObligacion: EstadoObligacion; cumplimientoGlobal: number; fuenteTipo: "documento" | "manual" | "mixta" } {
  if (!aplica) {
    return {
      cumple: false,
      estadoObligacion: "no_aplica",
      cumplimientoGlobal: 0,
      fuenteTipo: tipoObligacion === "documental" ? "documento" : tipoObligacion === "mixta" ? "mixta" : "manual",
    };
  }

  if (tipoObligacion === "documental") {
    return {
      cumple: estadoDocumental.cumpleDocumento,
      estadoObligacion: estadoDocumental.estadoObligacion,
      cumplimientoGlobal: estadoDocumental.cumplimientoGlobal,
      fuenteTipo: "documento",
    };
  }

  if (tipoObligacion === "estructural") {
    if (estadoManual === "cumple") {
      return { cumple: true, estadoObligacion: "cumplida", cumplimientoGlobal: 100, fuenteTipo: "manual" };
    }
    if (estadoManual === "en_revision") {
      return { cumple: false, estadoObligacion: "con_brechas", cumplimientoGlobal: 50, fuenteTipo: "manual" };
    }
    return { cumple: false, estadoObligacion: "no_cumplida", cumplimientoGlobal: 0, fuenteTipo: "manual" };
  }

  // Mixta: cumple solo si documento cumple + estructura manual cumple.
  if (!estadoDocumental.cumpleDocumento) {
    return { cumple: false, estadoObligacion: "no_cumplida", cumplimientoGlobal: 0, fuenteTipo: "mixta" };
  }

  if (estadoManual === "cumple") {
    return { cumple: true, estadoObligacion: "cumplida", cumplimientoGlobal: 100, fuenteTipo: "mixta" };
  }

  if (estadoManual === "en_revision") {
    return { cumple: false, estadoObligacion: "con_brechas", cumplimientoGlobal: 60, fuenteTipo: "mixta" };
  }

  return { cumple: false, estadoObligacion: "no_cumplida", cumplimientoGlobal: 0, fuenteTipo: "mixta" };
}

function puedeEditarCumplimientoPorRol(role: string) {
  if (role === "SUPERADMIN") return true;
  const canManageCumplimiento = PERMISSIONS.canManageCumplimiento.some((r) => r === role);
  const canManageDocumentacion = PERMISSIONS.canManageDocumentacion.some((r) => r === role);
  return canManageCumplimiento || canManageDocumentacion;
}

export async function getEstadosObligacionesEmpresa(): Promise<EstadoObligacionEmpresaRow[]> {
  const context = await requirePermission("canReadCumplimiento");

  const rows = await prisma.obligacionEmpresaEstado.findMany({
    where: { empresaId: context.empresaId },
    orderBy: { updatedAt: "desc" },
  });

  return rows.map((row) => ({
    id: row.id,
    obligacionClave: row.obligacionClave,
    cumple: row.cumple,
    estado: row.estado,
    observacion: row.observacion,
    actualizadoPorId: row.actualizadoPorId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export async function actualizarEstadoObligacionEmpresa(
  clave: string,
  data: { estado: EstadoManualObligacion; observacion?: string | null }
) {
  const context = await requireAuth();

  if (!puedeEditarCumplimientoPorRol(context.rol)) {
    throw new Error("No autorizado para actualizar cumplimiento.");
  }

  const estado = data.estado;
  if (!["cumple", "no_cumple", "en_revision"].includes(estado)) {
    throw new Error("Estado manual de obligacion no valido.");
  }

  const cumple = estado === "cumple";
  const observacion = (data.observacion ?? "").trim() || null;

  const saved = await prisma.obligacionEmpresaEstado.upsert({
    where: {
      empresaId_obligacionClave: {
        empresaId: context.empresaId,
        obligacionClave: clave,
      },
    },
    create: {
      empresaId: context.empresaId,
      obligacionClave: clave,
      cumple,
      estado,
      observacion,
      actualizadoPorId: context.usuarioId,
    },
    update: {
      cumple,
      estado,
      observacion,
      actualizadoPorId: context.usuarioId,
    },
  });

  return {
    id: saved.id,
    obligacionClave: saved.obligacionClave,
    cumple: saved.cumple,
    estado: saved.estado,
    observacion: saved.observacion,
    updatedAt: saved.updatedAt.toISOString(),
  };
}

export async function getObligacionesCumplimientoEmpresa(): Promise<CumplimientoEmpresaPayload> {
  const context = await requirePermission("canReadCumplimiento");

  const empresa = await prisma.empresa.findUnique({
    where: { id: context.empresaId },
    select: {
      nombre: true,
      cantidadTrabajadores: true,
    },
  });

  // If empresa is not found, return empty safe payload instead of throwing
  if (!empresa) {
    console.warn(`[cumplimiento] Empresa no encontrada para empresaId=${context.empresaId}. Retornando payload vacio.`);
    return {
      empresaNombre: "Empresa desconocida",
      cantidadTrabajadores: 0,
      centros: [],
      noAplican: 0,
      puedeEditarEstado: puedeEditarCumplimientoPorRol(context.rol),
      obligaciones: [],
    };
  }

  const cantidadTrabajadores = empresa.cantidadTrabajadores ?? 0;
  const centroUnico = { id: "empresa", nombre: empresa.nombre };

  const [requeridos, estadosManualRows] = await Promise.all([
    prisma.documentoRequeridoEmpresa.findMany({
      where: { activo: true },
      orderBy: { orden: "asc" },
      include: {
        documentos: {
          where: { empresaId: context.empresaId },
          orderBy: { updatedAt: "desc" },
          take: 1,
        },
      },
    }),
    prisma.obligacionEmpresaEstado.findMany({
      where: { empresaId: context.empresaId },
    }),
  ]);

  const estadoManualMap = new Map(estadosManualRows.map((r) => [r.obligacionClave, r]));

  const obligacionesDocumentales: ObligacionCumplimientoReal[] = requeridos.map((req) => {
    const obligacionClave = req.id;
    const doc = req.documentos[0] ?? null;
    const resolved = resolverTipoObligacion(req.nombre);

    const baseDocumento = {
      documentoEmpresaId: doc?.id ?? null,
      archivoNombre: doc?.archivoNombre ?? null,
      archivoUrl: doc?.archivoUrl ?? null,
      tieneVencimiento: doc?.tieneVencimiento ?? req.requiereVencimiento,
      fechaVencimiento: doc?.fechaVencimiento ? doc.fechaVencimiento.toISOString().slice(0, 10) : null,
      estado: normalizarEstadoDocumento(doc?.estado),
      aplicaDesdeTrabajadores: req.aplicaDesdeTrabajadores,
      aplicaHastaTrabajadores: req.aplicaHastaTrabajadores,
      esAdicional: false,
    } as const;

    const aplica = esDocumentoAplicable(baseDocumento, cantidadTrabajadores);
    const estadoDocumental = calcularEstadoDocumento(baseDocumento, cantidadTrabajadores) as EstadoDocumentalReal;
    const estadoDoc = estadoDesdeDocumental(estadoDocumental, aplica);

    const manualRow = estadoManualMap.get(obligacionClave);
    const manualEstado = (manualRow?.estado as EstadoManualObligacion | undefined) ?? estadoManualPorDefecto(aplica);

    const combinado = combinarEstado(resolved.tipoObligacion, aplica, estadoDoc, manualEstado);

    return {
      id: `req-${req.id}`,
      obligacionClave,
      documentoRequeridoId: req.id,
      documentoEmpresaId: doc?.id ?? null,
      nombre: req.nombre,
      tipo: tipoDesdeCategoria(req.categoria),
      descripcion: req.descripcion,
      frecuencia: req.periodicidadMeses ? `Cada ${req.periodicidadMeses} meses` : "Segun exigencia legal",
      responsable: responsablePorDefecto(resolved.tipoObligacion),
      vencimiento: doc?.fechaVencimiento?.toISOString().slice(0, 10),
      tipoObligacion: resolved.tipoObligacion,
      requiereDocumento: resolved.requiereDocumento,
      aplicaDesdeTrabajadores: req.aplicaDesdeTrabajadores,
      aplicaHastaTrabajadores: req.aplicaHastaTrabajadores,
      aplica,
      estadoDocumental,
      cumple: combinado.cumple,
      estadoObligacion: combinado.estadoObligacion,
      cumplimientoGlobal: combinado.cumplimientoGlobal,
      estadosPorCentro: { [centroUnico.id]: combinado.estadoObligacion },
      fuenteTipo: combinado.fuenteTipo,
      ultimoArchivo: doc?.archivoNombre ?? null,
      fechaActualizacion: doc?.updatedAt ? doc.updatedAt.toISOString() : manualRow?.updatedAt.toISOString() ?? null,
      manualEstado: resolved.tipoObligacion === "documental" ? null : manualEstado,
      manualCumple: resolved.tipoObligacion === "documental" ? null : manualEstado === "cumple",
      manualObservacion: resolved.tipoObligacion === "documental" ? null : manualRow?.observacion ?? null,
    };
  });

  const nombresExistentes = new Set(obligacionesDocumentales.map((o) => normalizarTexto(o.nombre)));

  // Obligaciones estructurales puras sin matriz documental asociada.
  const estructuralesPuras = OBLIGACIONES_EMPRESA_BASE
    .filter((ob) => ob.tipoObligacion === "estructural")
    .filter((ob) => !nombresExistentes.has(normalizarTexto(ob.nombre)))
    .map((ob): ObligacionCumplimientoReal => {
      const obligacionClave = ob.id;
      const manualRow = estadoManualMap.get(obligacionClave);
      const aplica = esObligacionEmpresaAplicable(ob, cantidadTrabajadores);
      const manualEstado = (manualRow?.estado as EstadoManualObligacion | undefined) ?? estadoManualPorDefecto(aplica);
      const estadoDoc = estadoDesdeDocumental(aplica ? "Pendiente de carga" : "No aplica", aplica);
      const combinado = combinarEstado(ob.tipoObligacion, aplica, estadoDoc, manualEstado);

      return {
        id: `manual-${ob.id}`,
        obligacionClave,
        documentoRequeridoId: null,
        documentoEmpresaId: null,
        nombre: ob.nombre,
        tipo: "Estructural",
        descripcion: ob.descripcion,
        frecuencia: "Revision manual",
        responsable: "Gestion / Administracion",
        tipoObligacion: ob.tipoObligacion,
        requiereDocumento: ob.requiereDocumento,
        aplicaDesdeTrabajadores: ob.aplicaDesdeTrabajadores,
        aplicaHastaTrabajadores: ob.aplicaHastaTrabajadores,
        aplica,
        estadoDocumental: aplica ? "Pendiente de carga" : "No aplica",
        cumple: combinado.cumple,
        estadoObligacion: combinado.estadoObligacion,
        cumplimientoGlobal: combinado.cumplimientoGlobal,
        estadosPorCentro: { [centroUnico.id]: combinado.estadoObligacion },
        fuenteTipo: combinado.fuenteTipo,
        ultimoArchivo: null,
        fechaActualizacion: manualRow?.updatedAt.toISOString() ?? null,
        manualEstado,
        manualCumple: manualEstado === "cumple",
        manualObservacion: manualRow?.observacion ?? null,
      };
    });

  const obligaciones = [...obligacionesDocumentales, ...estructuralesPuras];
  const noAplican = obligaciones.filter((o) => o.estadoObligacion === "no_aplica").length;

  return {
    empresaNombre: empresa.nombre,
    cantidadTrabajadores,
    centros: [centroUnico],
    noAplican,
    puedeEditarEstado: puedeEditarCumplimientoPorRol(context.rol),
    obligaciones,
  };
}
