export class InvalidOnboardingInputError extends Error {
  readonly code = "INVALID_ONBOARDING_INPUT" as const;

  constructor() {
    super("The onboarding information is invalid.");
    this.name = "InvalidOnboardingInputError";
  }
}

export class EmailAlreadyRegisteredError extends Error {
  readonly code = "EMAIL_ALREADY_REGISTERED" as const;

  constructor() {
    super("An account with this email is already registered.");
    this.name = "EmailAlreadyRegisteredError";
  }
}

export class OrganizationOnboardingUnavailableError extends Error {
  readonly code = "ORGANIZATION_ONBOARDING_UNAVAILABLE" as const;

  constructor() {
    super("Organization onboarding is temporarily unavailable.");
    this.name = "OrganizationOnboardingUnavailableError";
  }
}
