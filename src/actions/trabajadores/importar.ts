"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/auth/permissions";
import { evaluarDocumentosPendientesPorEvento } from "@/actions/trabajadores/documentos";
import { generarTokenFirma } from "@/lib/firmas/tokens";

export type FilaTrabajadorImportar = {
  rut: string;
  nombres: string;
  apellidos: string;
  email?: string;
  cargo?: string;
  area?: string;
  centroTrabajo?: string;
  tipoContrato?: string;
};

export type ErrorImportar = {
  fila: number;
  rut: string;
  mensaje: string;
};

export type ResultadoImportar = {
  creados: number;
  omitidos: number;
  errores: ErrorImportar[];
  induccionesCreadas: number;
};

function normalizeTipoContrato(raw: string | undefined): string {
  if (!raw) return "Indefinido";
  const val = raw.trim().toLowerCase();
  if (val.includes("plazo")) return "Plazo Fijo";
  if (val.includes("obra")) return "Por Obra";
  if (val.includes("part")) return "Part Time";
  return "Indefinido";
}

async function crearInduccionSiCorresponde(
  empresaId: string,
  trabajadorId: string,
  usuarioId: string,
): Promise<boolean> {
  const documentosPendientes = await prisma.trabajadorDocumento.count({
    where: {
      trabajadorId,
      empresaId,
      esVigente: true,
      archivoUrl: { not: null },
      firmado: false,
    },
  });

  if (documentosPendientes === 0) return false;

  const token = generarTokenFirma();

  const induccion = await prisma.induccionTrabajador.create({
    data: {
      empresaId,
      trabajadorId,
      token,
      estado: "pendiente",
      creadoPorId: usuarioId,
      observaciones: "Generada automáticamente por carga masiva.",
    },
    select: { id: true },
  });

  const docs = await prisma.trabajadorDocumento.findMany({
    where: {
      trabajadorId,
      empresaId,
      esVigente: true,
      archivoUrl: { not: null },
      firmado: false,
    },
    select: { id: true, nombre: true, tipo: true },
  });

  const trabajador = await prisma.trabajador.findUnique({
    where: { id: trabajadorId },
    select: { nombres: true, apellidos: true, rut: true },
  });

  if (docs.length > 0 && trabajador) {
    await prisma.firmaDocumento.createMany({
      data: docs.map((doc) => ({
        empresaId,
        trabajadorId,
        documentoId: doc.id,
        documentoOrigen: "induccion" as const,
        token: generarTokenFirma(),
        estado: "pendiente" as const,
        tituloDocumento: doc.nombre,
        descripcion: `Inducción digital — ${doc.tipo}`,
        nombreFirmante: `${trabajador.nombres} ${trabajador.apellidos}`.trim(),
        rutFirmante: trabajador.rut ?? null,
        induccionId: induccion.id,
      })),
    });
  }

  return true;
}

export async function importarTrabajadores(
  filas: FilaTrabajadorImportar[],
): Promise<ResultadoImportar> {
  const { empresaId, usuarioId, email } = await requirePermission("canCreateTrabajador");

  const result: ResultadoImportar = {
    creados: 0,
    omitidos: 0,
    errores: [],
    induccionesCreadas: 0,
  };

  if (!filas.length) return result;

  // Cargar lookups en un solo query
  const [cargosDB, areasDB, centrosDB, rutsExistentes] = await Promise.all([
    prisma.cargo.findMany({
      where: { empresaId },
      select: { id: true, nombre: true, areaId: true },
    }),
    prisma.area.findMany({
      where: { empresaId },
      select: { id: true, nombre: true },
    }),
    prisma.centroTrabajo.findMany({
      where: { empresaId },
      select: { id: true, nombre: true },
    }),
    prisma.trabajador.findMany({
      where: { empresaId, rut: { not: null } },
      select: { rut: true },
    }),
  ]);

  const cargoMap = new Map(cargosDB.map((c) => [c.nombre.toLowerCase(), c]));
  const areaMap = new Map(areasDB.map((a) => [a.nombre.toLowerCase(), a]));
  const centroMap = new Map(centrosDB.map((c) => [c.nombre.toLowerCase(), c]));
  const rutSet = new Set(rutsExistentes.map((t) => t.rut!.toLowerCase()));

  for (let i = 0; i < filas.length; i++) {
    const fila = filas[i];
    const filaNum = i + 1;
    const rutNorm = fila.rut?.trim().toLowerCase();

    // Validar campos requeridos
    if (!rutNorm) {
      result.errores.push({ fila: filaNum, rut: "", mensaje: "RUT es requerido" });
      continue;
    }
    if (!fila.nombres?.trim()) {
      result.errores.push({ fila: filaNum, rut: fila.rut, mensaje: "Nombre es requerido" });
      continue;
    }
    if (!fila.apellidos?.trim()) {
      result.errores.push({ fila: filaNum, rut: fila.rut, mensaje: "Apellido es requerido" });
      continue;
    }

    // Verificar duplicado
    if (rutSet.has(rutNorm)) {
      result.omitidos++;
      continue;
    }

    // Resolver IDs
    const cargo = fila.cargo ? cargoMap.get(fila.cargo.trim().toLowerCase()) : null;
    const area = fila.area ? areaMap.get(fila.area.trim().toLowerCase()) : null;
    const centro = fila.centroTrabajo ? centroMap.get(fila.centroTrabajo.trim().toLowerCase()) : null;

    const cargoId = cargo?.id ?? null;
    const areaId = area?.id ?? cargo?.areaId ?? null;
    const centroTrabajoId = centro?.id ?? null;
    const tipoContrato = normalizeTipoContrato(fila.tipoContrato);

    try {
      const created = await prisma.trabajador.create({
        data: {
          empresaId,
          nombres: fila.nombres.trim(),
          apellidos: fila.apellidos.trim(),
          rut: fila.rut.trim(),
          email: fila.email?.trim() || null,
          estado: "activo",
          tipoContrato,
          cargoId,
          areaId,
          centroTrabajoId,
        },
        select: { id: true },
      });

      rutSet.add(rutNorm);
      result.creados++;

      // Generar documentos por reglas
      await evaluarDocumentosPendientesPorEvento({
        empresaId,
        evento: "trabajador_creado",
        trabajadorId: created.id,
        usuarioId,
        email,
      });

      // Crear inducción si hay documentos firmables
      const inducionCreada = await crearInduccionSiCorresponde(empresaId, created.id, usuarioId);
      if (inducionCreada) result.induccionesCreadas++;
    } catch (err) {
      result.errores.push({
        fila: filaNum,
        rut: fila.rut,
        mensaje: err instanceof Error ? err.message : "Error al crear trabajador",
      });
    }
  }

  return result;
}
