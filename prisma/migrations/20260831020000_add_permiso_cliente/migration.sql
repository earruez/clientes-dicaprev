-- CreateTable
CREATE TABLE "PermisoCliente" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "contacto" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PermisoCliente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PermisoCliente_empresaId_nombre_key" ON "PermisoCliente"("empresaId", "nombre");

-- CreateIndex
CREATE INDEX "PermisoCliente_empresaId_idx" ON "PermisoCliente"("empresaId");

-- CreateIndex
CREATE INDEX "PermisoCliente_activo_idx" ON "PermisoCliente"("activo");

-- AddForeignKey
ALTER TABLE "PermisoCliente" ADD CONSTRAINT "PermisoCliente_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermisoInstalacion" ADD CONSTRAINT "PermisoInstalacion_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "PermisoCliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;
