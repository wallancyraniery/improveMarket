import "server-only";

import {
  parseDatabaseEnvironment,
  type DatabaseEnvironment,
} from "./database-env";

let cachedDatabaseEnvironment: DatabaseEnvironment | undefined;

export function getDatabaseEnvironment(): DatabaseEnvironment {
  cachedDatabaseEnvironment ??= parseDatabaseEnvironment(process.env);

  return cachedDatabaseEnvironment;
}
