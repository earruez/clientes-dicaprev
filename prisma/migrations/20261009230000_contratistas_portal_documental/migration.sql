-- Expedientes documentales independientes de Acreditaciones.
CREATE TABLE "ContratistaSolicitud" (
  "id" TEXT NOT NULL,
  "empresaId" TEXT NOT NULL,
  "contratistaId" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "faena" TEXT,
  "servicio" TEXT,
  "contactoEmail" TEXT NOT NULL,
  "responsable" TEXT,
  "dotacionEstimada" INTEGER,
  "fechaInicio" TIMESTAMP(3),
  "fechaTermino" TIMESTAMP(3),
  "estado" TEXT NOT NULL DEFAULT 'borrador',
  "tokenHash" TEXT,
  "tokenExpiraAt" TIMESTAMP(3),
  "invitadoAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ContratistaSolicitud_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ContratistaRecurso" (
  "id" TEXT NOT NULL,
  "empresaId" TEXT NOT NULL,
  "solicitudId" TEXT NOT NULL,
  "tipo" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "identificador" TEXT,
  "cargo" TEXT,
  "patente" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContratistaRecurso_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ContratistaRequisito" (
  "id" TEXT NOT NULL,
  "empresaId" TEXT NOT NULL,
  "solicitudId" TEXT NOT NULL,
  "recursoId" TEXT,
  "nombre" TEXT NOT NULL,
  "categoria" TEXT NOT NULL,
  "obligatorio" BOOLEAN NOT NULL DEFAULT true,
  "estado" TEXT NOT NULL DEFAULT 'pendiente',
  "archivoNombre" TEXT,
  "archivoOriginal" TEXT,
  "archivoTipo" TEXT,
  "archivoPeso" INTEGER,
  "fechaEmision" TIMESTAMP(3),
  "fechaVencimiento" TIMESTAMP(3),
  "observacionRevision" TEXT,
  "revisadoPorId" TEXT,
  "revisadoAt" TIMESTAMP(3),
  "version" INTEGER NOT NULL DEFAULT 0,
  "aviso30At" TIMESTAMP(3),
  "aviso15At" TIMESTAMP(3),
  "aviso5At" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ContratistaRequisito_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ContratistaDocumentoVersion" (
  "id" TEXT NOT NULL,
  "requisitoId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "archivoNombre" TEXT NOT NULL,
  "archivoOriginal" TEXT NOT NULL,
  "archivoTipo" TEXT,
  "archivoPeso" INTEGER NOT NULL,
  "fechaEmision" TIMESTAMP(3),
  "fechaVencimiento" TIMESTAMP(3),
  "subidoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContratistaDocumentoVersion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ContratistaSolicitud_tokenHash_key" ON "ContratistaSolicitud"("tokenHash");
CREATE INDEX "ContratistaSolicitud_empresaId_estado_idx" ON "ContratistaSolicitud"("empresaId","estado");
CREATE INDEX "ContratistaSolicitud_contratistaId_idx" ON "ContratistaSolicitud"("contratistaId");
CREATE INDEX "ContratistaRecurso_solicitudId_tipo_idx" ON "ContratistaRecurso"("solicitudId","tipo");
CREATE INDEX "ContratistaRecurso_empresaId_idx" ON "ContratistaRecurso"("empresaId");
CREATE INDEX "ContratistaRequisito_empresaId_estado_idx" ON "ContratistaRequisito"("empresaId","estado");
CREATE INDEX "ContratistaRequisito_solicitudId_categoria_idx" ON "ContratistaRequisito"("solicitudId","categoria");
CREATE INDEX "ContratistaRequisito_recursoId_idx" ON "ContratistaRequisito"("recursoId");
CREATE INDEX "ContratistaRequisito_fechaVencimiento_idx" ON "ContratistaRequisito"("fechaVencimiento");
CREATE UNIQUE INDEX "ContratistaDocumentoVersion_requisitoId_version_key" ON "ContratistaDocumentoVersion"("requisitoId","version");
CREATE INDEX "ContratistaDocumentoVersion_archivoNombre_idx" ON "ContratistaDocumentoVersion"("archivoNombre");
ALTER TABLE "ContratistaSolicitud" ADD CONSTRAINT "ContratistaSolicitud_contratistaId_fkey" FOREIGN KEY ("contratistaId") REFERENCES "Contratista"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContratistaRecurso" ADD CONSTRAINT "ContratistaRecurso_solicitudId_fkey" FOREIGN KEY ("solicitudId") REFERENCES "ContratistaSolicitud"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContratistaRequisito" ADD CONSTRAINT "ContratistaRequisito_solicitudId_fkey" FOREIGN KEY ("solicitudId") REFERENCES "ContratistaSolicitud"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContratistaRequisito" ADD CONSTRAINT "ContratistaRequisito_recursoId_fkey" FOREIGN KEY ("recursoId") REFERENCES "ContratistaRecurso"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContratistaDocumentoVersion" ADD CONSTRAINT "ContratistaDocumentoVersion_requisitoId_fkey" FOREIGN KEY ("requisitoId") REFERENCES "ContratistaRequisito"("id") ON DELETE CASCADE ON UPDATE CASCADE;
