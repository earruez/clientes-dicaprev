-- CreateEnum
CREATE TYPE "EstadoDs44Miper" AS ENUM ('borrador', 'vigente', 'en_revision', 'archivado');

-- CreateEnum
CREATE TYPE "TipoControlDs44Miper" AS ENUM ('eliminacion', 'sustitucion', 'ingenieria', 'administrativo', 'epp');

-- CreateEnum
CREATE TYPE "EstadoControlDs44Miper" AS ENUM ('pendiente', 'implementado', 'en_revision', 'descartado');

-- CreateTable
CREATE TABLE "Ds44Miper" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "estado" "EstadoDs44Miper" NOT NULL DEFAULT 'borrador',
    "vigenteDesde" TIMESTAMP(3),
    "fechaProximaRevision" TIMESTAMP(3),
    "observaciones" TEXT,
    "creadoPorId" TEXT NOT NULL,
    "actualizadoPorId" TEXT NOT NULL,
    "aprobadoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ds44Miper_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ds44MiperItem" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "miperId" TEXT NOT NULL,
    "centroTrabajoId" TEXT,
    "areaId" TEXT,
    "cargoId" TEXT,
    "actividad" TEXT NOT NULL,
    "peligro" TEXT NOT NULL,
    "riesgo" TEXT NOT NULL,
    "consecuencia" TEXT NOT NULL,
    "probabilidad" INTEGER NOT NULL,
    "severidad" INTEGER NOT NULL,
    "nivelRiesgo" INTEGER NOT NULL,
    "clasificacionRiesgo" TEXT NOT NULL,
    "responsableTrabajadorId" TEXT,
    "observaciones" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "creadoPorId" TEXT NOT NULL,
    "actualizadoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ds44MiperItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ds44MiperControl" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "miperItemId" TEXT NOT NULL,
    "tipoControl" "TipoControlDs44Miper" NOT NULL,
    "descripcion" TEXT NOT NULL,
    "responsableTrabajadorId" TEXT,
    "fechaCompromiso" TIMESTAMP(3),
    "estado" "EstadoControlDs44Miper" NOT NULL DEFAULT 'pendiente',
    "orden" INTEGER NOT NULL DEFAULT 0,
    "creadoPorId" TEXT NOT NULL,
    "actualizadoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ds44MiperControl_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Ds44Miper_empresaId_codigo_version_key" ON "Ds44Miper"("empresaId", "codigo", "version");
CREATE INDEX "Ds44Miper_empresaId_idx" ON "Ds44Miper"("empresaId");
CREATE INDEX "Ds44Miper_estado_idx" ON "Ds44Miper"("estado");
CREATE INDEX "Ds44Miper_creadoPorId_idx" ON "Ds44Miper"("creadoPorId");
CREATE INDEX "Ds44Miper_actualizadoPorId_idx" ON "Ds44Miper"("actualizadoPorId");
CREATE INDEX "Ds44Miper_aprobadoPorId_idx" ON "Ds44Miper"("aprobadoPorId");
CREATE INDEX "Ds44MiperItem_empresaId_idx" ON "Ds44MiperItem"("empresaId");
CREATE INDEX "Ds44MiperItem_miperId_idx" ON "Ds44MiperItem"("miperId");
CREATE INDEX "Ds44MiperItem_centroTrabajoId_idx" ON "Ds44MiperItem"("centroTrabajoId");
CREATE INDEX "Ds44MiperItem_areaId_idx" ON "Ds44MiperItem"("areaId");
CREATE INDEX "Ds44MiperItem_cargoId_idx" ON "Ds44MiperItem"("cargoId");
CREATE INDEX "Ds44MiperItem_responsableTrabajadorId_idx" ON "Ds44MiperItem"("responsableTrabajadorId");
CREATE INDEX "Ds44MiperItem_clasificacionRiesgo_idx" ON "Ds44MiperItem"("clasificacionRiesgo");
CREATE INDEX "Ds44MiperItem_creadoPorId_idx" ON "Ds44MiperItem"("creadoPorId");
CREATE INDEX "Ds44MiperItem_actualizadoPorId_idx" ON "Ds44MiperItem"("actualizadoPorId");
CREATE INDEX "Ds44MiperControl_empresaId_idx" ON "Ds44MiperControl"("empresaId");
CREATE INDEX "Ds44MiperControl_miperItemId_idx" ON "Ds44MiperControl"("miperItemId");
CREATE INDEX "Ds44MiperControl_estado_idx" ON "Ds44MiperControl"("estado");
CREATE INDEX "Ds44MiperControl_responsableTrabajadorId_idx" ON "Ds44MiperControl"("responsableTrabajadorId");
CREATE INDEX "Ds44MiperControl_creadoPorId_idx" ON "Ds44MiperControl"("creadoPorId");
CREATE INDEX "Ds44MiperControl_actualizadoPorId_idx" ON "Ds44MiperControl"("actualizadoPorId");

-- AddForeignKey
ALTER TABLE "Ds44Miper" ADD CONSTRAINT "Ds44Miper_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Ds44Miper" ADD CONSTRAINT "Ds44Miper_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Ds44Miper" ADD CONSTRAINT "Ds44Miper_actualizadoPorId_fkey" FOREIGN KEY ("actualizadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Ds44Miper" ADD CONSTRAINT "Ds44Miper_aprobadoPorId_fkey" FOREIGN KEY ("aprobadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Ds44MiperItem" ADD CONSTRAINT "Ds44MiperItem_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Ds44MiperItem" ADD CONSTRAINT "Ds44MiperItem_miperId_fkey" FOREIGN KEY ("miperId") REFERENCES "Ds44Miper"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Ds44MiperItem" ADD CONSTRAINT "Ds44MiperItem_centroTrabajoId_fkey" FOREIGN KEY ("centroTrabajoId") REFERENCES "CentroTrabajo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Ds44MiperItem" ADD CONSTRAINT "Ds44MiperItem_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Ds44MiperItem" ADD CONSTRAINT "Ds44MiperItem_cargoId_fkey" FOREIGN KEY ("cargoId") REFERENCES "Cargo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Ds44MiperItem" ADD CONSTRAINT "Ds44MiperItem_responsableTrabajadorId_fkey" FOREIGN KEY ("responsableTrabajadorId") REFERENCES "Trabajador"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Ds44MiperItem" ADD CONSTRAINT "Ds44MiperItem_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Ds44MiperItem" ADD CONSTRAINT "Ds44MiperItem_actualizadoPorId_fkey" FOREIGN KEY ("actualizadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Ds44MiperControl" ADD CONSTRAINT "Ds44MiperControl_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Ds44MiperControl" ADD CONSTRAINT "Ds44MiperControl_miperItemId_fkey" FOREIGN KEY ("miperItemId") REFERENCES "Ds44MiperItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Ds44MiperControl" ADD CONSTRAINT "Ds44MiperControl_responsableTrabajadorId_fkey" FOREIGN KEY ("responsableTrabajadorId") REFERENCES "Trabajador"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Ds44MiperControl" ADD CONSTRAINT "Ds44MiperControl_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Ds44MiperControl" ADD CONSTRAINT "Ds44MiperControl_actualizadoPorId_fkey" FOREIGN KEY ("actualizadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
