-- AlterTable
ALTER TABLE "Ds44PlanAccion" ADD COLUMN "responsableTrabajadorId" TEXT;

-- CreateIndex
CREATE INDEX "Ds44PlanAccion_responsableTrabajadorId_idx" ON "Ds44PlanAccion"("responsableTrabajadorId");

-- AddForeignKey
ALTER TABLE "Ds44PlanAccion" ADD CONSTRAINT "Ds44PlanAccion_responsableTrabajadorId_fkey" FOREIGN KEY ("responsableTrabajadorId") REFERENCES "Trabajador"("id") ON DELETE SET NULL ON UPDATE CASCADE;
