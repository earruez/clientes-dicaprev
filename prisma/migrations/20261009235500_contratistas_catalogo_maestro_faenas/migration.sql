-- Separación de documentos permanentes de empresa y documentación por faena.
-- Migración no destructiva: no elimina ni reubica datos existentes.
ALTER TABLE "ContratistaDocumento" ADD COLUMN "archivoOriginal" TEXT;
ALTER TABLE "ContratistaDocumento" ADD COLUMN "archivoTipo" TEXT;
ALTER TABLE "ContratistaDocumento" ADD COLUMN "archivoPeso" INTEGER;
ALTER TABLE "ContratistaDocumento" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;
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

CREATE TABLE "ContratistaDocumentoBaseVersion" (
  "id" TEXT NOT NULL,
  "documentoId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "archivoNombre" TEXT NOT NULL,
  "archivoOriginal" TEXT,
  "archivoTipo" TEXT,
  "archivoPeso" INTEGER,
  "fechaEmision" TIMESTAMP(3),
  "fechaVencimiento" TIMESTAMP(3),
  "subidoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContratistaDocumentoBaseVersion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ContratistaDocumentoBaseVersion_documentoId_version_key" ON "ContratistaDocumentoBaseVersion"("documentoId","version");
CREATE INDEX "ContratistaDocumentoBaseVersion_documentoId_idx" ON "ContratistaDocumentoBaseVersion"("documentoId");
ALTER TABLE "ContratistaDocumentoBaseVersion" ADD CONSTRAINT "ContratistaDocumentoBaseVersion_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "ContratistaDocumento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Registro maestro de recursos del contratista, sin alterar recursos ya asociados a expedientes.
CREATE TABLE "ContratistaRecursoBase" (
  "id" TEXT NOT NULL,
  "empresaId" TEXT NOT NULL,
  "contratistaId" TEXT NOT NULL,
  "tipo" TEXT NOT NULL,
  "clave" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "identificador" TEXT,
  "patente" TEXT,
  "cargo" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ContratistaRecursoBase_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ContratistaRecursoBase_contratistaId_tipo_clave_key" ON "ContratistaRecursoBase"("contratistaId", "tipo", "clave");
CREATE INDEX "ContratistaRecursoBase_empresaId_contratistaId_idx" ON "ContratistaRecursoBase"("empresaId", "contratistaId");
ALTER TABLE "ContratistaRecursoBase" ADD CONSTRAINT "ContratistaRecursoBase_contratistaId_fkey" FOREIGN KEY ("contratistaId") REFERENCES "Contratista"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContratistaRecurso" ADD COLUMN "recursoBaseId" TEXT;
CREATE INDEX "ContratistaRecurso_recursoBaseId_idx" ON "ContratistaRecurso"("recursoBaseId");
ALTER TABLE "ContratistaRecurso" ADD CONSTRAINT "ContratistaRecurso_recursoBaseId_fkey" FOREIGN KEY ("recursoBaseId") REFERENCES "ContratistaRecursoBase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
