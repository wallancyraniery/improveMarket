import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth/minimal";
import { drizzle } from "drizzle-orm/node-postgres";

const database = drizzle.mock();

export const auth = betterAuth({
  database: drizzleAdapter(database, {
    provider: "pg",
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
