-- MVP firma simple electronica

CREATE TABLE "FirmaUsuarioPerfil" (
  "id" TEXT NOT NULL,
  "empresaId" TEXT NOT NULL,
  "usuarioId" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "rut" TEXT NOT NULL,
  "cargo" TEXT,
  "imagenFirma" TEXT,
  "trazoFirma" TEXT,
  "activa" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "FirmaUsuarioPerfil_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "FirmaDocumento"
ADD COLUMN "usuarioPrevencionistaId" TEXT,
ADD COLUMN "tipoFirmante" TEXT DEFAULT 'trabajador',
ADD COLUMN "tipoFirma" TEXT DEFAULT 'manual',
ADD COLUMN "tokenTrazabilidad" TEXT;

CREATE INDEX "FirmaUsuarioPerfil_empresaId_idx" ON "FirmaUsuarioPerfil"("empresaId");
CREATE INDEX "FirmaUsuarioPerfil_usuarioId_idx" ON "FirmaUsuarioPerfil"("usuarioId");
CREATE INDEX "FirmaUsuarioPerfil_empresaId_activa_idx" ON "FirmaUsuarioPerfil"("empresaId", "activa");
CREATE INDEX "FirmaDocumento_usuarioPrevencionistaId_idx" ON "FirmaDocumento"("usuarioPrevencionistaId");

ALTER TABLE "FirmaUsuarioPerfil"
ADD CONSTRAINT "FirmaUsuarioPerfil_empresaId_fkey"
FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FirmaUsuarioPerfil"
ADD CONSTRAINT "FirmaUsuarioPerfil_usuarioId_fkey"
FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FirmaDocumento"
ADD CONSTRAINT "FirmaDocumento_usuarioPrevencionistaId_fkey"
FOREIGN KEY ("usuarioPrevencionistaId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
