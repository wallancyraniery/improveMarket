# Marketplace regional de shows

Aplicação web em desenvolvimento para aproximar projetos artísticos e estabelecimentos a partir de informações como agenda, localização, estilo e condições comerciais.

O projeto nasceu de um problema real do mercado regional de música ao vivo e vem sendo desenvolvido de forma incremental, combinando prototipação de produto com uma fundação de backend baseada em PostgreSQL, PostGIS, Drizzle ORM, validação e testes automatizados.

> **Estado atual:** protótipo navegável com dados fictícios e fundação backend em evolução. O nome público do produto ainda não foi definido e algumas decisões de produção permanecem deliberadamente em aberto.

## Competências demonstradas

- Modelagem e persistência com PostgreSQL, PostGIS e Drizzle ORM
- Migrations e separação entre credenciais de runtime e migration
- Docker Compose para ambientes locais de desenvolvimento e integração
- Testes automatizados e testes de integração com PostgreSQL real
- Validação de dados e ambiente com Zod
- Fluxo transacional de onboarding de organizações
- Arquitetura modular com separação entre domínio, interface e infraestrutura
- TypeScript em modo estrito, Next.js e React

## Problema e proposta

A contratação de apresentações musicais em cidades menores costuma depender de contatos dispersos e informações pouco estruturadas. O projeto investiga uma experiência em que artistas e estabelecimentos possam se encontrar considerando disponibilidade, localização, estilo e condições comerciais.

A interface atual serve como demonstração navegável do conceito. Os dados exibidos são fictícios e não representam usuários, estabelecimentos ou negociações reais.

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

`app/page.tsx` funciona como ponto de entrada. Regras, dados demonstrativos e interface ficam concentrados no módulo do marketplace, enquanto integrações específicas de infraestrutura permanecem isoladas.

## Stack

- Next.js 16
- React 19
- TypeScript 5.9
- PostgreSQL + PostGIS
- Drizzle ORM e Drizzle Kit
- Zod
- Docker Compose
- ESLint
- Node.js 22+

A base atual também utiliza Vinext/Vite para o ambiente de build existente. Essa escolha de infraestrutura não define, por si só, a plataforma final de produção.

## Backend e banco de dados

O ambiente local utiliza PostgreSQL com PostGIS via Docker Compose. O schema inicial contempla identidades e organizações, e o projeto separa a credencial de execução da aplicação (`DATABASE_URL`) da credencial usada para migrations (`MIGRATION_DATABASE_URL`).

Essa separação permite que uma futura configuração de produção aplique privilégio mínimo ao runtime sem acoplar migrations à inicialização da aplicação. O provedor remoto de PostgreSQL ainda não foi definido.

O acesso ao banco utiliza `pg` e Drizzle ORM. O adapter de runtime cria o pool de forma lazy e possui limites explícitos de conexão e timeout.

## Testes e ambiente de integração

Além dos testes automatizados do projeto, existe um PostgreSQL descartável e isolado para testes de integração:

- exposto somente em `127.0.0.1:5433`;
- exige banco com sufixo `_test`;
- participa apenas do profile `test` do Docker Compose;
- utiliza `tmpfs`, sem volume persistente;
- executa os testes de integração de forma opt-in e serial;
- valida o destino antes de permitir operações de teste.

O fluxo de integração verifica o comportamento do onboarding de organizações contra PostgreSQL real, sem reutilizar o banco local de desenvolvimento.

## Desenvolvimento local

Requisitos:

1. Node.js 22.13 ou superior
2. npm
3. Docker Engine com Docker Compose para os fluxos que utilizam PostgreSQL

Instale as dependências e inicie a aplicação:

```bash
npm ci
npm run dev
```

Para preparar o ambiente local de banco, copie o arquivo de exemplo e substitua as credenciais demonstrativas por valores locais próprios:

```bash
cp .env.example .env
docker compose up -d
```

O arquivo `.env` é ignorado pelo Git e não deve ser versionado.

## Comandos principais

```bash
npm run lint
npm test
npm run build
npm run db:generate
npm run db:migrate
npm run db:check
npm run db:test:prepare
npm run db:test:check
npm run test:integration
```

`npm run db:check` realiza diagnósticos do PostgreSQL, PostGIS, migrations e tabelas esperadas sem expor credenciais. Os testes de integração são executados separadamente para evitar que o fluxo padrão dependa de um banco ativo.

## Estado atual e limitações

O projeto ainda não representa um produto pronto para produção. Neste estágio:

- a experiência pública utiliza dados fictícios;
- autenticação de produção ainda não foi adotada;
- provedor de banco e estratégia final de hospedagem permanecem em avaliação;
- regras definitivas de identidade de organizações e estabelecimentos ainda precisam ser validadas;
- proteções necessárias para escrita pública, como rate limiting e mecanismos antiabuso, fazem parte das decisões futuras;
- não há pagamentos ou operação comercial real implementados.

Essas limitações são mantidas explícitas para não apresentar funcionalidades experimentais ou planejadas como concluídas.

## Próximos passos

A evolução prevista inclui validar o modelo de identidade de usuários e organizações, concluir a estratégia de autenticação, definir infraestrutura de produção, aprofundar proteção de operações de escrita e continuar a implementação dos fluxos do marketplace a partir das necessidades validadas do produto.

## Observação sobre infraestrutura

O repositório contém adaptações e arquivos relacionados ao ambiente Vinext/Vite e à infraestrutura de hospedagem utilizada durante o desenvolvimento. Eles permanecem isolados da lógica principal do marketplace. A decisão de hospedagem de produção ainda não é definitiva.
