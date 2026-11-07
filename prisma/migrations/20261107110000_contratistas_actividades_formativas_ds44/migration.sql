CREATE TABLE "ContratistaActividadFormativa" (
  "id" TEXT NOT NULL,
  "empresaId" TEXT NOT NULL,
  "solicitudId" TEXT NOT NULL,
  "recursoId" TEXT NOT NULL,
  "tipo" TEXT NOT NULL,
  "temaCodigo" TEXT NOT NULL,
  "titulo" TEXT NOT NULL,
  "fecha" TIMESTAMP(3) NOT NULL,
  "duracionMinutos" INTEGER NOT NULL,
  "relator" TEXT NOT NULL,
  "contenidosDs44" TEXT,
  "vinculadaCursoDs44" BOOLEAN NOT NULL DEFAULT false,
  "evaluacion" TEXT NOT NULL DEFAULT 'no_informada',
  "archivoNombre" TEXT NOT NULL,
  "archivoOriginal" TEXT NOT NULL,
  "archivoTipo" TEXT,
  "archivoPeso" INTEGER NOT NULL,
  "estado" TEXT NOT NULL DEFAULT 'pendiente_validacion',
  "observacionRevision" TEXT,
  "revisadoAt" TIMESTAMP(3),
  "revisadoPorId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContratistaActividadFormativa_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ContratistaActividadFormativa_empresaId_solicitudId_createdAt_idx" ON "ContratistaActividadFormativa"("empresaId","solicitudId","createdAt");
CREATE INDEX "ContratistaActividadFormativa_recursoId_fecha_idx" ON "ContratistaActividadFormativa"("recursoId","fecha");
CREATE INDEX "ContratistaActividadFormativa_solicitudId_estado_idx" ON "ContratistaActividadFormativa"("solicitudId","estado");
ALTER TABLE "ContratistaActividadFormativa" ADD CONSTRAINT "ContratistaActividadFormativa_solicitudId_fkey" FOREIGN KEY ("solicitudId") REFERENCES "ContratistaSolicitud"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContratistaActividadFormativa" ADD CONSTRAINT "ContratistaActividadFormativa_recursoId_fkey" FOREIGN KEY ("recursoId") REFERENCES "ContratistaRecurso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ContratistaActividadFormativaRevision" (
  "id" TEXT NOT NULL,
  "empresaId" TEXT NOT NULL,
  "solicitudId" TEXT NOT NULL,
  "actividadId" TEXT NOT NULL,
  "estadoAnterior" TEXT NOT NULL,
  "estadoNuevo" TEXT NOT NULL,
  "motivo" TEXT,
  "usuarioId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContratistaActividadFormativaRevision_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ContratistaActividadFormativaRevision_actividadId_createdAt_idx" ON "ContratistaActividadFormativaRevision"("actividadId","createdAt");
CREATE INDEX "ContratistaActividadFormativaRevision_empresaId_solicitudId_createdAt_idx" ON "ContratistaActividadFormativaRevision"("empresaId","solicitudId","createdAt");
ALTER TABLE "ContratistaActividadFormativaRevision" ADD CONSTRAINT "ContratistaActividadFormativaRevision_actividadId_fkey" FOREIGN KEY ("actividadId") REFERENCES "ContratistaActividadFormativa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
