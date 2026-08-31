-- AlterTable
ALTER TABLE "PermisoCliente" DROP COLUMN "contacto",
    ADD COLUMN "contactoEmail" TEXT,
    ADD COLUMN "contactoTelefono" TEXT;
