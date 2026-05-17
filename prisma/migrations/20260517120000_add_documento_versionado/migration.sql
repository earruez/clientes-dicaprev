-- AddColumn: versionado e historial a TrabajadorDocumento
ALTER TABLE "TrabajadorDocumento"
  ADD COLUMN "esVigente"        BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "versionNumero"    INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "origen"           TEXT    NOT NULL DEFAULT 'manual',
  ADD COLUMN "reemplazadoPorId" TEXT,
  ADD COLUMN "motivoReemplazo"  TEXT;

-- Drop old unique constraint (permite múltiples versiones por trabajadorId+tipo)
DROP INDEX IF EXISTS "TrabajadorDocumento_trabajadorId_tipo_key";

-- CreateIndex: índice compuesto para consultas de documentos vigentes
CREATE INDEX "TrabajadorDocumento_trabajadorId_tipo_esVigente_idx"
  ON "TrabajadorDocumento"("trabajadorId", "tipo", "esVigente");

-- AddColumn: contexto de origen y snapshot a historial
ALTER TABLE "TrabajadorDocumentoHistorial"
  ADD COLUMN "origen"           TEXT,
  ADD COLUMN "contenidoSnapshot" TEXT;
