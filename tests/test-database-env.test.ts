import assert from "node:assert/strict";
import test from "node:test";

import {
  parseTestDatabaseEnvironment,
  TestDatabaseEnvironmentError,
  type TestDatabaseEnvironmentErrorCode,
} from "../src/config/test-database-env";

const validTestDatabaseUrl =
  "postgresql://integration_user:local_test_password@127.0.0.1:5433/improve_integration_test";

test("accepts a dedicated local test database URL", () => {
  assert.deepEqual(
    parseTestDatabaseEnvironment({ TEST_DATABASE_URL: validTestDatabaseUrl }),
    { TEST_DATABASE_URL: validTestDatabaseUrl },
  );
});

const invalidConfigurations: Array<{
  code: TestDatabaseEnvironmentErrorCode;
  environment: Record<string, string | undefined>;
  name: string;
}> = [
  {
    name: "a missing URL",
    code: "TEST_DATABASE_URL_MISSING",
    environment: {},
  },
  {
    name: "an unsupported protocol",
    code: "TEST_DATABASE_URL_INVALID_PROTOCOL",
    environment: { TEST_DATABASE_URL: validTestDatabaseUrl.replace("postgresql:", "mysql:") },
  },
  {
    name: "a remote host",
    code: "TEST_DATABASE_URL_INVALID_HOST",
    environment: { TEST_DATABASE_URL: validTestDatabaseUrl.replace("127.0.0.1", "database.example") },
  },
  {
    name: "a database without the test suffix",
    code: "TEST_DATABASE_URL_INVALID_DATABASE",
    environment: {
      TEST_DATABASE_URL: validTestDatabaseUrl.replace(
        "improve_integration_test",
        "improve_development",
      ),
    },
  },
  {
    name: "a different port",
    code: "TEST_DATABASE_URL_INVALID_PORT",
    environment: { TEST_DATABASE_URL: validTestDatabaseUrl.replace("5433", "5432") },
  },
  {
    name: "the runtime database URL",
    code: "TEST_DATABASE_URL_MATCHES_RUNTIME",
    environment: {
      TEST_DATABASE_URL: validTestDatabaseUrl,
      DATABASE_URL: validTestDatabaseUrl,
    },
  },
  {
    name: "the migration database URL",
    code: "TEST_DATABASE_URL_MATCHES_MIGRATION",
    environment: {
      TEST_DATABASE_URL: validTestDatabaseUrl,
      MIGRATION_DATABASE_URL: validTestDatabaseUrl,
    },
  },
];

for (const { code, environment, name } of invalidConfigurations) {
  test(`rejects ${name} with a safe error`, () => {
    assert.throws(
      () => parseTestDatabaseEnvironment(environment),
      (error: unknown) => {
        assert.ok(error instanceof TestDatabaseEnvironmentError);
        assert.equal(error.code, code);
        assert.doesNotMatch(
          error.message,
          /integration_user|local_test_password|improve_integration_test|127\.0\.0\.1|5433/,
        );
        return true;
      },
    );
  });
}

test("accepts localhost and IPv6 loopback hosts", () => {
  for (const host of ["localhost", "[::1]"]) {
    const url = validTestDatabaseUrl.replace("127.0.0.1", host);
    assert.equal(parseTestDatabaseEnvironment({ TEST_DATABASE_URL: url }).TEST_DATABASE_URL, url);
  }
});
