-- Firma SST: segundo factor y acceso independiente de fiscalización
ALTER TABLE "FirmaDocumento"
  ADD COLUMN "consentimientoElectronicoAt" TIMESTAMP(3),
  ADD COLUMN "consentimientoIp" TEXT,
  ADD COLUMN "consentimientoUserAgent" TEXT,
  ADD COLUMN "codigoFirmaHash" TEXT,
  ADD COLUMN "codigoFirmaEnviadoAt" TIMESTAMP(3),
  ADD COLUMN "codigoFirmaVenceAt" TIMESTAMP(3),
  ADD COLUMN "codigoFirmaIntentos" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "correoValidadoAt" TIMESTAMP(3);

CREATE TABLE "FiscalizacionFirmaAcceso" (
  "id" TEXT NOT NULL,
  "empresaId" TEXT NOT NULL,
  "inspectorEmail" TEXT NOT NULL,
  "inspectorNombre" TEXT NOT NULL,
  "inspectorRut" TEXT NOT NULL,
  "creadoPorUsuarioId" TEXT NOT NULL,
  "activo" BOOLEAN NOT NULL DEFAULT true,
  "otpHash" TEXT,
  "otpEnviadoAt" TIMESTAMP(3),
  "otpVenceAt" TIMESTAMP(3),
  "otpIntentos" INTEGER NOT NULL DEFAULT 0,
  "creadoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FiscalizacionFirmaAcceso_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FiscalizacionFirmaAcceso_empresaId_inspectorEmail_key"
  ON "FiscalizacionFirmaAcceso"("empresaId", "inspectorEmail");
CREATE INDEX "FiscalizacionFirmaAcceso_inspectorEmail_idx" ON "FiscalizacionFirmaAcceso"("inspectorEmail");
CREATE INDEX "FiscalizacionFirmaAcceso_empresaId_activo_idx" ON "FiscalizacionFirmaAcceso"("empresaId", "activo");
ALTER TABLE "FiscalizacionFirmaAcceso"
  ADD CONSTRAINT "FiscalizacionFirmaAcceso_empresaId_fkey"
  FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "FiscalizacionFirmaEvento" (
  "id" TEXT NOT NULL,
  "accesoId" TEXT NOT NULL,
  "documentoId" TEXT,
  "tipo" TEXT NOT NULL,
  "ip" TEXT,
  "userAgent" TEXT,
  "evidenciaHash" TEXT,
  "creadoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FiscalizacionFirmaEvento_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "FiscalizacionFirmaEvento_accesoId_creadoAt_idx"
  ON "FiscalizacionFirmaEvento"("accesoId", "creadoAt");
CREATE INDEX "FiscalizacionFirmaEvento_documentoId_idx" ON "FiscalizacionFirmaEvento"("documentoId");
ALTER TABLE "FiscalizacionFirmaEvento"
  ADD CONSTRAINT "FiscalizacionFirmaEvento_accesoId_fkey"
  FOREIGN KEY ("accesoId") REFERENCES "FiscalizacionFirmaAcceso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Eventos append-only de auditoría de firma SST.
CREATE TABLE "FirmaSstEvento" (
  "id" TEXT NOT NULL,
  "empresaId" TEXT NOT NULL,
  "documentoId" TEXT NOT NULL,
  "tipo" TEXT NOT NULL,
  "actor" TEXT,
  "detalle" TEXT,
  "hashEvidencia" TEXT,
  "creadoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FirmaSstEvento_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "FirmaSstEvento_empresaId_documentoId_creadoAt_idx" ON "FirmaSstEvento"("empresaId", "documentoId", "creadoAt");
CREATE INDEX "FirmaSstEvento_tipo_creadoAt_idx" ON "FirmaSstEvento"("tipo", "creadoAt");
