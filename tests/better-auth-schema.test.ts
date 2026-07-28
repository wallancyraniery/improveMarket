import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { getTableName } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";
import {
  auth_accounts,
  auth_sessions,
  auth_users,
  auth_verifications,
} from "../src/experiments/better-auth/generated/auth-schema";
import * as experimentalSchema from "../src/experiments/better-auth/generated/auth-schema";

const expectedTableNames = [
  "auth_accounts",
  "auth_sessions",
  "auth_users",
  "auth_verifications",
];

const authTables = [
  auth_accounts,
  auth_sessions,
  auth_users,
  auth_verifications,
];

test("exports only the expected core authentication schema", () => {
  assert.deepEqual(Object.keys(experimentalSchema).sort(), [
    "auth_accounts",
    "auth_accountsRelations",
    "auth_sessions",
    "auth_sessionsRelations",
    "auth_users",
    "auth_usersRelations",
    "auth_verifications",
  ]);
  assert.deepEqual(authTables.map(getTableName).sort(), expectedTableNames);
});

test("keeps every foreign key inside the experimental authentication schema", () => {
  for (const table of authTables) {
    for (const foreignKey of getTableConfig(table).foreignKeys) {
      const referencedTableName = getTableName(
        foreignKey.reference().foreignTable,
      );

      assert.ok(expectedTableNames.includes(referencedTableName));
    }
  }
});

test("keeps generation configuration isolated from runtime infrastructure", async () => {
  const configSource = await readFile(
    new URL(
      "../src/experiments/better-auth/schema/auth.ts",
      import.meta.url,
    ),
    "utf8",
  );
  const generatedSource = await readFile(
    new URL(
      "../src/experiments/better-auth/generated/auth-schema.ts",
      import.meta.url,
    ),
    "utf8",
  );
  const combinedSource = `${configSource}\n${generatedSource}`;

  assert.match(configSource, /better-auth\/minimal/);
  assert.match(configSource, /better-auth\/adapters\/drizzle/);
  assert.match(configSource, /drizzle\.mock\(\)/);
  assert.doesNotMatch(
    combinedSource,
    /process\.env|getDb|DATABASE_URL|MIGRATION_DATABASE_URL|TEST_DATABASE_URL/,
  );
  assert.doesNotMatch(combinedSource, /src\/modules|db\/schema|console\./);
  assert.doesNotMatch(
    combinedSource,
    /organization|twoFactor|passkey|apiKey|sso|scim|stripe|oauthApplication/,
  );
});
