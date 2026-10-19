-- Regla documental que permite configurar requisitos antes de cargar trabajadores.
CREATE TABLE "ContratistaRequisitoRegla" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "solicitudId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "obligatorio" BOOLEAN NOT NULL DEFAULT true,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContratistaRequisitoRegla_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ContratistaRequisito" ADD COLUMN "reglaTrabajadorId" TEXT;

CREATE INDEX "ContratistaRequisitoRegla_empresaId_solicitudId_activo_idx"
    ON "ContratistaRequisitoRegla"("empresaId", "solicitudId", "activo");

CREATE UNIQUE INDEX "ContratistaRequisito_reglaTrabajadorId_recursoId_key"
    ON "ContratistaRequisito"("reglaTrabajadorId", "recursoId");

ALTER TABLE "ContratistaRequisitoRegla"
    ADD CONSTRAINT "ContratistaRequisitoRegla_solicitudId_fkey"
    FOREIGN KEY ("solicitudId") REFERENCES "ContratistaSolicitud"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ContratistaRequisito"
    ADD CONSTRAINT "ContratistaRequisito_reglaTrabajadorId_fkey"
    FOREIGN KEY ("reglaTrabajadorId") REFERENCES "ContratistaRequisitoRegla"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
