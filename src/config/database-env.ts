import { z } from "zod";

const databaseUrlSchema = z.string().min(1).refine((value) => {
  try {
    const url = new URL(value);

    return url.protocol === "postgres:" || url.protocol === "postgresql:";
  } catch {
    return false;
  }
});

const runtimeDatabaseEnvironmentSchema = z.object({
  DATABASE_URL: databaseUrlSchema,
});

const migrationDatabaseEnvironmentSchema = z.object({
  MIGRATION_DATABASE_URL: databaseUrlSchema,
});

export type RuntimeDatabaseEnvironment = z.infer<
  typeof runtimeDatabaseEnvironmentSchema
>;

export type MigrationDatabaseEnvironment = z.infer<
  typeof migrationDatabaseEnvironmentSchema
>;

type DatabaseEnvironmentVariable =
  | keyof RuntimeDatabaseEnvironment
  | keyof MigrationDatabaseEnvironment;

export class DatabaseEnvironmentError extends Error {
  constructor(variableName: DatabaseEnvironmentVariable) {
    super(`Invalid database environment variable: ${variableName}.`);
    this.name = "DatabaseEnvironmentError";
  }
}

function parseEnvironment<T>(
  schema: z.ZodType<T>,
  environment: Record<string, string | undefined>,
): T {
  const result = schema.safeParse(environment);

  if (!result.success) {
    const variableName = result.error.issues[0]?.path[0];

    if (
      variableName === "DATABASE_URL" ||
      variableName === "MIGRATION_DATABASE_URL"
    ) {
      throw new DatabaseEnvironmentError(variableName);
    }

    throw new Error("Invalid database environment configuration.");
  }

  return result.data;
}

export function parseRuntimeDatabaseEnvironment(
  environment: Record<string, string | undefined>,
): RuntimeDatabaseEnvironment {
  return parseEnvironment(runtimeDatabaseEnvironmentSchema, environment);
}

export function parseMigrationDatabaseEnvironment(
  environment: Record<string, string | undefined>,
): MigrationDatabaseEnvironment {
  return parseEnvironment(migrationDatabaseEnvironmentSchema, environment);
}
