ALTER TABLE "HallazgoCumplimiento"
ADD COLUMN IF NOT EXISTS "checklistRespuestaId" TEXT;

DO $$
BEGIN
	IF to_regclass('"ChecklistRespuesta"') IS NOT NULL THEN
		IF NOT EXISTS (
			SELECT 1
			FROM pg_constraint
			WHERE conname = 'HallazgoCumplimiento_checklistRespuestaId_fkey'
		) THEN
			ALTER TABLE "HallazgoCumplimiento"
			ADD CONSTRAINT "HallazgoCumplimiento_checklistRespuestaId_fkey"
			FOREIGN KEY ("checklistRespuestaId") REFERENCES "ChecklistRespuesta"("id")
			ON DELETE SET NULL ON UPDATE CASCADE;
		END IF;
	END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "HallazgoCumplimiento_checklistRespuestaId_key"
ON "HallazgoCumplimiento"("checklistRespuestaId");
