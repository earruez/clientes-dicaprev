CREATE TABLE "ContratistaRequisitoEvento" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "solicitudId" TEXT NOT NULL,
    "requisitoId" TEXT NOT NULL,
    "nombreRequisito" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "estadoAnterior" TEXT,
    "estadoNuevo" TEXT,
    "obligatorioAnterior" BOOLEAN,
    "obligatorioNuevo" BOOLEAN,
    "motivo" TEXT,
    "usuarioId" TEXT NOT NULL,
    "creadoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContratistaRequisitoEvento_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ContratistaRequisitoEvento_empresaId_solicitudId_creadoAt_idx" ON "ContratistaRequisitoEvento"("empresaId","solicitudId","creadoAt");
CREATE INDEX "ContratistaRequisitoEvento_requisitoId_creadoAt_idx" ON "ContratistaRequisitoEvento"("requisitoId","creadoAt");
