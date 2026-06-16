ALTER TABLE "HallazgoCumplimiento"
ADD COLUMN IF NOT EXISTS "checklistRespuestaId" TEXT;

ALTER TABLE "HallazgoCumplimiento"
ADD CONSTRAINT "HallazgoCumplimiento_checklistRespuestaId_fkey"
FOREIGN KEY ("checklistRespuestaId") REFERENCES "ChecklistRespuesta"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "HallazgoCumplimiento_checklistRespuestaId_key"
ON "HallazgoCumplimiento"("checklistRespuestaId");
