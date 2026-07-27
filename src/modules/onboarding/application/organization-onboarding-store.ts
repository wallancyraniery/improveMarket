import type {
  CreateUserWithInitialOrganizationOutput,
  NormalizedOrganizationOnboardingInput,
} from "../domain/organization-onboarding";

export type OrganizationOnboardingStore = {
  create(
    input: NormalizedOrganizationOnboardingInput,
  ): Promise<CreateUserWithInitialOrganizationOutput>;
};
