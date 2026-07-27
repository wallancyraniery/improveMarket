import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { loadEnvFile } from "node:process";
import { after, before, test } from "node:test";

import { and, eq, inArray, or } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "../../db/schema";
import { organizationMembers, organizations, users } from "../../db/schema";
import { parseTestDatabaseEnvironment } from "../../src/config/test-database-env";
import { createUserWithInitialOrganization } from "../../src/modules/onboarding/application/create-user-with-initial-organization";
import { PostgresOrganizationOnboardingStore } from "../../src/modules/onboarding/data/postgres-organization-onboarding-store";
import {
  EmailAlreadyRegisteredError,
  OrganizationOnboardingUnavailableError,
} from "../../src/modules/onboarding/domain/organization-onboarding-errors";

type TestDatabase = NodePgDatabase<typeof schema>;

let pool: Pool | undefined;
let database: TestDatabase | undefined;

function requireDatabase(): TestDatabase {
  if (!database) {
    throw new Error("The integration test database is unavailable.");
  }

  return database;
}

function validateTestDatabaseEnvironment() {
  return parseTestDatabaseEnvironment(process.env);
}

async function assertPreparedTestDatabase(databasePool: Pool): Promise<void> {
  const result = await databasePool.query<{ ready: boolean }>(
    `SELECT
       to_regclass('drizzle.__drizzle_migrations') IS NOT NULL
       AND to_regclass('public.users') IS NOT NULL
       AND to_regclass('public.organizations') IS NOT NULL
       AND to_regclass('public.organization_members') IS NOT NULL
       AND (SELECT COUNT(*) FROM drizzle.__drizzle_migrations) = 2
       AS ready`,
  );

  if (result.rows[0]?.ready !== true) {
    throw new Error("The integration test database is not prepared.");
  }
}

async function cleanupExecutionRecords(
  email: string,
  organizationNames: string[],
): Promise<void> {
  validateTestDatabaseEnvironment();
  const testDatabase = requireDatabase();
  const matchingUsers = await testDatabase
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email));
  const matchingOrganizations = await testDatabase
    .select({ id: organizations.id })
    .from(organizations)
    .where(inArray(organizations.name, organizationNames));
  const userIds = matchingUsers.map(({ id }) => id);
  const organizationIds = matchingOrganizations.map(({ id }) => id);

  if (userIds.length > 0 && organizationIds.length > 0) {
    validateTestDatabaseEnvironment();
    await testDatabase.delete(organizationMembers).where(
      or(
        inArray(organizationMembers.userId, userIds),
        inArray(organizationMembers.organizationId, organizationIds),
      ),
    );
  } else if (userIds.length > 0) {
    validateTestDatabaseEnvironment();
    await testDatabase
      .delete(organizationMembers)
      .where(inArray(organizationMembers.userId, userIds));
  } else if (organizationIds.length > 0) {
    validateTestDatabaseEnvironment();
    await testDatabase
      .delete(organizationMembers)
      .where(inArray(organizationMembers.organizationId, organizationIds));
  }

  if (organizationIds.length > 0) {
    validateTestDatabaseEnvironment();
    await testDatabase
      .delete(organizations)
      .where(inArray(organizations.id, organizationIds));
  }

  if (userIds.length > 0) {
    validateTestDatabaseEnvironment();
    await testDatabase.delete(users).where(inArray(users.id, userIds));
  }

  const remainingUsers = await testDatabase
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email));
  const remainingOrganizations = await testDatabase
    .select({ id: organizations.id })
    .from(organizations)
    .where(inArray(organizations.name, organizationNames));
  const remainingMemberships =
    userIds.length > 0 || organizationIds.length > 0
      ? await testDatabase
          .select({ userId: organizationMembers.userId })
          .from(organizationMembers)
          .where(
            or(
              userIds.length > 0
                ? inArray(organizationMembers.userId, userIds)
                : undefined,
              organizationIds.length > 0
                ? inArray(organizationMembers.organizationId, organizationIds)
                : undefined,
            ),
          )
      : [];

  if (
    remainingUsers.length > 0 ||
    remainingOrganizations.length > 0 ||
    remainingMemberships.length > 0
  ) {
    throw new Error("Integration test cleanup left execution records behind.");
  }
}

before(async () => {
  if (!process.env.TEST_DATABASE_URL) {
    loadEnvFile();
  }

  const environment = validateTestDatabaseEnvironment();
  pool = new Pool({
    connectionString: environment.TEST_DATABASE_URL,
    max: 2,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 5_000,
  });

  await assertPreparedTestDatabase(pool);
  database = drizzle(pool, { schema });
});

after(async () => {
  database = undefined;
  await pool?.end();
  pool = undefined;
});

test("persists a normalized onboarding and its OWNER membership", async () => {
  const token = randomUUID().replaceAll("-", "");
  const email = `success-${token}@example.invalid`;
  const organizationName = `Integration Artist ${token}`;
  const testDatabase = requireDatabase();
  const store = new PostgresOrganizationOnboardingStore(testDatabase);

  try {
    const result = await createUserWithInitialOrganization(
      {
        email,
        displayName: "  Integration Artist  ",
        organizationName: `  ${organizationName}  `,
        organizationKind: "ARTIST",
      },
      store,
    );
    const persistedUsers = await testDatabase
      .select({ id: users.id, displayName: users.displayName, status: users.status })
      .from(users)
      .where(eq(users.email, email));
    const persistedOrganizations = await testDatabase
      .select({
        id: organizations.id,
        name: organizations.name,
        kind: organizations.kind,
        status: organizations.status,
      })
      .from(organizations)
      .where(eq(organizations.id, result.organizationId));
    const persistedMemberships = await testDatabase
      .select({
        organizationId: organizationMembers.organizationId,
        userId: organizationMembers.userId,
        role: organizationMembers.role,
        status: organizationMembers.status,
      })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.userId, result.userId),
          eq(organizationMembers.organizationId, result.organizationId),
        ),
      );

    assert.equal(persistedUsers.length, 1);
    assert.deepEqual(persistedUsers[0], {
      id: result.userId,
      displayName: "Integration Artist",
      status: "ACTIVE",
    });
    assert.deepEqual(persistedOrganizations, [
      {
        id: result.organizationId,
        name: organizationName,
        kind: "ARTIST",
        status: "ACTIVE",
      },
    ]);
    assert.deepEqual(persistedMemberships, [
      {
        organizationId: result.organizationId,
        userId: result.userId,
        role: "OWNER",
        status: "ACTIVE",
      },
    ]);
    assert.equal(result.organizationKind, "ARTIST");
    assert.equal(result.membershipRole, "OWNER");
  } finally {
    await cleanupExecutionRecords(email, [organizationName]);
  }
});

test("maps a case-insensitive duplicate email without partial records", async () => {
  const token = randomUUID().replaceAll("-", "");
  const email = `duplicate-${token}@example.invalid`;
  const firstOrganizationName = `First Integration Artist ${token}`;
  const secondOrganizationName = `Second Integration Artist ${token}`;
  const testDatabase = requireDatabase();
  const store = new PostgresOrganizationOnboardingStore(testDatabase);

  try {
    const firstResult = await createUserWithInitialOrganization(
      {
        email,
        displayName: "First Integration Artist",
        organizationName: firstOrganizationName,
        organizationKind: "ARTIST",
      },
      store,
    );

    await assert.rejects(
      createUserWithInitialOrganization(
        {
          email: `  ${email.toUpperCase()}  `,
          displayName: "Second Integration Artist",
          organizationName: secondOrganizationName,
          organizationKind: "ARTIST",
        },
        store,
      ),
      (error: unknown) => {
        assert.ok(error instanceof EmailAlreadyRegisteredError);
        assert.equal(error.code, "EMAIL_ALREADY_REGISTERED");
        return true;
      },
    );

    const persistedUsers = await testDatabase
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email));
    const persistedOrganizations = await testDatabase
      .select({ id: organizations.id })
      .from(organizations)
      .where(inArray(organizations.name, [firstOrganizationName, secondOrganizationName]));
    const persistedMemberships = await testDatabase
      .select({ userId: organizationMembers.userId })
      .from(organizationMembers)
      .where(eq(organizationMembers.userId, firstResult.userId));

    assert.deepEqual(persistedUsers, [{ id: firstResult.userId }]);
    assert.deepEqual(persistedOrganizations, [
      { id: firstResult.organizationId },
    ]);
    assert.equal(persistedMemberships.length, 1);
  } finally {
    await cleanupExecutionRecords(email, [
      firstOrganizationName,
      secondOrganizationName,
    ]);
  }
});

test("rolls back real inserts when membership creation fails", async () => {
  const token = randomUUID().replaceAll("-", "");
  const email = `rollback-${token}@example.invalid`;
  const organizationName = `Rollback Integration Artist ${token}`;
  const sentinel = new Error("Controlled integration rollback.");
  const testDatabase = requireDatabase();

  // The facade delegates the real Drizzle transaction and the first two real
  // inserts, then fails only at membership. The escaped sentinel makes
  // PostgreSQL roll back the already-executed user and organization inserts.
  const rollbackDatabase = {
    async transaction<T>(callback: (transaction: unknown) => Promise<T>): Promise<T> {
      return testDatabase.transaction(async (transaction) => {
        const controlledTransaction = {
          insert(table: unknown) {
            if (table === users) {
              return transaction.insert(users);
            }

            if (table === organizations) {
              return transaction.insert(organizations);
            }

            if (table === organizationMembers) {
              throw sentinel;
            }

            throw new Error("Unexpected integration test table.");
          },
        };

        return callback(controlledTransaction);
      });
    },
  } as unknown as ConstructorParameters<
    typeof PostgresOrganizationOnboardingStore
  >[0];
  const store = new PostgresOrganizationOnboardingStore(rollbackDatabase);

  try {
    await assert.rejects(
      createUserWithInitialOrganization(
        {
          email,
          displayName: "Rollback Integration Artist",
          organizationName,
          organizationKind: "ARTIST",
        },
        store,
      ),
      (error: unknown) => {
        assert.ok(error instanceof OrganizationOnboardingUnavailableError);
        assert.equal(error.code, "ORGANIZATION_ONBOARDING_UNAVAILABLE");
        assert.notStrictEqual(error, sentinel);
        return true;
      },
    );

    const persistedUsers = await testDatabase
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email));
    const persistedOrganizations = await testDatabase
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.name, organizationName));
    const persistedMemberships = await testDatabase
      .select({ userId: organizationMembers.userId })
      .from(organizationMembers)
      .where(
        or(
          inArray(
            organizationMembers.userId,
            persistedUsers.map(({ id }) => id),
          ),
          inArray(
            organizationMembers.organizationId,
            persistedOrganizations.map(({ id }) => id),
          ),
        ),
      );

    assert.equal(persistedUsers.length, 0);
    assert.equal(persistedOrganizations.length, 0);
    assert.equal(persistedMemberships.length, 0);
  } finally {
    await cleanupExecutionRecords(email, [organizationName]);
  }
});
