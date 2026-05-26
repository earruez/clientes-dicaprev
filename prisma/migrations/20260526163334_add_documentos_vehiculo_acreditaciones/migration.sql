/*
  Warnings:

  - Added the required column `empresaId` to the `VehiculoDocumento` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "RequisitoPlantillaAcreditacion" ADD COLUMN     "documentoTipoVehiculoId" TEXT;

-- AlterTable
ALTER TABLE "VehiculoDocumento" ADD COLUMN     "archivoNombreOriginal" TEXT,
ADD COLUMN     "archivoPeso" INTEGER,
ADD COLUMN     "archivoTipo" TEXT,
ADD COLUMN     "empresaId" TEXT NOT NULL,
ADD COLUMN     "estado" TEXT NOT NULL DEFAULT 'pendiente',
ADD COLUMN     "fechaEmision" TIMESTAMP(3),
ADD COLUMN     "fechaVencimiento" TIMESTAMP(3),
ADD COLUMN     "observaciones" TEXT,
ADD COLUMN     "subidoPorId" TEXT,
ADD COLUMN     "tipoDocumentoId" TEXT;

-- CreateTable
CREATE TABLE "DocumentoTipoVehiculo" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "vigenciaDias" INTEGER,
    "requiereVencimiento" BOOLEAN NOT NULL DEFAULT true,
    "requiereArchivo" BOOLEAN NOT NULL DEFAULT true,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentoTipoVehiculo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentoTipoVehiculo_empresaId_idx" ON "DocumentoTipoVehiculo"("empresaId");

-- CreateIndex
CREATE INDEX "DocumentoTipoVehiculo_codigo_idx" ON "DocumentoTipoVehiculo"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentoTipoVehiculo_empresaId_codigo_key" ON "DocumentoTipoVehiculo"("empresaId", "codigo");

-- CreateIndex
CREATE INDEX "RequisitoPlantillaAcreditacion_documentoTipoVehiculoId_idx" ON "RequisitoPlantillaAcreditacion"("documentoTipoVehiculoId");

-- CreateIndex
CREATE INDEX "VehiculoDocumento_empresaId_idx" ON "VehiculoDocumento"("empresaId");

-- CreateIndex
CREATE INDEX "VehiculoDocumento_tipoDocumentoId_idx" ON "VehiculoDocumento"("tipoDocumentoId");

-- CreateIndex
CREATE INDEX "VehiculoDocumento_estado_idx" ON "VehiculoDocumento"("estado");

-- CreateIndex
CREATE INDEX "VehiculoDocumento_fechaVencimiento_idx" ON "VehiculoDocumento"("fechaVencimiento");

-- AddForeignKey
ALTER TABLE "VehiculoDocumento" ADD CONSTRAINT "VehiculoDocumento_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehiculoDocumento" ADD CONSTRAINT "VehiculoDocumento_tipoDocumentoId_fkey" FOREIGN KEY ("tipoDocumentoId") REFERENCES "DocumentoTipoVehiculo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequisitoPlantillaAcreditacion" ADD CONSTRAINT "RequisitoPlantillaAcreditacion_documentoTipoVehiculoId_fkey" FOREIGN KEY ("documentoTipoVehiculoId") REFERENCES "DocumentoTipoVehiculo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoTipoVehiculo" ADD CONSTRAINT "DocumentoTipoVehiculo_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
