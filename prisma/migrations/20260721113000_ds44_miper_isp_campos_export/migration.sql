-- CreateEnum
CREATE TYPE "TipoProcesoDs44Miper" AS ENUM ('operacional', 'apoyo');

-- AlterTable
ALTER TABLE "Ds44Miper"
  ADD COLUMN "procesoNombre" TEXT,
  ADD COLUMN "procesoTipo" "TipoProcesoDs44Miper",
  ADD COLUMN "procesoResponsable" TEXT;

-- AlterTable
ALTER TABLE "Ds44MiperItem"
  ADD COLUMN "peligroGente" TEXT,
  ADD COLUMN "peligroEquipos" TEXT,
  ADD COLUMN "peligroMateriales" TEXT,
  ADD COLUMN "peligroAmbiente" TEXT,
  ADD COLUMN "peligroDescripcion" TEXT;

-- AlterTable
ALTER TABLE "Ds44MiperTarea"
  ADD COLUMN "esRutinaria" BOOLEAN,
  ADD COLUMN "lugarEspecifico" TEXT,
  ADD COLUMN "personasExpuestasTotal" INTEGER,
  ADD COLUMN "distribucionSexogenerica" JSONB,
  ADD COLUMN "observaciones" TEXT;
