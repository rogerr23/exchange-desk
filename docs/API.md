# API — ExchangeDesk V1

Autenticação, cadastros, simulações e operações com auditoria estão disponíveis pelo servidor. As telas de login, funcionários, clientes, simulações e operações utilizam os serviços e endpoints abaixo. Os exemplos abaixo usam dados de teste.

## Preparar o acesso

1. Configure `.env` conforme o README e aplique as migrações com `npm run db:deploy`.
2. Gere `AUTH_SECRET` com o comando indicado no `.env.example`. Use `AUTH_URL=http://localhost:3000` no desenvolvimento local.
3. Preencha temporariamente `BOOTSTRAP_ADMIN_NAME`, `BOOTSTRAP_ADMIN_EMAIL` e `BOOTSTRAP_ADMIN_PASSWORD` no `.env`. Escolha a senha de 12 a 128 caracteres; não há senha padrão.
4. Execute `npm run admin:create`. O comando cria um administrador apenas se ainda não existir nenhum; não sobrescreve funcionários. Remova as três variáveis de bootstrap após a criação.
5. Execute `npm run dev` e abra `/login`. Após entrar, administradores podem usar `/funcionarios` e `/funcionarios/novo`; ambos os perfis acessam `/inicio`.

O comando de bootstrap é local e usa a condição Node `react-server` apenas para importar os módulos marcados com `server-only`. Isso não cria uma rota pública de cadastro.

## Sessão

Auth.js gerencia os cookies de sessão e a proteção CSRF das suas rotas. A configuração usa Credentials e JWT com `maxAge` de oito horas. E-mails são normalizados antes da consulta e as senhas são verificadas com Argon2id. Não são retornados senha ou hash.

| Rota | Uso |
| --- | --- |
| `/login` | Formulário próprio de login; `/api/auth/signin` também direciona para essa tela |
| `GET /api/auth/session` | Consultar a sessão atual; sem login, não retorna usuário |
| `/api/auth/signout` | Formulário padrão para encerrar a sessão |

A tela `/login` usa uma Server Action que valida os dados e chama `signIn` do Auth.js. O botão **Sair** usa `signOut` em uma Server Action e retorna ao login. As proteções de origem do Next.js se aplicam a essas ações. O fluxo direto de `/api/auth/signout` continua exigindo confirmação por POST com CSRF; abrir essa página por GET não encerra a sessão sozinho. O cadastro visual usa `POST /api/funcionarios`, com tratamento de validação, e-mail duplicado e expiração da sessão.

## Cadastros

Todos os endpoints abaixo exigem sessão. Os serviços consultam o funcionário no banco para obter seu perfil atual. Apenas administrador pode cadastrar e listar funcionários. Os dois perfis podem cadastrar e consultar clientes da equipe.

| Método e rota | Permissão | Resultado |
| --- | --- | --- |
| `GET /api/funcionarios` | Administrador | Lista com id, nome, e-mail e perfil |
| `POST /api/funcionarios` | Administrador | Cria funcionário e retorna seus dados públicos |
| `GET /api/clientes` | Administrador ou operador | Lista os clientes |
| `POST /api/clientes` | Administrador ou operador | Cria cliente |
| `GET /api/clientes/:id` | Administrador ou operador | Consulta um cliente; retorna 404 se não existir |

As listagens retornam os registros da equipe, em ordem de criação decrescente. Paginação não está implementada nesta etapa. Todas as respostas de cadastro usam `Cache-Control: no-store`.

### Cadastrar funcionário

Envie JSON com `name`, `email`, `password` e, opcionalmente, `role` (`ADMIN` ou `OPERATOR`, padrão `OPERATOR`). O administrador escolhe a senha e a entrega manualmente para acesso ao sistema. E-mail normalizado é único; campos extras são recusados.

### Cadastrar cliente

Após entrar, este exemplo pode ser executado no console do navegador na página da aplicação:

```js
const response = await fetch("/api/clientes", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "Cliente Exemplo",
    fictionalCpf: "000.000.000-00",
    email: "cliente@example.test",
    phone: "(11) 90000-0000",
  }),
});
console.log(response.status, await response.json());
```

O servidor remove a máscara do CPF e do telefone e normaliza o e-mail. CPF é único, mas não passa por validação de dígitos verificadores. E-mail e telefone de clientes não são únicos.

### Respostas

Sucesso: `{ "data": ... }`, com HTTP 200 em consultas e 201 em criações. Erros: `{ "error": { "code": "...", "message": "..." } }`; falhas de validação também incluem `fields`.

| HTTP | Situação |
| --- | --- |
| 400 | Campos inválidos ou JSON malformado |
| 401 | Sessão ausente ou funcionário não encontrado |
| 403 | Perfil sem permissão ou origem diferente da aplicação |
| 404 | Cliente não encontrado |
| 409 | E-mail de funcionário ou CPF já cadastrado |
| 415 | Corpo enviado sem `Content-Type: application/json` |
| 500 | Falha interna com mensagem genérica, sem detalhes do banco |

Mutações exigem JSON e recusam o cabeçalho `Origin` quando diferente da origem configurada. Requisições entre sites não recebem permissão CORS. Clientes HTTP fora do navegador precisam manter os cookies e seguir o fluxo CSRF do Auth.js para entrar e sair.

## Simulações

`POST /api/simulacoes` exige sessão de administrador ou operador, JSON e a mesma proteção de origem dos cadastros. Exemplo após entrar na aplicação:

```js
const response = await fetch("/api/simulacoes", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    sourceCurrency: "USD",
    targetCurrency: "BRL",
    sourceAmount: "100.00",
  }),
});
console.log(response.status, await response.json());
```

Aceita somente BRL, USD e EUR, com moedas diferentes. `sourceAmount` deve ser uma string decimal positiva, sem separadores de milhar, com ponto e no máximo duas casas; valores e resultados devem caber em `Decimal(18,2)`. Campos extras são recusados.

Sucesso retorna HTTP 200 com `{ data: ... }` e `Cache-Control: no-store`. O conteúdo inclui:

| Campo | Significado |
| --- | --- |
| `sourceCurrency`, `targetCurrency` | Par da simulação |
| `sourceAmount`, `targetAmount` | Valores como strings com duas casas decimais |
| `exchangeRate` | Taxa aplicada, string com oito casas decimais |
| `quoteProvider` | Frankfurter / ECB |
| `quoteReferenceDate` | Data diária da observação, sem hora |
| `quoteFetchedAt` | Instante original da consulta, preservado ao reutilizar o cache |
| `quoteTimestamp`, `quoteTimestampKind` | Instante da consulta e rótulo `FETCHED_AT`; não representa horário de mercado |
| `issuedAt`, `expiresAt` | Emissão da simulação e expiração após 15 minutos |
| `simulationToken` | Referência assinada vinculada ao funcionário; enviar na confirmação de operação |

O cache de cotações dura 15 minutos por par, em memória do processo. Consultas externas têm timeout de 5 segundos, sem repetição automática. Erros de rede, timeout, HTTP do provedor ou resposta inválida retornam HTTP 503 com código `QUOTE_UNAVAILABLE` e mensagem “Não foi possível consultar a cotação agora. Tente novamente em instantes.” Não há resultado substituto ou cotação fictícia em falhas. Entradas inválidas retornam 400; resultados fora dos limites técnicos retornam 400 com `AMOUNT_OUT_OF_RANGE`.

Cada simulação bem-sucedida salva um registro de histórico associado ao funcionário, sem criar operação nem auditoria de operação. Falha na gravação do histórico retorna erro e não entrega um novo token confirmável. O token tem integridade verificável, sem criptografia do conteúdo. O registro da operação garante uma única confirmação por simulação, por restrição persistida no banco. Alterar `AUTH_SECRET` invalida tokens existentes. O endpoint de confirmação está disponível abaixo; a tela `/simulacoes` apresenta alertas persistentes e permite tentar novamente preservando os campos.

### Histórico de simulações

`GET /api/simulacoes` exige sessão e retorna `{ data: [...] }`, com `Cache-Control: no-store`. Retorna até 50 simulações mais recentes por emissão: somente as do próprio operador ou todas para o administrador. Inclui id, autoria pública (id e nome), valores decimais como strings, taxa, fonte, referência diária, instante de consulta, emissão, expiração e `operationId` (nulo enquanto não confirmada). Não retorna token nem chave de confirmação. Simulações anteriores à migração não são recuperadas. O histórico permanece após expirar e não permite renovar ou confirmar um token vencido; **Simular novamente** exige nova consulta e revisão.

## Operações e auditoria

Todas as rotas exigem sessão de administrador ou operador e retornam `Cache-Control: no-store`. Operadores só listam, consultam detalhes e auditoria, contam ou alteram operações criadas por eles; administradores acessam toda a equipe. IDs fora do escopo do operador retornam 404, inclusive em alterações de status. Mutações exigem JSON e recusam `Origin` diferente da aplicação.

| Método e rota | Resultado |
| --- | --- |
| `POST /api/operacoes` | Confirma simulação para um cliente; 201 na criação, 200 no reenvio da mesma confirmação |
| `GET /api/operacoes` | Lista no escopo do usuário, em ordem de criação decrescente; sem paginação nesta V1 |
| `GET /api/operacoes/:id` | Detalhes com eventos de auditoria em ordem cronológica |
| `PATCH /api/operacoes/:id/status` | Altera status e grava auditoria na mesma transação |

Para confirmar, enviar somente `customerId` e `simulationToken` obtido de `/api/simulacoes`. Não enviar taxa, valores ou autoria; campos extras são recusados. O servidor verifica a assinatura, o funcionário, a validade, a consistência dos valores e a existência do cliente. Não consulta outra cotação. Operação Pendente e evento inicial são gravados juntos.

```js
const response = await fetch("/api/operacoes", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ customerId, simulationToken }),
});
const { data: operation } = await response.json();
```

A mesma simulação gera no máximo uma operação, mesmo com confirmações simultâneas. Reenvio ainda válido para o mesmo cliente retorna a operação já existente e seu status atual, sem repetir auditoria. Para outro cliente, retorna 409 `SIMULATION_ALREADY_CONFIRMED`. A validação do token ocorre antes da recuperação: se expirou, retorna 400 `INVALID_SIMULATION`; em caso de dúvida após uma falha de conexão, consultar as operações antes de iniciar uma nova confirmação.

A resposta usa `{ data: ... }`. Cada operação inclui identificadores, cliente (id, nome, CPF cadastrado), funcionário criador (id e nome), moedas, valores, taxa, referência e status, com datas de criação/atualização. Valores são strings com duas casas e a taxa com oito. `quoteReferenceDate` preserva `YYYY-MM-DD`; os demais instantes são ISO 8601. Detalhes, confirmação e alteração também incluem `auditEvents` com ação, status anterior/novo, instante e autor (id e nome). Nunca retorna senha, hash de senha, token ou chave interna de confirmação.

Para alterar o status, enviar o status exibido na tela em `expectedStatus` e o destino em `status`:

```js
await fetch(`/api/operacoes/${operation.id}/status`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ expectedStatus: "PENDING", status: "UNDER_REVIEW" }),
});
```

Transições: `PENDING → UNDER_REVIEW → COMPLETED | CANCELED`. Saltos, repetições, regressões e reabertura retornam 409 `INVALID_TRANSITION`. Se o status atual difere de `expectedStatus`, retorna 409 `STATUS_CONFLICT` e orienta atualizar os dados. Somente a transição vencedora em uma disputa grava seu evento. Falha de auditoria desfaz também a criação/alteração da operação. Cliente ou operação inexistente retorna 404. A interface de confirmação está em `/simulacoes`; a listagem e os detalhes com auditoria estão em `/operacoes` e `/operacoes/:id`. O painel `/inicio` apresenta as quantidades reais por status e o total de simulações salvas, limitados ao mesmo escopo de autoria, além de atividades recentes e orientações.
