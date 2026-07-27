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
  | "TEST_DATABASE_URL_INVALID_RUNTIME_COMPARISON"
  | "TEST_DATABASE_URL_INVALID_MIGRATION_COMPARISON"
  | "TEST_DATABASE_URL_MATCHES_RUNTIME"
  | "TEST_DATABASE_URL_MATCHES_MIGRATION";

export class TestDatabaseEnvironmentError extends Error {
  constructor(readonly code: TestDatabaseEnvironmentErrorCode) {
    super(`Invalid test database configuration: ${code}.`);
    this.name = "TestDatabaseEnvironmentError";
  }
}

type Environment = Record<string, string | undefined>;
type DatabaseDestinationIdentity = {
  database: string;
  host: string;
  port: string;
  user: string;
};

const localHosts = new Set(["127.0.0.1", "localhost", "[::1]"]);
const defaultPostgresPort = "5432";

function safelyDecode(value: string): string | undefined {
  try {
    return decodeURIComponent(value);
  } catch {
    return undefined;
  }
}

function normalizeHost(hostname: string): string {
  const normalizedHostname = hostname.toLowerCase();

  return localHosts.has(normalizedHostname) ? "loopback" : normalizedHostname;
}

function createDestinationIdentity(
  url: URL,
): DatabaseDestinationIdentity | undefined {
  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    return undefined;
  }

  const user = safelyDecode(url.username);
  const encodedDatabaseName = url.pathname.slice(1);
  const database = safelyDecode(encodedDatabaseName);

  if (
    !url.hostname ||
    !user ||
    !database ||
    encodedDatabaseName.includes("/") ||
    database.includes("/")
  ) {
    return undefined;
  }

  return {
    host: normalizeHost(url.hostname),
    port: url.port || defaultPostgresPort,
    user,
    database,
  };
}

function parseComparisonIdentity(
  value: string | undefined,
  errorCode:
    | "TEST_DATABASE_URL_INVALID_RUNTIME_COMPARISON"
    | "TEST_DATABASE_URL_INVALID_MIGRATION_COMPARISON",
): DatabaseDestinationIdentity | undefined {
  if (!value) {
    return undefined;
  }

  try {
    const identity = createDestinationIdentity(new URL(value));

    if (!identity) {
      throw new TestDatabaseEnvironmentError(errorCode);
    }

    return identity;
  } catch {
    throw new TestDatabaseEnvironmentError(errorCode);
  }
}

function destinationsMatch(
  first: DatabaseDestinationIdentity,
  second: DatabaseDestinationIdentity | undefined,
): boolean {
  return (
    second !== undefined &&
    first.host === second.host &&
    first.port === second.port &&
    first.user === second.user &&
    first.database === second.database
  );
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

  const effectivePort = url.port || defaultPostgresPort;
  if (effectivePort !== "5433") {
    throw new TestDatabaseEnvironmentError("TEST_DATABASE_URL_INVALID_PORT");
  }

  const user = safelyDecode(url.username);
  if (!user || !url.password) {
    throw new TestDatabaseEnvironmentError("TEST_DATABASE_URL_INVALID_USER");
  }

  const encodedDatabaseName = url.pathname.slice(1);
  const database = safelyDecode(encodedDatabaseName);
  if (
    !database ||
    encodedDatabaseName.includes("/") ||
    database.includes("/") ||
    !database.endsWith("_test")
  ) {
    throw new TestDatabaseEnvironmentError("TEST_DATABASE_URL_INVALID_DATABASE");
  }

  const testDestination: DatabaseDestinationIdentity = {
    host: normalizeHost(url.hostname),
    port: effectivePort,
    user,
    database,
  };

  const runtimeDestination = parseComparisonIdentity(
    environment.DATABASE_URL,
    "TEST_DATABASE_URL_INVALID_RUNTIME_COMPARISON",
  );
  if (destinationsMatch(testDestination, runtimeDestination)) {
    throw new TestDatabaseEnvironmentError("TEST_DATABASE_URL_MATCHES_RUNTIME");
  }

  const migrationDestination = parseComparisonIdentity(
    environment.MIGRATION_DATABASE_URL,
    "TEST_DATABASE_URL_INVALID_MIGRATION_COMPARISON",
  );
  if (destinationsMatch(testDestination, migrationDestination)) {
    throw new TestDatabaseEnvironmentError("TEST_DATABASE_URL_MATCHES_MIGRATION");
  }

  return { TEST_DATABASE_URL: value };
}
