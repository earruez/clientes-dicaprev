ALTER TABLE "ContratistaRequisitoRegla" ADD COLUMN "vigenciaMeses" INTEGER;
ALTER TABLE "ContratistaRequisitoRegla" ADD COLUMN "condicional" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ContratistaRequisito" ADD COLUMN "vigenciaMeses" INTEGER;
ALTER TABLE "ContratistaRequisito" ADD COLUMN "condicional" BOOLEAN NOT NULL DEFAULT false;
