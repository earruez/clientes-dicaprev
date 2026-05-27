-- AlterEnum
ALTER TYPE "Rol" ADD VALUE 'LECTURA';

-- AlterTable
ALTER TABLE "Empresa" ADD COLUMN     "activa" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "activo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "passwordHash" TEXT;

-- CreateTable
CREATE TABLE "UsuarioEmpresa" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "rol" "Rol" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsuarioEmpresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmpresaModulo" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "modulo" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmpresaModulo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UsuarioEmpresa_empresaId_idx" ON "UsuarioEmpresa"("empresaId");

-- CreateIndex
CREATE INDEX "UsuarioEmpresa_usuarioId_idx" ON "UsuarioEmpresa"("usuarioId");

-- CreateIndex
CREATE INDEX "UsuarioEmpresa_activo_idx" ON "UsuarioEmpresa"("activo");

-- CreateIndex
CREATE UNIQUE INDEX "UsuarioEmpresa_usuarioId_empresaId_key" ON "UsuarioEmpresa"("usuarioId", "empresaId");

-- CreateIndex
CREATE INDEX "EmpresaModulo_empresaId_idx" ON "EmpresaModulo"("empresaId");

-- CreateIndex
CREATE INDEX "EmpresaModulo_modulo_idx" ON "EmpresaModulo"("modulo");

-- CreateIndex
CREATE INDEX "EmpresaModulo_activo_idx" ON "EmpresaModulo"("activo");

-- CreateIndex
CREATE UNIQUE INDEX "EmpresaModulo_empresaId_modulo_key" ON "EmpresaModulo"("empresaId", "modulo");

-- Backfill
INSERT INTO "UsuarioEmpresa" ("id", "usuarioId", "empresaId", "rol", "activo", "createdAt", "updatedAt")
SELECT
    CONCAT('ue_', md5(u."id" || ':' || u."empresaId")),
    u."id",
    u."empresaId",
    u."rol",
    u."activo",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Usuario" u
WHERE u."empresaId" IS NOT NULL
ON CONFLICT ("usuarioId", "empresaId") DO NOTHING;

INSERT INTO "EmpresaModulo" ("id", "empresaId", "modulo", "activo", "createdAt", "updatedAt")
SELECT
    CONCAT('em_', md5(e."id" || ':' || m.modulo)),
    e."id",
    m.modulo,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Empresa" e
CROSS JOIN (
    VALUES
      ('dashboard'),
      ('empresa'),
      ('trabajadores'),
      ('cumplimiento'),
      ('documentacion'),
      ('plan_trabajo'),
      ('acreditaciones'),
      ('biblioteca_capacitaciones'),
      ('notificaciones')
) AS m(modulo)
ON CONFLICT ("empresaId", "modulo") DO NOTHING;

-- AddForeignKey
ALTER TABLE "UsuarioEmpresa" ADD CONSTRAINT "UsuarioEmpresa_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsuarioEmpresa" ADD CONSTRAINT "UsuarioEmpresa_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmpresaModulo" ADD CONSTRAINT "EmpresaModulo_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
