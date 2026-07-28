import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth/minimal";
import { drizzle } from "drizzle-orm/node-postgres";

import * as hardenedAuthSchema from "./hardened-auth-schema";

const database = drizzle.mock({ schema: hardenedAuthSchema });

export const hardenedAuth = betterAuth({
  database: drizzleAdapter(database, {
    provider: "pg",
    schema: hardenedAuthSchema,
  }),
  emailAndPassword: {
    enabled: false,
  },
  user: {
    modelName: "auth_users",
  },
  session: {
    modelName: "auth_sessions",
  },
  account: {
    modelName: "auth_accounts",
  },
  verification: {
    modelName: "auth_verifications",
  },
  telemetry: {
    enabled: false,
  },
});

export function getHardenedAuthProbe() {
  return {
    status: "initialized" as const,
    tables: [
      "auth_users",
      "auth_sessions",
      "auth_accounts",
      "auth_verifications",
    ] as const,
  };
}
