-- CreateTable PermisoOrganismo
CREATE TABLE "PermisoOrganismo" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "codigoCUT" TEXT,
    "region" TEXT,
    "provincia" TEXT,
    "comuna" TEXT,
    "nombre" TEXT NOT NULL,
    "nombreOficial" TEXT,
    "unidad" TEXT,
    "tipoTramite" TEXT,
    "descripcionTramite" TEXT,
    "modalidad" TEXT DEFAULT 'NO_INFORMADO',
    "plazoDias" INTEGER,
    "tipoPlazo" TEXT DEFAULT 'NO_INFORMADO',
    "direccion" TEXT,
    "horario" TEXT,
    "urlTramite" TEXT,
    "urlInstitucional" TEXT,
    "documentosRequeridos" TEXT,
    "costo" TEXT,
    "fuente" TEXT,
    "fechaVerificacion" TIMESTAMP(3),
    "observaciones" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PermisoOrganismo_pkey" PRIMARY KEY ("id")
);

-- CreateTable PermisoResponsable
CREATE TABLE "PermisoResponsable" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "cargo" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefono" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PermisoResponsable_pkey" PRIMARY KEY ("id")
);

-- CreateTable PermisoInstalacion
CREATE TABLE "PermisoInstalacion" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "clienteId" TEXT,
    "sucursalId" TEXT,
    "direccion" TEXT NOT NULL,
    "fechaInstalacion" TIMESTAMP(3) NOT NULL,
    "fechaRecepcionSolicitud" TIMESTAMP(3) NOT NULL,
    "fechaPresentacion" TIMESTAMP(3),
    "organismoId" TEXT NOT NULL,
    "responsableId" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'SOLICITUD_RECIBIDA',
    "nivelRiesgo" TEXT NOT NULL DEFAULT 'SIN_DATOS',
    "plazoDiasSnapshot" INTEGER,
    "tipoPlazoSnapshot" TEXT DEFAULT 'NO_INFORMADO',
    "modalidadSnapshot" TEXT,
    "nombreOrganismoSnapshot" TEXT,
    "fechaEstimadaResolucion" TIMESTAMP(3),
    "observaciones" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PermisoInstalacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable PermisoHistorial
CREATE TABLE "PermisoHistorial" (
    "id" TEXT NOT NULL,
    "permisoId" TEXT NOT NULL,
    "estadoAnterior" TEXT,
    "estadoNuevo" TEXT NOT NULL,
    "comentario" TEXT,
    "usuarioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PermisoHistorial_pkey" PRIMARY KEY ("id")
);

-- CreateTable PermisoNotificacion
CREATE TABLE "PermisoNotificacion" (
    "id" TEXT NOT NULL,
    "permisoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "destinatario" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "providerMessageId" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PermisoNotificacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PermisoOrganismo_empresaId_nombre_key" ON "PermisoOrganismo"("empresaId", "nombre");

-- CreateIndex
CREATE INDEX "PermisoOrganismo_empresaId_idx" ON "PermisoOrganismo"("empresaId");

-- CreateIndex
CREATE INDEX "PermisoOrganismo_activo_idx" ON "PermisoOrganismo"("activo");

-- CreateIndex
CREATE INDEX "PermisoOrganismo_comuna_idx" ON "PermisoOrganismo"("comuna");

-- CreateIndex
CREATE INDEX "PermisoOrganismo_region_idx" ON "PermisoOrganismo"("region");

-- CreateIndex
CREATE UNIQUE INDEX "PermisoResponsable_empresaId_email_key" ON "PermisoResponsable"("empresaId", "email");

-- CreateIndex
CREATE INDEX "PermisoResponsable_empresaId_idx" ON "PermisoResponsable"("empresaId");

-- CreateIndex
CREATE INDEX "PermisoResponsable_activo_idx" ON "PermisoResponsable"("activo");

-- CreateIndex
CREATE INDEX "PermisoInstalacion_empresaId_idx" ON "PermisoInstalacion"("empresaId");

-- CreateIndex
CREATE INDEX "PermisoInstalacion_estado_idx" ON "PermisoInstalacion"("estado");

-- CreateIndex
CREATE INDEX "PermisoInstalacion_nivelRiesgo_idx" ON "PermisoInstalacion"("nivelRiesgo");

-- CreateIndex
CREATE INDEX "PermisoInstalacion_fechaInstalacion_idx" ON "PermisoInstalacion"("fechaInstalacion");

-- CreateIndex
CREATE INDEX "PermisoInstalacion_fechaPresentacion_idx" ON "PermisoInstalacion"("fechaPresentacion");

-- CreateIndex
CREATE INDEX "PermisoInstalacion_responsableId_idx" ON "PermisoInstalacion"("responsableId");

-- CreateIndex
CREATE INDEX "PermisoInstalacion_organismoId_idx" ON "PermisoInstalacion"("organismoId");

-- CreateIndex
CREATE INDEX "PermisoInstalacion_updatedAt_idx" ON "PermisoInstalacion"("updatedAt");

-- CreateIndex
CREATE INDEX "PermisoInstalacion_clienteId_idx" ON "PermisoInstalacion"("clienteId");

-- CreateIndex
CREATE INDEX "PermisoHistorial_permisoId_idx" ON "PermisoHistorial"("permisoId");

-- CreateIndex
CREATE INDEX "PermisoHistorial_createdAt_idx" ON "PermisoHistorial"("createdAt");

-- CreateIndex
CREATE INDEX "PermisoHistorial_usuarioId_idx" ON "PermisoHistorial"("usuarioId");

-- CreateIndex
CREATE INDEX "PermisoNotificacion_permisoId_idx" ON "PermisoNotificacion"("permisoId");

-- CreateIndex
CREATE INDEX "PermisoNotificacion_estado_idx" ON "PermisoNotificacion"("estado");

-- CreateIndex
CREATE INDEX "PermisoNotificacion_createdAt_idx" ON "PermisoNotificacion"("createdAt");

-- AddForeignKey
ALTER TABLE "PermisoOrganismo" ADD CONSTRAINT "PermisoOrganismo_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermisoResponsable" ADD CONSTRAINT "PermisoResponsable_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermisoInstalacion" ADD CONSTRAINT "PermisoInstalacion_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermisoInstalacion" ADD CONSTRAINT "PermisoInstalacion_organismoId_fkey" FOREIGN KEY ("organismoId") REFERENCES "PermisoOrganismo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermisoInstalacion" ADD CONSTRAINT "PermisoInstalacion_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "PermisoResponsable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermisoHistorial" ADD CONSTRAINT "PermisoHistorial_permisoId_fkey" FOREIGN KEY ("permisoId") REFERENCES "PermisoInstalacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermisoNotificacion" ADD CONSTRAINT "PermisoNotificacion_permisoId_fkey" FOREIGN KEY ("permisoId") REFERENCES "PermisoInstalacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
