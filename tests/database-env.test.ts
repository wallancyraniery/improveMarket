import assert from "node:assert/strict";
import test from "node:test";

import {
  DatabaseEnvironmentError,
  parseDatabaseEnvironment,
} from "../src/config/database-env";

const validEnvironment = {
  DATABASE_URL:
    "postgresql://runtime_user:runtime_password@127.0.0.1:5432/improve_local",
  MIGRATION_DATABASE_URL:
    "postgres://migration_user:migration_password@127.0.0.1:5432/improve_local",
};

test("accepts valid PostgreSQL database URLs", () => {
  assert.deepEqual(parseDatabaseEnvironment(validEnvironment), validEnvironment);
});

test("rejects a missing DATABASE_URL", () => {
  const environment = {
    MIGRATION_DATABASE_URL: validEnvironment.MIGRATION_DATABASE_URL,
  };

  assert.throws(
    () => parseDatabaseEnvironment(environment),
    new DatabaseEnvironmentError("DATABASE_URL"),
  );
});

test("rejects a missing MIGRATION_DATABASE_URL", () => {
  const environment = {
    DATABASE_URL: validEnvironment.DATABASE_URL,
  };

  assert.throws(
    () => parseDatabaseEnvironment(environment),
    new DatabaseEnvironmentError("MIGRATION_DATABASE_URL"),
  );
});

test("rejects unsupported database protocols", () => {
  assert.throws(
    () =>
      parseDatabaseEnvironment({
        ...validEnvironment,
        DATABASE_URL:
          "mysql://runtime_user:runtime_password@127.0.0.1:3306/improve_local",
      }),
    new DatabaseEnvironmentError("DATABASE_URL"),
  );
});

test("does not expose a rejected URL or password in its error", () => {
  const rejectedUrl =
    "https://runtime_user:sensitive_test_password@database.invalid/improve";

  assert.throws(
    () =>
      parseDatabaseEnvironment({
        ...validEnvironment,
        DATABASE_URL: rejectedUrl,
      }),
    (error: unknown) => {
      assert.ok(error instanceof DatabaseEnvironmentError);
      assert.match(error.message, /DATABASE_URL/);
      assert.doesNotMatch(error.message, /sensitive_test_password/);
      assert.doesNotMatch(error.message, /database\.invalid/);
      assert.doesNotMatch(error.message, /https:/);

      return true;
    },
  );
});
