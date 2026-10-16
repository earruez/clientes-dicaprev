import pg from "pg";

const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

await client.connect();

const checks = {};

const columns = async (table, names) => {
  const result = await client.query(
    `SELECT column_name
       FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
        AND column_name = ANY($2::text[])
      ORDER BY column_name`,
    [table, names],
  );
  return result.rows.map((row) => row.column_name);
};

checks.vehiculoColumns = await columns("Vehiculo", ["responsableTrabajadorId", "numeroChasis", "gps"]);
checks.vehiculoDocumentoColumns = await columns("VehiculoDocumento", ["aviso20EnviadoAt", "aviso15EnviadoAt"]);
checks.permisoColumns = await columns("PermisoInstalacion", [
  "permisoAprobadoArchivoNombre",
  "permisoAprobadoArchivoNombreOriginal",
  "permisoAprobadoArchivoUrl",
  "permisoAprobadoArchivoTipo",
  "permisoAprobadoArchivoPeso",
  "permisoAprobadoAdjuntadoAt",
]);

const indexResult = await client.query(
  `SELECT indexname
     FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = ANY($1::text[])
    ORDER BY indexname`,
  [["Vehiculo_responsableTrabajadorId_idx"]],
);
checks.indexes = indexResult.rows.map((row) => row.indexname);

const constraintResult = await client.query(
  `SELECT conname
     FROM pg_constraint
    WHERE conname = ANY($1::text[])
    ORDER BY conname`,
  [["Vehiculo_responsableTrabajadorId_fkey"]],
);
checks.constraints = constraintResult.rows.map((row) => row.conname);

const tablesResult = await client.query(
  `SELECT table_name
     FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = ANY($1::text[])
    ORDER BY table_name`,
  [[
    "ContratistaSolicitud",
    "ContratistaRecurso",
    "ContratistaRequisito",
    "ContratistaDocumentoVersion",
    "ContratistaCatalogoRequisito",
    "ContratistaDocumentoBaseVersion",
    "ContratistaRecursoBase"
  ]],
);
checks.contratistaTables = tablesResult.rows.map((row) => row.table_name);

const migrations = await client.query(
  `SELECT migration_name,
          finished_at IS NOT NULL AS finished,
          rolled_back_at IS NOT NULL AS rolled_back,
          applied_steps_count
     FROM "_prisma_migrations"
    WHERE migration_name >= '20260902222000_auth_rate_limit'
    ORDER BY migration_name`,
);
checks.migrations = migrations.rows;

console.log("MIGRATION_DIAGNOSTIC", JSON.stringify(checks));

await client.end();
