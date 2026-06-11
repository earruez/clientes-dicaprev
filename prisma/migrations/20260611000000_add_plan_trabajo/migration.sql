-- CreateTable
CREATE TABLE "PlanTrabajo" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "anio" INTEGER NOT NULL,
    "estadoPlan" TEXT NOT NULL DEFAULT 'borrador',
    "version" INTEGER NOT NULL DEFAULT 1,
    "aprobadoPor" TEXT,
    "aprobadoCargo" TEXT,
    "aprobadoEn" TIMESTAMP(3),
    "rechazadoPor" TEXT,
    "rechazadoCargo" TEXT,
    "rechazadoEn" TIMESTAMP(3),
    "motivoRechazo" TEXT,
    "enviadoRevisionEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanTrabajo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActividadPlanTrabajo" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "actividad" TEXT NOT NULL,
    "normativa" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "periodicidad" TEXT NOT NULL,
    "responsable" TEXT NOT NULL,
    "centroContratista" TEXT NOT NULL,
    "requiereEvidencia" BOOLEAN NOT NULL DEFAULT false,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "critica" BOOLEAN NOT NULL DEFAULT false,
    "mesesEstados" JSONB NOT NULL DEFAULT '{}',
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActividadPlanTrabajo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidenciaActividadPlan" (
    "id" TEXT NOT NULL,
    "actividadId" TEXT NOT NULL,
    "archivo" TEXT NOT NULL,
    "archivoUrl" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" TEXT NOT NULL DEFAULT 'cargada',
    "observacion" TEXT,
    "creadoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvidenciaActividadPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistorialPlanTrabajo" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "usuario" TEXT NOT NULL,
    "archivo" TEXT,
    "actividadId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistorialPlanTrabajo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlanTrabajo_empresaId_anio_key" ON "PlanTrabajo"("empresaId", "anio");

-- CreateIndex
CREATE INDEX "PlanTrabajo_empresaId_idx" ON "PlanTrabajo"("empresaId");

-- CreateIndex
CREATE INDEX "PlanTrabajo_anio_idx" ON "PlanTrabajo"("anio");

-- CreateIndex
CREATE INDEX "PlanTrabajo_estadoPlan_idx" ON "PlanTrabajo"("estadoPlan");

-- CreateIndex
CREATE INDEX "ActividadPlanTrabajo_planId_idx" ON "ActividadPlanTrabajo"("planId");

-- CreateIndex
CREATE INDEX "ActividadPlanTrabajo_estado_idx" ON "ActividadPlanTrabajo"("estado");

-- CreateIndex
CREATE INDEX "EvidenciaActividadPlan_actividadId_idx" ON "EvidenciaActividadPlan"("actividadId");

-- CreateIndex
CREATE INDEX "EvidenciaActividadPlan_estado_idx" ON "EvidenciaActividadPlan"("estado");

-- CreateIndex
CREATE INDEX "HistorialPlanTrabajo_planId_idx" ON "HistorialPlanTrabajo"("planId");

-- CreateIndex
CREATE INDEX "HistorialPlanTrabajo_createdAt_idx" ON "HistorialPlanTrabajo"("createdAt");

-- AddForeignKey
ALTER TABLE "PlanTrabajo" ADD CONSTRAINT "PlanTrabajo_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActividadPlanTrabajo" ADD CONSTRAINT "ActividadPlanTrabajo_planId_fkey" FOREIGN KEY ("planId") REFERENCES "PlanTrabajo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenciaActividadPlan" ADD CONSTRAINT "EvidenciaActividadPlan_actividadId_fkey" FOREIGN KEY ("actividadId") REFERENCES "ActividadPlanTrabajo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistorialPlanTrabajo" ADD CONSTRAINT "HistorialPlanTrabajo_planId_fkey" FOREIGN KEY ("planId") REFERENCES "PlanTrabajo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
