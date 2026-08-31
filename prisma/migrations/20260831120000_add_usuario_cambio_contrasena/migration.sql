-- CreateTable
CREATE TABLE "UsuarioCambioContraseña" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "usado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsuarioCambioContraseña_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UsuarioCambioContraseña_token_key" ON "UsuarioCambioContraseña"("token");

-- CreateIndex
CREATE INDEX "UsuarioCambioContraseña_usuarioId_idx" ON "UsuarioCambioContraseña"("usuarioId");

-- CreateIndex
CREATE INDEX "UsuarioCambioContraseña_token_idx" ON "UsuarioCambioContraseña"("token");

-- AddForeignKey
ALTER TABLE "UsuarioCambioContraseña" ADD CONSTRAINT "UsuarioCambioContraseña_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;