import { loadEnvFile } from "node:process";

import { closeDatabasePool, getDatabasePool } from "../db/index";

type SelectOneRow = {
  result: number;
};

type VersionRow = {
  version: string;
};

async function checkDatabase(): Promise<void> {
  loadEnvFile();

  try {
    const pool = getDatabasePool();
    const connection = await pool.query<SelectOneRow>("SELECT 1 AS result");
    const postgresVersion = await pool.query<VersionRow>(
      "SELECT current_setting('server_version') AS version",
    );
    const postgisVersion = await pool.query<VersionRow>(
      "SELECT PostGIS_Full_Version() AS version",
    );

    if (connection.rows[0]?.result !== 1) {
      throw new Error("Database readiness query returned an unexpected result.");
    }

    const databaseVersion = postgresVersion.rows[0]?.version;
    const spatialVersion = postgisVersion.rows[0]?.version;

    if (!databaseVersion || !spatialVersion) {
      throw new Error("Database version information is unavailable.");
    }

    console.log("Database connection: ok");
    console.log("SELECT 1: ok");
    console.log(`PostgreSQL version: ${databaseVersion}`);
    console.log(`PostGIS availability: ${spatialVersion}`);
  } finally {
    await closeDatabasePool();
  }
}

try {
  await checkDatabase();
} catch {
  console.error("Database check failed without exposing connection details.");
  process.exitCode = 1;
}
