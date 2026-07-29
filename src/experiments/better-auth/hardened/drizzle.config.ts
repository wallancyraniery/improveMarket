import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema:
    "src/experiments/better-auth/hardened/hardened-auth-schema.ts",
  out: "src/experiments/better-auth/hardened/drizzle",
});
