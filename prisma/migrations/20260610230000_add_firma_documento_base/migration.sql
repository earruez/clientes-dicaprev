-- Reparación histórica: FirmaDocumento fue incorporada al schema el 10-06-2026
-- sin una migración que creara la tabla. Esta migración debe ejecutarse antes de
-- 20260618174000_firma_simple_electronica_mvp, que posteriormente la modifica.
--
-- Se usan guardas para que también sea segura en bases donde la tabla o enums
-- hayan sido creados previamente mediante db push u otra sincronización manual.

DO $$
BEGIN
  CREATE TYPE "DocumentoOrigenFirma" AS ENUM (
    'documento_trabajador',
    'documento_empresa',
    'entrega_epp',
    'capacitacion',
    'induccion',
    'acreditacion',
    'otro'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "EstadoFirmaDocumento" AS ENUM (
    'pendiente',
    'firmado',
    'rechazado',
    'expirado'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "FirmaDocumento" (
  "id" TEXT NOT NULL,
  "empresaId" TEXT NOT NULL,
  "trabajadorId" TEXT,
  "documentoId" TEXT NOT NULL,
  "documentoOrigen" "DocumentoOrigenFirma" NOT NULL,
  "token" TEXT NOT NULL,
  "estado" "EstadoFirmaDocumento" NOT NULL DEFAULT 'pendiente',
  "tituloDocumento" TEXT NOT NULL,
  "descripcion" TEXT,
  "nombreFirmante" TEXT,
  "rutFirmante" TEXT,
  "emailFirmante" TEXT,
  "aceptoLectura" BOOLEAN NOT NULL DEFAULT false,
  "firmaSvg" TEXT,
  "firmaTexto" TEXT,
  "ipFirma" TEXT,
  "userAgentFirma" TEXT,
  "hashDocumento" TEXT,
  "expiresAt" TIMESTAMP(3),
  "firmadoAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "FirmaDocumento_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "FirmaDocumento_token_key"
  ON "FirmaDocumento"("token");
CREATE INDEX IF NOT EXISTS "FirmaDocumento_empresaId_idx"
  ON "FirmaDocumento"("empresaId");
CREATE INDEX IF NOT EXISTS "FirmaDocumento_trabajadorId_idx"
  ON "FirmaDocumento"("trabajadorId");
CREATE INDEX IF NOT EXISTS "FirmaDocumento_documentoId_idx"
  ON "FirmaDocumento"("documentoId");
CREATE INDEX IF NOT EXISTS "FirmaDocumento_estado_idx"
  ON "FirmaDocumento"("estado");
CREATE INDEX IF NOT EXISTS "FirmaDocumento_token_idx"
  ON "FirmaDocumento"("token");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'FirmaDocumento_empresaId_fkey'
  ) THEN
    ALTER TABLE "FirmaDocumento"
      ADD CONSTRAINT "FirmaDocumento_empresaId_fkey"
      FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'FirmaDocumento_trabajadorId_fkey'
  ) THEN
    ALTER TABLE "FirmaDocumento"
      ADD CONSTRAINT "FirmaDocumento_trabajadorId_fkey"
      FOREIGN KEY ("trabajadorId") REFERENCES "Trabajador"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
