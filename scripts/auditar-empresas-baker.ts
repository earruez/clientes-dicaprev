import { prisma } from "@/lib/prisma";

const TARGET_NAME = "Baker SpA";
const TARGET_RUT = "77881890-6";
const PROTECTED_NAMES = ["Centros Comerciales SpA", "DICAPREV SpA"];

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
  const protectedNameSet = new Set(PROTECTED_NAMES.map((name) => normalizeName(name)));

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

  const baker = empresas.filter((empresa) => {
    const name = normalizeName(empresa.nombre);
    const rut = normalizeRut(empresa.rut);
    return (name === targetName || rut === targetRut) && !protectedNameSet.has(name);
  });

  const protectedRows = empresas.filter((empresa) => protectedNameSet.has(normalizeName(empresa.nombre)));

  console.log(
    JSON.stringify(
      {
        bakerCount: baker.length,
        baker,
        protectedCount: protectedRows.length,
        protectedRows,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error("Error auditando empresas Baker:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
