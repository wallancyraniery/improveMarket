import type {
  CreateUserWithInitialOrganizationInput,
  CreateUserWithInitialOrganizationOutput,
} from "../domain/organization-onboarding";
import { normalizeOrganizationOnboardingInput } from "../domain/organization-onboarding";
import {
  EmailAlreadyRegisteredError,
  InvalidOnboardingInputError,
  OrganizationOnboardingUnavailableError,
} from "../domain/organization-onboarding-errors";
import type { OrganizationOnboardingStore } from "./organization-onboarding-store";

export async function createUserWithInitialOrganization(
  input: CreateUserWithInitialOrganizationInput,
  store: OrganizationOnboardingStore,
): Promise<CreateUserWithInitialOrganizationOutput> {
  const normalizedInput = normalizeOrganizationOnboardingInput(input);

  try {
    const result = await store.create(normalizedInput);

    return {
      userId: result.userId,
      organizationId: result.organizationId,
      organizationKind: result.organizationKind,
      membershipRole: "OWNER",
    };
  } catch (error: unknown) {
    if (
      error instanceof InvalidOnboardingInputError ||
      error instanceof EmailAlreadyRegisteredError ||
      error instanceof OrganizationOnboardingUnavailableError
    ) {
      throw error;
    }

    throw new OrganizationOnboardingUnavailableError();
  }
}
