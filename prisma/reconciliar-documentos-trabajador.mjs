import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";

config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL no esta definida en .env");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

function normalize(value) {
  return (value ?? "")
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function matchesTipoContrato(reglaTipoContrato, trabajadorTipoContrato) {
  if (!reglaTipoContrato) return true;
  if (!trabajadorTipoContrato) return false;
  return normalize(reglaTipoContrato) === normalize(trabajadorTipoContrato);
}

function reglaAplicaATrabajador(regla, trabajador) {
  if (regla.cargoId && regla.cargoId !== trabajador.cargoId) return false;
  if (regla.areaId && regla.areaId !== trabajador.areaId) return false;
  if (regla.centroTrabajoId && regla.centroTrabajoId !== trabajador.centroTrabajoId) return false;
  if (!matchesTipoContrato(regla.tipoContrato, trabajador.tipoContrato)) return false;
  return true;
}

async function reconciliarEmpresa(empresaId) {
  const usuario = await prisma.usuario.findFirst({
    where: { empresaId },
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true },
  });

  const reglas = await prisma.reglaDocumentoTrabajador.findMany({
    where: {
      empresaId,
      activo: true,
      tipoDocumento: { activo: true },
    },
    include: {
      tipoDocumento: {
        select: {
          codigo: true,
          nombre: true,
          requiereVencimiento: true,
        },
      },
    },
    orderBy: [{ obligatorio: "desc" }, { createdAt: "asc" }],
  });

  if (reglas.length === 0) {
    return {
      empresaId,
      reglasActivas: 0,
      trabajadoresEvaluados: 0,
      documentosGenerados: 0,
    };
  }

  const trabajadores = await prisma.trabajador.findMany({
    where: {
      empresaId,
      estado: { not: "inactivo" },
    },
    select: {
      id: true,
      cargoId: true,
      areaId: true,
      centroTrabajoId: true,
      tipoContrato: true,
    },
    orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
  });

  if (trabajadores.length === 0) {
    return {
      empresaId,
      reglasActivas: reglas.length,
      trabajadoresEvaluados: 0,
      documentosGenerados: 0,
    };
  }

  const workerIds = trabajadores.map((w) => w.id);

  const existentes = await prisma.trabajadorDocumento.findMany({
    where: {
      empresaId,
      trabajadorId: { in: workerIds },
      esVigente: true,
    },
    select: { trabajadorId: true, tipo: true, nombre: true },
  });

  const existentesByWorker = new Map();
  for (const doc of existentes) {
    const key = doc.trabajadorId;
    const set = existentesByWorker.get(key) ?? new Set();
    set.add(normalize(doc.tipo));
    set.add(normalize(doc.nombre));
    existentesByWorker.set(key, set);
  }

  let documentosGenerados = 0;

  for (const trabajador of trabajadores) {
    const aplicables = reglas.filter((regla) => reglaAplicaATrabajador(regla, trabajador));
    const dedup = new Map();

    for (const regla of aplicables) {
      const k = normalize(regla.tipoDocumento.codigo);
      if (dedup.has(k)) continue;
      dedup.set(k, regla);
    }

    const existentesKeys = existentesByWorker.get(trabajador.id) ?? new Set();

    for (const regla of dedup.values()) {
      const codigoKey = normalize(regla.tipoDocumento.codigo);
      const nombreKey = normalize(regla.tipoDocumento.nombre);
      if (existentesKeys.has(codigoKey) || existentesKeys.has(nombreKey)) continue;

      const created = await prisma.trabajadorDocumento.create({
        data: {
          trabajadorId: trabajador.id,
          empresaId,
          nombre: regla.tipoDocumento.nombre,
          tipo: regla.tipoDocumento.codigo,
          categoria: "trabajador",
          estado: regla.obligatorio ? "pendiente" : "no_aplica",
          version: "1.0",
          esVigente: true,
          versionNumero: 1,
          origen: "sistema",
          tieneVencimiento: regla.tipoDocumento.requiereVencimiento,
          observaciones: "Generado por reconciliacion desde reglas documentales en BD.",
          subidoPorId: usuario?.id ?? null,
          creadoPorEmail: usuario?.email ?? null,
        },
        select: { id: true, version: true },
      });

      await prisma.trabajadorDocumentoHistorial.create({
        data: {
          documentoId: created.id,
          usuarioId: usuario?.id ?? null,
          accion: "DOCUMENTO_GENERADO_POR_REGLA",
          detalle: "Documento generado por reconciliacion de reglas documentales BD",
          version: created.version,
          origen: "sistema",
        },
      });

      documentosGenerados += 1;
      existentesKeys.add(codigoKey);
      existentesKeys.add(nombreKey);
    }
  }

  return {
    empresaId,
    reglasActivas: reglas.length,
    trabajadoresEvaluados: trabajadores.length,
    documentosGenerados,
  };
}

async function main() {
  const empresaArg = process.argv.find((arg) => arg.startsWith("--empresaId="));
  const empresaId = empresaArg ? empresaArg.split("=")[1] : null;

  const empresas = empresaId
    ? await prisma.empresa.findMany({ where: { id: empresaId }, select: { id: true } })
    : await prisma.empresa.findMany({ select: { id: true } });

  if (empresas.length === 0) {
    console.log("Reconciliacion documental trabajador: sin empresas, se omite.");
    return;
  }

  let totalReglas = 0;
  let totalTrabajadores = 0;
  let totalDocs = 0;

  for (const empresa of empresas) {
    const result = await reconciliarEmpresa(empresa.id);
    totalReglas += result.reglasActivas;
    totalTrabajadores += result.trabajadoresEvaluados;
    totalDocs += result.documentosGenerados;
    console.log(
      `Empresa ${empresa.id}: reglas ${result.reglasActivas}, trabajadores evaluados ${result.trabajadoresEvaluados}, documentos generados ${result.documentosGenerados}`,
    );
  }

  console.log(
    `Reconciliacion completada: reglas evaluadas ${totalReglas}, trabajadores evaluados ${totalTrabajadores}, documentos generados ${totalDocs}`,
  );
}

main()
  .catch((error) => {
    console.error("Error en reconciliacion documental trabajador:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
