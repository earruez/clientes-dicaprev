-- CreateTable
CREATE TABLE "DocumentoGeneradoRegistro" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "usuarioId" TEXT,
    "modulo" TEXT NOT NULL,
    "tipoDocumento" TEXT NOT NULL,
    "entidadTipo" TEXT NOT NULL,
    "entidadId" TEXT,
    "nombre" TEXT NOT NULL,
    "formato" TEXT NOT NULL,
    "archivoNombre" TEXT,
    "archivoNombreOriginal" TEXT,
    "archivoUrl" TEXT,
    "archivoTipo" TEXT,
    "archivoPeso" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentoGeneradoRegistro_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentoGeneradoRegistro_empresaId_idx" ON "DocumentoGeneradoRegistro"("empresaId");

-- CreateIndex
CREATE INDEX "DocumentoGeneradoRegistro_usuarioId_idx" ON "DocumentoGeneradoRegistro"("usuarioId");

-- CreateIndex
CREATE INDEX "DocumentoGeneradoRegistro_modulo_idx" ON "DocumentoGeneradoRegistro"("modulo");

-- CreateIndex
CREATE INDEX "DocumentoGeneradoRegistro_tipoDocumento_idx" ON "DocumentoGeneradoRegistro"("tipoDocumento");

-- CreateIndex
CREATE INDEX "DocumentoGeneradoRegistro_entidadTipo_entidadId_idx" ON "DocumentoGeneradoRegistro"("entidadTipo", "entidadId");

-- CreateIndex
CREATE INDEX "DocumentoGeneradoRegistro_createdAt_idx" ON "DocumentoGeneradoRegistro"("createdAt");

-- AddForeignKey
ALTER TABLE "DocumentoGeneradoRegistro" ADD CONSTRAINT "DocumentoGeneradoRegistro_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoGeneradoRegistro" ADD CONSTRAINT "DocumentoGeneradoRegistro_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
