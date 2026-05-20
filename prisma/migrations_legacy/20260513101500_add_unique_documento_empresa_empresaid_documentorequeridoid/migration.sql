-- Fase 26.1.2: Blindaje definitivo anti-duplicados en DocumentoEmpresa
-- Permite multiples filas con documentoRequeridoId NULL (comportamiento de Postgres en UNIQUE)
CREATE UNIQUE INDEX IF NOT EXISTS "DocumentoEmpresa_empresaId_documentoRequeridoId_key"
ON "DocumentoEmpresa"("empresaId", "documentoRequeridoId");
