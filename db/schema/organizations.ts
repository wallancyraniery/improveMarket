import {
  index,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "./identity";

export const organizationKind = pgEnum("organization_kind", [
  "ARTIST",
  "VENUE",
]);

export const organizationStatus = pgEnum("organization_status", [
  "ACTIVE",
  "SUSPENDED",
  "DELETED",
]);

export const organizationMemberRole = pgEnum("organization_member_role", [
  "OWNER",
  "ADMIN",
  "MEMBER",
]);

export const organizationMemberStatus = pgEnum(
  "organization_member_status",
  ["ACTIVE", "INACTIVE"],
);

export const organizations = pgTable("organizations", {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    kind: organizationKind("kind").notNull(),
    status: organizationStatus("status").notNull().default("ACTIVE"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    // The application must maintain updatedAt until an explicit trigger strategy exists.
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const organizationMembers = pgTable(
  "organization_members",
  {
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: organizationMemberRole("role").notNull(),
    status: organizationMemberStatus("status").notNull().default("ACTIVE"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    // The application must maintain updatedAt until an explicit trigger strategy exists.
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({
      name: "organization_members_organization_id_user_id_pk",
      columns: [table.organizationId, table.userId],
    }),
    index("organization_members_user_id_idx").on(table.userId),
  ],
);
