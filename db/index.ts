import "server-only";

import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { getRuntimeDatabaseEnvironment } from "../src/config/database-env.server";
import * as schema from "./schema";

const databasePoolKey = Symbol.for("improve.databasePool");
const drizzleDatabaseKey = Symbol.for("improve.drizzleDatabase");

type Database = NodePgDatabase<typeof schema>;
type DatabaseGlobals = typeof globalThis & {
  [databasePoolKey]?: Pool;
  [drizzleDatabaseKey]?: Database;
};

const databaseGlobals = globalThis as DatabaseGlobals;

export function getDatabasePool(): Pool {
  databaseGlobals[databasePoolKey] ??= new Pool({
    connectionString: getRuntimeDatabaseEnvironment().DATABASE_URL,
    max: 5,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 10_000,
  });

  return databaseGlobals[databasePoolKey];
}

export function getDb(): Database {
  databaseGlobals[drizzleDatabaseKey] ??= drizzle(getDatabasePool(), {
    schema,
  });

  return databaseGlobals[drizzleDatabaseKey];
}

export async function closeDatabasePool(): Promise<void> {
  const pool = databaseGlobals[databasePoolKey];

  delete databaseGlobals[drizzleDatabaseKey];
  delete databaseGlobals[databasePoolKey];

  if (pool) {
    await pool.end();
  }
}
