import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const compatibilityModulePath =
  "../src/experiments/better-auth/compatibility.server";

function experimentalSecret(): string {
  return ["not", "a", "runtime", "secret", "for", "compatibility", "only"].join(
    "-",
  );
}

test("imports Better Auth only in a server environment without network access", async () => {
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;

  globalThis.fetch = () => {
    fetchCalls += 1;
    throw new Error("Network access is forbidden in the compatibility test.");
  };

  try {
    const compatibilityModule = await import(compatibilityModulePath);
    const result =
      compatibilityModule.initializeExperimentalBetterAuthCompatibility({
        baseURL: "http://127.0.0.1:3000",
        secret: experimentalSecret(),
      });

    assert.deepEqual(result, { status: "initialized" });
    assert.equal(fetchCalls, 0);
    assert.deepEqual(Object.keys(result), ["status"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("keeps the experimental module independent from database infrastructure", async () => {
  const source = await readFile(
    new URL(
      "../src/experiments/better-auth/compatibility.server.ts",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(source, /^import "server-only";/);
  assert.doesNotMatch(source, /(?:getDb|drizzle|node-postgres|\bpg\b|Pool)/);
  assert.doesNotMatch(source, /process\.env|DATABASE_URL|TEST_DATABASE_URL/);
  assert.doesNotMatch(source, /console\.|NEXT_PUBLIC_/);
});

test("reports invalid configuration without exposing rejected values", async () => {
  const compatibilityModule = await import(compatibilityModulePath);
  const rejectedSecret = ["rejected", "sensitive", "value"].join("-");
  const rejectedURL = "https://user:password@invalid.example/path?secret=value";

  assert.throws(
    () =>
      compatibilityModule.initializeExperimentalBetterAuthCompatibility({
        baseURL: rejectedURL,
        secret: rejectedSecret,
      }),
    (error: unknown) => {
      if (!(error instanceof Error)) {
        return false;
      }

      assert.ok(
        error instanceof
          compatibilityModule.ExperimentalBetterAuthConfigurationError,
      );
      assert.doesNotMatch(error.message, /rejected|sensitive|value/i);
      assert.doesNotMatch(error.message, /invalid\.example|password|secret/i);
      return true;
    },
  );
});
