-- AlterTable
ALTER TABLE "Ds44Miper"
  ADD COLUMN "procesoResponsableId" TEXT;

-- CreateIndex
CREATE INDEX "Ds44Miper_procesoResponsableId_idx" ON "Ds44Miper"("procesoResponsableId");

-- AddForeignKey
ALTER TABLE "Ds44Miper"
  ADD CONSTRAINT "Ds44Miper_procesoResponsableId_fkey"
  FOREIGN KEY ("procesoResponsableId") REFERENCES "Trabajador"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
