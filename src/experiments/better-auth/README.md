# Better Auth compatibility spike

Analysis date: 2026-07-27. This experiment evaluates whether Better Auth
1.6.25 can coexist with the IMPROVE application without coupling authentication
tables to the marketplace domain. It is not production authentication code and
must not be imported into a production runtime.

## Checkpoints

Checkpoint 1 proved that the minimal server-only package surface can be built,
tested, and kept out of the client bundle and Worker artifact. Checkpoint 2
proved that the official CLI can derive an isolated Drizzle/PostgreSQL schema
from a mocked adapter, without a database connection:

```sh
npx auth@1.6.25 generate --config src/experiments/better-auth/schema/auth.ts --output src/experiments/better-auth/generated/auth-schema.ts --yes
```

Generated schema SHA-256:
`28140d6e55a3397c04894f8af03fe18d41523360e47ac11df6eec8415cddf054`.
It contains only the four core tables: `auth_users`, `auth_sessions`,
`auth_accounts`, and `auth_verifications`; no plugin tables were generated.
Their IDs are textual and remain separate from the UUID-based marketplace
domain. No database was accessed and no migration was generated or applied.

Checkpoint 3 adds a separate, IMPROVE-controlled schema proposal in
`hardened/hardened-auth-schema.ts`. The official generated schema remains the
immutable compatibility baseline; the hardened proposal is not generated,
migrated, connected to PostgreSQL, or approved for production. A typed probe
initializes Better Auth 1.6.25 with the official Drizzle adapter, an explicitly
injected schema, and Drizzle's PostgreSQL mock only.

The proposal replaces case-sensitive `unique(email)` with the unique index
`auth_users_email_lower_unique_idx` over `lower(email)`. The application must
continue normalizing email to lowercase; the database index is the final
case-insensitive invariant. This checkpoint deliberately does not add trimming
or Unicode canonicalization. It also adds
`auth_accounts_provider_id_account_id_unique_idx`, ordered as
`(provider_id, account_id)`, so the same external identity cannot be linked
twice while one Better Auth user can still have accounts from Google and
Microsoft. A future adapter workflow must safely map a concurrent uniqueness
violation.

Every temporal column uses PostgreSQL `timestamp with time zone`, preserving
the generated schema's defaults, nullability, and `$onUpdate` behavior. The
TypeScript relation properties are `sessions`, `accounts`, and `user`, avoiding
the generated double-plural names without changing physical tables or columns.

OAuth token columns remain nullable solely for structural adapter
compatibility. Their presence does not authorize plaintext token storage;
minimization and encryption require separate experiments, and plaintext
`id_token` remains an unresolved risk. No real provider is configured.

Checkpoint 4 uses the locally installed Drizzle Kit 0.31.10 to generate and
statically review the PostgreSQL migration for the hardened proposal. The exact
command was:

```sh
npx --no-install drizzle-kit generate --config src/experiments/better-auth/hardened/drizzle.config.ts --name create_hardened_better_auth_schema
```

The isolated migration is
`hardened/drizzle/0000_create_hardened_better_auth_schema.sql`. It creates only
the four core authentication tables, with four textual primary keys, twelve
timezone-aware timestamp columns, the two cascading user foreign keys, session
token uniqueness, the case-insensitive email index, the provider/account
identity index, and the three functional lookup indexes. Its only `ALTER TABLE`
statements add the two foreign keys; it contains no destructive SQL, DML,
plugin or domain table, seed, extension, function, trigger, or privilege change.

Generated artifact SHA-256 values:

- SQL: `b0b24264973191f8aa3bb3d7fb3ac3041cdebb147765bbdfe37b65dba9d3b7f9`
- Snapshot: `9d8930a38c64638cf3592eed55037c4ad032f7d5cffc510f7ccfa7e4470b1104`
- Journal: `49e17c36efd613c43fe4b160aec0aa15ad564026ba4b94d06544ca6a44d4c3dc`

The SQL was not applied and no database was accessed. These generated files
remain experimental review artifacts, not a production migration. PostgreSQL
execution, transactional behavior, concurrent uniqueness violations, rollback
strategy, token minimization and encryption, and integration with a real OAuth
flow remain unproved.

As expected from the hardened Drizzle schema, `auth_accounts.updated_at` and
`auth_sessions.updated_at` are required but have no SQL default; this preserves
the Better Auth structural behavior in which the application supplies their
values. A future adapter test must prove that every applicable insert provides
them before this proposal can advance. The offline command
`npx --no-install drizzle-kit check --config src/experiments/better-auth/hardened/drizzle.config.ts`
reported that the experimental migration metadata is valid.

The generated relation properties `auth_sessionss` and `auth_accountss` result
from plural custom model names receiving another plural suffix. They do not
change physical table names, but are a maintainability concern if relational
queries later use them.

## Findings and unresolved production requirements

- Better Auth's internal 1.6.25 paths lowercase user email with
  `toLowerCase()`; they do not trim or perform Unicode/provider-specific
  canonicalization. Direct adapter calls and hooks can bypass or replace this
  behavior. The generated `unique(email)` is case-sensitive, so production
  design still needs a database-enforced normalized-email policy.
- OAuth lookup uses `(providerId, accountId)`, but the generated schema has no
  unique constraint for that pair. Application checks alone do not close a
  concurrent-link race. A database uniqueness constraint is a production
  blocker to resolve and validate before adoption.
- Every generated PostgreSQL timestamp is `timestamp without time zone`.
  Drizzle serializes JavaScript `Date` values as ISO UTC and interprets returned
  naive strings as UTC, but database/session timezone differences can make SQL
  defaults or comparisons ambiguous. The marketplace currently uses
  `timestamp with time zone`; alignment requires an explicit schema ownership
  decision rather than editing this generated file by hand.
- OAuth flows can persist access, refresh, and ID tokens when providers return
  them. `account.encryptOAuthTokens` defaults to false. Although the option is
  documented for OAuth tokens generally, inspected 1.6.25 paths encrypt access
  and refresh tokens while passing `idToken` directly in several create/update
  flows. This must be verified or mitigated before storing tokens. Versioned
  secrets support non-destructive rotation only while prior keys remain
  available.
- With email/password disabled, `auth_accounts.password` remains nullable and
  unused by the intended OAuth-only flow. `auth_verifications` may still hold
  OAuth state when database state storage is selected; it cannot yet be assumed
  unused.

For an authentication-only MVP, request only identity scopes, disable implicit
account linking until its policy is approved, avoid downstream-provider APIs,
and do not retain provider tokens unless a demonstrated runtime requirement
exists. If retention is required, encrypt every token class with tested key
rotation and minimize its lifetime. These are recommendations, not configuration
implemented by this spike.

The preferred future boundary is a domain-owned `user_auth_identities` mapping:
`users.id` → `issuer = "better-auth"` → `subject = auth_users.id`, while Google
and Microsoft accounts remain inside `auth_accounts`. Checkpoint 3 does not
implement that table. Conceptually it should have a UUID primary key, a
foreign key to `users`, unique `(issuer, subject)`, and an index on `user_id`.
Multiple authentication identities per marketplace user should be allowed for
migration, with explicit merge controls. Avoid a direct foreign key to
`auth_users` so the same contract works with an external provider such as Clerk;
application workflows must coordinate deletion and revocation.

Still unproved: real OAuth callbacks, provider-specific claims, database SQL and
concurrency behavior, migrations, token minimization, encryption coverage,
secret rotation, timezone behavior against PostgreSQL, sessions, revocation,
deletion, and the identity bridge. None may be inferred as production-ready
from this experiment.

Official references:

- [Database and core schema](https://www.better-auth.com/docs/concepts/database)
- [CLI schema generation](https://www.better-auth.com/docs/concepts/cli)
- [Users, accounts, and account linking](https://www.better-auth.com/docs/concepts/users-accounts)
- [Configuration options](https://www.better-auth.com/docs/reference/options)
- [Security and secret rotation](https://www.better-auth.com/docs/reference/security)
