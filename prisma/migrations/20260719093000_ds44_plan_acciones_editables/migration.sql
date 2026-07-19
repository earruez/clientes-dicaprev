-- CreateTable
CREATE TABLE "Ds44PlanAccion" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "diagnosticoId" TEXT,
    "preguntaClave" TEXT NOT NULL,
    "bloque" TEXT,
    "prioridad" TEXT NOT NULL,
    "accionSugerida" TEXT NOT NULL,
    "recomendacion" TEXT NOT NULL,
    "evidenciaEsperada" TEXT,
    "rutaSugerida" TEXT,
    "frenteOperativo" TEXT,
    "responsableSugerido" TEXT,
    "responsableReal" TEXT,
    "fechaCompromiso" TIMESTAMP(3),
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "observacionTecnica" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ds44PlanAccion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Ds44PlanAccion_empresaId_idx" ON "Ds44PlanAccion"("empresaId");

-- CreateIndex
CREATE INDEX "Ds44PlanAccion_diagnosticoId_idx" ON "Ds44PlanAccion"("diagnosticoId");

-- CreateIndex
CREATE INDEX "Ds44PlanAccion_prioridad_idx" ON "Ds44PlanAccion"("prioridad");

-- CreateIndex
CREATE INDEX "Ds44PlanAccion_estado_idx" ON "Ds44PlanAccion"("estado");

-- CreateIndex
CREATE INDEX "Ds44PlanAccion_fechaCompromiso_idx" ON "Ds44PlanAccion"("fechaCompromiso");

-- CreateIndex
CREATE UNIQUE INDEX "Ds44PlanAccion_empresaId_preguntaClave_key" ON "Ds44PlanAccion"("empresaId", "preguntaClave");

-- AddForeignKey
ALTER TABLE "Ds44PlanAccion" ADD CONSTRAINT "Ds44PlanAccion_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ds44PlanAccion" ADD CONSTRAINT "Ds44PlanAccion_diagnosticoId_fkey" FOREIGN KEY ("diagnosticoId") REFERENCES "Ds44Diagnostico"("id") ON DELETE SET NULL ON UPDATE CASCADE;

