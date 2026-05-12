-- CreateTable
CREATE TABLE "Capacitacion" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "categoria" TEXT NOT NULL,
    "modalidad" TEXT NOT NULL,
    "duracionHoras" INTEGER,
    "vigenciaMeses" INTEGER,
    "requiereEvaluacion" BOOLEAN NOT NULL DEFAULT false,
    "requiereFirma" BOOLEAN NOT NULL DEFAULT false,
    "generaCertificado" BOOLEAN NOT NULL DEFAULT false,
    "esObligatoria" BOOLEAN NOT NULL DEFAULT false,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Capacitacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CapacitacionAsignacion" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "trabajadorId" TEXT NOT NULL,
    "capacitacionId" TEXT NOT NULL,
    "sesionId" TEXT,
    "origen" TEXT NOT NULL DEFAULT 'manual',
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "fechaAsignacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaEnvio" TIMESTAMP(3),
    "fechaInicio" TIMESTAMP(3),
    "fechaCompletada" TIMESTAMP(3),
    "fechaVencimiento" TIMESTAMP(3),
    "fechaCancelacion" TIMESTAMP(3),
    "token" TEXT,
    "observacion" TEXT,
    "nota" DOUBLE PRECISION,
    "aprobado" BOOLEAN,
    "evidenciaDocumentoId" TEXT,
    "certificadoDocumentoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CapacitacionAsignacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CapacitacionSesion" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "capacitacionId" TEXT NOT NULL,
    "creadoPorId" TEXT,
    "titulo" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "horaInicio" TIMESTAMP(3),
    "horaFin" TIMESTAMP(3),
    "modalidad" TEXT NOT NULL,
    "ubicacion" TEXT,
    "relator" TEXT,
    "cupos" INTEGER,
    "estado" TEXT NOT NULL DEFAULT 'programada',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CapacitacionSesion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CapacitacionHistorial" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "trabajadorId" TEXT NOT NULL,
    "capacitacionId" TEXT NOT NULL,
    "asignacionId" TEXT,
    "sesionId" TEXT,
    "evaluacionId" TEXT,
    "usuarioId" TEXT,
    "tipoEvento" TEXT NOT NULL,
    "detalle" TEXT,
    "estado" TEXT,
    "fechaEvento" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vigenciaHasta" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CapacitacionHistorial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CapacitacionEvaluacion" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "trabajadorId" TEXT NOT NULL,
    "capacitacionId" TEXT NOT NULL,
    "asignacionId" TEXT,
    "sesionId" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'registrada',
    "asistencia" BOOLEAN,
    "nota" DOUBLE PRECISION,
    "aprobado" BOOLEAN,
    "fechaEvaluacion" TIMESTAMP(3) NOT NULL,
    "observacion" TEXT,
    "evidenciaDocumentoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CapacitacionEvaluacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CapacitacionAsistencia" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "trabajadorId" TEXT NOT NULL,
    "capacitacionId" TEXT NOT NULL,
    "sesionId" TEXT NOT NULL,
    "asignacionId" TEXT,
    "estadoAsistencia" TEXT NOT NULL DEFAULT 'ausente',
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "horaCheckIn" TIMESTAMP(3),
    "horaCheckOut" TIMESTAMP(3),
    "observacion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CapacitacionAsistencia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Capacitacion_empresaId_idx" ON "Capacitacion"("empresaId");

-- CreateIndex
CREATE INDEX "Capacitacion_activa_idx" ON "Capacitacion"("activa");

-- CreateIndex
CREATE UNIQUE INDEX "Capacitacion_empresaId_codigo_key" ON "Capacitacion"("empresaId", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "CapacitacionAsignacion_token_key" ON "CapacitacionAsignacion"("token");

-- CreateIndex
CREATE INDEX "CapacitacionAsignacion_empresaId_idx" ON "CapacitacionAsignacion"("empresaId");

-- CreateIndex
CREATE INDEX "CapacitacionAsignacion_trabajadorId_idx" ON "CapacitacionAsignacion"("trabajadorId");

-- CreateIndex
CREATE INDEX "CapacitacionAsignacion_capacitacionId_idx" ON "CapacitacionAsignacion"("capacitacionId");

-- CreateIndex
CREATE INDEX "CapacitacionAsignacion_sesionId_idx" ON "CapacitacionAsignacion"("sesionId");

-- CreateIndex
CREATE INDEX "CapacitacionAsignacion_estado_idx" ON "CapacitacionAsignacion"("estado");

-- CreateIndex
CREATE INDEX "CapacitacionAsignacion_fechaAsignacion_idx" ON "CapacitacionAsignacion"("fechaAsignacion");

-- CreateIndex
CREATE INDEX "CapacitacionAsignacion_fechaVencimiento_idx" ON "CapacitacionAsignacion"("fechaVencimiento");

-- CreateIndex
CREATE INDEX "CapacitacionSesion_empresaId_idx" ON "CapacitacionSesion"("empresaId");

-- CreateIndex
CREATE INDEX "CapacitacionSesion_capacitacionId_idx" ON "CapacitacionSesion"("capacitacionId");

-- CreateIndex
CREATE INDEX "CapacitacionSesion_creadoPorId_idx" ON "CapacitacionSesion"("creadoPorId");

-- CreateIndex
CREATE INDEX "CapacitacionSesion_estado_idx" ON "CapacitacionSesion"("estado");

-- CreateIndex
CREATE INDEX "CapacitacionSesion_fecha_idx" ON "CapacitacionSesion"("fecha");

-- CreateIndex
CREATE INDEX "CapacitacionHistorial_empresaId_idx" ON "CapacitacionHistorial"("empresaId");

-- CreateIndex
CREATE INDEX "CapacitacionHistorial_trabajadorId_idx" ON "CapacitacionHistorial"("trabajadorId");

-- CreateIndex
CREATE INDEX "CapacitacionHistorial_capacitacionId_idx" ON "CapacitacionHistorial"("capacitacionId");

-- CreateIndex
CREATE INDEX "CapacitacionHistorial_asignacionId_idx" ON "CapacitacionHistorial"("asignacionId");

-- CreateIndex
CREATE INDEX "CapacitacionHistorial_sesionId_idx" ON "CapacitacionHistorial"("sesionId");

-- CreateIndex
CREATE INDEX "CapacitacionHistorial_evaluacionId_idx" ON "CapacitacionHistorial"("evaluacionId");

-- CreateIndex
CREATE INDEX "CapacitacionHistorial_usuarioId_idx" ON "CapacitacionHistorial"("usuarioId");

-- CreateIndex
CREATE INDEX "CapacitacionHistorial_estado_idx" ON "CapacitacionHistorial"("estado");

-- CreateIndex
CREATE INDEX "CapacitacionHistorial_fechaEvento_idx" ON "CapacitacionHistorial"("fechaEvento");

-- CreateIndex
CREATE INDEX "CapacitacionEvaluacion_empresaId_idx" ON "CapacitacionEvaluacion"("empresaId");

-- CreateIndex
CREATE INDEX "CapacitacionEvaluacion_trabajadorId_idx" ON "CapacitacionEvaluacion"("trabajadorId");

-- CreateIndex
CREATE INDEX "CapacitacionEvaluacion_capacitacionId_idx" ON "CapacitacionEvaluacion"("capacitacionId");

-- CreateIndex
CREATE INDEX "CapacitacionEvaluacion_asignacionId_idx" ON "CapacitacionEvaluacion"("asignacionId");

-- CreateIndex
CREATE INDEX "CapacitacionEvaluacion_sesionId_idx" ON "CapacitacionEvaluacion"("sesionId");

-- CreateIndex
CREATE INDEX "CapacitacionEvaluacion_estado_idx" ON "CapacitacionEvaluacion"("estado");

-- CreateIndex
CREATE INDEX "CapacitacionEvaluacion_fechaEvaluacion_idx" ON "CapacitacionEvaluacion"("fechaEvaluacion");

-- CreateIndex
CREATE INDEX "CapacitacionAsistencia_empresaId_idx" ON "CapacitacionAsistencia"("empresaId");

-- CreateIndex
CREATE INDEX "CapacitacionAsistencia_trabajadorId_idx" ON "CapacitacionAsistencia"("trabajadorId");

-- CreateIndex
CREATE INDEX "CapacitacionAsistencia_capacitacionId_idx" ON "CapacitacionAsistencia"("capacitacionId");

-- CreateIndex
CREATE INDEX "CapacitacionAsistencia_sesionId_idx" ON "CapacitacionAsistencia"("sesionId");

-- CreateIndex
CREATE INDEX "CapacitacionAsistencia_asignacionId_idx" ON "CapacitacionAsistencia"("asignacionId");

-- CreateIndex
CREATE INDEX "CapacitacionAsistencia_estadoAsistencia_idx" ON "CapacitacionAsistencia"("estadoAsistencia");

-- CreateIndex
CREATE INDEX "CapacitacionAsistencia_fecha_idx" ON "CapacitacionAsistencia"("fecha");

-- CreateIndex
CREATE UNIQUE INDEX "CapacitacionAsistencia_sesionId_trabajadorId_key" ON "CapacitacionAsistencia"("sesionId", "trabajadorId");

-- AddForeignKey
ALTER TABLE "Capacitacion" ADD CONSTRAINT "Capacitacion_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacitacionAsignacion" ADD CONSTRAINT "CapacitacionAsignacion_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacitacionAsignacion" ADD CONSTRAINT "CapacitacionAsignacion_trabajadorId_fkey" FOREIGN KEY ("trabajadorId") REFERENCES "Trabajador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacitacionAsignacion" ADD CONSTRAINT "CapacitacionAsignacion_capacitacionId_fkey" FOREIGN KEY ("capacitacionId") REFERENCES "Capacitacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacitacionAsignacion" ADD CONSTRAINT "CapacitacionAsignacion_sesionId_fkey" FOREIGN KEY ("sesionId") REFERENCES "CapacitacionSesion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacitacionAsignacion" ADD CONSTRAINT "CapacitacionAsignacion_evidenciaDocumentoId_fkey" FOREIGN KEY ("evidenciaDocumentoId") REFERENCES "TrabajadorDocumento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacitacionAsignacion" ADD CONSTRAINT "CapacitacionAsignacion_certificadoDocumentoId_fkey" FOREIGN KEY ("certificadoDocumentoId") REFERENCES "TrabajadorDocumento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacitacionSesion" ADD CONSTRAINT "CapacitacionSesion_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacitacionSesion" ADD CONSTRAINT "CapacitacionSesion_capacitacionId_fkey" FOREIGN KEY ("capacitacionId") REFERENCES "Capacitacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacitacionSesion" ADD CONSTRAINT "CapacitacionSesion_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacitacionHistorial" ADD CONSTRAINT "CapacitacionHistorial_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacitacionHistorial" ADD CONSTRAINT "CapacitacionHistorial_trabajadorId_fkey" FOREIGN KEY ("trabajadorId") REFERENCES "Trabajador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacitacionHistorial" ADD CONSTRAINT "CapacitacionHistorial_capacitacionId_fkey" FOREIGN KEY ("capacitacionId") REFERENCES "Capacitacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacitacionHistorial" ADD CONSTRAINT "CapacitacionHistorial_asignacionId_fkey" FOREIGN KEY ("asignacionId") REFERENCES "CapacitacionAsignacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacitacionHistorial" ADD CONSTRAINT "CapacitacionHistorial_sesionId_fkey" FOREIGN KEY ("sesionId") REFERENCES "CapacitacionSesion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacitacionHistorial" ADD CONSTRAINT "CapacitacionHistorial_evaluacionId_fkey" FOREIGN KEY ("evaluacionId") REFERENCES "CapacitacionEvaluacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacitacionHistorial" ADD CONSTRAINT "CapacitacionHistorial_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacitacionEvaluacion" ADD CONSTRAINT "CapacitacionEvaluacion_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacitacionEvaluacion" ADD CONSTRAINT "CapacitacionEvaluacion_trabajadorId_fkey" FOREIGN KEY ("trabajadorId") REFERENCES "Trabajador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacitacionEvaluacion" ADD CONSTRAINT "CapacitacionEvaluacion_capacitacionId_fkey" FOREIGN KEY ("capacitacionId") REFERENCES "Capacitacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacitacionEvaluacion" ADD CONSTRAINT "CapacitacionEvaluacion_asignacionId_fkey" FOREIGN KEY ("asignacionId") REFERENCES "CapacitacionAsignacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacitacionEvaluacion" ADD CONSTRAINT "CapacitacionEvaluacion_sesionId_fkey" FOREIGN KEY ("sesionId") REFERENCES "CapacitacionSesion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacitacionEvaluacion" ADD CONSTRAINT "CapacitacionEvaluacion_evidenciaDocumentoId_fkey" FOREIGN KEY ("evidenciaDocumentoId") REFERENCES "TrabajadorDocumento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacitacionAsistencia" ADD CONSTRAINT "CapacitacionAsistencia_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacitacionAsistencia" ADD CONSTRAINT "CapacitacionAsistencia_trabajadorId_fkey" FOREIGN KEY ("trabajadorId") REFERENCES "Trabajador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacitacionAsistencia" ADD CONSTRAINT "CapacitacionAsistencia_capacitacionId_fkey" FOREIGN KEY ("capacitacionId") REFERENCES "Capacitacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacitacionAsistencia" ADD CONSTRAINT "CapacitacionAsistencia_sesionId_fkey" FOREIGN KEY ("sesionId") REFERENCES "CapacitacionSesion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacitacionAsistencia" ADD CONSTRAINT "CapacitacionAsistencia_asignacionId_fkey" FOREIGN KEY ("asignacionId") REFERENCES "CapacitacionAsignacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

