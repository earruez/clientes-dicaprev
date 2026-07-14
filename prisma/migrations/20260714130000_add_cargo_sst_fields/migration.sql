-- Add SST persistence fields for cargos
ALTER TABLE "Cargo"
ADD COLUMN "perfilSstRequerido" TEXT,
ADD COLUMN "riesgosClave" JSONB,
ADD COLUMN "documentosBase" JSONB,
ADD COLUMN "capacitacionesBase" JSONB;
