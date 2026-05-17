"use server";

import { Prisma } from "@prisma/client";
import { calcularCumplimientoEmpresa } from "@/lib/documentacion/cumplimiento-empresa";
import {
  generarDocumentosFaltantesIA,
  type GenerarDocumentosFaltantesResultado,
} from "@/lib/documentacion/generacion-ia";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/auth/permissions";

type EstadoDocumento = "vigente" | "pendiente" | "vencido" | "por-vencer";

function getEstadoDocumento(fechaVencimiento?: Date | null): EstadoDocumento {
  if (!fechaVencimiento) return "vigente";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(fechaVencimiento);
  due.setHours(0, 0, 0, 0);

  const diffMs = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "vencido";
  if (diffDays <= 30) return "por-vencer";
  return "vigente";
}

export type ResumenEmpresaKpis = {
  totalCentros: number;
  totalAreas: number;
  totalCargos: number;
  totalTrabajadoresActivos: number;
  totalPosicionesDotacion: number;
  totalPosicionesCubiertas: number;
  totalVacantes: number;
  cumplimientoDocumentalEmpresa: number;
  documentosVigentes: number;
  documentosPendientes: number;
  documentosVencidos: number;
  documentosPorVencer: number;
};

export type ResumenEmpresaResponse = {
  empresa: {
    id: string;
    nombre: string;
    rut: string;
    razonSocial: string;
    direccion: string;
    giro: string;
    comuna: string;
    region: string;
  };
  activacion: {
    completada: boolean;
    pasoActual: number | null;
    completadaEn: string | null;
  };
  kpis: ResumenEmpresaKpis;
  cumplimiento: {
    porcentaje: number;
    totalAplicables: number;
    totalCumple: number;
    totalFaltantes: number;
    totalIncompletos: number;
  };
};

export async function getResumenEmpresa(): Promise<ResumenEmpresaResponse> {
  const { empresaId } = await requirePermission("canReadCumplimiento");

  const cumplimiento = await calcularCumplimientoEmpresa({ empresaId });

  const empresa = await prisma.empresa.findUnique({
    where: { id: empresaId },
    select: {
      id: true,
      nombre: true,
      rut: true,
      razonSocial: true,
      direccion: true,
      giro: true,
      activacionCompletada: true,
      activacionPasoActual: true,
      activacionCompletadaEn: true,
    },
  });

  if (!empresa) {
    throw new Error("No existe empresa configurada para resumen");
  }

  const [
    totalCentros,
    totalAreas,
    totalCargos,
    totalTrabajadoresActivos,
    posiciones,
    trabajadoresActivosConPosicion,
    requeridos,
    documentosEmpresa,
  ] = await Promise.all([
    prisma.centroTrabajo.count({ where: { empresaId } }),
    prisma.area.count({ where: { empresaId } }),
    prisma.cargo.count({ where: { empresaId } }),
    prisma.trabajador.count({ where: { empresaId, estado: "activo" } }),
    prisma.posicionDotacion.findMany({
      where: { empresaId, estado: { not: "inactiva" } },
      select: { id: true, cantidad: true },
    }),
    prisma.trabajador.findMany({
      where: {
        empresaId,
        estado: "activo",
        posicionDotacionId: { not: null },
      },
      select: { posicionDotacionId: true },
    }),
    prisma.documentoRequeridoEmpresa.findMany({
      where: { activo: true },
      select: { id: true },
      orderBy: { orden: "asc" },
    }),
    prisma.documentoEmpresa.findMany({
      where: { empresaId },
      select: {
        id: true,
        documentoRequeridoId: true,
        archivoNombre: true,
        archivoUrl: true,
        fechaVencimiento: true,
        updatedAt: true,
      },
      orderBy: [{ updatedAt: "desc" }],
    }),
  ]);

  const totalPosicionesDotacion = posiciones.reduce((acc, pos) => acc + pos.cantidad, 0);

  const activosAsignadosPorPosicion = trabajadoresActivosConPosicion.reduce(
    (acc, worker) => {
      const key = worker.posicionDotacionId;
      if (!key) return acc;
      acc.set(key, (acc.get(key) ?? 0) + 1);
      return acc;
    },
    new Map<string, number>(),
  );

  const totalPosicionesCubiertas = posiciones.reduce((acc, pos) => {
    const asignados = activosAsignadosPorPosicion.get(pos.id) ?? 0;
    return acc + Math.min(pos.cantidad, asignados);
  }, 0);

  const totalVacantes = Math.max(totalPosicionesDotacion - totalPosicionesCubiertas, 0);

  // Evaluacion documental por documento requerido activo.
  const latestByRequerido = new Map<string, (typeof documentosEmpresa)[number]>();
  for (const doc of documentosEmpresa) {
    if (!doc.documentoRequeridoId) continue;
    if (!latestByRequerido.has(doc.documentoRequeridoId)) {
      latestByRequerido.set(doc.documentoRequeridoId, doc);
    }
  }

  let documentosVigentes = 0;
  let documentosPendientes = 0;
  let documentosVencidos = 0;
  let documentosPorVencer = 0;

  for (const requerido of requeridos) {
    const doc = latestByRequerido.get(requerido.id);
    const hasFile = Boolean(doc && (doc.archivoNombre || doc.archivoUrl));

    if (!doc || !hasFile) {
      documentosPendientes += 1;
      continue;
    }

    const estado = getEstadoDocumento(doc.fechaVencimiento);
    if (estado === "vigente") documentosVigentes += 1;
    else if (estado === "vencido") documentosVencidos += 1;
    else if (estado === "por-vencer") documentosPorVencer += 1;
  }

  const totalRequeridos = requeridos.length;
  const cumplimientoDocumentalEmpresa =
    totalRequeridos > 0
      ? Math.round(((documentosVigentes + documentosPorVencer) / totalRequeridos) * 100)
      : 100;

  return {
    empresa: {
      id: empresa.id,
      nombre: empresa.nombre,
      rut: empresa.rut ?? "",
      razonSocial: empresa.razonSocial ?? empresa.nombre,
      direccion: empresa.direccion ?? "",
      giro: empresa.giro ?? "",
      comuna: "",
      region: "",
    },
    activacion: {
      completada: empresa.activacionCompletada,
      pasoActual: empresa.activacionPasoActual,
      completadaEn: empresa.activacionCompletadaEn?.toISOString() ?? null,
    },
    kpis: {
      totalCentros,
      totalAreas,
      totalCargos,
      totalTrabajadoresActivos,
      totalPosicionesDotacion,
      totalPosicionesCubiertas,
      totalVacantes,
      cumplimientoDocumentalEmpresa,
      documentosVigentes,
      documentosPendientes,
      documentosVencidos,
      documentosPorVencer,
    },
    cumplimiento: {
      porcentaje: cumplimiento.porcentajeCumplimiento,
      totalAplicables: cumplimiento.totalAplicables,
      totalCumple: cumplimiento.totalCumple,
      totalFaltantes: cumplimiento.totalFaltantes,
      totalIncompletos: cumplimiento.totalIncompletos,
    },
  };
}

export async function generarDocumentosFaltantes(input: { empresaId: string }): Promise<GenerarDocumentosFaltantesResultado> {
  const context = await requirePermission("canManageDocumentacion");

  if (input.empresaId !== context.empresaId) {
    throw new Error("Empresa invalida para generacion");
  }

  return generarDocumentosFaltantesIA({
    empresaId: context.empresaId,
    usuarioId: context.usuarioId,
    email: context.email,
  });
}

export type EventoActivacion =
  | "activacion_inicio"
  | "activacion_generar_docs"
  | "activacion_firma"
  | "activacion_completa";

export type PasoFunnelActivacion =
  | "inicio"
  | "generacion"
  | "firma"
  | "completado";

export type AnaliticaActivacionEmpresa = {
  totalUsuarios: number;
  porcentajeActivacionCompleta: number;
  tiempoPromedioActivacionMinutos: number;
  conversionEntreEtapas: {
    inicioAGeneracion: number;
    generacionAFirma: number;
    firmaACompletado: number;
  };
  tiempoPromedioPorEtapaMinutos: {
    inicioAGeneracion: number;
    generacionAFirma: number;
    firmaACompletado: number;
  };
  pasosDondeSeDetienen: Array<{
    paso: Exclude<PasoFunnelActivacion, "completado">;
    usuarios: number;
    porcentajeSobreInicio: number;
    porcentajeSobreEtapa: number;
  }>;
  funnel: Record<PasoFunnelActivacion, number>;
};

export async function guardarEstadoActivacionEmpresa(input: {
  empresaId: string;
  pasoActual: number;
  evento?: EventoActivacion;
  completada?: boolean;
  metadata?: unknown;
}): Promise<{ ok: true; pasoActual: number; completada: boolean } | { ok: false; error: string }> {
  const context = await requirePermission("canManageDocumentacion");

  if (input.empresaId !== context.empresaId) {
    return { ok: false, error: "Empresa invalida para actualizar activacion" };
  }

  const now = new Date();

  try {
    const result = await prisma.$transaction(async (tx) => {
      const empresa = await tx.empresa.findUnique({
        where: { id: context.empresaId },
        select: {
          activacionPasoActual: true,
          activacionCompletada: true,
          activacionCompletadaEn: true,
        },
      });

      if (!empresa) {
        throw new Error("No existe empresa para actualizar activacion");
      }

      const pasoActual = empresa.activacionPasoActual == null
        ? input.pasoActual
        : Math.max(empresa.activacionPasoActual, input.pasoActual);

      const completada = input.completada ?? empresa.activacionCompletada;
      const completadaEn = completada && !empresa.activacionCompletadaEn
        ? now
        : empresa.activacionCompletadaEn;

      await tx.empresa.update({
        where: { id: context.empresaId },
        data: {
          activacionPasoActual: pasoActual,
          activacionCompletada: completada,
          activacionCompletadaEn: completadaEn,
        },
      });

      const eventoExistente = input.evento
        ? await tx.activacionEvento.findFirst({
            where: {
              empresaId: context.empresaId,
              usuarioId: context.usuarioId,
              evento: input.evento,
            },
            select: { id: true },
          })
        : null;

      const debeRegistrarEvento = Boolean(input.evento) && !eventoExistente;

      if (debeRegistrarEvento && input.evento) {
        await tx.activacionEvento.create({
          data: {
            empresaId: context.empresaId,
            usuarioId: context.usuarioId,
            evento: input.evento,
            pasoActual,
            metadata: input.metadata as Prisma.InputJsonValue | undefined,
          },
        });
      }

      return {
        pasoActual,
        completada,
      };
    });

    return { ok: true, pasoActual: result.pasoActual, completada: result.completada };
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo actualizar la activacion";
    return { ok: false, error: message };
  }
}

export async function getAnaliticaActivacionEmpresa(): Promise<AnaliticaActivacionEmpresa> {
  const { empresaId } = await requirePermission("canReadCumplimiento");

  const [totalUsuarios, eventos] = await Promise.all([
    prisma.usuario.count({ where: { empresaId } }),
    prisma.activacionEvento.findMany({
      where: { empresaId },
      select: {
        evento: true,
        usuarioId: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const etapasPorUsuario = new Map<
    string,
    {
      inicio?: Date;
      generacion?: Date;
      firma?: Date;
      completado?: Date;
    }
  >();

  for (const evento of eventos) {
    if (!evento.usuarioId) continue;

    const registro = etapasPorUsuario.get(evento.usuarioId) ?? {};

    if (evento.evento === "activacion_inicio") {
      if (!registro.inicio) registro.inicio = evento.createdAt;
      etapasPorUsuario.set(evento.usuarioId, registro);
      continue;
    }

    if (evento.evento === "activacion_generar_docs") {
      if (!registro.generacion) registro.generacion = evento.createdAt;
      etapasPorUsuario.set(evento.usuarioId, registro);
      continue;
    }

    if (evento.evento === "activacion_firma") {
      if (!registro.firma) registro.firma = evento.createdAt;
      etapasPorUsuario.set(evento.usuarioId, registro);
      continue;
    }

    if (evento.evento === "activacion_completa") {
      if (!registro.completado) registro.completado = evento.createdAt;
      etapasPorUsuario.set(evento.usuarioId, registro);
    }
  }

  const usuariosInicio = new Set<string>();
  const usuariosGeneracion = new Set<string>();
  const usuariosFirma = new Set<string>();
  const usuariosCompletado = new Set<string>();

  for (const [usuarioId, etapas] of etapasPorUsuario) {
    if (etapas.inicio) usuariosInicio.add(usuarioId);
    if (etapas.generacion) usuariosGeneracion.add(usuarioId);
    if (etapas.firma) usuariosFirma.add(usuarioId);
    if (etapas.completado) usuariosCompletado.add(usuarioId);
  }

  const totalInicio = usuariosInicio.size;
  const totalGeneracion = usuariosGeneracion.size;
  const totalFirma = usuariosFirma.size;
  const totalCompletado = usuariosCompletado.size;

  const porcentajeActivacionCompleta = totalUsuarios > 0
    ? Number(((totalCompletado / totalUsuarios) * 100).toFixed(2))
    : 0;

  const obtenerPromedioMinutos = (valores: number[]) => {
    if (valores.length === 0) return 0;
    return Number((valores.reduce((sum, item) => sum + item, 0) / valores.length).toFixed(2));
  };

  const tiemposInicioAGeneracion = Array.from(etapasPorUsuario.values())
    .map((etapas) => {
      if (!etapas.inicio || !etapas.generacion) return null;
      return Math.max(etapas.generacion.getTime() - etapas.inicio.getTime(), 0) / 60000;
    })
    .filter((item): item is number => item !== null);

  const tiemposGeneracionAFirma = Array.from(etapasPorUsuario.values())
    .map((etapas) => {
      if (!etapas.generacion || !etapas.firma) return null;
      return Math.max(etapas.firma.getTime() - etapas.generacion.getTime(), 0) / 60000;
    })
    .filter((item): item is number => item !== null);

  const tiemposFirmaACompletado = Array.from(etapasPorUsuario.values())
    .map((etapas) => {
      if (!etapas.firma || !etapas.completado) return null;
      return Math.max(etapas.completado.getTime() - etapas.firma.getTime(), 0) / 60000;
    })
    .filter((item): item is number => item !== null);

  const duracionesMinutos = Array.from(etapasPorUsuario.values())
    .map((etapas) => {
      const inicio = etapas.inicio;
      const completado = etapas.completado;
      if (!inicio || !completado) return null;
      return Math.max(completado.getTime() - inicio.getTime(), 0) / 60000;
    })
    .filter((item): item is number => item !== null);

  const tiempoPromedioActivacionMinutos = obtenerPromedioMinutos(duracionesMinutos);

  const abandonoEnInicio = Math.max(totalInicio - totalGeneracion, 0);
  const abandonoEnGeneracion = Math.max(totalGeneracion - totalFirma, 0);
  const abandonoEnFirma = Math.max(totalFirma - totalCompletado, 0);

  const porcentajeSobreInicio = (usuarios: number) => {
    if (totalInicio === 0) return 0;
    return Number(((usuarios / totalInicio) * 100).toFixed(2));
  };

  const porcentajeSobreEtapa = (usuarios: number, totalEtapa: number) => {
    if (totalEtapa === 0) return 0;
    return Number(((usuarios / totalEtapa) * 100).toFixed(2));
  };

  const conversion = (siguiente: number, actual: number) => {
    if (actual === 0) return 0;
    return Number(((siguiente / actual) * 100).toFixed(2));
  };

  return {
    totalUsuarios,
    porcentajeActivacionCompleta,
    tiempoPromedioActivacionMinutos,
    conversionEntreEtapas: {
      inicioAGeneracion: conversion(totalGeneracion, totalInicio),
      generacionAFirma: conversion(totalFirma, totalGeneracion),
      firmaACompletado: conversion(totalCompletado, totalFirma),
    },
    tiempoPromedioPorEtapaMinutos: {
      inicioAGeneracion: obtenerPromedioMinutos(tiemposInicioAGeneracion),
      generacionAFirma: obtenerPromedioMinutos(tiemposGeneracionAFirma),
      firmaACompletado: obtenerPromedioMinutos(tiemposFirmaACompletado),
    },
    pasosDondeSeDetienen: [
      {
        paso: "inicio",
        usuarios: abandonoEnInicio,
        porcentajeSobreInicio: porcentajeSobreInicio(abandonoEnInicio),
        porcentajeSobreEtapa: porcentajeSobreEtapa(abandonoEnInicio, totalInicio),
      },
      {
        paso: "generacion",
        usuarios: abandonoEnGeneracion,
        porcentajeSobreInicio: porcentajeSobreInicio(abandonoEnGeneracion),
        porcentajeSobreEtapa: porcentajeSobreEtapa(abandonoEnGeneracion, totalGeneracion),
      },
      {
        paso: "firma",
        usuarios: abandonoEnFirma,
        porcentajeSobreInicio: porcentajeSobreInicio(abandonoEnFirma),
        porcentajeSobreEtapa: porcentajeSobreEtapa(abandonoEnFirma, totalFirma),
      },
    ],
    funnel: {
      inicio: totalInicio,
      generacion: totalGeneracion,
      firma: totalFirma,
      completado: totalCompletado,
    },
  };
}