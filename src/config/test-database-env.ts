export type TestDatabaseEnvironment = {
  TEST_DATABASE_URL: string;
};

export type TestDatabaseEnvironmentErrorCode =
  | "TEST_DATABASE_URL_MISSING"
  | "TEST_DATABASE_URL_INVALID_PROTOCOL"
  | "TEST_DATABASE_URL_INVALID_HOST"
  | "TEST_DATABASE_URL_INVALID_PORT"
  | "TEST_DATABASE_URL_INVALID_DATABASE"
  | "TEST_DATABASE_URL_INVALID_USER"
  | "TEST_DATABASE_URL_MATCHES_RUNTIME"
  | "TEST_DATABASE_URL_MATCHES_MIGRATION";

export class TestDatabaseEnvironmentError extends Error {
  constructor(readonly code: TestDatabaseEnvironmentErrorCode) {
    super(`Invalid test database configuration: ${code}.`);
    this.name = "TestDatabaseEnvironmentError";
  }
}

type Environment = Record<string, string | undefined>;

const localHosts = new Set(["127.0.0.1", "localhost", "[::1]"]);

function safelyDecode(value: string): string | undefined {
  try {
    return decodeURIComponent(value);
  } catch {
    return undefined;
  }
}

function parseComparisonUrl(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  try {
    return new URL(value).href;
  } catch {
    return value;
  }
}

export function parseTestDatabaseEnvironment(
  environment: Environment,
): TestDatabaseEnvironment {
  const value = environment.TEST_DATABASE_URL;

  if (!value) {
    throw new TestDatabaseEnvironmentError("TEST_DATABASE_URL_MISSING");
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new TestDatabaseEnvironmentError("TEST_DATABASE_URL_INVALID_PROTOCOL");
  }

  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    throw new TestDatabaseEnvironmentError("TEST_DATABASE_URL_INVALID_PROTOCOL");
  }

  if (!localHosts.has(url.hostname)) {
    throw new TestDatabaseEnvironmentError("TEST_DATABASE_URL_INVALID_HOST");
  }

  if (url.port !== "5433") {
    throw new TestDatabaseEnvironmentError("TEST_DATABASE_URL_INVALID_PORT");
  }

  const user = safelyDecode(url.username);
  if (!user || !url.password) {
    throw new TestDatabaseEnvironmentError("TEST_DATABASE_URL_INVALID_USER");
  }

  const encodedDatabaseName = url.pathname.slice(1);
  const databaseName = safelyDecode(encodedDatabaseName);
  if (
    !databaseName ||
    encodedDatabaseName.includes("/") ||
    !databaseName.endsWith("_test")
  ) {
    throw new TestDatabaseEnvironmentError("TEST_DATABASE_URL_INVALID_DATABASE");
  }

  const normalizedTestUrl = url.href;
  if (normalizedTestUrl === parseComparisonUrl(environment.DATABASE_URL)) {
    throw new TestDatabaseEnvironmentError("TEST_DATABASE_URL_MATCHES_RUNTIME");
  }

  if (
    normalizedTestUrl === parseComparisonUrl(environment.MIGRATION_DATABASE_URL)
  ) {
    throw new TestDatabaseEnvironmentError("TEST_DATABASE_URL_MATCHES_MIGRATION");
  }

  return { TEST_DATABASE_URL: value };
}
