import assert from "node:assert/strict";
import { after, test } from "node:test";

import {
  closeDatabasePool,
  getDatabasePool,
  getDb,
} from "../db/index";

const databasePoolKey = Symbol.for("improve.databasePool");
const drizzleDatabaseKey = Symbol.for("improve.drizzleDatabase");
const runtimeDatabaseUrl =
  "postgresql://runtime_user:runtime_password@127.0.0.1:5432/runtime_database";

process.env.DATABASE_URL = runtimeDatabaseUrl;
delete process.env.MIGRATION_DATABASE_URL;

after(async () => {
  await closeDatabasePool();
});

test("importing the adapter does not create a database pool", () => {
  assert.equal(Reflect.get(globalThis, databasePoolKey), undefined);
});

test("creates lazy singleton Pool and Drizzle instances", () => {
  const firstPool = getDatabasePool();
  const secondPool = getDatabasePool();
  const firstDatabase = getDb();
  const secondDatabase = getDb();

  assert.strictEqual(firstPool, secondPool);
  assert.strictEqual(firstDatabase, secondDatabase);
  assert.equal(firstPool.totalCount, 0);
  assert.equal(firstPool.options.max, 5);
  assert.equal(firstPool.options.connectionTimeoutMillis, 5_000);
  assert.equal(firstPool.options.idleTimeoutMillis, 10_000);
});

test("uses only DATABASE_URL at runtime", () => {
  const pool = getDatabasePool();

  assert.equal(pool.options.connectionString, runtimeDatabaseUrl);
  assert.equal(process.env.MIGRATION_DATABASE_URL, undefined);
});

test("closes and clears database resources and allows recreation", async () => {
  const firstPool = getDatabasePool();
  const firstDatabase = getDb();

  await closeDatabasePool();

  assert.equal(firstPool.ended, true);
  assert.equal(Reflect.get(globalThis, databasePoolKey), undefined);
  assert.equal(Reflect.get(globalThis, drizzleDatabaseKey), undefined);

  const recreatedPool = getDatabasePool();
  const recreatedDatabase = getDb();

  assert.notStrictEqual(recreatedPool, firstPool);
  assert.notStrictEqual(recreatedDatabase, firstDatabase);
  assert.equal(recreatedPool.totalCount, 0);

  await closeDatabasePool();
  await assert.doesNotReject(closeDatabasePool());
});
