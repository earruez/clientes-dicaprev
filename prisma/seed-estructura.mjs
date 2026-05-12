/**
 * seed-estructura.mjs
 * Pobla Area, Cargo y CentroTrabajo para la empresa activa (MVP Chile SPA).
 * Run: node prisma/seed-estructura.mjs
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const empresa = await prisma.empresa.findFirst({ select: { id: true, nombre: true } });
  if (!empresa) {
    console.error("No se encontró ninguna empresa en la DB.");
    process.exit(1);
  }
  console.log(`Empresa: ${empresa.nombre} (${empresa.id})`);

  // ── Áreas ─────────────────────────────────────────────────────────────────
  const areasInput = [
    { nombre: "Producción e Instalación", descripcion: "Producción, instalación y operaciones en terreno." },
    { nombre: "Administración",           descripcion: "Gestión administrativa, soporte documental y RRHH." },
  ];

  const areas = [];
  for (const a of areasInput) {
    let area = await prisma.area.findFirst({ where: { empresaId: empresa.id, nombre: a.nombre }, select: { id: true, nombre: true } });
    if (!area) {
      area = await prisma.area.create({
        data: { empresaId: empresa.id, nombre: a.nombre, descripcion: a.descripcion, estado: "activa" },
        select: { id: true, nombre: true },
      });
      console.log(`  ✓ Área creada: ${area.nombre}`);
    } else {
      console.log(`  ↷ Área ya existe: ${area.nombre}`);
    }
    areas.push(area);
  }

  const areaProduccion = areas.find((a) => a.nombre === "Producción e Instalación");
  const areaAdmin      = areas.find((a) => a.nombre === "Administración");

  // ── Cargos ─────────────────────────────────────────────────────────────────
  const cargosInput = [
    { nombre: "Supervisor de Obra",   areaId: areaProduccion?.id, esCritico: true  },
    { nombre: "Maestro PVC/Aluminio", areaId: areaProduccion?.id, esCritico: false },
    { nombre: "Instalador",           areaId: areaProduccion?.id, esCritico: false },
    { nombre: "Administrativa",       areaId: areaAdmin?.id,      esCritico: false },
  ];

  for (const c of cargosInput) {
    let cargo = await prisma.cargo.findFirst({ where: { empresaId: empresa.id, nombre: c.nombre }, select: { id: true, nombre: true } });
    if (!cargo) {
      cargo = await prisma.cargo.create({
        data: { empresaId: empresa.id, nombre: c.nombre, areaId: c.areaId ?? null, esCritico: c.esCritico, estado: "activo" },
        select: { id: true, nombre: true },
      });
      console.log(`  ✓ Cargo creado: ${cargo.nombre}`);
    } else {
      console.log(`  ↷ Cargo ya existe: ${cargo.nombre}`);
    }
  }

  // ── Centro de Trabajo ──────────────────────────────────────────────────────
  let centro = await prisma.centroTrabajo.findFirst({ where: { empresaId: empresa.id, nombre: "Sede Central MVP Chile" }, select: { id: true, nombre: true } });
  if (!centro) {
    centro = await prisma.centroTrabajo.create({
      data: { empresaId: empresa.id, nombre: "Sede Central MVP Chile", tipo: "Casa Matriz", estado: "activo" },
        data: { empresaId: empresa.id, nombre: "Sede Central MVP Chile", tipo: "Casa Matriz", estado: "activo", direccion: "Por definir" },
          data: { empresaId: empresa.id, nombre: "Sede Central MVP Chile", tipo: "Casa Matriz", estado: "activo", direccion: "Por definir", comuna: "Por definir", region: "Metropolitana" },
      select: { id: true, nombre: true },
    });
    console.log(`  ✓ Centro creado: ${centro.nombre}`);
  } else {
    console.log(`  ↷ Centro ya existe: ${centro.nombre}`);
  }

  console.log("\n✅ Estructura organizacional lista.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
