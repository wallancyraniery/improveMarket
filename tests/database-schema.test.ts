import assert from "node:assert/strict";
import test from "node:test";

import { SQL } from "drizzle-orm";
import { getTableConfig, PgDialect } from "drizzle-orm/pg-core";

import { organizationMembers, organizations, users } from "../db/schema";

const forbiddenColumnNames = [
  "password",
  "password_hash",
  "cpf",
  "cnpj",
  "residential_address",
];

test("defines the identity and organization tables without sensitive fields", () => {
  for (const table of [users, organizations, organizationMembers]) {
    const columnNames = getTableConfig(table).columns.map((column) => column.name);

    for (const forbiddenColumnName of forbiddenColumnNames) {
      assert.doesNotMatch(columnNames.join(" "), new RegExp(forbiddenColumnName));
    }
  }
});

test("defines the organization membership composite primary key", () => {
  const primaryKeys = getTableConfig(organizationMembers).primaryKeys;

  assert.equal(primaryKeys.length, 1);
  assert.deepEqual(
    primaryKeys[0]?.columns.map((column) => column.name).sort(),
    ["organization_id", "user_id"],
  );
});

test("defines the case-insensitive unique email index", () => {
  const emailIndex = getTableConfig(users).indexes.find(
    (candidate) => candidate.config.name === "users_email_lower_unique_idx",
  );

  assert.ok(emailIndex);
  assert.equal(emailIndex.config.unique, true);
  const emailExpression = emailIndex.config.columns[0];
  assert.ok(emailExpression instanceof SQL);
  assert.equal(
    new PgDialect().sqlToQuery(emailExpression).sql,
    'lower("users"."email")',
  );
});

test("defines the organization membership user index", () => {
  const userIndex = getTableConfig(organizationMembers).indexes.find(
    (candidate) =>
      candidate.config.name === "organization_members_user_id_idx",
  );

  assert.ok(userIndex);
  assert.deepEqual(
    userIndex.config.columns.map((column) =>
      "name" in column ? column.name : undefined,
    ),
    ["user_id"],
  );
});
