# AGENTS.md

Este arquivo define as regras de trabalho para agentes e colaboradores neste repositório. Leia-o antes de alterar qualquer arquivo e preserve as instruções mais específicas que existirem em subdiretórios.

## Contexto do produto

A IMPROVE é um marketplace regional que conecta artistas, músicos, duplas e bandas a estabelecimentos com oportunidades de shows. A região piloto inclui Itajubá, Paraisópolis e Brazópolis, Minas Gerais, além das proximidades.

O nome definitivo do marketplace ainda será escolhido. Não renomeie o produto nem transforme `marketplace` em outro nome de módulo sem decisão explícita.

## Estrutura do repositório

- `app/`: integração com o App Router, layout global, estilos globais e pontos de entrada. `app/page.tsx` deve permanecer mínimo e apenas compor/importar a interface principal.
- `src/components/`: componentes compartilhados entre módulos, como elementos de marca.
- `src/infrastructure/`: integrações e detalhes técnicos externos à regra de negócio.
- `src/modules/`: módulos funcionais da aplicação.
- `src/modules/marketplace/domain/`: tipos, entidades, regras e contratos do domínio do marketplace, sem dependência da interface.
- `src/modules/marketplace/data/`: dados demonstrativos, adaptadores e implementações de acesso a dados do módulo.
- `src/modules/marketplace/ui/`: páginas internas, seções e componentes de interface do marketplace.
- `public/`: arquivos estáticos; o símbolo oficial da IMPROVE está em `public/brand/improve-symbol-transparent.png`.
- `db/`, `drizzle/` e `examples/d1/`: estrutura preparada e exemplos de persistência. O Drizzle Kit usa PostgreSQL e `MIGRATION_DATABASE_URL`; o adaptador runtime usa PostgreSQL e `DATABASE_URL`. Migrations são executadas deliberadamente com `npm run db:migrate`, nunca no startup da aplicação. Os exemplos D1 permanecem isolados. Não ativar ou expandir banco de dados sem solicitação explícita.
- `build/`, `worker/` e `scripts/`: integração de build, worker e automações do projeto.
- `tests/`: testes automatizados.

## Comandos de trabalho

Pré-requisito: Node.js `>=22.13.0` e npm compatível com o `package-lock.json`.

- Instalar dependências reproduzíveis: `npm ci`
- Executar em desenvolvimento: `npm run dev`
- Executar o artefato compilado: `npm run start`
- Validar lint: `npm run lint`
- Gerar e validar o build: `npm run build`
- Executar testes: `npm test`
- Preparar banco descartável de testes: `npm run db:test:prepare`
- Diagnosticar banco descartável de testes: `npm run db:test:check`
- Validar o artefato existente: `npm run validate:artifact`

Os comandos npm oficiais devem funcionar diretamente em Windows, Linux e macOS. Os arquivos `.sh` preservados em `scripts/` são auxiliares especializados do ambiente de hospedagem e não devem ser usados como única implementação dos comandos públicos.

## Convenções de código

- Use `PascalCase` para componentes React e seus arquivos, `camelCase` para funções e variáveis, e nomes descritivos em inglês para símbolos de código.
- Exporte componentes nomeados nos módulos; mantenha `export default` apenas onde o framework exigir, como páginas, layouts e arquivos de configuração.
- Declare tipos de propriedades junto ao componente e prefira `type` para modelos e uniões já adotados pelo projeto.
- Use o alias `@/` para imports entre áreas distantes do repositório. Dentro do mesmo módulo, prefira imports relativos curtos que deixem visível a relação entre `ui`, `domain` e `data`.
- Use `import type` quando o import existir somente em tempo de compilação.
- Mantenha componentes pequenos e focados. Seções de página ficam em `ui/sections`; componentes reutilizáveis do módulo ficam em `ui/components`; componentes transversais ficam em `src/components`.
- Escreva `IMPROVE` com letras latinas normais, sem caracteres matemáticos ou estilizados. O símbolo oficial deve ser carregado de `/brand/improve-symbol-transparent.png`.

## Regras de engenharia

- Mantenha compatibilidade obrigatória com Windows, Linux e macOS. Não introduza comandos dependentes de um único shell, separadores específicos de plataforma ou caminhos absolutos do ambiente local. Para variáveis de ambiente em scripts npm, use `cross-env`.
- Mantenha TypeScript em modo estrito (`strict: true`). Não enfraqueça o `tsconfig.json`, não use `any` como atalho e modele explicitamente entradas, saídas e estados anuláveis.
- Preserve a separação entre domínio, interface e infraestrutura. O domínio não deve importar React, componentes visuais, frameworks ou implementações de infraestrutura.
- Organize funcionalidades dentro de `src/modules/<modulo>/`, mantendo, conforme necessário, as camadas `domain`, `data` e `ui`. Reutilizáveis transversais ficam em `src/components` ou `src/infrastructure`, de acordo com sua responsabilidade.
- Não concentre a aplicação em `app/page.tsx`. Esse arquivo é somente o ponto de entrada e deve delegar a composição ao módulo adequado em `src`.
- Não implemente banco de dados, autenticação real ou integrações externas sem escopo e decisão explícitos.
- Preserve alterações existentes. Antes de editar, inspecione o estado do repositório e o diff; nunca reverta, sobrescreva ou formate mudanças alheias sem autorização.
- Evite mudanças de arquitetura, dependências ou comportamento implícitas. Quando forem necessárias, explique impacto e alternativas antes de executá-las.

## Segurança

- Aplique segurança desde o início: valide entradas em fronteiras do sistema, limite dados expostos ao cliente, trate erros sem revelar detalhes internos e mantenha dependências e permissões no menor escopo necessário.
- Nunca inclua segredos, tokens, senhas, chaves, credenciais, dados pessoais reais ou identificadores sensíveis no código, fixtures, logs, documentação ou histórico Git.
- Comandos `db:test:*` usam exclusivamente `TEST_DATABASE_URL`, que deve apontar para host local, porta `5433` e banco terminado em `_test`; nunca reutilize URLs de desenvolvimento ou migration nesse fluxo.
- Use variáveis de ambiente e mecanismos seguros da plataforma para configuração sensível. Arquivos locais de ambiente não devem ser versionados; disponibilize apenas exemplos sem valores reais quando necessário.
- Dados demonstrativos devem ser claramente fictícios. Não presuma que validação no cliente substitui validação no servidor.

## Critério de conclusão

Antes de considerar qualquer tarefa concluída:

1. Revise o diff e confirme que alterações existentes foram preservadas.
2. Execute `npm run lint` e corrija todos os erros pertinentes à tarefa.
3. Execute `npm run build` e confirme que o build termina com sucesso.
4. Execute os testes relevantes; quando o escopo justificar a suíte completa, use `npm test`.
5. Informe arquivos alterados, decisões, validações executadas e riscos ou pendências.

Uma tarefa não está concluída se lint ou build falharem, salvo quando houver um bloqueio externo claramente registrado e comunicado.
