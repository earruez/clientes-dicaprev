-- AlterTable
ALTER TABLE "RequisitoPlantillaAcreditacion"
ADD COLUMN "documentoRequeridoEmpresaId" TEXT,
ADD COLUMN "documentoTipoTrabajadorId" TEXT;

-- CreateIndex
CREATE INDEX "RequisitoPlantillaAcreditacion_codigoDocumento_idx" ON "RequisitoPlantillaAcreditacion"("codigoDocumento");

-- CreateIndex
CREATE INDEX "RequisitoPlantillaAcreditacion_documentoRequeridoEmpresaId_idx" ON "RequisitoPlantillaAcreditacion"("documentoRequeridoEmpresaId");

-- CreateIndex
CREATE INDEX "RequisitoPlantillaAcreditacion_documentoTipoTrabajadorId_idx" ON "RequisitoPlantillaAcreditacion"("documentoTipoTrabajadorId");

-- AddForeignKey
ALTER TABLE "RequisitoPlantillaAcreditacion"
ADD CONSTRAINT "RequisitoPlantillaAcreditacion_documentoRequeridoEmpresaId_fkey"
FOREIGN KEY ("documentoRequeridoEmpresaId")
REFERENCES "DocumentoRequeridoEmpresa"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequisitoPlantillaAcreditacion"
ADD CONSTRAINT "RequisitoPlantillaAcreditacion_documentoTipoTrabajadorId_fkey"
FOREIGN KEY ("documentoTipoTrabajadorId")
REFERENCES "DocumentoTipoTrabajador"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
