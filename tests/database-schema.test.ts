import assert from "node:assert/strict";
import test from "node:test";

import { SQL } from "drizzle-orm";
import { getTableConfig, PgDialect } from "drizzle-orm/pg-core";

import {
  organizationKind,
  organizationMemberRole,
  organizationMembers,
  organizationMemberStatus,
  organizations,
  organizationStatus,
  users,
  userStatus,
} from "../db/schema";

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

test("defines the five expected enums", () => {
  const enums = [
    userStatus,
    organizationKind,
    organizationStatus,
    organizationMemberRole,
    organizationMemberStatus,
  ].map((databaseEnum) => ({
    name: databaseEnum.enumName,
    values: [...databaseEnum.enumValues],
  }));

  assert.deepEqual(
    enums.sort((first, second) => first.name.localeCompare(second.name)),
    [
      { name: "organization_kind", values: ["ARTIST", "VENUE"] },
      {
        name: "organization_member_role",
        values: ["OWNER", "ADMIN", "MEMBER"],
      },
      {
        name: "organization_member_status",
        values: ["ACTIVE", "INACTIVE"],
      },
      {
        name: "organization_status",
        values: ["ACTIVE", "SUSPENDED", "DELETED"],
      },
      {
        name: "user_status",
        values: ["ACTIVE", "SUSPENDED", "DELETED"],
      },
    ],
  );
});

test("defines cascading organization membership foreign keys", () => {
  const foreignKeys = getTableConfig(organizationMembers).foreignKeys.map(
    (foreignKey) => {
      const reference = foreignKey.reference();

      return {
        columns: reference.columns.map((column) => column.name),
        foreignColumns: reference.foreignColumns.map((column) => column.name),
        foreignTable: reference.foreignTable,
        onDelete: foreignKey.onDelete,
      };
    },
  );

  assert.equal(foreignKeys.length, 2);
  assert.ok(
    foreignKeys.some(
      (foreignKey) =>
        foreignKey.columns[0] === "organization_id" &&
        foreignKey.foreignColumns[0] === "id" &&
        foreignKey.foreignTable === organizations &&
        foreignKey.onDelete === "cascade",
    ),
  );
  assert.ok(
    foreignKeys.some(
      (foreignKey) =>
        foreignKey.columns[0] === "user_id" &&
        foreignKey.foreignColumns[0] === "id" &&
        foreignKey.foreignTable === users &&
        foreignKey.onDelete === "cascade",
    ),
  );
});

test("defines timezone-aware timestamps and ACTIVE defaults", () => {
  for (const table of [users, organizations, organizationMembers]) {
    const columns = getTableConfig(table).columns;

    for (const timestampName of ["created_at", "updated_at"]) {
      const timestampColumn = columns.find(
        (column) => column.name === timestampName,
      );

      assert.ok(timestampColumn);
      assert.ok("withTimezone" in timestampColumn);
      assert.equal(timestampColumn.withTimezone, true);
      assert.equal(timestampColumn.notNull, true);
    }

    const statusColumn = columns.find((column) => column.name === "status");
    assert.ok(statusColumn);
    assert.equal(statusColumn.default, "ACTIVE");
  }
});

test("defines optional timezone-aware deletion timestamps", () => {
  for (const table of [users, organizations]) {
    const deletedAt = getTableConfig(table).columns.find(
      (column) => column.name === "deleted_at",
    );

    assert.ok(deletedAt);
    assert.ok("withTimezone" in deletedAt);
    assert.equal(deletedAt.withTimezone, true);
    assert.equal(deletedAt.notNull, false);
  }
});
