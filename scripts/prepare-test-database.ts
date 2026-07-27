import { loadEnvFile } from "node:process";

import { migrate } from "drizzle-orm/node-postgres/migrator";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { parseTestDatabaseEnvironment } from "../src/config/test-database-env";

async function prepareTestDatabase(): Promise<void> {
  if (!process.env.TEST_DATABASE_URL) {
    loadEnvFile();
  }

  const environment = parseTestDatabaseEnvironment(process.env);
  const pool = new Pool({ connectionString: environment.TEST_DATABASE_URL });

  try {
    await migrate(drizzle(pool), { migrationsFolder: "drizzle" });
    console.log("Test database migrations: ok");
  } finally {
    await pool.end();
  }
}

try {
  await prepareTestDatabase();
} catch {
  console.error("Test database preparation failed without exposing connection details.");
  process.exitCode = 1;
}
