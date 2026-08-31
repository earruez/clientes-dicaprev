-- AlterTable: comuna/región de la instalación + token de respuesta a observaciones
ALTER TABLE "PermisoInstalacion"
    ADD COLUMN "comuna" TEXT,
    ADD COLUMN "region" TEXT,
    ADD COLUMN "tokenRespuestaObservacion" TEXT,
    ADD COLUMN "tokenRespuestaUsado" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "PermisoInstalacion_tokenRespuestaObservacion_key" ON "PermisoInstalacion"("tokenRespuestaObservacion");

-- CreateTable: multi-responsables por permiso
CREATE TABLE "PermisoInstalacionResponsable" (
    "id" TEXT NOT NULL,
    "permisoId" TEXT NOT NULL,
    "responsableId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PermisoInstalacionResponsable_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PermisoInstalacionResponsable_permisoId_responsableId_key" ON "PermisoInstalacionResponsable"("permisoId", "responsableId");

-- CreateIndex
CREATE INDEX "PermisoInstalacionResponsable_permisoId_idx" ON "PermisoInstalacionResponsable"("permisoId");

-- CreateIndex
CREATE INDEX "PermisoInstalacionResponsable_responsableId_idx" ON "PermisoInstalacionResponsable"("responsableId");

-- AddForeignKey
ALTER TABLE "PermisoInstalacionResponsable" ADD CONSTRAINT "PermisoInstalacionResponsable_permisoId_fkey" FOREIGN KEY ("permisoId") REFERENCES "PermisoInstalacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermisoInstalacionResponsable" ADD CONSTRAINT "PermisoInstalacionResponsable_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "PermisoResponsable"("id") ON DELETE CASCADE ON UPDATE CASCADE;
