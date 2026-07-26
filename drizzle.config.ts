import { loadEnvFile } from "node:process";

import { defineConfig } from "drizzle-kit";

import { parseMigrationDatabaseEnvironment } from "./src/config/database-env";

if (!process.env.MIGRATION_DATABASE_URL) {
  loadEnvFile();
}

const migrationDatabaseEnvironment = parseMigrationDatabaseEnvironment(
  process.env,
);

export default defineConfig({
  out: "./drizzle",
  schema: "./db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: migrationDatabaseEnvironment.MIGRATION_DATABASE_URL,
  },
});
