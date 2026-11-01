# API — ExchangeDesk V1

Autenticação, cadastros, simulações e operações com auditoria estão disponíveis pelo servidor. As telas de login, funcionários, clientes, simulações e operações utilizam os serviços e endpoints abaixo. Os exemplos abaixo usam dados de teste.

## Preparar o acesso

1. Configure `.env` conforme o README e aplique as migrações com `npm run db:deploy`.
2. Gere `AUTH_SECRET` com o comando indicado no `.env.example`. Use `AUTH_URL=http://localhost:3000` no desenvolvimento local.
3. Preencha temporariamente `BOOTSTRAP_ADMIN_NAME`, `BOOTSTRAP_ADMIN_EMAIL` e `BOOTSTRAP_ADMIN_PASSWORD` no `.env`. Escolha a senha de 12 a 128 caracteres; não há senha padrão.
4. Execute `npm run admin:create`. O comando cria um administrador apenas se ainda não existir nenhum; não sobrescreve funcionários. Remova as três variáveis de bootstrap após a criação.
5. Execute `npm run dev` e abra `/login`. Após entrar, administradores podem usar `/funcionarios` e `/funcionarios/novo`; os quatro perfis acessam `/inicio`, com conteúdo e links conforme suas permissões.

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

Todos os endpoints abaixo exigem sessão. Os serviços consultam o funcionário no banco para obter seu perfil atual. Apenas administrador pode cadastrar e listar funcionários. Somente o consultor cadastra clientes. Consultor, analista e gerente consultam todos os clientes; o administrador consulta apenas os vinculados a operações, inclusive por ID.

| Método e rota | Permissão | Resultado |
| --- | --- | --- |
| `GET /api/funcionarios` | Administrador | Lista com id, nome, e-mail e perfil |
| `POST /api/funcionarios` | Administrador | Cria funcionário e retorna seus dados públicos |
| `GET /api/clientes` | Quatro perfis, conforme escopo | Lista os clientes disponíveis |
| `POST /api/clientes` | Consultor | Cria cliente |
| `GET /api/clientes/:id` | Quatro perfis, conforme escopo | Consulta um cliente; 404 se ausente ou fora do escopo |

As listagens retornam os registros da equipe, em ordem de criação decrescente. Paginação não está implementada nesta etapa. Todas as respostas de cadastro usam `Cache-Control: no-store`.

### Cadastrar funcionário

Envie JSON com `name`, `email`, `password` e, opcionalmente, `role` (`CONSULTANT`, `OPERATIONS_ANALYST`, `MANAGER` ou `ADMIN`; padrão `CONSULTANT`). O administrador escolhe a senha e a entrega manualmente para acesso ao sistema. E-mail normalizado é único; campos extras são recusados.

### Cadastrar cliente

Após entrar como consultor, este exemplo pode ser executado no console do navegador na página da aplicação:

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

`POST /api/simulacoes` exige sessão de Consultor de Câmbio, JSON e a mesma proteção de origem dos cadastros. Exemplo após entrar na aplicação:

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

Cada simulação bem-sucedida salva um registro de histórico associado ao funcionário, sem criar operação nem auditoria de operação. Falha na gravação do histórico retorna erro e não entrega um novo token confirmável. O token tem integridade verificável, sem criptografia do conteúdo. A criação da proposta garante uso único da simulação, por restrição persistida no banco. Alterar `AUTH_SECRET` invalida tokens existentes. O endpoint de criação de proposta está descrito abaixo; a tela `/simulacoes` apresenta alertas persistentes e permite tentar novamente preservando os campos.

### Histórico de simulações

`GET /api/simulacoes` exige sessão de consultor e retorna `{ data: [...] }`, com `Cache-Control: no-store`. Retorna até 50 simulações mais recentes por emissão: somente as do próprio consultor. Os demais perfis recebem 403. Inclui id, autoria pública (id e nome), valores decimais como strings, taxa, fonte, referência diária, instante de consulta, emissão, expiração `proposalId` (nulo enquanto não houver proposta) e `operationId` (para registros legados). Não retorna token nem chave de confirmação. Simulações anteriores à migração não são recuperadas. O histórico permanece após expirar e não permite renovar ou confirmar um token vencido; **Simular novamente** exige nova consulta e revisão.

## Propostas e solicitações

Todas as respostas usam `Cache-Control: no-store`. Mutações exigem JSON e recusam origem externa. Valores são strings decimais; chaves internas, tokens e hashes de senha não são retornados nas consultas.

| Método e rota | Resultado |
| --- | --- |
| `POST /api/propostas` | Consultor envia `{ customerId, simulationToken }`; 201 na criação e 200 no reenvio válido |
| `GET /api/propostas` | Propostas do escopo do perfil |
| `GET /api/propostas/:id` | Valores preservados, cliente, autor, prazo, solicitação vinculada e histórico |
| `POST /api/propostas/:id/aceite` | Consultor autor envia `{ confirmSimulatedAcceptance: true }`; 201 no primeiro aceite, 200 em reenvio |
| `GET /api/solicitacoes` | Solicitações do escopo do perfil |
| `GET /api/solicitacoes/:id` | Solicitação e proposta de origem, com histórico |

Consultores consultam e aceitam apenas seus registros. Analistas consultam solicitações da equipe e propostas com solicitação gerada; proposta ainda sem aceite retorna 404. Gerentes e administradores consultam propostas e solicitações da equipe, sem permissão de criação ou aceite. IDs fora do escopo retornam 404.

A proposta preserva os valores e `expiresAt` da simulação assinada, sem renovar o prazo original de 15 minutos. Token inválido, expirado ou de outro funcionário retorna 400 `INVALID_SIMULATION`. Uma simulação já usada por outro cliente ou por uma operação legada retorna 409 `SIMULATION_ALREADY_USED`.

`status` da proposta é derivado: `AWAITING_ACCEPTANCE`, `EXPIRED` ou `ACCEPTED`. Aceite após expiração retorna 409 `PROPOSAL_EXPIRED`. O aceite grava `acceptedAt`, uma única solicitação `PENDING_REVIEW` e o evento `ACCEPTED` atomicamente. Reenvio de aceite já concluído retorna o registro existente mesmo depois do prazo. Falha de histórico desfaz criação/aceite. O aceite não gera operação; ela é criada somente na aprovação.

As telas são `/propostas`, `/propostas/:id`, `/solicitacoes` e `/solicitacoes/:id`. `/simulacoes` cria a proposta e abre seus detalhes; o aceite é uma segunda ação explícita, com confirmação de que é simulado.

## Operações e auditoria legadas

Operações já existentes mantêm valores, autoria e histórico. Consultores consultam suas próprias operações; analista, gerente e administrador consultam a equipe. Somente analistas conduzem as transições legadas, sem analisar operações de própria autoria, inclusive após mudança de perfil (403 `SELF_REVIEW_FORBIDDEN`).

| Método e rota | Resultado |
| --- | --- |
| `POST /api/operacoes` | Criação direta bloqueada: 409 `APPROVAL_REQUIRED` para consultores; 403 para outros perfis; 401 sem sessão |
| `GET /api/operacoes` | Lista operações no escopo do perfil |
| `GET /api/operacoes/:id` | Detalhes e histórico, ou 404 fora do escopo |
| `PATCH /api/operacoes/:id/status` | Transição legada com auditoria atômica |

A aprovação gera uma operação `PENDING`, com vínculo `request: { id }` para a solicitação de origem. As transições legadas não se aplicam a essas operações: retornam 409 `PROCESSING_REQUIRED`. O processamento simulado usa os endpoints específicos abaixo.

A resposta usa `{ data: ... }`. Cada operação inclui identificadores, cliente (id, nome, CPF cadastrado), funcionário criador (id e nome), moedas, valores, taxa, referência e status, com datas de criação/atualização. Valores são strings com duas casas e a taxa com oito. `quoteReferenceDate` preserva `YYYY-MM-DD`; os demais instantes são ISO 8601. Detalhes e alteração também incluem `auditEvents` com ação, status anterior/novo, instante e autor (id e nome). Nunca retorna senha, hash de senha, token ou chave interna de confirmação.

Para alterar o status, enviar o status exibido na tela em `expectedStatus` e o destino em `status`:

```js
await fetch(`/api/operacoes/${operation.id}/status`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ expectedStatus: "PENDING", status: "UNDER_REVIEW" }),
});
```

Transições: `PENDING → UNDER_REVIEW → COMPLETED | CANCELED`. Saltos, repetições, regressões e reabertura retornam 409 `INVALID_TRANSITION`. Se o status atual difere de `expectedStatus`, retorna 409 `STATUS_CONFLICT` e orienta atualizar os dados. Somente a transição vencedora em uma disputa grava seu evento. Falha de auditoria desfaz a alteração da operação. Cliente ou operação inexistente retorna 404. A interface de criação de propostas está em `/simulacoes`; a listagem e os detalhes com auditoria estão em `/operacoes` e `/operacoes/:id`. O painel `/inicio` apresenta as quantidades reais por status e o total de simulações salvas, limitados ao mesmo escopo de autoria, além de atividades recentes e orientações.

## Decisão de solicitações

`POST /api/solicitacoes/:id/decisao` exige sessão de analista e origem válida para mutações. Corpo estrito:

```json
{ "decision": "APPROVED" }
```

ou:

```json
{ "decision": "REJECTED", "rejectionReason": "Dados inconsistentes na conferência." }
```

Motivo obrigatório na rejeição, de 1 a 1000 caracteres após trim. Campos extras são recusados (400). A resposta é HTTP 200 `{ data: ... }`, com `Cache-Control: no-store`, contendo a solicitação e a proposta com histórico, além de `operationId`, `decidedAt`, `decidedBy: { id, name }` e `rejectionReason`. Esses campos são nulos enquanto pendente; uma rejeição mantém `operationId` nulo. Listagem e detalhes de solicitações retornam os mesmos campos, conforme o escopo do perfil.

Aprovação/rejeição são definitivas. Reenvio da mesma decisão e motivo normalizado retorna o resultado original; decisão diferente ou motivo alterado retorna 409 `REQUEST_ALREADY_DECIDED`. A aprovação cria uma única operação com os valores aceitos, autoria comercial do consultor e evento de criação atribuído ao analista. Rejeição não cria operação. O prazo de aceite não limita a decisão posterior. Tudo é persistido em transação com os eventos `APPROVED`/`REJECTED` no histórico da proposta; falha de auditoria desfaz a decisão.

Outros perfis recebem 403; sem sessão, 401; solicitação inexistente, 404. O autor recebe 403 `SELF_REVIEW_FORBIDDEN` mesmo que tenha passado a analista. A decisão não modifica operações legadas nem executa processamento ou pagamento.

## Processamento simulado e recuperação

Somente analistas podem usar estas rotas, sem processar operações de sua autoria (`SELF_REVIEW_FORBIDDEN`, 403). As operações precisam estar vinculadas a uma solicitação aprovada (`APPROVED_REQUEST_REQUIRED`, 409). Mutações verificam sessão e origem. Os demais perfis recebem 403; sem sessão, 401; operação inexistente, 404. Campos extras e entradas inválidas retornam 400.

### Iniciar ou tentar novamente

`POST /api/operacoes/:id/processamento`

```json
{ "expectedAttemptCount": 0, "scenario": "SUCCESS" }
```

`scenario` aceita `SUCCESS` ou `FAILURE`, para simulação explícita. `expectedAttemptCount` é o contador exibido nos detalhes, inteiro entre 0 e 2147483646. O primeiro início usa 0; uma nova tentativa após falha usa o contador atual. O servidor aceita início em `PENDING` ou `FAILED` e muda para `PROCESSING`.

Mesmo contador anterior e mesmo cenário retornam a tentativa já criada, inclusive após resultado, sem novos efeitos. Cenário divergente, contador desatualizado, nova tentativa em andamento ou reabertura de conclusão retornam 409 `PROCESSING_CONFLICT`. Reenvios antigos depois de tentativas posteriores também retornam conflito.

### Consultar ou retomar resultado

`POST /api/operacoes/:id/processamento/resultado`

```json
{ "attemptId": "id-da-tentativa-atual" }
```

O servidor obtém o cenário persistido e finaliza como `COMPLETED` ou `FAILED`. Antes de `readyAt` (dois segundos após o início), retorna 409 `PROCESSING_NOT_READY`. Reenvio do resultado atual é idempotente. ID de outra tentativa ou operação, inclusive tentativa anterior após reinício, retorna 409 `PROCESSING_CONFLICT`.

Ambas as rotas retornam HTTP 200 `{ data: ... }` com `Cache-Control: no-store` e os detalhes da operação. Detalhes GET e respostas incluem `processingAttemptCount` e `processingAttempts`, em ordem decrescente de número, com `id`, `number`, `scenario`, `startedBy: { id, name }`, `startedAt`, `readyAt`, `finishedAt` e `failureReason`. Resultado e motivo são persistidos; valores e referência cambial permanecem inalterados. Auditoria registra início e resultado atomicamente com a operação e a tentativa.

As consultas GET não finalizam tentativas. A tela do analista chama o POST de resultado automaticamente enquanto aberta; após interrupção, um analista pode retomar a mesma tentativa. Não há processamento autônomo em segundo plano. Uma falha simulada permite nova tentativa na mesma operação; uma falha técnica de persistência desfaz a transação e permite reenvio seguro. Regras completas em [V1_1_PROCESSING_FLOW.md](./V1_1_PROCESSING_FLOW.md).
