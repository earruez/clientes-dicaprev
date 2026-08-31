-- AlterTable
ALTER TABLE "PermisoOrganismo" ADD COLUMN "tipo" TEXT NOT NULL DEFAULT 'MUNICIPAL';

-- CreateIndex
CREATE INDEX "PermisoOrganismo_tipo_idx" ON "PermisoOrganismo"("tipo");
