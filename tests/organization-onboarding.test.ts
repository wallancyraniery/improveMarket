import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createUserWithInitialOrganization } from "../src/modules/onboarding/application/create-user-with-initial-organization";
import type { OrganizationOnboardingStore } from "../src/modules/onboarding/application/organization-onboarding-store";
import type {
  CreateUserWithInitialOrganizationInput,
  CreateUserWithInitialOrganizationOutput,
  NormalizedOrganizationOnboardingInput,
} from "../src/modules/onboarding/domain/organization-onboarding";
import {
  EmailAlreadyRegisteredError,
  InvalidOnboardingInputError,
  OrganizationOnboardingUnavailableError,
} from "../src/modules/onboarding/domain/organization-onboarding-errors";

const validInput: CreateUserWithInitialOrganizationInput = {
  email: "  ARTIST@Example.COM  ",
  displayName: "  Ana da Silva  ",
  organizationName: "  Banda Horizonte  ",
  organizationKind: "ARTIST",
};

const successfulOutput: CreateUserWithInitialOrganizationOutput = {
  userId: "00000000-0000-4000-8000-000000000001",
  organizationId: "00000000-0000-4000-8000-000000000002",
  organizationKind: "ARTIST",
  membershipRole: "OWNER",
};

type StoreCall = {
  input: NormalizedOrganizationOnboardingInput;
};

function createFakeStore(
  implementation: OrganizationOnboardingStore["create"] = async () =>
    successfulOutput,
): { calls: StoreCall[]; store: OrganizationOnboardingStore } {
  const calls: StoreCall[] = [];

  return {
    calls,
    store: {
      async create(input) {
        calls.push({ input });
        return implementation(input);
      },
    },
  };
}

test("normalizes input and calls the store exactly once", async () => {
  const { calls, store } = createFakeStore();

  await createUserWithInitialOrganization(validInput, store);

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0]?.input, {
    email: "artist@example.com",
    displayName: "Ana da Silva",
    organizationName: "Banda Horizonte",
    organizationKind: "ARTIST",
  });
});

test("preserves internal capitalization of names", async () => {
  const { calls, store } = createFakeStore();

  await createUserWithInitialOrganization(
    {
      ...validInput,
      displayName: "  ANA da Silva  ",
      organizationName: "  Banda do SOL  ",
    },
    store,
  );

  assert.equal(calls[0]?.input.displayName, "ANA da Silva");
  assert.equal(calls[0]?.input.organizationName, "Banda do SOL");
});

for (const organizationKind of ["ARTIST", "VENUE"] as const) {
  test(`accepts ${organizationKind} organizations`, async () => {
    const { calls, store } = createFakeStore(async () => ({
      ...successfulOutput,
      organizationKind,
    }));

    const result = await createUserWithInitialOrganization(
      { ...validInput, organizationKind },
      store,
    );

    assert.equal(calls[0]?.input.organizationKind, organizationKind);
    assert.equal(result.organizationKind, organizationKind);
  });
}

test("returns only the public output with OWNER membership", async () => {
  const { store } = createFakeStore(
    async () =>
      ({
        ...successfulOutput,
        internalValue: "not-public",
      }) as CreateUserWithInitialOrganizationOutput,
  );

  const result = await createUserWithInitialOrganization(validInput, store);

  assert.deepEqual(result, successfulOutput);
  assert.equal(result.membershipRole, "OWNER");
  assert.deepEqual(Object.keys(result).sort(), [
    "membershipRole",
    "organizationId",
    "organizationKind",
    "userId",
  ]);
});

const invalidInputs: Array<{
  input: unknown;
  name: string;
}> = [
  {
    name: "an invalid organization kind",
    input: { ...validInput, organizationKind: "OTHER" },
  },
  { name: "an empty email", input: { ...validInput, email: "   " } },
  { name: "an empty display name", input: { ...validInput, displayName: "   " } },
  { name: "an empty organization name", input: { ...validInput, organizationName: "   " } },
  { name: "an invalid email", input: { ...validInput, email: "not-an-email" } },
  { name: "a non-string email", input: { ...validInput, email: 42 } },
  { name: "a non-string display name", input: { ...validInput, displayName: null } },
  { name: "a non-string organization name", input: { ...validInput, organizationName: [] } },
];

for (const { input, name } of invalidInputs) {
  test(`rejects ${name} without calling the store`, async () => {
    const { calls, store } = createFakeStore();

    await assert.rejects(
      createUserWithInitialOrganization(
        input as CreateUserWithInitialOrganizationInput,
        store,
      ),
      (error: unknown) => {
        assert.ok(error instanceof InvalidOnboardingInputError);
        assert.equal(error.code, "INVALID_ONBOARDING_INPUT");
        assert.doesNotMatch(error.message, /artist@example\.com|Banda Horizonte/);
        return true;
      },
    );
    assert.equal(calls.length, 0);
  });
}

test("preserves a duplicate email business error", async () => {
  const duplicateEmailError = new EmailAlreadyRegisteredError();
  const { store } = createFakeStore(async () => {
    throw duplicateEmailError;
  });

  await assert.rejects(
    createUserWithInitialOrganization(validInput, store),
    (error: unknown) => {
      assert.strictEqual(error, duplicateEmailError);
      assert.ok(error instanceof EmailAlreadyRegisteredError);
      assert.equal(error.code, "EMAIL_ALREADY_REGISTERED");
      assert.doesNotMatch(error.message, /artist@example\.com|Banda Horizonte/);
      return true;
    },
  );
});

test("converts unexpected store errors to a safe unavailable error", async () => {
  const internalError = new Error(
    'duplicate key violates constraint "users_email_lower_unique_idx" for artist@example.com',
  );
  const { store } = createFakeStore(async () => {
    throw internalError;
  });

  await assert.rejects(
    createUserWithInitialOrganization(validInput, store),
    (error: unknown) => {
      assert.ok(error instanceof OrganizationOnboardingUnavailableError);
      assert.equal(error.code, "ORGANIZATION_ONBOARDING_UNAVAILABLE");
      assert.doesNotMatch(
        error.message,
        /artist@example\.com|users_email_lower_unique_idx|duplicate key/,
      );
      assert.equal("cause" in error, false);
      return true;
    },
  );
});

test("does not depend on environment or database infrastructure", async () => {
  const moduleFiles = [
    "src/modules/onboarding/domain/organization-onboarding.ts",
    "src/modules/onboarding/domain/organization-onboarding-errors.ts",
    "src/modules/onboarding/application/organization-onboarding-store.ts",
    "src/modules/onboarding/application/create-user-with-initial-organization.ts",
  ];
  const source = (
    await Promise.all(moduleFiles.map((file) => readFile(file, "utf8")))
  ).join("\n");

  assert.doesNotMatch(source, /process\.env/);
  assert.doesNotMatch(source, /from ["']pg["']/);
  assert.doesNotMatch(source, /drizzle/i);
  assert.doesNotMatch(source, /db\/(index|schema)/);
});
