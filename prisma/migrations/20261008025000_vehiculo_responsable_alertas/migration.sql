-- Vehículos: responsable vinculado, número de chasis, GPS y control de avisos de vencimiento
ALTER TABLE "Vehiculo"
  ADD COLUMN "responsableTrabajadorId" TEXT,
  ADD COLUMN "numeroChasis" TEXT,
  ADD COLUMN "gps" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "VehiculoDocumento"
  ADD COLUMN "aviso20EnviadoAt" TIMESTAMP(3),
  ADD COLUMN "aviso15EnviadoAt" TIMESTAMP(3);

CREATE INDEX "Vehiculo_responsableTrabajadorId_idx"
  ON "Vehiculo"("responsableTrabajadorId");

ALTER TABLE "Vehiculo"
  ADD CONSTRAINT "Vehiculo_responsableTrabajadorId_fkey"
  FOREIGN KEY ("responsableTrabajadorId")
  REFERENCES "Trabajador"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
