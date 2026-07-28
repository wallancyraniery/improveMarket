import "server-only";

import { betterAuth } from "better-auth/minimal";

export type ExperimentalBetterAuthCompatibilityConfig = {
  baseURL: string;
  secret: string;
};

export type ExperimentalBetterAuthCompatibilityResult = {
  status: "initialized";
};

export class ExperimentalBetterAuthConfigurationError extends Error {
  constructor() {
    super("The experimental authentication configuration is invalid.");
    this.name = "ExperimentalBetterAuthConfigurationError";
  }
}

function isValidConfiguration(
  config: ExperimentalBetterAuthCompatibilityConfig,
): boolean {
  if (config.secret.length < 32) {
    return false;
  }

  try {
    const baseURL = new URL(config.baseURL);

    return (
      (baseURL.protocol === "https:" ||
        (baseURL.protocol === "http:" && baseURL.hostname === "127.0.0.1")) &&
      baseURL.username.length === 0 &&
      baseURL.password.length === 0 &&
      baseURL.pathname === "/" &&
      baseURL.search.length === 0 &&
      baseURL.hash.length === 0
    );
  } catch {
    return false;
  }
}

export function initializeExperimentalBetterAuthCompatibility(
  config: ExperimentalBetterAuthCompatibilityConfig,
): ExperimentalBetterAuthCompatibilityResult {
  if (!isValidConfiguration(config)) {
    throw new ExperimentalBetterAuthConfigurationError();
  }

  betterAuth({
    appName: "IMPROVE Better Auth compatibility experiment",
    baseURL: config.baseURL,
    secret: config.secret,
    telemetry: { enabled: false },
    emailAndPassword: { enabled: false },
    socialProviders: {},
  });

  return { status: "initialized" };
}
