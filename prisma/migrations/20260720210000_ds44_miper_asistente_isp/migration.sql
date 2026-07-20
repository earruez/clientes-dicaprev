-- Fase 5B: asistente MIPER alineado con la metodología ISP.
-- Los valores 5x5 existentes se conservan y quedan identificados como legacy_5x5.
CREATE TYPE "CategoriaRiesgoDs44Miper" AS ENUM ('seguridad', 'emergencia', 'higienico', 'psicosocial', 'musculoesqueletico');
CREATE TYPE "MetodologiaEvaluacionDs44Miper" AS ENUM ('legacy_5x5', 'vep_isp', 'evaluacion_especifica');
CREATE TYPE "EstadoEvaluacionEspecificaDs44Miper" AS ENUM ('pendiente', 'en_evaluacion', 'evaluado');
CREATE TYPE "RespuestaExposicionDs44Miper" AS ENUM ('aplica', 'no_aplica', 'no_se');
CREATE TYPE "OrigenTareaDs44Miper" AS ENUM ('manual', 'ia');

ALTER TABLE "Ds44Miper"
  ADD COLUMN "versionAnteriorId" TEXT,
  ADD COLUMN "responsableElaboracionId" TEXT,
  ADD COLUMN "modoCreacion" TEXT NOT NULL DEFAULT 'experto',
  ADD COLUMN "asistentePaso" INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX "Ds44Miper_versionAnteriorId_key" ON "Ds44Miper"("versionAnteriorId");
CREATE INDEX "Ds44Miper_responsableElaboracionId_idx" ON "Ds44Miper"("responsableElaboracionId");

ALTER TABLE "Ds44Miper"
  ADD CONSTRAINT "Ds44Miper_versionAnteriorId_fkey" FOREIGN KEY ("versionAnteriorId") REFERENCES "Ds44Miper"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "Ds44Miper_responsableElaboracionId_fkey" FOREIGN KEY ("responsableElaboracionId") REFERENCES "Trabajador"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Ds44MiperItem"
  ALTER COLUMN "probabilidad" DROP NOT NULL,
  ALTER COLUMN "severidad" DROP NOT NULL,
  ALTER COLUMN "nivelRiesgo" DROP NOT NULL,
  ALTER COLUMN "clasificacionRiesgo" DROP NOT NULL,
  ADD COLUMN "categoriaRiesgo" "CategoriaRiesgoDs44Miper",
  ADD COLUMN "metodologiaEvaluacion" "MetodologiaEvaluacionDs44Miper" NOT NULL DEFAULT 'legacy_5x5',
  ADD COLUMN "catalogoRiesgoId" TEXT,
  ADD COLUMN "tareaId" TEXT,
  ADD COLUMN "codigoIsp" TEXT,
  ADD COLUMN "requiereEvaluacionEspecifica" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "magnitudExposicion" TEXT,
  ADD COLUMN "nivelRiesgoEspecifico" TEXT,
  ADD COLUMN "protocoloAplicable" TEXT,
  ADD COLUMN "estadoEvaluacionEspecifica" "EstadoEvaluacionEspecificaDs44Miper",
  ADD COLUMN "observacionTecnica" TEXT,
  ADD COLUMN "motivoSugerencia" TEXT,
  ADD COLUMN "confirmadoPorUsuario" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "Ds44MiperRiesgoCatalogo" (
  "id" TEXT NOT NULL,
  "familia" TEXT NOT NULL,
  "categoria" "CategoriaRiesgoDs44Miper" NOT NULL,
  "codigoIsp" TEXT NOT NULL,
  "riesgoEspecifico" TEXT NOT NULL,
  "definicion" TEXT NOT NULL,
  "metodologiaEvaluacion" "MetodologiaEvaluacionDs44Miper" NOT NULL,
  "protocoloAplicable" TEXT,
  "activo" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Ds44MiperRiesgoCatalogo_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Ds44MiperAsistenteCargo" (
  "id" TEXT NOT NULL,
  "empresaId" TEXT NOT NULL,
  "miperId" TEXT NOT NULL,
  "cargoId" TEXT NOT NULL,
  "centroTrabajoId" TEXT NOT NULL,
  "areaId" TEXT NOT NULL,
  "descripcionTrabajo" TEXT,
  "orden" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Ds44MiperAsistenteCargo_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Ds44MiperTarea" (
  "id" TEXT NOT NULL,
  "empresaId" TEXT NOT NULL,
  "miperId" TEXT NOT NULL,
  "asistenteCargoId" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "origen" "OrigenTareaDs44Miper" NOT NULL DEFAULT 'manual',
  "confirmada" BOOLEAN NOT NULL DEFAULT false,
  "orden" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Ds44MiperTarea_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Ds44MiperExposicionRespuesta" (
  "id" TEXT NOT NULL,
  "empresaId" TEXT NOT NULL,
  "tareaId" TEXT NOT NULL,
  "grupo" TEXT NOT NULL,
  "clave" TEXT NOT NULL,
  "pregunta" TEXT NOT NULL,
  "respuesta" "RespuestaExposicionDs44Miper" NOT NULL,
  "revisionTecnicaPendiente" BOOLEAN NOT NULL DEFAULT false,
  "observacion" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Ds44MiperExposicionRespuesta_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Ds44MiperRiesgoCatalogo_codigoIsp_key" ON "Ds44MiperRiesgoCatalogo"("codigoIsp");
CREATE INDEX "Ds44MiperRiesgoCatalogo_categoria_idx" ON "Ds44MiperRiesgoCatalogo"("categoria");
CREATE INDEX "Ds44MiperRiesgoCatalogo_activo_idx" ON "Ds44MiperRiesgoCatalogo"("activo");
CREATE UNIQUE INDEX "Ds44MiperAsistenteCargo_miperId_cargoId_key" ON "Ds44MiperAsistenteCargo"("miperId", "cargoId");
CREATE INDEX "Ds44MiperAsistenteCargo_empresaId_idx" ON "Ds44MiperAsistenteCargo"("empresaId");
CREATE INDEX "Ds44MiperAsistenteCargo_cargoId_idx" ON "Ds44MiperAsistenteCargo"("cargoId");
CREATE INDEX "Ds44MiperAsistenteCargo_centroTrabajoId_idx" ON "Ds44MiperAsistenteCargo"("centroTrabajoId");
CREATE INDEX "Ds44MiperAsistenteCargo_areaId_idx" ON "Ds44MiperAsistenteCargo"("areaId");
CREATE INDEX "Ds44MiperTarea_empresaId_idx" ON "Ds44MiperTarea"("empresaId");
CREATE INDEX "Ds44MiperTarea_miperId_idx" ON "Ds44MiperTarea"("miperId");
CREATE INDEX "Ds44MiperTarea_asistenteCargoId_idx" ON "Ds44MiperTarea"("asistenteCargoId");
CREATE UNIQUE INDEX "Ds44MiperExposicionRespuesta_tareaId_clave_key" ON "Ds44MiperExposicionRespuesta"("tareaId", "clave");
CREATE INDEX "Ds44MiperExposicionRespuesta_empresaId_idx" ON "Ds44MiperExposicionRespuesta"("empresaId");
CREATE INDEX "Ds44MiperExposicionRespuesta_respuesta_idx" ON "Ds44MiperExposicionRespuesta"("respuesta");
CREATE INDEX "Ds44MiperItem_catalogoRiesgoId_idx" ON "Ds44MiperItem"("catalogoRiesgoId");
CREATE INDEX "Ds44MiperItem_tareaId_idx" ON "Ds44MiperItem"("tareaId");
CREATE INDEX "Ds44MiperItem_categoriaRiesgo_idx" ON "Ds44MiperItem"("categoriaRiesgo");

ALTER TABLE "Ds44MiperAsistenteCargo" ADD CONSTRAINT "Ds44MiperAsistenteCargo_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Ds44MiperAsistenteCargo" ADD CONSTRAINT "Ds44MiperAsistenteCargo_miperId_fkey" FOREIGN KEY ("miperId") REFERENCES "Ds44Miper"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Ds44MiperAsistenteCargo" ADD CONSTRAINT "Ds44MiperAsistenteCargo_cargoId_fkey" FOREIGN KEY ("cargoId") REFERENCES "Cargo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Ds44MiperAsistenteCargo" ADD CONSTRAINT "Ds44MiperAsistenteCargo_centroTrabajoId_fkey" FOREIGN KEY ("centroTrabajoId") REFERENCES "CentroTrabajo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Ds44MiperAsistenteCargo" ADD CONSTRAINT "Ds44MiperAsistenteCargo_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Ds44MiperTarea" ADD CONSTRAINT "Ds44MiperTarea_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Ds44MiperTarea" ADD CONSTRAINT "Ds44MiperTarea_miperId_fkey" FOREIGN KEY ("miperId") REFERENCES "Ds44Miper"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Ds44MiperTarea" ADD CONSTRAINT "Ds44MiperTarea_asistenteCargoId_fkey" FOREIGN KEY ("asistenteCargoId") REFERENCES "Ds44MiperAsistenteCargo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Ds44MiperExposicionRespuesta" ADD CONSTRAINT "Ds44MiperExposicionRespuesta_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Ds44MiperExposicionRespuesta" ADD CONSTRAINT "Ds44MiperExposicionRespuesta_tareaId_fkey" FOREIGN KEY ("tareaId") REFERENCES "Ds44MiperTarea"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Ds44MiperItem" ADD CONSTRAINT "Ds44MiperItem_catalogoRiesgoId_fkey" FOREIGN KEY ("catalogoRiesgoId") REFERENCES "Ds44MiperRiesgoCatalogo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Ds44MiperItem" ADD CONSTRAINT "Ds44MiperItem_tareaId_fkey" FOREIGN KEY ("tareaId") REFERENCES "Ds44MiperTarea"("id") ON DELETE SET NULL ON UPDATE CASCADE;
