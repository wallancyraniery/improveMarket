import assert from "node:assert/strict";
import test from "node:test";

import {
  DatabaseEnvironmentError,
  parseMigrationDatabaseEnvironment,
  parseRuntimeDatabaseEnvironment,
} from "../src/config/database-env";

const runtimeDatabaseUrl =
  "postgresql://runtime_user:runtime_password@127.0.0.1:5432/improve_local";
const migrationDatabaseUrl =
  "postgres://migration_user:migration_password@127.0.0.1:5432/improve_local";

test("accepts a runtime environment with only DATABASE_URL", () => {
  assert.deepEqual(parseRuntimeDatabaseEnvironment({
    DATABASE_URL: runtimeDatabaseUrl,
  }), { DATABASE_URL: runtimeDatabaseUrl });
});

test("rejects a runtime environment without DATABASE_URL", () => {
  assert.throws(
    () => parseRuntimeDatabaseEnvironment({}),
    new DatabaseEnvironmentError("DATABASE_URL"),
  );
});

test("rejects an unsupported runtime database protocol", () => {
  assert.throws(
    () =>
      parseRuntimeDatabaseEnvironment({
        DATABASE_URL:
          "mysql://runtime_user:runtime_password@127.0.0.1:3306/improve_local",
      }),
    new DatabaseEnvironmentError("DATABASE_URL"),
  );
});

test("accepts a migration environment with only MIGRATION_DATABASE_URL", () => {
  assert.deepEqual(parseMigrationDatabaseEnvironment({
    MIGRATION_DATABASE_URL: migrationDatabaseUrl,
  }), { MIGRATION_DATABASE_URL: migrationDatabaseUrl });
});

test("rejects a migration environment without MIGRATION_DATABASE_URL", () => {
  assert.throws(
    () => parseMigrationDatabaseEnvironment({}),
    new DatabaseEnvironmentError("MIGRATION_DATABASE_URL"),
  );
});

test("rejects an unsupported migration database protocol", () => {
  assert.throws(
    () =>
      parseMigrationDatabaseEnvironment({
        MIGRATION_DATABASE_URL:
          "mysql://migration_user:migration_password@127.0.0.1:3306/improve_local",
      }),
    new DatabaseEnvironmentError("MIGRATION_DATABASE_URL"),
  );
});

test("does not expose rejected runtime or migration values", () => {
  const sensitiveValues = [
    "sensitive_test_password",
    "database.invalid",
    "runtime_sensitive_user",
    "migration_sensitive_user",
    "https:",
  ];

  const invalidEnvironments = [
    () =>
      parseRuntimeDatabaseEnvironment({
        DATABASE_URL:
          "https://runtime_sensitive_user:sensitive_test_password@database.invalid/improve",
      }),
    () =>
      parseMigrationDatabaseEnvironment({
        MIGRATION_DATABASE_URL:
          "https://migration_sensitive_user:sensitive_test_password@database.invalid/improve",
      }),
  ];

  for (const parseInvalidEnvironment of invalidEnvironments) {
    assert.throws(parseInvalidEnvironment, (error: unknown) => {
      assert.ok(error instanceof DatabaseEnvironmentError);

      for (const sensitiveValue of sensitiveValues) {
        assert.doesNotMatch(error.message, new RegExp(sensitiveValue));
      }
      return true;
    });
  }
});
