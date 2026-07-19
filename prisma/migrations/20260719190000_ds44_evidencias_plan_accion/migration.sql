-- AlterTable
ALTER TABLE "EvidenciaCumplimiento" ADD COLUMN "ds44PlanAccionId" TEXT;

-- CreateIndex
CREATE INDEX "EvidenciaCumplimiento_ds44PlanAccionId_idx" ON "EvidenciaCumplimiento"("ds44PlanAccionId");

-- AddForeignKey
ALTER TABLE "EvidenciaCumplimiento" ADD CONSTRAINT "EvidenciaCumplimiento_ds44PlanAccionId_fkey" FOREIGN KEY ("ds44PlanAccionId") REFERENCES "Ds44PlanAccion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
