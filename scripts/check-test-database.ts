import { loadEnvFile } from "node:process";

import { Pool } from "pg";

import { parseTestDatabaseEnvironment } from "../src/config/test-database-env";

type SelectOneRow = { result: number };
type VersionRow = { version: string };
type CountRow = { count: number };
type TableNameRow = { tableName: string };

const expectedBusinessTables = [
  "organization_members",
  "organizations",
  "users",
] as const;

async function checkTestDatabase(): Promise<void> {
  if (!process.env.TEST_DATABASE_URL) {
    loadEnvFile();
  }

  const environment = parseTestDatabaseEnvironment(process.env);
  const pool = new Pool({ connectionString: environment.TEST_DATABASE_URL });

  try {
    const connection = await pool.query<SelectOneRow>("SELECT 1 AS result");
    const postgresVersion = await pool.query<VersionRow>(
      "SELECT current_setting('server_version') AS version",
    );
    const postgisVersion = await pool.query<VersionRow>(
      "SELECT PostGIS_Full_Version() AS version",
    );
    const migrationCount = await pool.query<CountRow>(
      "SELECT COUNT(*)::integer AS count FROM drizzle.__drizzle_migrations",
    );
    const businessTables = await pool.query<TableNameRow>(
      `SELECT relation.relname AS "tableName"
       FROM pg_class AS relation
       INNER JOIN pg_namespace AS namespace
         ON namespace.oid = relation.relnamespace
       WHERE relation.relkind = 'r'
         AND namespace.nspname NOT IN ('pg_catalog', 'information_schema', 'drizzle')
         AND namespace.nspname NOT LIKE 'pg_toast%'
         AND NOT EXISTS (
           SELECT 1
           FROM pg_depend AS dependency
           WHERE dependency.classid = 'pg_class'::regclass
             AND dependency.objid = relation.oid
             AND dependency.deptype = 'e'
         )
       ORDER BY relation.relname`,
    );

    if (connection.rows[0]?.result !== 1) {
      throw new Error("The test database readiness query returned an invalid result.");
    }

    const databaseVersion = postgresVersion.rows[0]?.version;
    const spatialVersion = postgisVersion.rows[0]?.version;
    const appliedMigrations = migrationCount.rows[0]?.count;
    if (!databaseVersion || !spatialVersion || !appliedMigrations) {
      throw new Error("Test database diagnostic information is unavailable.");
    }

    const tableNames = businessTables.rows.map(({ tableName }) => tableName);
    if (
      tableNames.length !== expectedBusinessTables.length ||
      tableNames.some((tableName, index) => tableName !== expectedBusinessTables[index])
    ) {
      throw new Error("The test database business tables do not match the schema.");
    }

    console.log("Test database connection: ok");
    console.log("Test database name suffix: _test");
    console.log("SELECT 1: ok");
    console.log(`PostgreSQL version: ${databaseVersion}`);
    console.log(`PostGIS availability: ${spatialVersion}`);
    console.log(`Drizzle migrations registered: ${appliedMigrations}`);
    console.log(`Business tables: ${tableNames.join(", ")}`);
  } finally {
    await pool.end();
  }
}

try {
  await checkTestDatabase();
} catch {
  console.error("Test database check failed without exposing connection details.");
  process.exitCode = 1;
}
