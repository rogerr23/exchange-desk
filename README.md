# ExchangeDesk V1

Projeto pessoal de estudo e portfólio: um sistema web demonstrativo para uma equipe simular conversões de moedas, cadastrar clientes fictícios e acompanhar operações de câmbio com histórico de status.

O projeto usa Next.js Full Stack com TypeScript. A V1 não movimenta dinheiro nem executa câmbio real. As cotações são dados reais de referência obtidos de uma API pública.

## Escopo da V1

- Login com os perfis administrador e operador.
- Cadastro de funcionários exclusivamente pelo administrador, sem cadastro público.
- Cadastro de clientes com nome, CPF fictício, e-mail e telefone.
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
| Recharts | Visualizações simples a partir dos dados disponíveis |
| Vitest | Testes das regras e dos serviços |

## Fluxo principal

1. Um funcionário entra no sistema.
2. Cadastra ou seleciona um cliente fictício.
3. Escolhe as moedas e informa o valor de origem.
4. Consulta a cotação e visualiza a simulação, a fonte e o horário da referência.
5. Confirma o registro da operação como **Pendente**, preservando os valores e a cotação apresentados.
6. A operação passa para **Em análise** e depois para **Concluída** ou **Cancelada**.
7. Cada alteração de status fica registrada na auditoria.

O registro da operação representa um fluxo interno demonstrativo; o status Concluída não comprova pagamento ou liquidação financeira.

## Execução local

Login e gerenciamento de funcionários já têm telas próprias. Autenticação e cadastros de funcionários/clientes também estão disponíveis pela API. Cotações, operações e as demais telas serão implementadas nas próximas etapas.

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
| `npm run db:deploy` | Aplicar migrações existentes no ambiente de publicação |
| `npm run db:studio` | Abrir o explorador do banco |

O schema define funcionários, clientes, operações e auditoria. A migração inicial foi aplicada e validada no PostgreSQL local e no banco de testes. Em um novo ambiente, use `db:deploy` para aplicar as migrações existentes. Para novas alterações do schema, use `db:migrate`. O bootstrap é exclusivo do comando local; os demais funcionários são cadastrados por administrador autenticado.

Credenciais e segredos não devem ser versionados. O `.env` está ignorado; o `.env.example` descreve as variáveis locais, de autenticação, bootstrap e testes. As opções de cotações serão definidas na etapa 4. Auth.js está fixado em `next-auth@5.0.0-beta.32`, versão beta indicada pela documentação oficial para a integração v5; Argon2 usa `@node-rs/argon2`.

### Validação da base

Lint, tipos, schema Prisma e build foram verificados. Os testes incluem autorização no servidor, validações, bootstrap repetido e concorrente, hash Argon2id, cadastros e o fluxo HTTP real de login, cookies, permissões e logout.

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

- Clientes, documentos e operações financeiras reais.
- Pagamentos, transferências, contas bancárias, carteiras ou saldos.
- IOF, spread, tarifas, comissões e regras de compliance financeiro.
- Integração com corretoras ou execução de ordens.
- Cadastro público de funcionários ou acesso de clientes ao sistema.
- Histórico de mercado e gráficos de preços que exijam outra fonte de dados.

## Política de valores definida

Valores com duas casas decimais e taxas com oito. Cálculos com aritmética decimal e arredondamento de metade para cima; a simulação e a operação preservam a mesma taxa e o mesmo resultado. Detalhes em [ARCHITECTURE.md](./docs/ARCHITECTURE.md).

## Acesso e dados definidos

Login por e-mail e senha com Auth.js Credentials, hash Argon2id e sessão JWT com expiração de oito horas. Login, logout, bootstrap e serviços de cadastros já estão implementados.

Administrador e operador acessam os clientes, operações e auditoria da mesma equipe; apenas o administrador cadastra e lista funcionários. Os cadastros de clientes usam dados fictícios, sem consulta de CPF ou envio de e-mails. As cotações usarão Frankfurter / ECB, com referência diária e sem chave de API. As decisões e os limites estão detalhados na arquitetura e nos requisitos.

## Decisões técnicas pendentes

- Cache e prazo de validade das cotações e da simulação antes da confirmação.
- Conteúdo mínimo dos gráficos e ambiente de publicação.

Essas pendências não alteram o escopo funcional fechado. Devem ser resolvidas antes da implementação das partes correspondentes; as propostas estão em [ARCHITECTURE.md](./docs/ARCHITECTURE.md).

## Documentação

- [REQUIREMENTS.md](./docs/REQUIREMENTS.md): requisitos e critérios de aceite.
- [ARCHITECTURE.md](./docs/ARCHITECTURE.md): organização técnica, dados e decisões pendentes.
- [IMPLEMENTATION_PLAN.md](./docs/IMPLEMENTATION_PLAN.md): sequência de implementação da V1.
- [API.md](./docs/API.md): preparação do acesso, endpoints e exemplos de uso.
