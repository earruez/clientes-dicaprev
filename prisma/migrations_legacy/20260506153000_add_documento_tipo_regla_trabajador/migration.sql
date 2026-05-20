-- Fase 15.3 - Control documental trabajadores (modelos base)
-- Agrega DocumentoTipoTrabajador y ReglaDocumentoTrabajador sin alterar datos existentes.

CREATE TABLE IF NOT EXISTS "DocumentoTipoTrabajador" (
  "id" TEXT NOT NULL,
  "empresaId" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "codigo" TEXT NOT NULL,
  "descripcion" TEXT,
  "vigenciaDias" INTEGER,
  "requiereVencimiento" BOOLEAN NOT NULL DEFAULT false,
  "requiereArchivo" BOOLEAN NOT NULL DEFAULT true,
  "activo" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DocumentoTipoTrabajador_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DocumentoTipoTrabajador_empresaId_fkey"
    FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "DocumentoTipoTrabajador_empresaId_codigo_key"
  ON "DocumentoTipoTrabajador"("empresaId", "codigo");

CREATE INDEX IF NOT EXISTS "DocumentoTipoTrabajador_empresaId_idx"
  ON "DocumentoTipoTrabajador"("empresaId");

CREATE TABLE IF NOT EXISTS "ReglaDocumentoTrabajador" (
  "id" TEXT NOT NULL,
  "empresaId" TEXT NOT NULL,
  "tipoDocumentoId" TEXT NOT NULL,
  "cargoId" TEXT,
  "areaId" TEXT,
  "centroTrabajoId" TEXT,
  "tipoContrato" TEXT,
  "obligatorio" BOOLEAN NOT NULL DEFAULT true,
  "activo" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReglaDocumentoTrabajador_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ReglaDocumentoTrabajador_empresaId_fkey"
    FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ReglaDocumentoTrabajador_tipoDocumentoId_fkey"
    FOREIGN KEY ("tipoDocumentoId") REFERENCES "DocumentoTipoTrabajador"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ReglaDocumentoTrabajador_cargoId_fkey"
    FOREIGN KEY ("cargoId") REFERENCES "Cargo"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ReglaDocumentoTrabajador_areaId_fkey"
    FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ReglaDocumentoTrabajador_centroTrabajoId_fkey"
    FOREIGN KEY ("centroTrabajoId") REFERENCES "CentroTrabajo"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ReglaDocumentoTrabajador_empresaId_idx"
  ON "ReglaDocumentoTrabajador"("empresaId");

CREATE INDEX IF NOT EXISTS "ReglaDocumentoTrabajador_tipoDocumentoId_idx"
  ON "ReglaDocumentoTrabajador"("tipoDocumentoId");

CREATE INDEX IF NOT EXISTS "ReglaDocumentoTrabajador_cargoId_idx"
  ON "ReglaDocumentoTrabajador"("cargoId");

CREATE INDEX IF NOT EXISTS "ReglaDocumentoTrabajador_areaId_idx"
  ON "ReglaDocumentoTrabajador"("areaId");

CREATE INDEX IF NOT EXISTS "ReglaDocumentoTrabajador_centroTrabajoId_idx"
  ON "ReglaDocumentoTrabajador"("centroTrabajoId");
