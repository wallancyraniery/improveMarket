import { loadEnvFile } from "node:process";

import { defineConfig } from "drizzle-kit";

import { parseDatabaseEnvironment } from "./src/config/database-env";

if (!process.env.DATABASE_URL || !process.env.MIGRATION_DATABASE_URL) {
  loadEnvFile();
}

const databaseEnvironment = parseDatabaseEnvironment(process.env);

export default defineConfig({
  out: "./drizzle",
  schema: "./db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseEnvironment.MIGRATION_DATABASE_URL,
  },
});
