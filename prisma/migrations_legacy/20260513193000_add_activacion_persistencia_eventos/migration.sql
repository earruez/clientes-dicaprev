-- Fase 28.2 — Persistencia y analitica de activacion
ALTER TABLE "Empresa"
  ADD COLUMN IF NOT EXISTS "activacionPasoActual" INTEGER,
  ADD COLUMN IF NOT EXISTS "activacionCompletada" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "activacionCompletadaEn" TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS "ActivacionEvento" (
  "id" TEXT NOT NULL,
  "empresaId" TEXT NOT NULL,
  "usuarioId" TEXT,
  "evento" TEXT NOT NULL,
  "pasoActual" INTEGER,
  "metadata" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ActivacionEvento_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ActivacionEvento_empresaId_evento_idx"
  ON "ActivacionEvento"("empresaId", "evento");

CREATE INDEX IF NOT EXISTS "ActivacionEvento_createdAt_idx"
  ON "ActivacionEvento"("createdAt");

ALTER TABLE "ActivacionEvento"
  ADD CONSTRAINT "ActivacionEvento_empresaId_fkey"
  FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ActivacionEvento"
  ADD CONSTRAINT "ActivacionEvento_usuarioId_fkey"
  FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
