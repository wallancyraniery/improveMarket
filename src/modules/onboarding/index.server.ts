import "server-only";

import { getDb } from "@/db/index";

import { createUserWithInitialOrganization as executeCreateUserWithInitialOrganization } from "./application/create-user-with-initial-organization";
import { PostgresOrganizationOnboardingStore } from "./data/postgres-organization-onboarding-store";
import type {
  CreateUserWithInitialOrganizationInput,
  CreateUserWithInitialOrganizationOutput,
} from "./domain/organization-onboarding";

export async function createUserWithInitialOrganization(
  input: CreateUserWithInitialOrganizationInput,
): Promise<CreateUserWithInitialOrganizationOutput> {
  const database = getDb();
  const store = new PostgresOrganizationOnboardingStore(database);

  return executeCreateUserWithInitialOrganization(input, store);
}
