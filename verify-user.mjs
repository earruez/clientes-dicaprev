import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";

config();

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const users = await prisma.usuario.findMany({
    select: { id: true, email: true, nombre: true, rol: true },
    take: 10,
  });

  console.log("Users in database:");
  users.forEach(u => console.log(`  - ${u.email} (${u.nombre}) - ${u.rol}`));
  
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
