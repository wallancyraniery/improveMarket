import assert from "node:assert/strict";
import test from "node:test";

import { organizationMembers, organizations, users } from "../db/schema";
import { PostgresOrganizationOnboardingStore } from "../src/modules/onboarding/data/postgres-organization-onboarding-store";
import { EmailAlreadyRegisteredError } from "../src/modules/onboarding/domain/organization-onboarding-errors";
import type { NormalizedOrganizationOnboardingInput } from "../src/modules/onboarding/domain/organization-onboarding";

const input: NormalizedOrganizationOnboardingInput = {
  email: "artist@example.com",
  displayName: "Ana da Silva",
  organizationName: "Banda Horizonte",
  organizationKind: "ARTIST",
};

const userId = "00000000-0000-4000-8000-000000000001";
const organizationId = "00000000-0000-4000-8000-000000000002";

type InsertCall = { table: unknown; values: unknown };
type FakeOptions = {
  failureAt?: "user" | "organization" | "membership";
  organizationRows?: Array<{ id: string; kind: "ARTIST" | "VENUE" }>;
  userRows?: Array<{ id: string }>;
};

function createControlledDatabase(options: FakeOptions = {}) {
  const calls: InsertCall[] = [];
  let transactionCalls = 0;
  let insideTransaction = false;

  const transaction = {
    insert(table: unknown) {
      assert.equal(insideTransaction, true);
      const step =
        table === users
          ? "user"
          : table === organizations
            ? "organization"
            : "membership";

      return {
        values(values: unknown) {
          calls.push({ table, values });

          if (options.failureAt === step) {
            throw new Error(`${step} insert failed`);
          }

          if (step === "membership") {
            return Promise.resolve();
          }

          return {
            returning() {
              return Promise.resolve(
                step === "user"
                  ? (options.userRows ?? [{ id: userId }])
                  : (options.organizationRows ?? [
                      { id: organizationId, kind: "ARTIST" as const },
                    ]),
              );
            },
          };
        },
      };
    },
  };

  const database = {
    async transaction<T>(callback: (value: unknown) => Promise<T>): Promise<T> {
      transactionCalls += 1;
      insideTransaction = true;
      try {
        return await callback(transaction);
      } finally {
        insideTransaction = false;
      }
    },
  };

  return {
    calls,
    get transactionCalls() {
      return transactionCalls;
    },
    store: new PostgresOrganizationOnboardingStore(
      database as unknown as ConstructorParameters<
        typeof PostgresOrganizationOnboardingStore
      >[0],
    ),
  };
}

test("creates user, organization, and OWNER membership in one transaction", async () => {
  const controlled = createControlledDatabase();

  const result = await controlled.store.create(input);

  assert.equal(controlled.transactionCalls, 1);
  assert.deepEqual(
    controlled.calls.map(({ table }) => table),
    [users, organizations, organizationMembers],
  );
  assert.deepEqual(controlled.calls[0]?.values, {
    email: "artist@example.com",
    displayName: "Ana da Silva",
  });
  assert.deepEqual(controlled.calls[1]?.values, {
    name: "Banda Horizonte",
    kind: "ARTIST",
  });
  assert.deepEqual(controlled.calls[2]?.values, {
    userId,
    organizationId,
    role: "OWNER",
    status: "ACTIVE",
  });
  assert.deepEqual(result, {
    userId,
    organizationId,
    organizationKind: "ARTIST",
    membershipRole: "OWNER",
  });
  assert.deepEqual(Object.keys(result).sort(), [
    "membershipRole",
    "organizationId",
    "organizationKind",
    "userId",
  ]);
});

for (const failureAt of ["user", "organization", "membership"] as const) {
  test(`rejects when the ${failureAt} insert fails`, async () => {
    const controlled = createControlledDatabase({ failureAt });

    await assert.rejects(controlled.store.create(input), {
      message: `${failureAt} insert failed`,
    });
    assert.equal(controlled.transactionCalls, 1);
    assert.equal(
      controlled.calls.length,
      failureAt === "user" ? 1 : failureAt === "organization" ? 2 : 3,
    );
  });
}

test("rejects an empty user returning before inserting the organization", async () => {
  const controlled = createControlledDatabase({ userRows: [] });

  await assert.rejects(controlled.store.create(input), {
    message: "The user insert returned an invalid result.",
  });
  assert.equal(controlled.calls.length, 1);
});

test("rejects an empty organization returning before inserting membership", async () => {
  const controlled = createControlledDatabase({ organizationRows: [] });

  await assert.rejects(controlled.store.create(input), {
    message: "The organization insert returned an invalid result.",
  });
  assert.equal(controlled.calls.length, 2);
});

function duplicateEmailError(cause?: unknown): Record<string, unknown> {
  return {
    code: "23505",
    constraint: "users_email_lower_unique_idx",
    cause,
  };
}

for (const wrapped of [false, true]) {
  test(`maps a ${wrapped ? "wrapped" : "direct"} duplicate email error`, async () => {
    const postgresError = duplicateEmailError();
    const controlled = createControlledDatabase({ failureAt: "user" });
    const databaseError = wrapped ? { cause: postgresError } : postgresError;
    const store = new PostgresOrganizationOnboardingStore({
      async transaction() {
        throw databaseError;
      },
    } as unknown as ConstructorParameters<
      typeof PostgresOrganizationOnboardingStore
    >[0]);

    await assert.rejects(store.create(input), (error: unknown) => {
      assert.ok(error instanceof EmailAlreadyRegisteredError);
      assert.doesNotMatch(
        error.message,
        /artist@example\.com|users_email_lower_unique_idx|23505|password|select|insert/i,
      );
      return true;
    });
    assert.equal(controlled.calls.length, 0);
  });
}

test("handles a cyclic cause without looping or reclassifying it", async () => {
  const cyclicError: Record<string, unknown> = { code: "UNKNOWN" };
  cyclicError.cause = cyclicError;
  const store = new PostgresOrganizationOnboardingStore({
    async transaction() {
      throw cyclicError;
    },
  } as unknown as ConstructorParameters<
    typeof PostgresOrganizationOnboardingStore
  >[0]);

  await assert.rejects(store.create(input), (error) => error === cyclicError);
});

test("does not classify another unique constraint as duplicate email", async () => {
  const otherConstraintError = {
    code: "23505",
    constraint: "organization_members_pkey",
  };
  const store = new PostgresOrganizationOnboardingStore({
    async transaction() {
      throw otherConstraintError;
    },
  } as unknown as ConstructorParameters<
    typeof PostgresOrganizationOnboardingStore
  >[0]);

  await assert.rejects(
    store.create(input),
    (error) => error === otherConstraintError,
  );
});

test("preserves an unknown error", async () => {
  const unknownError = new Error("database unavailable");
  const store = new PostgresOrganizationOnboardingStore({
    async transaction() {
      throw unknownError;
    },
  } as unknown as ConstructorParameters<
    typeof PostgresOrganizationOnboardingStore
  >[0]);

  await assert.rejects(store.create(input), (error) => error === unknownError);
});
