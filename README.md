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
- `db/index.ts` reads the D1 binding from the Cloudflare Worker environment
- `db/schema.ts` starts intentionally empty
- `examples/d1/` contains an optional D1 example surface
- `drizzle.config.ts` supports local migration generation when needed

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
- `npm run db:generate`: generate Drizzle migrations after schema changes

Use build and validation commands for targeted diagnosis after a remote failure, not as part of the normal checkpoint path.

The timeout defaults can be overridden for a controlled canary with `SITES_INSTALL_TIMEOUT`, `SITES_INSTALL_KILL_AFTER`, `SITES_BUILD_TIMEOUT`, and `SITES_BUILD_KILL_AFTER`. A timeout fails the command; the helpers never retry an unchanged install or build.

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)
