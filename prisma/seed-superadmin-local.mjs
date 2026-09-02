import { randomBytes, scryptSync } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";

config({ path: [".env.local", ".env"] });

if (process.env.NODE_ENV === "production") {
  throw new Error("Este seed es exclusivo para desarrollo local");
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL no esta definida");
}

const devPassword = process.env.AUTH_DEV_PASSWORD;
if (!devPassword) {
  throw new Error("AUTH_DEV_PASSWORD no esta definida en .env.local o .env");
}

function hashPassword(password) {
  const options = { N: 16384, r: 8, p: 1 };
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, 64, options);
  return `scrypt$${options.N}$${options.r}$${options.p}$${salt}$${derivedKey.toString("hex")}`;
}

const passwordHash = hashPassword(devPassword);

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const MODULES = [
  "dashboard",
  "empresa",
  "trabajadores",
  "cumplimiento",
  "documentacion",
  "plan_trabajo",
  "acreditaciones",
  "biblioteca_capacitaciones",
  "notificaciones",
];

async function main() {
  const empresa = await prisma.empresa.upsert({
    where: { id: "empresa-demo-nextprev" },
    create: {
      id: "empresa-demo-nextprev",
      nombre: "Empresa Demo NextPrev",
      razonSocial: "Empresa Demo NextPrev SpA",
      rut: "76.123.456-7",
      activa: true,
      tipoEmpresa: "servicios",
      giro: "servicios",
      tamanoEmpresa: "mediana",
      cantidadTrabajadores: 10,
    },
    update: {
      nombre: "Empresa Demo NextPrev",
      razonSocial: "Empresa Demo NextPrev SpA",
      rut: "76.123.456-7",
      activa: true,
      tipoEmpresa: "servicios",
      giro: "servicios",
      tamanoEmpresa: "mediana",
      cantidadTrabajadores: 10,
    },
    select: { id: true, nombre: true },
  });

  const superadmin = await prisma.usuario.upsert({
    where: { email: "admin@dicaprev.cl" },
    create: {
      nombre: "Superadmin Demo",
      email: "admin@dicaprev.cl",
      rol: "SUPERADMIN",
      activo: true,
      empresaId: empresa.id,
      passwordHash,
    },
    update: {
      nombre: "Superadmin Demo",
      rol: "SUPERADMIN",
      activo: true,
      empresaId: empresa.id,
      passwordHash,
    },
    select: { id: true, email: true, rol: true },
  });

  await prisma.usuarioEmpresa.upsert({
    where: {
      usuarioId_empresaId: {
        usuarioId: superadmin.id,
        empresaId: empresa.id,
      },
    },
    create: {
      usuarioId: superadmin.id,
      empresaId: empresa.id,
      rol: "SUPERADMIN",
      activo: true,
    },
    update: {
      rol: "SUPERADMIN",
      activo: true,
    },
  });

  for (const modulo of MODULES) {
    await prisma.empresaModulo.upsert({
      where: {
        empresaId_modulo: {
          empresaId: empresa.id,
          modulo,
        },
      },
      create: {
        empresaId: empresa.id,
        modulo,
        activo: true,
      },
      update: {
        activo: true,
      },
    });
  }

  console.log("Seed local SUPERADMIN listo");
  console.log(`Empresa demo: ${empresa.nombre} (${empresa.id})`);
  console.log(`Usuario SUPERADMIN: ${superadmin.email} (${superadmin.rol})`);
  console.log("Password local actualizada desde AUTH_DEV_PASSWORD");
}

main()
  .catch((error) => {
    console.error("Error seed superadmin local:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
