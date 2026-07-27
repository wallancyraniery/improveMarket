import { z } from "zod";

import { InvalidOnboardingInputError } from "./organization-onboarding-errors";

export type OrganizationKind = "ARTIST" | "VENUE";

export type CreateUserWithInitialOrganizationInput = {
  email: string;
  displayName: string;
  organizationName: string;
  organizationKind: OrganizationKind;
};

export type NormalizedOrganizationOnboardingInput = {
  email: string;
  displayName: string;
  organizationName: string;
  organizationKind: OrganizationKind;
};

export type CreateUserWithInitialOrganizationOutput = {
  userId: string;
  organizationId: string;
  organizationKind: OrganizationKind;
  membershipRole: "OWNER";
};

const organizationOnboardingInputSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  displayName: z.string().trim().min(1),
  organizationName: z.string().trim().min(1),
  organizationKind: z.enum(["ARTIST", "VENUE"]),
});

export function normalizeOrganizationOnboardingInput(
  input: unknown,
): NormalizedOrganizationOnboardingInput {
  const result = organizationOnboardingInputSchema.safeParse(input);

  if (!result.success) {
    throw new InvalidOnboardingInputError();
  }

  return result.data;
}
