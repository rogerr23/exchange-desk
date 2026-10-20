# ExchangeDesk V1

Sistema web demonstrativo para uma equipe simular conversões de moedas, cadastrar clientes fictícios e acompanhar operações de câmbio com histórico de status.

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

A base da aplicação está configurada. Autenticação, cadastros, cotações e operações serão implementados nas próximas etapas.

Ambiente de referência: **Node.js 22.14.0** (ver `.nvmrc`), **npm 11.6.2** e **PostgreSQL 17**. As versões das dependências estão fixadas em `package.json` e `package-lock.json`. Prisma 7 usa configuração em `prisma.config.ts` e o adaptador PostgreSQL; consulte a [documentação oficial](https://www.prisma.io/docs/orm/v7).

```sh
nvm install
nvm use
npx --yes npm@11.6.2 ci
cp .env.example .env
npm run db:up
npm run dev
```

A instalação usa npm 11.6.2 via `npx` para evitar um erro do resolvedor do npm 10.9.2, sem alterar a instalação global. Os demais scripts podem ser executados com `npm run`.

O comando `db:up` exige Docker Compose e um serviço Docker em execução. Também é possível usar um PostgreSQL 17 existente e ajustar `DATABASE_URL`, sem executar esse comando. Se alterar usuário, senha, nome ou porta do banco local no `.env`, atualize também a URL. As credenciais de exemplo destinam-se apenas ao banco local de desenvolvimento.

Os scripts de desenvolvimento e compilação usam Webpack, validado neste ambiente. O Turbopack encontrou uma restrição de abertura de portas durante o processamento do CSS.

A aplicação fica em [localhost:3000](http://localhost:3000). A página inicial é temporária; ainda não há dados ou funções internas disponíveis.

### Comandos disponíveis

| Comando | Uso |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Compilação de produção |
| `npm start` | Executar a compilação de produção |
| `npm run lint` | Análise estática com ESLint |
| `npm run typecheck` | Verificar tipos TypeScript |
| `npm test` | Executar os testes essenciais quando implementados |
| `npm run test:watch` | Testes em modo de acompanhamento |
| `npm run db:up` | Iniciar PostgreSQL local e aguardar disponibilidade |
| `npm run db:stop` | Parar o banco local, preservando o volume |
| `npm run db:validate` | Validar o schema Prisma |
| `npm run db:generate` | Gerar o cliente após a definição dos modelos |
| `npm run db:migrate -- --name init` | Criar e aplicar uma migração no desenvolvimento |
| `npm run db:deploy` | Aplicar migrações existentes no ambiente de publicação |
| `npm run db:studio` | Abrir o explorador do banco |

O schema inicial contém apenas a configuração PostgreSQL. Os modelos, a primeira migração e a criação do administrador dependem das decisões da etapa 2. Não execute migrações ou geração do cliente antes de definir os modelos. O Vitest está configurado, mas ainda não há testes; os testes serão adicionados com os fluxos de servidor.

Credenciais e segredos não devem ser versionados. O `.env` está ignorado; o `.env.example` descreve somente a configuração local disponível nesta etapa. Autenticação e provedor de cotações terão suas variáveis documentadas quando forem definidos.

### Validação da base

Lint, verificação de tipos, validação do schema Prisma e compilação de produção foram verificados. A configuração do Docker Compose também foi validada; a conexão com PostgreSQL ainda não foi verificada por falta de um serviço Docker disponível neste ambiente. O Vitest foi executado com `--passWithNoTests` apenas para conferir a configuração, sem testes de regras nesta etapa.

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

## Decisões técnicas pendentes

- Provedor de cotações, pares atendidos e eventual necessidade de chave de API.
- Método de login, estratégia de sessão e criação segura do primeiro administrador.
- Política de atualização/validade das cotações.
- Matriz detalhada de permissões operacionais e visibilidade entre funcionários.
- Conteúdo mínimo dos gráficos e ambiente de publicação.

Essas pendências não alteram o escopo funcional fechado. Devem ser resolvidas antes da implementação das partes correspondentes; as propostas estão em [ARCHITECTURE.md](./docs/ARCHITECTURE.md).

## Documentação

- [REQUIREMENTS.md](./docs/REQUIREMENTS.md): requisitos e critérios de aceite.
- [ARCHITECTURE.md](./docs/ARCHITECTURE.md): organização técnica, dados e decisões pendentes.
- [IMPLEMENTATION_PLAN.md](./docs/IMPLEMENTATION_PLAN.md): sequência de implementação da V1.
