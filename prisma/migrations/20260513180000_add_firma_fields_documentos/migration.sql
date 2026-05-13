-- Fase 26.9 — Firma digital simple de documentos
ALTER TABLE "DocumentoEmpresa"
  ADD COLUMN IF NOT EXISTS "firmado" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "firmadoPor" TEXT,
  ADD COLUMN IF NOT EXISTS "firmadoEn" TIMESTAMPTZ;

ALTER TABLE "TrabajadorDocumento"
  ADD COLUMN IF NOT EXISTS "firmado" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "firmadoPor" TEXT,
  ADD COLUMN IF NOT EXISTS "firmadoEn" TIMESTAMPTZ;
