import { prisma } from "@/lib/prisma";

const TARGET_NAME = "Baker SpA";
const TARGET_RUT = "77881890-6";
const PROTECTED_NAMES = new Set(["Centros Comerciales SpA", "DICAPREV SpA"]);

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeRut(value: string | null | undefined): string {
  if (!value) return "";
  return value.replace(/[^0-9kK]/g, "").toLowerCase();
}

async function main() {
  const targetName = normalizeName(TARGET_NAME);
  const targetRut = normalizeRut(TARGET_RUT);

  const empresas = await prisma.empresa.findMany({
    select: {
      id: true,
      nombre: true,
      rut: true,
      activa: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const candidatas = empresas.filter((empresa) => {
    if (PROTECTED_NAMES.has(empresa.nombre)) {
      return false;
    }

    const sameName = normalizeName(empresa.nombre) === targetName;
    const sameRut = normalizeRut(empresa.rut) === targetRut;
    return sameName || sameRut;
  });

  if (candidatas.length === 0) {
    console.log("No se encontraron empresas Baker SpA para limpiar.");
    return;
  }

  const [keep, ...duplicadas] = candidatas;

  if (!keep) {
    console.log("No hay empresa para conservar.");
    return;
  }

  console.log(`Empresa que se conserva activa: ${keep.nombre} (${keep.id})`);
  console.log(`Total duplicadas detectadas: ${duplicadas.length}`);

  if (duplicadas.length === 0) {
    console.log("No hay duplicados para desactivar.");
    return;
  }

  const idsDuplicadas = duplicadas.map((empresa) => empresa.id);

  const resultado = await prisma.empresa.updateMany({
    where: { id: { in: idsDuplicadas }, activa: true },
    data: { activa: false },
  });

  console.log(`Empresas Baker desactivadas: ${resultado.count}`);

  const estadoFinal = await prisma.empresa.findMany({
    where: { id: { in: candidatas.map((empresa) => empresa.id) } },
    select: {
      id: true,
      nombre: true,
      rut: true,
      activa: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  console.log("Estado final Baker SpA:");
  console.table(
    estadoFinal.map((empresa) => ({
      id: empresa.id,
      nombre: empresa.nombre,
      rut: empresa.rut,
      activa: empresa.activa,
      createdAt: empresa.createdAt.toISOString(),
    }))
  );
}

main()
  .catch((error) => {
    console.error("Error limpiando duplicados Baker:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
