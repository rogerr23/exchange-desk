# ExchangeDesk — evolução V1.1

Sistema de gestão de operações de câmbio para equipes, com cadastro de clientes, simulações de conversão e acompanhamento de operações com histórico de status.

A aplicação usa Next.js Full Stack com TypeScript. A V1 gerencia o fluxo interno das operações, sem executar pagamentos ou liquidação financeira. As cotações são dados reais de referência obtidos de uma API pública.

## Escopo implementado

- Login com um perfil por funcionário: Consultor de Câmbio, Analista de Operações, Gerente ou Administrador.
- Cadastro de funcionários exclusivamente pelo administrador, sem cadastro público.
- Cadastro de clientes com nome, CPF, e-mail e telefone.
- Moedas disponíveis: BRL, USD e EUR.
- Consulta de cotações em uma API pública.
- Simulações de conversão entre moedas diferentes.
- Registro e acompanhamento de operações vinculadas a clientes.
- Fluxo de status: **Pendente → Em análise → Concluída ou Cancelada**.
- Auditoria com data, funcionário responsável, operação e alterações de status.

## Tecnologias

| Tecnologia | Uso |
| --- | --- |
| Next.js e TypeScript | Interface e lógica de servidor na mesma aplicação |
| PostgreSQL | Banco de dados relacional |
| Prisma | Modelagem, migrações e acesso ao banco |
| Auth.js | Autenticação e sessão |
| Zod | Validação dos dados recebidos no servidor |
| Tailwind CSS | Estilização da interface |
| Vitest | Testes das regras e dos serviços |

## Fluxo principal

1. Um funcionário entra no sistema.
2. Cadastra ou seleciona um cliente.
3. Escolhe as moedas e informa o valor de origem.
4. Consulta a cotação e visualiza a simulação, a fonte e o horário da referência.
5. Salva uma proposta com os valores, a cotação e o prazo original da simulação.
6. Registra separadamente o aceite simulado, gerando uma solicitação **Aguardando análise**.
7. O analista aprova ou rejeita a solicitação. A aprovação cria uma única operação; a rejeição exige motivo.
8. Na operação aprovada, o analista inicia o processamento simulado, escolhendo sucesso ou falha. Pode retomar uma tentativa interrompida ou iniciar outra após falha. O fluxo antigo continua disponível para operações legadas.

O status Concluída indica o encerramento do fluxo interno da operação; pagamentos e liquidação financeira são externos ao sistema.

## Execução local

Login, funcionários, clientes, simulações, propostas, solicitações e operações já têm telas próprias. A visão geral apresenta as quantidades reais por status, sem gráficos por decisão de escopo. O fluxo permite cadastrar cliente, simular, criar proposta, registrar aceite simulado e acompanhar a solicitação e seu histórico. As operações anteriores continuam disponíveis para consulta e transições do fluxo V1. Os serviços também estão disponíveis pela API.

Ambiente de referência: **Node.js 22.14.0** (ver `.nvmrc`), **npm 11.6.2** e **PostgreSQL 17**. As versões das dependências estão fixadas em `package.json` e `package-lock.json`. Prisma 7 usa configuração em `prisma.config.ts` e o adaptador PostgreSQL; consulte a [documentação oficial](https://www.prisma.io/docs/orm/v7).

```sh
nvm install
nvm use
npx --yes npm@11.6.2 ci
cp -n .env.example .env
# Preencha AUTH_SECRET no .env conforme as instruções abaixo.
npm run db:generate
npm run db:up
npm run db:deploy
npm run dev
```

A instalação usa npm 11.6.2 via `npx` para evitar um erro do resolvedor do npm 10.9.2, sem alterar a instalação global. Os demais scripts podem ser executados com `npm run`.

O comando `db:up` exige Docker Compose e um serviço Docker em execução. Também é possível usar um PostgreSQL 17 existente e ajustar `DATABASE_URL`, sem executar esse comando. Se alterar usuário, senha, nome ou porta do banco local no `.env`, atualize também a URL. As credenciais de exemplo destinam-se apenas ao banco local de desenvolvimento.

Os scripts de desenvolvimento e compilação usam Webpack, validado neste ambiente. O Turbopack encontrou uma restrição de abertura de portas durante o processamento do CSS.

A aplicação fica em [localhost:3000](http://localhost:3000). Antes de entrar, preencha `AUTH_SECRET` com um valor gerado por:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

Mantenha `AUTH_URL=http://localhost:3000` no desenvolvimento. Para criar seu acesso, preencha temporariamente `BOOTSTRAP_ADMIN_NAME`, `BOOTSTRAP_ADMIN_EMAIL` e `BOOTSTRAP_ADMIN_PASSWORD` no `.env` e execute `npm run admin:create`. Escolha uma senha de 12 a 128 caracteres e remova essas variáveis após criar o administrador. Não existe senha padrão. O comando recusa execução se já houver administrador.

Acesse `/login` para entrar. Após o login, `/inicio` apresenta o espaço da equipe; administradores podem abrir `/funcionarios` para listar acessos e `/funcionarios/novo` para cadastrar funcionários. O botão **Sair** encerra a sessão. O cadastro não é público: a página e a API verificam a permissão no servidor. Os endpoints e exemplos estão em [API.md](./docs/API.md).

### Comandos disponíveis

| Comando | Uso |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Compilação de produção |
| `npm start` | Executar a compilação de produção |
| `npm run lint` | Análise estática com ESLint |
| `npm run typecheck` | Verificar tipos TypeScript |
| `npm test` | Executar testes unitários de regras, validações e guardas |
| `npm run test:integration` | Compilar e verificar serviços e HTTP real no banco de testes |
| `npm run test:watch` | Testes em modo de acompanhamento |
| `npm run db:up` | Iniciar PostgreSQL local e aguardar disponibilidade |
| `npm run db:stop` | Parar o banco local, preservando o volume |
| `npm run db:validate` | Validar o schema Prisma |
| `npm run db:generate` | Gerar o cliente Prisma; também executado no postinstall |
| `npm run admin:create` | Criar o primeiro administrador com dados do ambiente |
| `npm run db:test:deploy` | Aplicar migrações exclusivamente no TEST_DATABASE_URL |
| `npm run db:migrate -- --name init` | Criar e aplicar uma migração no desenvolvimento |
| `npm run db:deploy` | Aplicar migrações existentes no banco local configurado |
| `npm run db:studio` | Abrir o explorador do banco |

O schema define funcionários, clientes, operações e auditoria. As migrações incluem a base e a chave única de confirmação de operações. Aplique-as com `npm run db:deploy` antes de usar as novas rotas. Em um novo ambiente, use `db:deploy` para aplicar as migrações existentes. Para novas alterações do schema, use `db:migrate`. O bootstrap é exclusivo do comando local; os demais funcionários são cadastrados por administrador autenticado.

Credenciais e segredos não devem ser versionados. O `.env` está ignorado; o `.env.example` descreve as variáveis locais, de autenticação, bootstrap e testes. As políticas de cotações e simulação estão implementadas no servidor e descritas na arquitetura. Auth.js está fixado em `next-auth@5.0.0-beta.32`, versão beta indicada pela documentação oficial para a integração v5; Argon2 usa `@node-rs/argon2`.

### Validação da base

A política de testes é enxuta: proteger regras relevantes e falhas concretas, sem meta de cobertura, teste por componente ou duplicação entre camadas. Integração roda separadamente; telas são verificadas manualmente. Alterações apenas de documentação não exigem a suíte da aplicação. Detalhes em [ARCHITECTURE.md](./docs/ARCHITECTURE.md#8-interface-e-testes).

Lint, tipos, schema Prisma e build foram verificados. Os testes incluem autorização no servidor, validações, bootstrap repetido e concorrente, hash Argon2id, cadastros, simulação, confirmação sem duplicação, transições concorrentes, rollback de operação/auditoria e o fluxo HTTP real de login, cookies, permissões e logout.

Para executar a integração, crie um banco separado com nome terminado em `_test` e configure `TEST_DATABASE_URL` no `.env`. Os testes limpam as tabelas desse banco, por isso ele deve ser exclusivo e descartável. Usando o PostgreSQL local do Compose:

```sh
docker compose exec db sh -c 'createdb -U "$POSTGRES_USER" exchangedesk_stage3_test'
# Configure TEST_DATABASE_URL no .env conforme o exemplo.
npm run db:test:deploy
npm run test:integration
```

O comando `db:test:deploy` e os testes recusam URLs cujo nome de banco não termine em `_test`. A integração compila a aplicação, inicia um servidor em uma porta local temporária e o encerra ao concluir. Os testes da camada de serviço simulam apenas a sessão; o teste HTTP usa Auth.js e cookies reais. Nenhum administrador de teste é criado no banco da aplicação.

O `npm audit` identificou cinco alertas de severidade alta na cadeia de desenvolvimento `eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch → braces`. O registro ainda não oferece uma versão corrigida de `braces`; a correção automática sugerida rebaixa a configuração do Next.js para outra versão principal. Os alertas permanecem registrados para revisão futura. O ESLint 9.39.5 também está fora de suporte, mas é a versão aceita pelos plugins instalados; a versão 10 apresentou conflitos de compatibilidade. Esses pontos não devem ser tratados como resolvidos.

## Fora do escopo

- Validação documental e liquidação financeira das operações.
- Pagamentos, transferências, contas bancárias, carteiras ou saldos.
- IOF, spread, tarifas, comissões e regras de compliance financeiro.
- Integração com corretoras ou execução de ordens.
- Cadastro público de funcionários ou acesso de clientes ao sistema.
- Histórico de mercado e gráficos de preços que exijam outra fonte de dados.

## Política de valores definida

Valores com duas casas decimais e taxas com oito. Cálculos com aritmética decimal e arredondamento de metade para cima; a simulação e a operação preservam a mesma taxa e o mesmo resultado. Detalhes em [ARCHITECTURE.md](./docs/ARCHITECTURE.md).

## Acesso e dados definidos

Login por e-mail e senha com Auth.js Credentials, hash Argon2id e sessão JWT com expiração de oito horas. Login, logout, bootstrap e serviços de cadastros já estão implementados.

O consultor possui um painel pessoal em `/inicio`, com simulações, operações e auditoria próprias, e cadastra clientes. Analista e gerente consultam operações, auditoria e clientes da equipe; apenas o analista conduz as transições do fluxo existente, sem analisar operações que criou, mesmo após mudança de função. O administrador cadastra e lista funcionários e consulta operações, auditoria e clientes vinculados para suporte. Somente o consultor cria simulações e propostas e registra aceite; o administrador não herda essas ações. O perfil atual é conferido no banco em cada autorização. O cadastro de clientes não realiza consulta de CPF ou envio de e-mails. As cotações usarão Frankfurter / ECB, com referência diária e sem chave de API. As decisões e os limites estão detalhados na arquitetura e nos requisitos.

## Próxima entrega e decisões pendentes

A etapa 4 está implementada no servidor: `POST /api/simulacoes`, timeout de 5 segundos, cache em memória por 15 minutos e simulação assinada válida por 15 minutos. A política está em [ARCHITECTURE.md](./docs/ARCHITECTURE.md). A etapa 5 também está implementada no servidor: confirmação sem duplicação, consultas, transições de status e auditoria atômica. As telas operacionais estão implementadas: clientes, simulação com revisão e validade, confirmação, listagem e detalhes com transições e auditoria. A visão geral usa somente contadores reais por status, conforme a opção aprovada.

O foco atual é o desenvolvimento local e a evolução para a V1.1, conforme [as decisões aprovadas](./docs/V1_1_DECISIONS.md). Publicação e escolha de hospedagem estão adiadas, sem bloquear o desenvolvimento. Gráficos e a adoção de Recharts também ficam adiados.

## Documentação

- [REQUIREMENTS.md](./docs/REQUIREMENTS.md): requisitos e critérios de aceite.
- [ARCHITECTURE.md](./docs/ARCHITECTURE.md): organização técnica, dados e decisões pendentes.
- [IMPLEMENTATION_PLAN.md](./docs/IMPLEMENTATION_PLAN.md): sequência de implementação da V1.
- [API.md](./docs/API.md): preparação do acesso, endpoints e exemplos de uso.
- [V1_1_DECISIONS.md](./docs/V1_1_DECISIONS.md): responsabilidades e escopos aprovados para os quatro perfis.
- [V1_1_IMPLEMENTATION_PLAN.md](./docs/V1_1_IMPLEMENTATION_PLAN.md): base local conferida, matriz funcional e andamento da V1.1.
- [V1_1_PROPOSAL_FLOW.md](./docs/V1_1_PROPOSAL_FLOW.md): ciclo aprovado e entrega de propostas, aceite e solicitações.

### Painel do consultor e histórico de simulações

Aplique a migração `20261031183000_operator_workspace` com `npm run db:deploy` antes de iniciar esta versão. Cada simulação bem-sucedida passa a ser salva com seu autor, valores, taxa, fonte, referência e prazo original. Não há recuperação retroativa de simulações anteriores. `/simulacoes/historico` e `GET /api/simulacoes` mostram as 50 consultas mais recentes do escopo do usuário, com acesso à operação quando confirmada. A opção **Simular novamente** preenche as moedas e o valor, mas exige uma nova consulta e revisão. O histórico não armazena tokens nem renova a validade de 15 minutos.

O painel do consultor mostra indicadores reais, cinco operações e cinco simulações próprias recentes; os demais perfis consultam operações da equipe, além de explicações sobre cálculo, referência diária e etapas de acompanhamento. A simulação aplica apenas a taxa de referência, sem calcular tarifas, spread ou impostos; registrar e concluir operações não executa pagamentos.

### Perfis da V1.1

A migração `20261031210000_v1_1_roles` implementa `CONSULTANT`, `OPERATIONS_ANALYST`, `MANAGER` e `ADMIN`, com Consultor como padrão no cadastro. Foi aplicada nos bancos locais da aplicação e de testes, preservando integralmente o administrador existente. Não foram criados acessos automáticos no banco da aplicação. Use `/funcionarios/novo` com o administrador para cadastrar cada funcionário na sua função.

A migração recusa bancos que ainda tenham contas `OPERATOR`, exigindo atribuição explícita antes da evolução. Não converte usuários nem reescreve autoria automaticamente. Outro ambiente com operadores exige um plano de atribuição e migração próprio antes de executar `db:deploy`.

Esta entrega separa os perfis, permissões, navegação e painéis sobre o fluxo existente `PENDING → UNDER_REVIEW → COMPLETED | CANCELED`. Propostas, aceite e solicitações aguardando análise já estão disponíveis. Aprovação/rejeição e processamento simulado com recuperação estão implementados. Edição de perfil, desativação e recuperação de acesso também continuam pendentes.

### Propostas e aceite simulado

Aplique `20261031220000_proposals_and_requests` com `npm run db:deploy`. A tela de simulação agora salva uma proposta; o aceite é uma segunda ação explícita nos detalhes e gera uma solicitação única. O prazo continua sendo o restante dos 15 minutos desde a simulação, sem renovação. Solicitações aceitas preservam os valores para análise mesmo depois desse prazo.

Consultores veem seus registros; analistas veem solicitações da equipe e propostas já aceitas; gerentes e administradores consultam a equipe. A criação direta por `POST /api/operacoes` foi bloqueada com `APPROVAL_REQUIRED`, pois a operação dependerá de aprovação. A decisão do analista cria a operação somente na aprovação. O processamento simulado registra tentativas e permite recuperação, conforme [V1_1_PROCESSING_FLOW.md](./docs/V1_1_PROCESSING_FLOW.md). Regras e próximos passos em [V1_1_PROPOSAL_FLOW.md](./docs/V1_1_PROPOSAL_FLOW.md).
