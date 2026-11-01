# Desenvolvimento local

Este guia reúne detalhes de ambiente, comandos e verificações. Para uma apresentação do projeto e o início rápido, consulte o [README](../README.md). O funcionamento da versão está no [relatório da V1.1](./V1_1_RELATORIO_IMPLEMENTACAO.md).

## Ambiente

- Node.js 22.14.0, conforme `.nvmrc`.
- npm 11.6.2, conforme `packageManager` no `package.json`.
- PostgreSQL 17; o Compose usa `postgres:17-alpine`.
- Docker com Compose para iniciar o banco fornecido pelo projeto.

Se utilizar nvm:

```sh
nvm install
nvm use
```

Instale as dependências com `npx --yes npm@11.6.2 ci`. O npm é executado nessa versão sem alterar a instalação global. Essa escolha preserva o ambiente validado e evita o problema de resolução observado anteriormente com npm 10.9.2. As versões das dependências estão fixadas em `package.json` e `package-lock.json`.

O cliente Prisma é gerado automaticamente no `postinstall`. Para regenerá-lo após mudanças no modelo, execute `npm run db:generate`. Prisma usa `prisma.config.ts` e o adaptador PostgreSQL.

## Variáveis e banco

Copie `.env.example` para `.env` e configure `AUTH_SECRET` antes de usar a aplicação. Esse segredo também assina as referências de simulação; alterá-lo invalida referências e sessões existentes.

`DATABASE_URL` deve apontar para o banco da aplicação. O `.env.example` contém valores apenas para desenvolvimento local. Ao alterar usuário, senha, porta ou nome do banco no Compose, ajuste também a URL. Mantenha `AUTH_URL` de acordo com a origem usada no navegador, normalmente `http://localhost:3000`.

`npm run db:up` exige o Docker em execução e aguarda o PostgreSQL ficar disponível. Para usar uma instância PostgreSQL 17 existente, configure `DATABASE_URL` e não execute esse comando.

Aplique as migrações existentes com `npm run db:deploy`. Para novas alterações de schema durante o desenvolvimento, use `npm run db:migrate -- --name nome_da_alteracao`. Não renomeie ou reescreva migrações já aplicadas.

A migração de perfis recusa bancos antigos que ainda contenham contas `OPERATOR` sem atribuição explícita. A evolução de outro ambiente exige avaliar esses dados antes de migrar; detalhes no [plano da V1.1](./V1_1_IMPLEMENTATION_PLAN.md).

## Administrador inicial

Defina temporariamente `BOOTSTRAP_ADMIN_NAME`, `BOOTSTRAP_ADMIN_EMAIL` e `BOOTSTRAP_ADMIN_PASSWORD` no `.env` e execute:

```sh
npm run admin:create
```

A senha deve ter entre 12 e 128 caracteres. Remova essas variáveis depois. Não existe senha padrão nem cadastro público. O comando recusa execução se já houver administrador e não redefine senhas existentes. As demais contas são cadastradas pela interface administrativa.

## Comandos

| Comando | Uso |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Compilação de produção |
| `npm start` | Executar a compilação de produção |
| `npm run lint` | ESLint |
| `npm run typecheck` | Verificar tipos TypeScript |
| `npm test` | Testes unitários |
| `npm run test:watch` | Testes em modo de acompanhamento |
| `npm run test:integration` | Build e testes de serviços/HTTP no banco descartável |
| `npm run db:up` | Iniciar PostgreSQL do Compose |
| `npm run db:stop` | Parar o banco, preservando o volume |
| `npm run db:validate` | Validar o schema Prisma |
| `npm run db:generate` | Gerar o cliente Prisma |
| `npm run db:deploy` | Aplicar migrações existentes em `DATABASE_URL` |
| `npm run db:migrate -- --name nome_da_alteracao` | Criar e aplicar migração de desenvolvimento |
| `npm run db:test:deploy` | Aplicar migrações em `TEST_DATABASE_URL` |
| `npm run db:studio` | Abrir o explorador do banco |
| `npm run admin:create` | Criar o primeiro administrador |

## Testes de integração

Use um banco exclusivo e descartável cujo nome termine em `_test`. Os testes limpam suas tabelas para montar os cenários; não use um banco com dados que precise preservar.

Com o PostgreSQL local do Compose em execução, crie o banco uma vez:

```sh
docker compose exec db sh -c 'createdb -U "$POSTGRES_USER" exchangedesk_stage3_test'
```

Configure `TEST_DATABASE_URL` no `.env`, conforme `.env.example`, e execute:

```sh
npm run db:test:deploy
npm run test:integration
```

O comando de migração de testes e a suíte recusam nomes de banco que não terminem em `_test`. A integração compila a aplicação, inicia um servidor HTTP temporário e o encerra ao concluir. Os testes de serviços simulam a sessão; os de HTTP usam Auth.js e cookies reais. Não são criadas contas de teste no banco da aplicação.

A política de verificação prioriza regras de negócio, autorização, concorrência e rollback. Não há meta de cobertura nem testes por componente; a interface é conferida visualmente. Alterações apenas de documentação não exigem executar a suíte da aplicação. As evidências do fechamento da versão estão no [relatório](./V1_1_RELATORIO_IMPLEMENTACAO.md#18-evidências-do-fechamento).

## Notas técnicas e registros de dependências

- Desenvolvimento e build usam Webpack. Na validação do ambiente, o Turbopack encontrou uma restrição de abertura de portas ao processar CSS.
- Auth.js está fixado em `next-auth@5.0.0-beta.32`; o hash de senhas usa `@node-rs/argon2`.
- O aviso conhecido do `pg` sobre consultas simultâneas no mesmo cliente apareceu nas verificações sem falhas.
- Na validação anterior da base, `npm audit` registrou cinco alertas de severidade alta na cadeia `eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch → braces`. Naquele momento, não havia correção de `braces` oferecida pelo registro e a correção automática sugeria outra versão principal da configuração do Next.js. O ESLint 9.39.5 também foi registrado como fora de suporte, enquanto a versão 10 apresentou conflitos com os plugins instalados.

Os registros de dependências acima são históricos e não representam uma nova auditoria. Não foram tratados como resolvidos nesta reorganização da documentação. Para verificar a situação atual, execute `npm audit` e avalie a compatibilidade das atualizações antes de alterar as versões fixadas.
