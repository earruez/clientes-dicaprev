ALTER TABLE "PermisoInstalacion"
ADD COLUMN "permisoAprobadoArchivoNombre" TEXT,
ADD COLUMN "permisoAprobadoArchivoNombreOriginal" TEXT,
ADD COLUMN "permisoAprobadoArchivoUrl" TEXT,
ADD COLUMN "permisoAprobadoArchivoTipo" TEXT,
ADD COLUMN "permisoAprobadoArchivoPeso" INTEGER,
ADD COLUMN "permisoAprobadoAdjuntadoAt" TIMESTAMP(3);
