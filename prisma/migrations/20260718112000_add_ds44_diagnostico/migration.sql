-- CreateEnum
CREATE TYPE "EstadoDs44Diagnostico" AS ENUM ('en_evaluacion', 'completado');

-- CreateEnum
CREATE TYPE "RespuestaDs44Diagnostico" AS ENUM ('si', 'no', 'no_aplica');

-- CreateTable
CREATE TABLE "Ds44Diagnostico" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "estado" "EstadoDs44Diagnostico" NOT NULL DEFAULT 'en_evaluacion',
    "scoreGlobal" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ds44Diagnostico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ds44DiagnosticoRespuesta" (
    "id" TEXT NOT NULL,
    "diagnosticoId" TEXT NOT NULL,
    "bloque" TEXT NOT NULL,
    "preguntaClave" TEXT NOT NULL,
    "preguntaTexto" TEXT NOT NULL,
    "respuesta" "RespuestaDs44Diagnostico" NOT NULL,
    "puntaje" INTEGER,
    "observacion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ds44DiagnosticoRespuesta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Ds44Diagnostico_empresaId_idx" ON "Ds44Diagnostico"("empresaId");

-- CreateIndex
CREATE INDEX "Ds44Diagnostico_estado_idx" ON "Ds44Diagnostico"("estado");

-- CreateIndex
CREATE INDEX "Ds44Diagnostico_updatedAt_idx" ON "Ds44Diagnostico"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Ds44DiagnosticoRespuesta_diagnosticoId_preguntaClave_key" ON "Ds44DiagnosticoRespuesta"("diagnosticoId", "preguntaClave");

-- CreateIndex
CREATE INDEX "Ds44DiagnosticoRespuesta_diagnosticoId_idx" ON "Ds44DiagnosticoRespuesta"("diagnosticoId");

-- CreateIndex
CREATE INDEX "Ds44DiagnosticoRespuesta_bloque_idx" ON "Ds44DiagnosticoRespuesta"("bloque");

-- CreateIndex
CREATE INDEX "Ds44DiagnosticoRespuesta_respuesta_idx" ON "Ds44DiagnosticoRespuesta"("respuesta");

-- AddForeignKey
ALTER TABLE "Ds44Diagnostico" ADD CONSTRAINT "Ds44Diagnostico_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ds44DiagnosticoRespuesta" ADD CONSTRAINT "Ds44DiagnosticoRespuesta_diagnosticoId_fkey" FOREIGN KEY ("diagnosticoId") REFERENCES "Ds44Diagnostico"("id") ON DELETE CASCADE ON UPDATE CASCADE;
