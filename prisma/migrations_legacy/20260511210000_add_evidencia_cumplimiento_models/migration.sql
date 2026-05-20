-- CreateTable
CREATE TABLE "EvidenciaCumplimiento" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "fechaEvidencia" TIMESTAMP(3) NOT NULL,
    "observacion" TEXT,
    "archivoNombre" TEXT,
    "archivoUrl" TEXT,
    "archivoTipo" TEXT,
    "archivoPeso" INTEGER,
    "hallazgoId" TEXT,
    "obligacionClave" TEXT,
    "accionPlanId" TEXT,
    "centroTrabajoId" TEXT,
    "trabajadorId" TEXT,
    "creadoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvidenciaCumplimiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidenciaCumplimientoHistorial" (
    "id" TEXT NOT NULL,
    "evidenciaId" TEXT NOT NULL,
    "usuarioId" TEXT,
    "accion" TEXT NOT NULL,
    "detalle" TEXT,
    "estadoAnterior" TEXT,
    "estadoNuevo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvidenciaCumplimientoHistorial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EvidenciaCumplimiento_empresaId_idx" ON "EvidenciaCumplimiento"("empresaId");

-- CreateIndex
CREATE INDEX "EvidenciaCumplimiento_hallazgoId_idx" ON "EvidenciaCumplimiento"("hallazgoId");

-- CreateIndex
CREATE INDEX "EvidenciaCumplimiento_obligacionClave_idx" ON "EvidenciaCumplimiento"("obligacionClave");

-- CreateIndex
CREATE INDEX "EvidenciaCumplimiento_centroTrabajoId_idx" ON "EvidenciaCumplimiento"("centroTrabajoId");

-- CreateIndex
CREATE INDEX "EvidenciaCumplimiento_trabajadorId_idx" ON "EvidenciaCumplimiento"("trabajadorId");

-- CreateIndex
CREATE INDEX "EvidenciaCumplimiento_estado_idx" ON "EvidenciaCumplimiento"("estado");

-- CreateIndex
CREATE INDEX "EvidenciaCumplimiento_fechaEvidencia_idx" ON "EvidenciaCumplimiento"("fechaEvidencia");

-- CreateIndex
CREATE INDEX "EvidenciaCumplimiento_creadoPorId_idx" ON "EvidenciaCumplimiento"("creadoPorId");

-- CreateIndex
CREATE INDEX "EvidenciaCumplimientoHistorial_evidenciaId_idx" ON "EvidenciaCumplimientoHistorial"("evidenciaId");

-- CreateIndex
CREATE INDEX "EvidenciaCumplimientoHistorial_usuarioId_idx" ON "EvidenciaCumplimientoHistorial"("usuarioId");

-- CreateIndex
CREATE INDEX "EvidenciaCumplimientoHistorial_createdAt_idx" ON "EvidenciaCumplimientoHistorial"("createdAt");

-- AddForeignKey
ALTER TABLE "EvidenciaCumplimiento" ADD CONSTRAINT "EvidenciaCumplimiento_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenciaCumplimiento" ADD CONSTRAINT "EvidenciaCumplimiento_hallazgoId_fkey" FOREIGN KEY ("hallazgoId") REFERENCES "HallazgoCumplimiento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenciaCumplimiento" ADD CONSTRAINT "EvidenciaCumplimiento_centroTrabajoId_fkey" FOREIGN KEY ("centroTrabajoId") REFERENCES "CentroTrabajo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenciaCumplimiento" ADD CONSTRAINT "EvidenciaCumplimiento_trabajadorId_fkey" FOREIGN KEY ("trabajadorId") REFERENCES "Trabajador"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenciaCumplimiento" ADD CONSTRAINT "EvidenciaCumplimiento_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenciaCumplimientoHistorial" ADD CONSTRAINT "EvidenciaCumplimientoHistorial_evidenciaId_fkey" FOREIGN KEY ("evidenciaId") REFERENCES "EvidenciaCumplimiento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenciaCumplimientoHistorial" ADD CONSTRAINT "EvidenciaCumplimientoHistorial_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
