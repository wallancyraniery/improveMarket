# IMPROVE — Marketplace regional de shows

Aplicação web para conectar projetos artísticos e estabelecimentos por agenda,
localização, estilo e condições comerciais.

## Arquitetura da aplicação

```text
app/
  layout.tsx
  page.tsx
src/
  components/
    brand/
  infrastructure/
    auth/
  modules/
    marketplace/
      data/
      domain/
      ui/
        components/
        sections/
```

`app/page.tsx` funciona somente como ponto de entrada. Regras, dados
demonstrativos e interface do marketplace ficam no módulo correspondente.
Integrações específicas de hospedagem permanecem isoladas em `infrastructure`.

## Estado atual

Protótipo navegável com dados fictícios. O nome público do produto ainda não
foi definido.

## Desenvolvimento local

Requisitos:

1. Node.js 22.13 ou superior.
2. npm.

Instalação e execução:

```bash
npm ci
npm run dev
```

## PostgreSQL e PostGIS locais

Este ambiente é somente para desenvolvimento local. Ele não configura banco de
produção, provedor remoto ou Cloudflare Hyperdrive.

Pré-requisitos:

1. Docker Engine com o plugin Docker Compose.
2. Porta `5432` disponível em `127.0.0.1`.

Crie o arquivo local de ambiente a partir dos valores demonstrativos:

```bash
# Linux e macOS
cp .env.example .env

# Windows PowerShell
Copy-Item .env.example .env
```

Antes de iniciar o serviço, substitua a senha demonstrativa em `.env` por uma
senha local própria. O arquivo `.env` é ignorado pelo Git e não deve ser
versionado. Atualize também `DATABASE_URL` e `MIGRATION_DATABASE_URL` com o
mesmo usuário, senha, host, porta e banco definidos pelas variáveis
`POSTGRES_*`. As URLs aceitam os protocolos `postgres:` e `postgresql:`.

No desenvolvimento local, as duas URLs podem apontar para o mesmo banco e usar
a mesma credencial. Em produção, a credencial de runtime indicada por
`DATABASE_URL` deverá ter privilégios mínimos, enquanto a credencial separada
de `MIGRATION_DATABASE_URL` deverá ter os privilégios adicionais necessários
para executar migrations. O provedor de produção ainda não está definido.
O runtime exige somente `DATABASE_URL`; o Drizzle Kit exige somente
`MIGRATION_DATABASE_URL`.

Inicie o banco em segundo plano:

```bash
docker compose up -d
```

Verifique o estado e aguarde até o serviço aparecer como `healthy`:

```bash
docker compose ps
```

Para visualizar os logs:

```bash
docker compose logs -f postgres
```

Para parar e remover os contêineres sem apagar os dados persistidos:

```bash
docker compose down
```

Para apagar deliberadamente também o volume de dados:

```bash
docker compose down --volumes
```

**Atenção:** a opção `--volumes` apaga de forma destrutiva todos os dados do
PostgreSQL armazenados no volume deste projeto.

### PostgreSQL descartável para testes de integração

O serviço `postgres-test` é isolado do banco de desenvolvimento: usa somente
`127.0.0.1:5433`, exige banco com sufixo `_test`, participa apenas do profile
`test` e armazena dados em `tmpfs`. Atualize manualmente as quatro variáveis
`TEST_*` no `.env` local antes de usar os comandos abaixo.

Inicie e verifique somente o serviço de teste:

```bash
docker compose --profile test up -d postgres-test
docker compose --profile test ps postgres-test
```

Prepare as migrations existentes e execute o diagnóstico somente leitura:

```bash
npm run db:test:prepare
npm run db:test:check
```

Pare somente o serviço de teste:

```bash
docker compose --profile test stop postgres-test
```

Para apagar o ambiente descartável, remova somente esse contêiner. Como os
dados usam `tmpfs`, não há volume de teste persistente a remover:

```bash
docker compose --profile test rm -f postgres-test
```

Não use `docker compose down --volumes` para esse fluxo, pois o comando também
apagaria o volume persistente do PostgreSQL de desenvolvimento.

---

## Infraestrutura de hospedagem

O projeto utiliza uma base Vinext para a publicação atual.

A clean full-stack starter running on
[vinext](https://github.com/cloudflare/vinext), with optional Cloudflare D1 and
Drizzle support.

## Compatibilidade

Os comandos npm públicos funcionam em Windows, Linux e macOS com Node.js
`>=22.13.0`. Os scripts Bash em `scripts/` são auxiliares especializados do
ambiente de hospedagem e não são necessários para o fluxo local padrão.

## Sites Lifecycle

The Sites lifecycle CLI runs the locked dependency install before returning this checkout. Edit the source under `app/`, then checkpoint when a coherent milestone is ready to inspect or share. The remote Sites builder runs `npm run build` against the pushed commit. Do not repeat install or build as a normal pre-checkpoint step.

This starter does not use `wrangler.jsonc`.

`install:ci` executa uma instalação reproduzível a partir do lockfile e mantém o
cache dentro do projeto. `build` gera o artefato Vinext e valida o manifesto e o
Worker resultantes com um script Node multiplataforma.

Scripts that need writable project-scoped home, npm, XDG, and temporary paths use `scripts/sites-env.sh`. The `dev` and `start` scripts honor the caller's runtime environment and keep Wrangler logs inside the checkout. The generated `.sites-runtime/` directory is disposable and ignored by Git.

## Included Shape

- mantenha `app/page.tsx` como ponto de entrada e desenvolva os módulos em `src/`
- `src/infrastructure/auth/workspace-user.ts` encapsulates the optional
  identity integration supplied by the current hosting platform
- `.openai/hosting.json` declares optional Sites D1 and R2 bindings
- `vite.config.ts` simulates declared bindings for local development
- `db/index.ts` provides a lazy PostgreSQL Pool and Drizzle adapter using only
  `DATABASE_URL`; it limits the Pool to 5 connections, waits up to 5 seconds to
  connect, and releases idle connections after 10 seconds
- `db/schema.ts` exports the initial `users`, `organizations`, and
  `organization_members` schemas
- `examples/d1/` contains an optional D1 example surface
- `drizzle.config.ts` loads the local `.env`, validates the database environment,
  and gives Drizzle Kit only `MIGRATION_DATABASE_URL` for PostgreSQL migrations

## Workspace Auth Headers

OpenAI workspace sites can read the current user's email from
`oai-authenticated-user-email`.

SIWC-authenticated workspace sites may also receive
`oai-authenticated-user-full-name` when the user's SIWC profile has a non-empty
`name` claim. The full-name value is percent-encoded UTF-8 and is accompanied by
`oai-authenticated-user-full-name-encoding: percent-encoded-utf-8`.

Treat the full name as optional and fall back to email when it is absent:

```tsx
import { headers } from "next/headers";

export default async function Home() {
  const requestHeaders = await headers();
  const email = requestHeaders.get("oai-authenticated-user-email");
  const encodedFullName = requestHeaders.get("oai-authenticated-user-full-name");
  const fullName =
    encodedFullName &&
    requestHeaders.get("oai-authenticated-user-full-name-encoding") ===
      "percent-encoded-utf-8"
      ? decodeURIComponent(encodedFullName)
      : null;

  const displayName = fullName ?? email;
  // ...
}
```

## Optional Dispatch-Owned ChatGPT Sign-In

Import the hosting adapter from
`src/infrastructure/auth/workspace-user.ts` only when the site needs the
optional identity integration:

- Use `getWorkspaceUser()` for optional signed-in UI.
- Use `requireWorkspaceUser(returnTo)` for server-rendered pages that should send
  anonymous visitors through Sign in with ChatGPT.
- Use `workspaceSignInPath(returnTo)` and `workspaceSignOutPath(returnTo)` for
  browser links or actions.
- Pass a same-origin relative `returnTo` path for the destination after sign-in
  or sign-out. The helper validates and safely encodes it.
- Mark protected pages with `export const dynamic = "force-dynamic"` because
  they depend on per-request identity headers.

Dispatch owns `/signin-with-chatgpt`, `/signout-with-chatgpt`, `/callback`, the
OAuth cookies, and identity header injection. Do not implement app routes for
those reserved paths. Routes that do not import and call the helper remain
anonymous-compatible.

SIWC establishes identity only; it does not prove workspace membership. Use the
Sites hosting platform's access policy controls for workspace-wide restrictions,
or enforce explicit server-side membership or allowlist checks.

Use SIWC for account pages, user-specific dashboards, saved records, and write
actions tied to the current ChatGPT user. Leave public content anonymous.

## Diagnostic Commands

- `npm run install:ci`: perform the one bounded lockfile install
- `npm run dev`: start the Vite/Vinext development server
- `npm run build`: build and validate the deployable Sites artifact
- `npm run start`: start the built Vinext application
- `npm test`: build, validate, and verify the rendered development-preview metadata
- `npm run validate:artifact`: recheck an existing artifact's manifest and ESM `default.fetch` export
- `npm run db:generate`: generate PostgreSQL migrations after schema changes;
  Drizzle Kit loads `.env` and uses only `MIGRATION_DATABASE_URL`
- `npm run db:migrate`: deliberately apply pending PostgreSQL migrations using
  only `MIGRATION_DATABASE_URL`; migrations never run during application startup
- `npm run db:check`: validate the local PostgreSQL connection, `SELECT 1`,
  PostgreSQL version, PostGIS availability, registered migrations, and the
  expected `users`, `organizations`, and `organization_members` tables without
  exposing credentials
- `npm run db:test:prepare`: valida `TEST_DATABASE_URL` e aplica as migrations
  existentes exclusivamente no PostgreSQL descartável de testes
- `npm run db:test:check`: valida e diagnostica somente o PostgreSQL de testes,
  sem modificar dados nem expor credenciais

Use build and validation commands for targeted diagnosis after a remote failure, not as part of the normal checkpoint path.

The production PostgreSQL transport remains undecided. Cloudflare deployment
may require `nodejs_compat` and Hyperdrive depending on the chosen provider;
neither is configured by the generic local adapter.

The timeout defaults can be overridden for a controlled canary with `SITES_INSTALL_TIMEOUT`, `SITES_INSTALL_KILL_AFTER`, `SITES_BUILD_TIMEOUT`, and `SITES_BUILD_KILL_AFTER`. A timeout fails the command; the helpers never retry an unchanged install or build.

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)
