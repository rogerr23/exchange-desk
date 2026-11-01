# ExchangeDesk

Aplicação web para equipes acompanharem atendimentos de câmbio, da simulação à conclusão da operação. Usa cotações de referência do Frankfurter / ECB para BRL, USD e EUR.

**Fluxo:** simulação → proposta → aceite simulado → análise → operação → processamento simulado.

O projeto organiza o fluxo interno e seu histórico. Não executa pagamentos, transferências ou liquidação financeira.

## O que tem no projeto

- Quatro perfis: consultor, analista de operações, gerente e administrador.
- Cadastro de clientes e histórico de simulações.
- Propostas com validade, aceite simulado e aprovação ou rejeição pelo analista.
- Processamento simulado com falhas, retomada e novas tentativas.
- Gestão de funcionários, perfis e desativação/reativação de acessos.
- Área de trabalho por perfil, indicadores por período e auditoria das alterações.

## Indicadores

A página **Indicadores** permite consultar os últimos 7, 30 ou 90 dias ou um intervalo personalizado de até 90 dias, em horário de Brasília. Os cartões abrem propostas, solicitações e operações com o mesmo filtro; o consultor consulta apenas seus registros.

Entradas usam a data de criação da proposta (ou da solicitação, para o analista). Conclusões usam a data do evento no histórico. Falhas pendentes consideram operações ainda em falha com evento no período, sem duplicar tentativas. A espera média considera apenas solicitações recebidas no intervalo que continuam pendentes, do envio até a consulta, incluindo noites e fins de semana. O gráfico oferece os valores também em tabela.

## Tecnologias

Next.js, React, TypeScript, Tailwind CSS, PostgreSQL, Prisma, Auth.js, Zod e Vitest.

## Como rodar

**Requisitos:** Node.js 22 (versão em [.nvmrc](./.nvmrc)), npm 11.6.2 e Docker com Compose em execução.

### 1. Instale e configure o ambiente

Na pasta do projeto:

```sh
cp -n .env.example .env
npx --yes npm@11.6.2 ci
```

No `.env`, preencha `AUTH_SECRET` com um segredo gerado pelo comando abaixo. Mantenha `AUTH_URL=http://localhost:3000`; as demais variáveis já têm exemplos para o banco local.

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

### 2. Prepare o banco

```sh
npm run db:up
npm run db:deploy
```

### 3. Crie o primeiro acesso e inicie a aplicação

Defina temporariamente `BOOTSTRAP_ADMIN_NAME`, `BOOTSTRAP_ADMIN_EMAIL` e `BOOTSTRAP_ADMIN_PASSWORD` no `.env`. A senha deve ter entre 12 e 128 caracteres.

```sh
npm run admin:create
npm run dev
```

Remova as variáveis `BOOTSTRAP_ADMIN_*` após criar a conta. Não há senha padrão; os demais funcionários são cadastrados pelo administrador dentro da aplicação.

Abra [localhost:3000](http://localhost:3000) e entre com o acesso criado. O `.env` não deve ser versionado.

## Verificações

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

Os testes de integração exigem um banco separado e descartável. A configuração e os demais comandos estão no [guia de desenvolvimento](./docs/DEVELOPMENT.md).

## Onde encontrar mais informações

| Documento | Conteúdo |
| --- | --- |
| [Guia do usuário](./docs/GUIA_DO_USUARIO.md) | Seções por perfil, instruções de uso e interpretação dos indicadores |
| [Relatório da V1.1](./docs/V1_1_RELATORIO_IMPLEMENTACAO.md) | O que foi implementado, como funciona e os motivos das decisões |
| [Desenvolvimento](./docs/DEVELOPMENT.md) | Ambiente, comandos, testes de integração e notas técnicas |
| [API](./docs/API.md) | Endpoints, permissões, exemplos e respostas |
| [Plano da V1.1](./docs/V1_1_IMPLEMENTATION_PLAN.md) | Escopo e histórico das entregas |

O código fica em `src/`, o modelo e as migrações em `prisma/`, os testes em `tests/` e a documentação em `docs/`. A V1.1 está implementada para execução local; publicação e hospedagem não fazem parte desta entrega.
