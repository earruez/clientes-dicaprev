-- CreateTable
CREATE TABLE "PlanCapacitacion" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "periodo" TEXT,
    "anio" INTEGER NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'borrador',
    "version" TEXT NOT NULL,
    "fechaInicio" TIMESTAMP(3),
    "fechaFin" TIMESTAMP(3),
    "aprobadoPorId" TEXT,
    "aprobadoEn" TIMESTAMP(3),
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanCapacitacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanCapacitacionItem" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "capacitacionId" TEXT NOT NULL,
    "cargoId" TEXT,
    "areaId" TEXT,
    "centroTrabajoId" TEXT,
    "periodicidad" TEXT NOT NULL,
    "mesProgramado" INTEGER,
    "obligatorio" BOOLEAN NOT NULL DEFAULT true,
    "estado" TEXT NOT NULL DEFAULT 'activo',
    "responsableId" TEXT,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanCapacitacionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReglaCapacitacionCargo" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "capacitacionId" TEXT NOT NULL,
    "cargoId" TEXT,
    "areaId" TEXT,
    "centroTrabajoId" TEXT,
    "tipoContrato" TEXT,
    "obligatorio" BOOLEAN NOT NULL DEFAULT true,
    "periodicidad" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReglaCapacitacionCargo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlantillaPlanCapacitacion" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "tipoEmpresa" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlantillaPlanCapacitacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlantillaPlanCapacitacionItem" (
    "id" TEXT NOT NULL,
    "plantillaId" TEXT NOT NULL,
    "capacitacionId" TEXT NOT NULL,
    "cargoId" TEXT,
    "areaId" TEXT,
    "centroTrabajoId" TEXT,
    "periodicidad" TEXT NOT NULL,
    "mesProgramado" INTEGER,
    "obligatorio" BOOLEAN NOT NULL DEFAULT true,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlantillaPlanCapacitacionItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlanCapacitacion_empresaId_idx" ON "PlanCapacitacion"("empresaId");

-- CreateIndex
CREATE INDEX "PlanCapacitacion_estado_idx" ON "PlanCapacitacion"("estado");

-- CreateIndex
CREATE INDEX "PlanCapacitacion_anio_idx" ON "PlanCapacitacion"("anio");

-- CreateIndex
CREATE INDEX "PlanCapacitacion_periodo_idx" ON "PlanCapacitacion"("periodo");

-- CreateIndex
CREATE INDEX "PlanCapacitacionItem_planId_idx" ON "PlanCapacitacionItem"("planId");

-- CreateIndex
CREATE INDEX "PlanCapacitacionItem_capacitacionId_idx" ON "PlanCapacitacionItem"("capacitacionId");

-- CreateIndex
CREATE INDEX "PlanCapacitacionItem_cargoId_idx" ON "PlanCapacitacionItem"("cargoId");

-- CreateIndex
CREATE INDEX "PlanCapacitacionItem_areaId_idx" ON "PlanCapacitacionItem"("areaId");

-- CreateIndex
CREATE INDEX "PlanCapacitacionItem_centroTrabajoId_idx" ON "PlanCapacitacionItem"("centroTrabajoId");

-- CreateIndex
CREATE INDEX "PlanCapacitacionItem_estado_idx" ON "PlanCapacitacionItem"("estado");

-- CreateIndex
CREATE INDEX "ReglaCapacitacionCargo_empresaId_idx" ON "ReglaCapacitacionCargo"("empresaId");

-- CreateIndex
CREATE INDEX "ReglaCapacitacionCargo_capacitacionId_idx" ON "ReglaCapacitacionCargo"("capacitacionId");

-- CreateIndex
CREATE INDEX "ReglaCapacitacionCargo_cargoId_idx" ON "ReglaCapacitacionCargo"("cargoId");

-- CreateIndex
CREATE INDEX "ReglaCapacitacionCargo_areaId_idx" ON "ReglaCapacitacionCargo"("areaId");

-- CreateIndex
CREATE INDEX "ReglaCapacitacionCargo_centroTrabajoId_idx" ON "ReglaCapacitacionCargo"("centroTrabajoId");

-- CreateIndex
CREATE INDEX "ReglaCapacitacionCargo_tipoContrato_idx" ON "ReglaCapacitacionCargo"("tipoContrato");

-- CreateIndex
CREATE INDEX "ReglaCapacitacionCargo_activo_idx" ON "ReglaCapacitacionCargo"("activo");

-- CreateIndex
CREATE INDEX "PlantillaPlanCapacitacion_empresaId_idx" ON "PlantillaPlanCapacitacion"("empresaId");

-- CreateIndex
CREATE INDEX "PlantillaPlanCapacitacion_activa_idx" ON "PlantillaPlanCapacitacion"("activa");

-- CreateIndex
CREATE INDEX "PlantillaPlanCapacitacion_tipoEmpresa_idx" ON "PlantillaPlanCapacitacion"("tipoEmpresa");

-- CreateIndex
CREATE INDEX "PlantillaPlanCapacitacionItem_plantillaId_idx" ON "PlantillaPlanCapacitacionItem"("plantillaId");

-- CreateIndex
CREATE INDEX "PlantillaPlanCapacitacionItem_capacitacionId_idx" ON "PlantillaPlanCapacitacionItem"("capacitacionId");

-- CreateIndex
CREATE INDEX "PlantillaPlanCapacitacionItem_cargoId_idx" ON "PlantillaPlanCapacitacionItem"("cargoId");

-- CreateIndex
CREATE INDEX "PlantillaPlanCapacitacionItem_areaId_idx" ON "PlantillaPlanCapacitacionItem"("areaId");

-- CreateIndex
CREATE INDEX "PlantillaPlanCapacitacionItem_centroTrabajoId_idx" ON "PlantillaPlanCapacitacionItem"("centroTrabajoId");

-- AddForeignKey
ALTER TABLE "PlanCapacitacion" ADD CONSTRAINT "PlanCapacitacion_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanCapacitacion" ADD CONSTRAINT "PlanCapacitacion_aprobadoPorId_fkey" FOREIGN KEY ("aprobadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanCapacitacionItem" ADD CONSTRAINT "PlanCapacitacionItem_planId_fkey" FOREIGN KEY ("planId") REFERENCES "PlanCapacitacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanCapacitacionItem" ADD CONSTRAINT "PlanCapacitacionItem_capacitacionId_fkey" FOREIGN KEY ("capacitacionId") REFERENCES "Capacitacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanCapacitacionItem" ADD CONSTRAINT "PlanCapacitacionItem_cargoId_fkey" FOREIGN KEY ("cargoId") REFERENCES "Cargo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanCapacitacionItem" ADD CONSTRAINT "PlanCapacitacionItem_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanCapacitacionItem" ADD CONSTRAINT "PlanCapacitacionItem_centroTrabajoId_fkey" FOREIGN KEY ("centroTrabajoId") REFERENCES "CentroTrabajo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanCapacitacionItem" ADD CONSTRAINT "PlanCapacitacionItem_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReglaCapacitacionCargo" ADD CONSTRAINT "ReglaCapacitacionCargo_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReglaCapacitacionCargo" ADD CONSTRAINT "ReglaCapacitacionCargo_capacitacionId_fkey" FOREIGN KEY ("capacitacionId") REFERENCES "Capacitacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReglaCapacitacionCargo" ADD CONSTRAINT "ReglaCapacitacionCargo_cargoId_fkey" FOREIGN KEY ("cargoId") REFERENCES "Cargo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReglaCapacitacionCargo" ADD CONSTRAINT "ReglaCapacitacionCargo_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReglaCapacitacionCargo" ADD CONSTRAINT "ReglaCapacitacionCargo_centroTrabajoId_fkey" FOREIGN KEY ("centroTrabajoId") REFERENCES "CentroTrabajo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlantillaPlanCapacitacion" ADD CONSTRAINT "PlantillaPlanCapacitacion_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlantillaPlanCapacitacionItem" ADD CONSTRAINT "PlantillaPlanCapacitacionItem_plantillaId_fkey" FOREIGN KEY ("plantillaId") REFERENCES "PlantillaPlanCapacitacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlantillaPlanCapacitacionItem" ADD CONSTRAINT "PlantillaPlanCapacitacionItem_capacitacionId_fkey" FOREIGN KEY ("capacitacionId") REFERENCES "Capacitacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlantillaPlanCapacitacionItem" ADD CONSTRAINT "PlantillaPlanCapacitacionItem_cargoId_fkey" FOREIGN KEY ("cargoId") REFERENCES "Cargo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlantillaPlanCapacitacionItem" ADD CONSTRAINT "PlantillaPlanCapacitacionItem_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlantillaPlanCapacitacionItem" ADD CONSTRAINT "PlantillaPlanCapacitacionItem_centroTrabajoId_fkey" FOREIGN KEY ("centroTrabajoId") REFERENCES "CentroTrabajo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
