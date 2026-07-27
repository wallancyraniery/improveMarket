import "server-only";

import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import * as schema from "../../../../db/schema";
import { organizationMembers, organizations, users } from "../../../../db/schema";
import type { OrganizationOnboardingStore } from "../application/organization-onboarding-store";
import { EmailAlreadyRegisteredError } from "../domain/organization-onboarding-errors";

type OnboardingDatabase = Pick<NodePgDatabase<typeof schema>, "transaction">;

const duplicateEmailConstraint = "users_email_lower_unique_idx";
const maximumCauseDepth = 8;

function isDuplicateEmailError(error: unknown): boolean {
  const visited = new Set<object>();
  let current: unknown = error;

  for (let depth = 0; depth < maximumCauseDepth; depth += 1) {
    if (typeof current !== "object" || current === null || visited.has(current)) {
      return false;
    }

    visited.add(current);
    const candidate = current as Record<string, unknown>;

    if (
      candidate.code === "23505" &&
      candidate.constraint === duplicateEmailConstraint
    ) {
      return true;
    }

    current = candidate.cause;
  }

  return false;
}

function requireUserId(rows: Array<{ id: string }>): string {
  if (rows.length !== 1 || typeof rows[0]?.id !== "string" || rows[0].id.length === 0) {
    throw new Error("The user insert returned an invalid result.");
  }

  return rows[0].id;
}

function requireOrganization(
  rows: Array<{ id: string; kind: "ARTIST" | "VENUE" }>,
): { id: string; kind: "ARTIST" | "VENUE" } {
  const organization = rows[0];

  if (
    rows.length !== 1 ||
    typeof organization?.id !== "string" ||
    organization.id.length === 0 ||
    (organization.kind !== "ARTIST" && organization.kind !== "VENUE")
  ) {
    throw new Error("The organization insert returned an invalid result.");
  }

  return organization;
}

export class PostgresOrganizationOnboardingStore
  implements OrganizationOnboardingStore
{
  constructor(private readonly database: OnboardingDatabase) {}

  async create(
    input: Parameters<OrganizationOnboardingStore["create"]>[0],
  ): ReturnType<OrganizationOnboardingStore["create"]> {
    try {
      return await this.database.transaction(async (transaction) => {
        const insertedUsers = await transaction
          .insert(users)
          .values({
            email: input.email,
            displayName: input.displayName,
          })
          .returning({ id: users.id });
        const userId = requireUserId(insertedUsers);

        const insertedOrganizations = await transaction
          .insert(organizations)
          .values({
            name: input.organizationName,
            kind: input.organizationKind,
          })
          .returning({
            id: organizations.id,
            kind: organizations.kind,
          });
        const organization = requireOrganization(insertedOrganizations);

        await transaction.insert(organizationMembers).values({
          userId,
          organizationId: organization.id,
          role: "OWNER",
          status: "ACTIVE",
        });

        return {
          userId,
          organizationId: organization.id,
          organizationKind: organization.kind,
          membershipRole: "OWNER",
        };
      });
    } catch (error: unknown) {
      if (isDuplicateEmailError(error)) {
        throw new EmailAlreadyRegisteredError();
      }

      throw error;
    }
  }
}
