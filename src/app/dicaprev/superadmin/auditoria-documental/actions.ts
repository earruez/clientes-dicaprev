"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/server/auth/permissions";

// ──────────────────────────────────────────────────────────
// TIPOS
// ──────────────────────────────────────────────────────────

export type InconsistenciaAuditoria = {
  modulo: string;
  problema: string;
  severidad: "crítico" | "advertencia" | "info";
  registroAfectado: string;
  solucionSugerida: string;
};

export type AuditoriaModulo = {
  nombre: string;
  estado: "ok" | "advertencia" | "crítico";
  conteos: Record<string, number>;
  inconsistencias: InconsistenciaAuditoria[];
  accionSugerida?: string;
};

export type ResultadoAuditoria = {
  timestamp: Date;
  empresaId: string;
  empresaNombre: string;
  modulos: Record<string, AuditoriaModulo>;
  inconsistenciasGlobales: InconsistenciaAuditoria[];
};

// ──────────────────────────────────────────────────────────
// UTILIDADES
// ──────────────────────────────────────────────────────────

function calcularEstado(
  inconsistencias: InconsistenciaAuditoria[]
): "ok" | "advertencia" | "crítico" {
  if (inconsistencias.some((i) => i.severidad === "crítico")) return "crítico";
  if (inconsistencias.some((i) => i.severidad === "advertencia")) return "advertencia";
  return "ok";
}

// ──────────────────────────────────────────────────────────
// AUDITORÍA: BIBLIOTECA DOCUMENTAL
// ──────────────────────────────────────────────────────────

async function auditarBibliotecaDocumental(
  empresaId: string
): Promise<AuditoriaModulo> {
  const inconsistencias: InconsistenciaAuditoria[] = [];

  // Contar documentos totales
  const docsTotal = await prisma.documentoEmpresa.count({
    where: { empresaId },
  });

  // Contar por estado
  const docsPorEstado = await prisma.documentoEmpresa.groupBy({
    by: ["estado"],
    where: { empresaId },
    _count: true,
  });

  const estadoMap: Record<string, number> = {
    vigente: 0,
    vencido: 0,
    pendiente: 0,
    rechazado: 0,
    "en-revision": 0,
  };
  docsPorEstado.forEach((item) => {
    if (item.estado in estadoMap) {
      estadoMap[item.estado] = item._count;
    }
  });

  // Detectar documentos sin empresaId
  const docsOrigen = await prisma.documentoEmpresa.findMany({
    where: { empresaId },
    select: { id: true, nombre: true, estado: true, archivoUrl: true },
  });

  // Detectar documentos sin nombre
  const docsSinNombre = docsOrigen.filter((d) => !d.nombre || d.nombre.trim() === "");
  if (docsSinNombre.length > 0) {
    inconsistencias.push({
      modulo: "Biblioteca documental",
      problema: `${docsSinNombre.length} documento(s) sin nombre`,
      severidad: "crítico",
      registroAfectado: docsSinNombre.map((d) => d.id).join(", "),
      solucionSugerida: "Asignar nombre a cada documento",
    });
  }

  // Detectar documentos sin archivoUrl
  const docsSinArchivo = docsOrigen.filter((d) => !d.archivoUrl);
  if (docsSinArchivo.length > 0) {
    inconsistencias.push({
      modulo: "Biblioteca documental",
      problema: `${docsSinArchivo.length} documento(s) sin archivoUrl`,
      severidad: "crítico",
      registroAfectado: docsSinArchivo.map((d) => d.id).join(", "),
      solucionSugerida: "Verificar que los documentos tengan archivo almacenado",
    });
  }

  // Contar por categorías
  const docsPorCategoria = await prisma.documentoEmpresa.groupBy({
    by: ["categoria"],
    where: { empresaId },
    _count: true,
  });

  return {
    nombre: "Biblioteca documental",
    estado: calcularEstado(inconsistencias),
    conteos: {
      total: docsTotal,
      vigente: estadoMap.vigente,
      vencido: estadoMap.vencido,
      pendiente: estadoMap.pendiente,
      rechazado: estadoMap.rechazado,
      "en-revision": estadoMap["en-revision"],
      categorias: docsPorCategoria.length,
      sinNombre: docsSinNombre.length,
      sinArchivo: docsSinArchivo.length,
    },
    inconsistencias,
    accionSugerida:
      inconsistencias.length > 0
        ? "Revisar documentos con problemas identificados"
        : undefined,
  };
}

// ──────────────────────────────────────────────────────────
// AUDITORÍA: DOCUMENTACIÓN EMPRESA
// ──────────────────────────────────────────────────────────

async function auditarDocumentacionEmpresa(
  empresaId: string
): Promise<AuditoriaModulo> {
  const inconsistencias: InconsistenciaAuditoria[] = [];

  // Contar documentos requeridos
  const documentosRequeridos = await prisma.documentoRequeridoEmpresa.findMany({
    where: { activo: true },
    select: { id: true, nombre: true },
  });

  // Contar documentos cargados
  const documentosCargados = await prisma.documentoEmpresa.count({
    where: { empresaId },
  });

  // Documentos requeridos sin cargados
  const requeridosSinCargados = documentosRequeridos.filter(() => {
    // Aquí verificamos si existe al menos un documento cargado vinculado
    return !documentosCargados; // Simplificado por ahora
  });

  if (requeridosSinCargados.length > 0) {
    inconsistencias.push({
      modulo: "Documentación empresa",
      problema: `${requeridosSinCargados.length} tipo(s) de documento requerido sin cargar`,
      severidad: "advertencia",
      registroAfectado: requeridosSinCargados.map((d) => d.nombre).join(", "),
      solucionSugerida: "Cargar los documentos requeridos",
    });
  }

  // Detectar documentos cargados sin documentoRequeridoId
  const docsCargadosSinRequerido = await prisma.documentoEmpresa.findMany({
    where: { empresaId, documentoRequeridoId: null },
    select: { id: true, nombre: true },
  });

  if (docsCargadosSinRequerido.length > 0) {
    inconsistencias.push({
      modulo: "Documentación empresa",
      problema: `${docsCargadosSinRequerido.length} documento(s) cargado(s) sin tipo requerido asignado`,
      severidad: "advertencia",
      registroAfectado: docsCargadosSinRequerido.map((d) => d.id).join(", "),
      solucionSugerida: "Asignar tipo de documento requerido",
    });
  }

  return {
    nombre: "Documentación empresa",
    estado: calcularEstado(inconsistencias),
    conteos: {
      documentosRequeridos: documentosRequeridos.length,
      documentosCargados: documentosCargados,
      sinAsignar: docsCargadosSinRequerido.length,
    },
    inconsistencias,
    accionSugerida:
      inconsistencias.length > 0
        ? "Verificar documentación empresa incompleta"
        : undefined,
  };
}

// ──────────────────────────────────────────────────────────
// AUDITORÍA: CONTROL DOCUMENTAL DE TRABAJADORES
// ──────────────────────────────────────────────────────────

async function auditarControlTrabajadores(empresaId: string): Promise<AuditoriaModulo> {
  const inconsistencias: InconsistenciaAuditoria[] = [];

  // Contar trabajadores activos
  const trabajadoresActivos = await prisma.trabajador.count({
    where: { empresaId, estado: { not: "inactivo" } },
  });

  // Contar tipos de documentos requeridos
  const tiposDocumentos = await prisma.documentoTipoTrabajador.count({
    where: { empresaId, activo: true },
  });

  // Contar reglas documentales activas
  const reglasActivas = await prisma.reglaDocumentoTrabajador.count({
    where: { empresaId, activo: true },
  });

  // Contar documentos por trabajador
  const documentosPorTrabajador = await prisma.trabajadorDocumento.count({
    where: { empresaId },
  });

  // Detectar documentos vencidos
  const documentosVencidos = await prisma.trabajadorDocumento.count({
    where: {
      empresaId,
      estado: "vencido",
    },
  });

  if (documentosVencidos > 0) {
    inconsistencias.push({
      modulo: "Control documental trabajadores",
      problema: `${documentosVencidos} documento(s) vencido(s) en trabajadores`,
      severidad: "advertencia",
      registroAfectado: `${documentosVencidos}`,
      solucionSugerida: "Renovar documentos vencidos",
    });
  }

  // Detectar documentos rechazados
  const documentosRechazados = await prisma.trabajadorDocumento.count({
    where: {
      empresaId,
      estado: "rechazado",
    },
  });

  if (documentosRechazados > 0) {
    inconsistencias.push({
      modulo: "Control documental trabajadores",
      problema: `${documentosRechazados} documento(s) rechazado(s)`,
      severidad: "crítico",
      registroAfectado: `${documentosRechazados}`,
      solucionSugerida: "Revisar y corregir documentos rechazados",
    });
  }

  return {
    nombre: "Control documental trabajadores",
    estado: calcularEstado(inconsistencias),
    conteos: {
      trabajadoresActivos,
      tiposDocumentos,
      reglasActivas,
      documentosPorTrabajador,
      documentosVencidos,
      documentosRechazados,
    },
    inconsistencias,
    accionSugerida:
      inconsistencias.length > 0 ? "Atender documentos vencidos o rechazados" : undefined,
  };
}

// ──────────────────────────────────────────────────────────
// AUDITORÍA: BIBLIOTECA DE CAPACITACIONES
// ──────────────────────────────────────────────────────────

async function auditarCapacitaciones(empresaId: string): Promise<AuditoriaModulo> {
  const inconsistencias: InconsistenciaAuditoria[] = [];

  // Contar capacitaciones activas
  const capacitacionesActivas = await prisma.capacitacion.count({
    where: { empresaId, activa: true },
  });

  // Capacitaciones sin nombre
  const capacitacionesSinNombre = await prisma.capacitacion.count({
    where: { empresaId, nombre: { equals: "" } },
  });

  if (capacitacionesSinNombre > 0) {
    inconsistencias.push({
      modulo: "Biblioteca capacitaciones",
      problema: `${capacitacionesSinNombre} capacitación(es) sin nombre`,
      severidad: "crítico",
      registroAfectado: `${capacitacionesSinNombre}`,
      solucionSugerida: "Asignar nombre a capacitaciones",
    });
  }

  // Contar asignaciones por estado
  const asignacionesPorEstado = await prisma.capacitacionAsignacion.groupBy({
    by: ["estado"],
    where: { capacitacion: { empresaId } },
    _count: true,
  });

  const estadoMap: Record<string, number> = {
    pendiente: 0,
    enviada: 0,
    "en-progreso": 0,
    completada: 0,
    vencida: 0,
    cancelada: 0,
  };

  asignacionesPorEstado.forEach((item) => {
    if (item.estado in estadoMap) {
      estadoMap[item.estado] = item._count;
    }
  });

  return {
    nombre: "Biblioteca capacitaciones",
    estado: calcularEstado(inconsistencias),
    conteos: {
      capacitacionesActivas,
      pendiente: estadoMap.pendiente,
      enviada: estadoMap.enviada,
      "en-progreso": estadoMap["en-progreso"],
      completada: estadoMap.completada,
      vencida: estadoMap.vencida,
      cancelada: estadoMap.cancelada,
      sinNombre: capacitacionesSinNombre,
    },
    inconsistencias,
    accionSugerida:
      inconsistencias.length > 0 ? "Revisar capacitaciones incompletas" : undefined,
  };
}

// ──────────────────────────────────────────────────────────
// AUDITORÍA: PLANTILLAS
// ──────────────────────────────────────────────────────────

async function auditarPlantillas(empresaId: string): Promise<AuditoriaModulo> {
  const inconsistencias: InconsistenciaAuditoria[] = [];

  // Plantillas documento empresa
  const plantillasDocEmpresa = await prisma.plantillaDocumentoEmpresa.count({
    where: { empresaId, activa: true },
  });

  // Plantillas plan capacitación
  const plantillasPlanCap = await prisma.plantillaPlanCapacitacion.count({
    where: { empresaId, activa: true },
  });

  // Plantillas acreditación
  const plantillasAcred = await prisma.plantillaAcreditacion.count({
    where: { empresaId: empresaId, activa: true },
  });

  // Validar que haya plantillas de tipos esperados
  if (plantillasDocEmpresa === 0) {
    inconsistencias.push({
      modulo: "Plantillas",
      problema: "No hay plantillas de documentos empresa",
      severidad: "advertencia",
      registroAfectado: "Plantillas documento empresa",
      solucionSugerida: "Crear plantillas de documentos para la empresa",
    });
  }

  if (plantillasPlanCap === 0) {
    inconsistencias.push({
      modulo: "Plantillas",
      problema: "No hay plantillas de plan de capacitación",
      severidad: "advertencia",
      registroAfectado: "Plantillas plan capacitación",
      solucionSugerida: "Crear plantillas de plan de capacitación",
    });
  }

  return {
    nombre: "Plantillas",
    estado: calcularEstado(inconsistencias),
    conteos: {
      documentoEmpresa: plantillasDocEmpresa,
      planCapacitacion: plantillasPlanCap,
      acreditacion: plantillasAcred,
    },
    inconsistencias,
    accionSugerida: inconsistencias.length > 0 ? "Crear plantillas faltantes" : undefined,
  };
}

// ──────────────────────────────────────────────────────────
// AUDITORÍA: DOCUMENTOS GENERADOS
// ──────────────────────────────────────────────────────────

async function auditarDocumentosGenerados(
  empresaId: string
): Promise<AuditoriaModulo> {
  const inconsistencias: InconsistenciaAuditoria[] = [];

  // Detectar documentos con archivoUrl inválida
  const docsConArchivo = await prisma.documentoEmpresa.findMany({
    where: { empresaId, archivoUrl: { not: null } },
    select: {
      id: true,
      archivoUrl: true,
      archivoNombreOriginal: true,
      archivoTipo: true,
      archivoPeso: true,
    },
  });

  // Verificar documentos sin metadata
  const docsSinMetadata = docsConArchivo.filter(
    (d) =>
      !d.archivoNombreOriginal ||
      !d.archivoTipo ||
      d.archivoPeso === null ||
      d.archivoPeso === undefined
  );

  if (docsSinMetadata.length > 0) {
    inconsistencias.push({
      modulo: "Documentos generados",
      problema: `${docsSinMetadata.length} documento(s) sin metadata completa`,
      severidad: "advertencia",
      registroAfectado: docsSinMetadata.map((d) => d.id).slice(0, 3).join(", "),
      solucionSugerida: "Verificar metadata de archivos almacenados",
    });
  }

  // Contar documentos con historial
  const docsConHistorial = await prisma.documentoEmpresaHistorial.count({
    where: {
      documento: { empresaId },
    },
  });

  const totalDocs = await prisma.documentoEmpresa.count({
    where: { empresaId },
  });

  return {
    nombre: "Documentos generados",
    estado: calcularEstado(inconsistencias),
    conteos: {
      total: totalDocs,
      conArchivo: docsConArchivo.length,
      conHistorial: docsConHistorial,
      sinMetadata: docsSinMetadata.length,
    },
    inconsistencias,
    accionSugerida: inconsistencias.length > 0 ? "Verificar integridad de archivos" : undefined,
  };
}

// ──────────────────────────────────────────────────────────
// FUNCIÓN PRINCIPAL: EJECUTAR AUDITORÍA COMPLETA
// ──────────────────────────────────────────────────────────

export async function ejecutarAuditoriaDocumental(empresaId: string): Promise<ResultadoAuditoria> {
  await requireRole("SUPERADMIN");

  // Obtener empresa
  const empresa = await prisma.empresa.findUnique({
    where: { id: empresaId },
    select: { id: true, nombre: true },
  });

  if (!empresa) {
    throw new Error(`Empresa no encontrada: ${empresaId}`);
  }

  // Ejecutar auditorías de cada módulo en paralelo
  const [
    auditBiblioteca,
    auditDocEmpresa,
    auditTrabajadores,
    auditCapacitaciones,
    auditPlantillas,
    auditDocGenerados,
  ] = await Promise.all([
    auditarBibliotecaDocumental(empresaId),
    auditarDocumentacionEmpresa(empresaId),
    auditarControlTrabajadores(empresaId),
    auditarCapacitaciones(empresaId),
    auditarPlantillas(empresaId),
    auditarDocumentosGenerados(empresaId),
  ]);

  // Compilar inconsistencias globales (críticas)
  const inconsistenciasGlobales = [
    ...auditBiblioteca.inconsistencias,
    ...auditDocEmpresa.inconsistencias,
    ...auditTrabajadores.inconsistencias,
    ...auditCapacitaciones.inconsistencias,
    ...auditPlantillas.inconsistencias,
    ...auditDocGenerados.inconsistencias,
  ]
    .filter((i) => i.severidad === "crítico")
    .slice(0, 20); // Limitar a las primeras 20 críticas

  return {
    timestamp: new Date(),
    empresaId,
    empresaNombre: empresa.nombre,
    modulos: {
      "Biblioteca documental": auditBiblioteca,
      "Documentación empresa": auditDocEmpresa,
      "Control trabajadores": auditTrabajadores,
      "Capacitaciones": auditCapacitaciones,
      "Plantillas": auditPlantillas,
      "Documentos generados": auditDocGenerados,
    },
    inconsistenciasGlobales,
  };
}
