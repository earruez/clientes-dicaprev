CREATE TYPE "EstadoSugerenciaDs44Miper" AS ENUM (
  'sugerido',
  'confirmado',
  'no_aplica',
  'revision_tecnica'
);

ALTER TABLE "Ds44Miper"
ADD COLUMN "contextoLevantamiento" JSONB;

ALTER TABLE "Ds44MiperItem"
ADD COLUMN "estadoSugerencia" "EstadoSugerenciaDs44Miper" NOT NULL DEFAULT 'confirmado';

UPDATE "Ds44MiperItem"
SET "estadoSugerencia" = 'no_aplica'
WHERE "confirmadoPorUsuario" = false;

CREATE INDEX "Ds44MiperItem_estadoSugerencia_idx"
ON "Ds44MiperItem"("estadoSugerencia");
