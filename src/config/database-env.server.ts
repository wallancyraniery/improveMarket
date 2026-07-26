import "server-only";

import {
  parseRuntimeDatabaseEnvironment,
  type RuntimeDatabaseEnvironment,
} from "./database-env";

let cachedRuntimeDatabaseEnvironment: RuntimeDatabaseEnvironment | undefined;

export function getRuntimeDatabaseEnvironment(): RuntimeDatabaseEnvironment {
  cachedRuntimeDatabaseEnvironment ??=
    parseRuntimeDatabaseEnvironment(process.env);

  return cachedRuntimeDatabaseEnvironment;
}
