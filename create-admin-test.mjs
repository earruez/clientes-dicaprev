import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";

config();

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  let empresa = await prisma.empresa.findFirst({
    where: { nombre: "MVP CHILE SPA" },
    select: { id: true },
  });

  if (!empresa) {
    empresa = await prisma.empresa.create({
      data: {
        nombre: "MVP CHILE SPA",
        razonSocial: "MVP CHILE SPA",
        rut: "76.800.000-0",
        tipoEmpresa: "servicios",
        giro: "servicios de seguridad",
        tamanoEmpresa: "mediana",
        cantidadTrabajadores: 10,
      },
      select: { id: true },
    });
    console.log("✓ Empresa creada:", empresa.id);
  } else {
    console.log("✓ Empresa encontrada:", empresa.id);
  }

  const user = await prisma.usuario.upsert({
    where: { email: "admin@dicaprev.cl" },
    create: {
      email: "admin@dicaprev.cl",
      nombre: "Admin DICAPREV",
      rol: "ADMIN_EMPRESA",
      empresaId: empresa.id,
    },
    update: {
      nombre: "Admin DICAPREV",
      rol: "ADMIN_EMPRESA",
      empresaId: empresa.id,
    },
  });

  console.log("✓ Usuario creado/actualizado:", user.email, "con rol:", user.rol);
  await prisma.$disconnect();
  process.exit(0);
}

main().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
