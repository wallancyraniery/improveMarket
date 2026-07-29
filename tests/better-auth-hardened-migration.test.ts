import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationURL = new URL(
  "../src/experiments/better-auth/hardened/drizzle/0000_create_hardened_better_auth_schema.sql",
  import.meta.url,
);
const snapshotURL = new URL(
  "../src/experiments/better-auth/hardened/drizzle/meta/0000_snapshot.json",
  import.meta.url,
);
const journalURL = new URL(
  "../src/experiments/better-auth/hardened/drizzle/meta/_journal.json",
  import.meta.url,
);

const expectedTables = [
  "auth_accounts",
  "auth_sessions",
  "auth_users",
  "auth_verifications",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readMigration(): Promise<string> {
  return readFile(migrationURL, "utf8");
}

test("creates only the four hardened authentication tables", async () => {
  const sql = await readMigration();
  const createdTables = [...sql.matchAll(/CREATE TABLE "([^"]+)"/g)].map(
    (match) => match[1],
  );

  assert.deepEqual(createdTables.sort(), expectedTables);
  assert.equal((sql.match(/\bPRIMARY KEY\b/g) ?? []).length, 4);
  assert.equal((sql.match(/"id" text PRIMARY KEY NOT NULL/g) ?? []).length, 4);
  assert.doesNotMatch(sql, /\b(?:serial|bigserial|CREATE SEQUENCE)\b/i);
  assert.doesNotMatch(
    sql,
    /CREATE TABLE "(?:users|organizations|organization_members|user_auth_identities)"/,
  );
});

test("preserves timezone, defaults, and column nullability", async () => {
  const sql = await readMigration();
  const timestamps = sql.match(/timestamp(?: with(?:out)? time zone)?/g) ?? [];

  assert.equal(timestamps.length, 12);
  assert.ok(timestamps.every((value) => value === "timestamp with time zone"));
  assert.match(sql, /"email_verified" boolean DEFAULT false NOT NULL/);
  assert.equal(
    (sql.match(/"created_at" timestamp with time zone DEFAULT now\(\) NOT NULL/g) ?? [])
      .length,
    4,
  );
  assert.equal(
    (sql.match(/"updated_at" timestamp with time zone DEFAULT now\(\) NOT NULL/g) ?? [])
      .length,
    2,
  );
  for (const table of ["auth_accounts", "auth_sessions"]) {
    const tableDefinition = sql.match(
      new RegExp(`CREATE TABLE "${table}" \\(([\\s\\S]*?)\\n\\);`),
    )?.[1];
    assert.ok(tableDefinition);
    assert.match(tableDefinition, /"updated_at" timestamp with time zone NOT NULL/);
    assert.doesNotMatch(
      tableDefinition,
      /"updated_at" timestamp with time zone DEFAULT/,
    );
  }
  for (const nullableColumn of [
    "access_token",
    "refresh_token",
    "id_token",
    "access_token_expires_at",
    "refresh_token_expires_at",
    "scope",
    "password",
  ]) {
    assert.doesNotMatch(
      sql,
      new RegExp(`"${nullableColumn}"[^,\\n]* NOT NULL`),
    );
  }
});

test("defines the expected foreign keys, cascades, uniqueness, and indexes", async () => {
  const sql = await readMigration();

  assert.equal((sql.match(/\bFOREIGN KEY\b/g) ?? []).length, 2);
  assert.equal((sql.match(/ON DELETE cascade/g) ?? []).length, 2);
  assert.match(
    sql,
    /ALTER TABLE "auth_sessions" ADD CONSTRAINT [^;]+FOREIGN KEY \("user_id"\) REFERENCES "public"\."auth_users"\("id"\) ON DELETE cascade/,
  );
  assert.match(
    sql,
    /ALTER TABLE "auth_accounts" ADD CONSTRAINT [^;]+FOREIGN KEY \("user_id"\) REFERENCES "public"\."auth_users"\("id"\) ON DELETE cascade/,
  );
  assert.match(
    sql,
    /CONSTRAINT "auth_sessions_token_unique" UNIQUE\("token"\)/,
  );
  assert.match(
    sql,
    /CREATE UNIQUE INDEX "auth_users_email_lower_unique_idx"[^;]+\(lower\("email"\)\)/,
  );
  assert.match(
    sql,
    /CREATE UNIQUE INDEX "auth_accounts_provider_id_account_id_unique_idx"[^;]+\("provider_id","account_id"\)/,
  );
  assert.match(
    sql,
    /CREATE INDEX "auth_sessions_userId_idx"[^;]+\("user_id"\)/,
  );
  assert.match(
    sql,
    /CREATE INDEX "auth_accounts_userId_idx"[^;]+\("user_id"\)/,
  );
  assert.match(
    sql,
    /CREATE INDEX "auth_verifications_identifier_idx"[^;]+\("identifier"\)/,
  );
});

test("contains no destructive SQL, DML, privileged objects, or sample data", async () => {
  const sql = await readMigration();
  const alterStatements = sql.match(/^ALTER TABLE .+$/gm) ?? [];

  assert.equal(alterStatements.length, 2);
  assert.ok(
    alterStatements.every((statement) =>
      /^ALTER TABLE "auth_(?:accounts|sessions)" ADD CONSTRAINT .+ FOREIGN KEY/.test(
        statement,
      ),
    ),
  );
  assert.doesNotMatch(
    sql,
    /\b(?:DROP|TRUNCATE|GRANT|REVOKE|OWNED|OWNER|CREATE EXTENSION|CREATE FUNCTION|CREATE TRIGGER)\b/i,
  );
  assert.doesNotMatch(sql, /^\s*(?:INSERT|UPDATE|DELETE)\b/im);
  assert.doesNotMatch(sql, /DROP (?:COLUMN|CONSTRAINT)|ALTER COLUMN/i);
  assert.doesNotMatch(
    sql,
    /(?:AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{20,}|BEGIN [A-Z ]*PRIVATE KEY|postgres(?:ql)?:\/\/)/,
  );
  assert.doesNotMatch(sql, /@example\.|seed|fixture|INSERT INTO/i);
});

test("keeps PostgreSQL metadata limited to one four-table migration", async () => {
  const journal: unknown = JSON.parse(await readFile(journalURL, "utf8"));
  const snapshot: unknown = JSON.parse(await readFile(snapshotURL, "utf8"));

  assert.ok(isRecord(journal));
  assert.equal(journal.dialect, "postgresql");
  assert.ok(Array.isArray(journal.entries));
  assert.equal(journal.entries.length, 1);
  const journalEntry: unknown = journal.entries[0];
  assert.ok(isRecord(journalEntry));
  assert.equal(journalEntry.tag, "0000_create_hardened_better_auth_schema");

  assert.ok(isRecord(snapshot));
  assert.equal(snapshot.dialect, "postgresql");
  assert.ok(isRecord(snapshot.tables));
  assert.deepEqual(
    Object.keys(snapshot.tables).sort(),
    expectedTables.map((table) => `public.${table}`).sort(),
  );
  assert.ok(isRecord(snapshot.sequences));
  assert.deepEqual(snapshot.sequences, {});
});

test("uses an isolated generation config without database access", async () => {
  const config = await readFile(
    new URL(
      "../src/experiments/better-auth/hardened/drizzle.config.ts",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(config, /defineConfig/);
  assert.match(config, /dialect: "postgresql"/);
  assert.match(
    config,
    /src\/experiments\/better-auth\/hardened\/hardened-auth-schema\.ts/,
  );
  assert.match(config, /src\/experiments\/better-auth\/hardened\/drizzle/);
  assert.doesNotMatch(
    config,
    /dbCredentials|process\.env|process\.loadEnvFile|DATABASE_URL|MIGRATION_DATABASE_URL|TEST_DATABASE_URL|getDb|Pool|db\/schema/,
  );
});
