import pg from "pg";

const { Client } = pg;
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const lockRows = await client.query(`
  SELECT
    l.pid,
    l.granted,
    l.mode,
    l.classid::text AS classid,
    l.objid::text AS objid,
    a.usename,
    a.application_name,
    a.client_addr::text AS client_addr,
    a.state,
    a.backend_start,
    a.xact_start,
    a.query_start,
    a.state_change,
    LEFT(COALESCE(a.query, ''), 300) AS query
  FROM pg_locks l
  LEFT JOIN pg_stat_activity a ON a.pid = l.pid
  WHERE l.locktype = 'advisory'
    AND l.granted = true
  ORDER BY a.query_start NULLS LAST
`);

const migrationRows = await client.query(`
  SELECT
    pid,
    usename,
    application_name,
    client_addr::text AS client_addr,
    state,
    backend_start,
    xact_start,
    query_start,
    state_change,
    LEFT(COALESCE(query, ''), 300) AS query
  FROM pg_stat_activity
  WHERE pid <> pg_backend_pid()
    AND (
      query ILIKE '%pg_advisory_lock%'
      OR application_name ILIKE '%prisma%'
    )
  ORDER BY query_start NULLS LAST
`);

console.log("PRISMA_LOCK_DIAGNOSTIC", JSON.stringify({
  advisoryLocks: lockRows.rows,
  migrationSessions: migrationRows.rows,
  inspectedAt: new Date().toISOString(),
}));

await client.end();
