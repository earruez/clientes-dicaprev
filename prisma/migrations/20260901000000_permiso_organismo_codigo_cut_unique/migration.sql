DROP INDEX "PermisoOrganismo_empresaId_nombre_key";

CREATE UNIQUE INDEX "PermisoOrganismo_empresaId_codigoCUT_key" ON "PermisoOrganismo"("empresaId", "codigoCUT");