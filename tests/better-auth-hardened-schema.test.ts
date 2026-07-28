import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  createTableRelationsHelpers,
  getTableName,
  SQL,
} from "drizzle-orm";
import { getTableConfig, PgDialect } from "drizzle-orm/pg-core";

import * as generatedSchema from "../src/experiments/better-auth/generated/auth-schema";
import {
  auth_accounts,
  auth_accountsRelations,
  auth_sessions,
  auth_sessionsRelations,
  auth_users,
  auth_usersRelations,
  auth_verifications,
} from "../src/experiments/better-auth/hardened/hardened-auth-schema";
import * as hardenedSchema from "../src/experiments/better-auth/hardened/hardened-auth-schema";

const expectedTableNames = [
  "auth_accounts",
  "auth_sessions",
  "auth_users",
  "auth_verifications",
];

const hardenedTables = [
  auth_accounts,
  auth_sessions,
  auth_users,
  auth_verifications,
];

const generatedTables = [
  generatedSchema.auth_accounts,
  generatedSchema.auth_sessions,
  generatedSchema.auth_users,
  generatedSchema.auth_verifications,
];

function columnShape(table: (typeof hardenedTables)[number]) {
  return getTableConfig(table).columns.map((column) => ({
    name: column.name,
    dataType: column.dataType,
    notNull: column.notNull,
    hasDefault: column.hasDefault,
    hasOnUpdate: column.onUpdateFn !== undefined,
    primary: column.primary,
  }));
}

async function sourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nestedFiles = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = join(directory, entry.name);
      return entry.isDirectory() ? sourceFiles(entryPath) : [entryPath];
    }),
  );

  return nestedFiles
    .flat()
    .filter((filePath) => [".js", ".mjs", ".ts", ".tsx"].includes(extname(filePath)));
}

test("preserves the official four-table core schema and functional fields", () => {
  assert.deepEqual(
    hardenedTables.map(getTableName).sort(),
    expectedTableNames,
  );
  assert.deepEqual(
    generatedTables.map(getTableName).sort(),
    expectedTableNames,
  );
  assert.deepEqual(Object.keys(hardenedSchema).sort(), [
    "auth_accounts",
    "auth_accountsRelations",
    "auth_sessions",
    "auth_sessionsRelations",
    "auth_users",
    "auth_usersRelations",
    "auth_verifications",
  ]);

  for (const hardenedTable of hardenedTables) {
    const generatedTable = generatedTables.find(
      (candidate) => getTableName(candidate) === getTableName(hardenedTable),
    );

    assert.ok(generatedTable);
    assert.deepEqual(columnShape(hardenedTable), columnShape(generatedTable));
  }
});

test("keeps textual IDs without SQL defaults and requires email", () => {
  for (const table of hardenedTables) {
    const id = getTableConfig(table).columns.find(
      (column) => column.name === "id",
    );

    assert.ok(id);
    assert.equal(id.dataType, "string");
    assert.equal(id.hasDefault, false);
    assert.equal(id.primary, true);
  }

  assert.equal(auth_users.email.notNull, true);
});

test("enforces case-insensitive email uniqueness without a redundant constraint", () => {
  const config = getTableConfig(auth_users);
  const emailIndex = config.indexes.find(
    (candidate) =>
      candidate.config.name === "auth_users_email_lower_unique_idx",
  );

  assert.ok(emailIndex);
  assert.equal(emailIndex.config.unique, true);
  assert.equal(emailIndex.config.columns.length, 1);
  const expression = emailIndex.config.columns[0];
  assert.ok(expression instanceof SQL);
  assert.equal(
    new PgDialect().sqlToQuery(expression).sql,
    'lower("auth_users"."email")',
  );
  assert.equal(config.uniqueConstraints.length, 0);
});

test("uniquely identifies OAuth accounts in provider/account order", () => {
  const config = getTableConfig(auth_accounts);
  const identityIndex = config.indexes.find(
    (candidate) =>
      candidate.config.name ===
      "auth_accounts_provider_id_account_id_unique_idx",
  );

  assert.ok(identityIndex);
  assert.equal(identityIndex.config.unique, true);
  assert.deepEqual(
    identityIndex.config.columns.map((column) =>
      "name" in column ? column.name : undefined,
    ),
    ["provider_id", "account_id"],
  );
  assert.equal(auth_accounts.id.primary, true);
});

test("uses timezone-aware Date timestamps while preserving official behavior", () => {
  for (const hardenedTable of hardenedTables) {
    const generatedTable = generatedTables.find(
      (candidate) => getTableName(candidate) === getTableName(hardenedTable),
    );
    assert.ok(generatedTable);

    const generatedColumns = getTableConfig(generatedTable).columns;
    for (const column of getTableConfig(hardenedTable).columns) {
      const officialColumn = generatedColumns.find(
        (candidate) => candidate.name === column.name,
      );
      assert.ok(officialColumn);

      if (column.dataType === "date") {
        assert.ok("withTimezone" in column);
        assert.equal(column.withTimezone, true);
        assert.ok("withTimezone" in officialColumn);
        assert.equal(officialColumn.withTimezone, false);
        assert.equal(column.notNull, officialColumn.notNull);
        assert.equal(column.hasDefault, officialColumn.hasDefault);
        assert.equal(
          column.onUpdateFn !== undefined,
          officialColumn.onUpdateFn !== undefined,
        );
      }
    }
  }
});

test("preserves internal cascades and functional lookup indexes", () => {
  for (const table of [auth_sessions, auth_accounts]) {
    const foreignKeys = getTableConfig(table).foreignKeys;
    assert.equal(foreignKeys.length, 1);
    assert.equal(foreignKeys[0]?.onDelete, "cascade");
    assert.equal(
      getTableName(foreignKeys[0]?.reference().foreignTable),
      "auth_users",
    );
  }

  const expectedIndexes = [
    [auth_sessions, "auth_sessions_userId_idx", "user_id"],
    [auth_accounts, "auth_accounts_userId_idx", "user_id"],
    [
      auth_verifications,
      "auth_verifications_identifier_idx",
      "identifier",
    ],
  ] as const;

  for (const [table, name, columnName] of expectedIndexes) {
    const lookupIndex = getTableConfig(table).indexes.find(
      (candidate) => candidate.config.name === name,
    );
    assert.ok(lookupIndex);
    assert.equal(lookupIndex.config.unique, false);
    const indexedColumn = lookupIndex.config.columns[0];
    assert.ok(indexedColumn && "name" in indexedColumn);
    assert.equal(indexedColumn.name, columnName);
  }
  assert.equal(auth_sessions.token.isUnique, true);
});

test("uses clean TypeScript relation names", () => {
  const userRelations = auth_usersRelations.config(
    createTableRelationsHelpers(auth_users),
  );
  const sessionRelations = auth_sessionsRelations.config(
    createTableRelationsHelpers(auth_sessions),
  );
  const accountRelations = auth_accountsRelations.config(
    createTableRelationsHelpers(auth_accounts),
  );

  assert.deepEqual(Object.keys(userRelations).sort(), ["accounts", "sessions"]);
  assert.deepEqual(Object.keys(sessionRelations), ["user"]);
  assert.deepEqual(Object.keys(accountRelations), ["user"]);
  assert.equal(userRelations.sessions.referencedTable, auth_sessions);
  assert.equal(userRelations.accounts.referencedTable, auth_accounts);
  assert.equal(sessionRelations.user.referencedTable, auth_users);
  assert.equal(accountRelations.user.referencedTable, auth_users);
  assert.ok(
    [...Object.keys(userRelations), ...Object.keys(sessionRelations), ...Object.keys(accountRelations)].every(
      (name) => !name.endsWith("ss"),
    ),
  );
});

test("keeps OAuth token material nullable for structural compatibility", () => {
  for (const columnName of [
    "access_token",
    "refresh_token",
    "id_token",
    "access_token_expires_at",
    "refresh_token_expires_at",
    "scope",
  ]) {
    const column = getTableConfig(auth_accounts).columns.find(
      (candidate) => candidate.name === columnName,
    );
    assert.ok(column);
    assert.equal(column.notNull, false);
  }
});

test("initializes the typed adapter probe without network or database access", async () => {
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = () => {
    fetchCalls += 1;
    throw new Error("Network access is forbidden in the hardened schema test.");
  };

  try {
    const hardenedAuthModule = await import(
      "../src/experiments/better-auth/hardened/hardened-auth"
    );
    await hardenedAuthModule.hardenedAuth.$context;
    const result = hardenedAuthModule.getHardenedAuthProbe();

    assert.deepEqual(result, {
      status: "initialized",
      tables: [
        "auth_users",
        "auth_sessions",
        "auth_accounts",
        "auth_verifications",
      ],
    });
    assert.equal(fetchCalls, 0);
    assert.deepEqual(Object.keys(result).sort(), ["status", "tables"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("keeps the probe isolated and the generated baseline byte-identical", async () => {
  const generatedSource = await readFile(
    new URL(
      "../src/experiments/better-auth/generated/auth-schema.ts",
      import.meta.url,
    ),
  );
  assert.equal(
    createHash("sha256").update(generatedSource).digest("hex"),
    "28140d6e55a3397c04894f8af03fe18d41523360e47ac11df6eec8415cddf054",
  );

  const probeSource = await readFile(
    new URL(
      "../src/experiments/better-auth/hardened/hardened-auth.ts",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(probeSource, /better-auth\/minimal/);
  assert.match(probeSource, /better-auth\/adapters\/drizzle/);
  assert.match(probeSource, /drizzle\.mock\(\{ schema: hardenedAuthSchema \}\)/);
  assert.match(probeSource, /provider: "pg"/);
  assert.match(probeSource, /schema: hardenedAuthSchema/);
  assert.doesNotMatch(
    probeSource,
    /process\.env|getDb|Pool|DATABASE_URL|MIGRATION_DATABASE_URL|TEST_DATABASE_URL|fetch\(|\.select\(|\.insert\(|\.update\(|\.delete\(/,
  );
  assert.doesNotMatch(probeSource, /plugins|socialProviders|experimental|joins/);
  assert.doesNotMatch(probeSource, /\bany\b|@ts-ignore|@ts-expect-error/);
});

test("is not imported by application, domain, UI, or Worker sources", async () => {
  const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));
  const protectedDirectories = ["app", "src/modules", "worker"];
  const files = (
    await Promise.all(
      protectedDirectories.map((directory) =>
        sourceFiles(join(repositoryRoot, directory)),
      ),
    )
  ).flat();

  for (const file of files) {
    const source = await readFile(file, "utf8");
    assert.doesNotMatch(source, /experiments\/better-auth\/hardened|hardened-auth/);
  }
});
