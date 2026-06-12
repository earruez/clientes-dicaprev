ALTER TABLE "CapacitacionSesion"
ADD COLUMN "videoUrl" TEXT,
ADD COLUMN "videoDuracionSegundos" INTEGER,
ADD COLUMN "minimoVisualizacionPct" INTEGER NOT NULL DEFAULT 85,
ADD COLUMN "evaluacionPreguntas" JSONB,
ADD COLUMN "evaluacionMinimoAprobacion" INTEGER NOT NULL DEFAULT 70;
