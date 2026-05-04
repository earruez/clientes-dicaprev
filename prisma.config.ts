import { defineConfig } from "prisma/config";

// Configuración central de Prisma v7
// Para conectar a PostgreSQL local, copia .env.example a .env y completa DATABASE_URL

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
