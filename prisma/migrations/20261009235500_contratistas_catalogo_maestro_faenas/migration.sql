-- Separación de documentos permanentes de empresa y documentación por faena.
-- Migración no destructiva: no elimina ni reubica datos existentes.
ALTER TABLE "ContratistaSolicitud" ADD COLUMN "centroTrabajoId" TEXT;
ALTER TABLE "ContratistaRequisito" ADD COLUMN "alcance" TEXT NOT NULL DEFAULT 'faena';
ALTER TABLE "ContratistaRequisito" ADD COLUMN "documentoBaseId" TEXT;

CREATE TABLE "ContratistaCatalogoRequisito" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "alcance" TEXT NOT NULL DEFAULT 'faena',
    "categoria" TEXT NOT NULL DEFAULT 'empresa',
    "grupo" TEXT NOT NULL DEFAULT 'Otros',
    "obligatorio" BOOLEAN NOT NULL DEFAULT false,
    "requiereVencimiento" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ContratistaCatalogoRequisito_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ContratistaCatalogoRequisito_empresaId_clave_alcance_key" ON "ContratistaCatalogoRequisito"("empresaId","clave","alcance");
CREATE INDEX "ContratistaCatalogoRequisito_empresaId_activo_idx" ON "ContratistaCatalogoRequisito"("empresaId","activo");
CREATE INDEX "ContratistaSolicitud_centroTrabajoId_idx" ON "ContratistaSolicitud"("centroTrabajoId");
CREATE INDEX "ContratistaRequisito_documentoBaseId_idx" ON "ContratistaRequisito"("documentoBaseId");
ALTER TABLE "ContratistaSolicitud" ADD CONSTRAINT "ContratistaSolicitud_centroTrabajoId_fkey" FOREIGN KEY ("centroTrabajoId") REFERENCES "CentroTrabajo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ContratistaRequisito" ADD CONSTRAINT "ContratistaRequisito_documentoBaseId_fkey" FOREIGN KEY ("documentoBaseId") REFERENCES "ContratistaDocumento"("id") ON DELETE SET NULL ON UPDATE CASCADE;
