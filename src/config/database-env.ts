import { z } from "zod";

const databaseUrlSchema = z.string().min(1).refine((value) => {
  try {
    const url = new URL(value);

    return url.protocol === "postgres:" || url.protocol === "postgresql:";
  } catch {
    return false;
  }
});

const databaseEnvironmentSchema = z.object({
  DATABASE_URL: databaseUrlSchema,
  MIGRATION_DATABASE_URL: databaseUrlSchema,
});

export type DatabaseEnvironment = z.infer<typeof databaseEnvironmentSchema>;

export class DatabaseEnvironmentError extends Error {
  constructor(variableName: keyof DatabaseEnvironment) {
    super(`Invalid database environment variable: ${variableName}.`);
    this.name = "DatabaseEnvironmentError";
  }
}

export function parseDatabaseEnvironment(
  environment: Record<string, string | undefined>,
): DatabaseEnvironment {
  const result = databaseEnvironmentSchema.safeParse(environment);

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
