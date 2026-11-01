# Arquitetura — ExchangeDesk V1

## 1. Visão geral

A V1 será uma aplicação Next.js Full Stack com TypeScript, PostgreSQL e Prisma. Interface e lógica de servidor ficarão no mesmo projeto, sem necessidade de um backend separado.

A stack, a organização de pastas, o modelo inicial e as decisões de acesso estão definidos para o escopo de [REQUIREMENTS.md](./REQUIREMENTS.md). As pendências restantes estão indicadas neste documento. A aplicação centraliza os fluxos operacionais de uma única equipe, com autorização no servidor, validação de dados e rastreabilidade das operações.

```text
Navegador
  └─ Next.js: interface com Tailwind CSS
       └─ Camada de servidor: sessão, autorização e validação Zod
            └─ Serviços de clientes, cotações e operações
                 ├─ Prisma → PostgreSQL
                 └─ Adaptador → API pública de cotações

Auth.js fornece autenticação e sessão à aplicação.
```

## 2. Responsabilidades

| Parte | Responsabilidade |
| --- | --- |
| Interface | Formulários, tabelas, detalhes, mensagens e visualizações |
| Auth.js | Identificação do funcionário e manutenção da sessão |
| Autorização | Verificar no servidor o perfil e o acesso à ação e ao recurso |
| Zod | Validar dados recebidos e respostas externas relevantes |
| Serviços | Aplicar conversão, transições e registro de auditoria |
| Prisma | Acesso ao banco e transações |
| Adaptador de cotações | Consultar o provedor e normalizar a resposta |
| Vitest | Testar regras, serviços e integrações selecionadas |

Componentes da interface não devem acessar o banco diretamente. Toda mutação passa por autenticação, autorização e validação no servidor.

## 3. Organização definida

Usar o App Router do Next.js, com componentes de servidor para leitura quando adequado e componentes de cliente para formulários e interações.

```text
src/
  app/
    (auth)/login/
    (internal)/
      clientes/
      funcionarios/
      simulacoes/
      operacoes/
    api/
  components/
  server/
    auth/
    db/
    services/
    quotes/
  schemas/
  domain/
prisma/
  schema.prisma
  migrations/
tests/
```

A organização principal usa as responsabilidades abaixo:

| Pasta | Responsabilidade |
| --- | --- |
| `src/app` | Páginas, layouts, entradas HTTP e Server Actions associadas às rotas |
| `src/components` | Componentes da interface, de servidor ou de cliente conforme a necessidade |
| `src/server/auth` | Sessão e autorização |
| `src/server/db` | Instância e configuração de acesso ao banco com Prisma |
| `src/server/services` | Coordenação dos fluxos, persistência e transações |
| `src/server/quotes` | Adaptador e comunicação com o provedor de cotações |
| `src/schemas` | Schemas Zod para validar entradas e dados compartilháveis, sem segredos |
| `src/domain` | Regras e tipos do domínio, independentes de Next.js, banco e chamadas externas |
| `prisma` | Schema e migrações do banco |
| `docs` | Requisitos, arquitetura e plano de implementação |

Os módulos de `src/server` devem importar `server-only` para impedir seu uso em componentes de cliente. Componentes de servidor podem chamar serviços para leituras autorizadas; componentes de cliente usam as entradas de servidor. Os serviços continuam responsáveis por aplicar as verificações de acesso.

As pastas principais e as subdivisões de `src/server` já foram criadas. Arquivos `.gitkeep` preservam as pastas ainda vazias no versionamento e podem ser removidos quando receberem código. As rotas funcionais e `tests/` mostrados na árvore serão criados conforme a implementação de cada fluxo.

Grupos de rotas organizam arquivos; não substituem controles de acesso. Server Actions e/ou Route Handlers serão entradas finas que chamam os mesmos serviços. A divisão final será definida na implementação, sem duplicar regras em cada entrada.

## 4. Modelo de dados definido

### Funcionário (`User`)

- `id`, `name`, `email`, `passwordHash`, `role`, `createdAt`.
- Perfil único: `CONSULTANT`, `OPERATIONS_ANALYST`, `MANAGER` ou `ADMIN`; padrão `CONSULTANT`.
- E-mail único para identificação do funcionário.
- `passwordHash` contém somente o hash Argon2id; nunca retornar esse campo nas respostas.
- Sessão JWT: não são necessárias tabelas `Session`, `Account` ou `VerificationToken` para Credentials nesta V1.

Não existe entidade de cliente autenticável. Não disponibilizar rota pública de criação de funcionários.

### Cliente (`Customer`)

- `id`, `name`, `fictionalCpf`, `email`, `phone`, `createdAt`.
- CPF e telefone armazenados como texto para preservar zeros e formatação.
- CPF único, com 11 dígitos, sem validar dígitos verificadores; remover máscara e preservar zeros.
- Nome com 2 a 100 caracteres; e-mail válido com até 254 caracteres em minúsculas; telefone com DDD e 10 ou 11 dígitos, sem código de país.
- E-mail e telefone do cliente não são únicos. Remover espaços nas extremidades dos textos e máscaras do CPF/telefone no schema Zod.

### Operação (`ExchangeOperation`)

- `id`, `customerId`, `createdById`, `createdAt`, `updatedAt`.
- `confirmationKey`: hash SHA-256 único do conteúdo validado da simulação; interno, não retornado pela API. É opcional apenas para preservar registros anteriores à migração.
- `sourceCurrency`, `targetCurrency`: `BRL`, `USD` ou `EUR`.
- `sourceAmount`, `targetAmount`, `exchangeRate`: decimais.
- `quoteProvider`, `quoteReferenceDate`, `quoteTimestamp`, `quoteTimestampKind`, `quoteFetchedAt`.
- `status`: `PENDING`, `UNDER_REVIEW`, `COMPLETED` ou `CANCELED`.

`quoteTimestampKind` usa `PROVIDER` quando há um instante informado pelo provedor e `FETCHED_AT` quando a referência temporal é a consulta. `quoteReferenceDate` é uma data opcional separada, armazenada como PostgreSQL `date`, para provedores que publicam observações diárias. Frankfurter/ECB retorna data sem hora: preservar essa data, usar o instante de consulta em `quoteTimestamp` com tipo `FETCHED_AT` e exibir os dois rótulos separadamente, sem inventar o instante da cotação.

Os valores e a referência de cotação formam um retrato da simulação confirmada. Não recalcular operações já registradas com a cotação atual. A precisão e o arredondamento seguem a política definida abaixo.

### Política decimal definida para a V1

- Valores de origem e destino: `Decimal(18,2)` no PostgreSQL/Prisma, com duas casas decimais para BRL, USD e EUR.
- Taxa aplicada à simulação e salva na operação: `Decimal(18,8)`, com oito casas decimais.
- Validar o valor de origem positivo e com no máximo duas casas; recusar excesso de casas em vez de alterar silenciosamente a entrada.
- Usar aritmética decimal no servidor. Normalizar a taxa final origem → destino para oito casas com `ROUND_HALF_UP` (metade para cima) antes de multiplicar. Se houver inversão ou composição, manter a precisão intermediária e normalizar apenas a taxa final.
- Multiplicar o valor de origem pela taxa normalizada e arredondar o resultado uma única vez para duas casas, também com `ROUND_HALF_UP`.
- Exemplo de cálculo: `100,00 × 5,12345678 = 512,345678`, resultando em `512,35`. No empate, `1,005` resulta em `1,01`.
- A simulação deve usar a mesma taxa e o mesmo resultado que serão persistidos. Não recalcular no navegador nem usar uma taxa oculta com mais casas.
- Transportar valores monetários e taxas da API interna como strings decimais; formatar em português apenas para exibição.
- Recusar valores fora da capacidade das colunas e resultados que arredondem para zero, com mensagem clara. Esses são limites técnicos, sem introduzir limites comerciais.

### Evento de auditoria (`OperationAuditEvent`)

- `id`, `operationId`, `actorId`, `occurredAt`.
- `action`: criação ou mudança de status.
- `previousStatus` opcional e `newStatus` obrigatório.

Relacionamentos: cliente → operações; funcionário → operações criadas e eventos realizados; operação → eventos. Usar chaves estrangeiras para preservar esses vínculos. Não criar exclusão em cascata que apague o histórico por acidente; exclusão de operações não faz parte da V1.

Uma tabela separada de simulações não é necessária para o escopo atual. IDs usam CUID gerado pelo Prisma. Instantes usam `timestamptz(3)`; a data diária da cotação usa `date`. As chaves estrangeiras restringem exclusões dos registros relacionados. A migração inicial também verifica valores positivos, moedas diferentes e a forma dos eventos de auditoria; transições e gravação atômica continuam responsabilidade dos serviços.

## 5. Fluxos de servidor

### Simular

1. Validar sessão, acesso, moedas e valor de origem com Zod.
2. Consultar o adaptador de cotações.
3. Validar e normalizar a resposta para uma taxa origem → destino.
4. Calcular com aritmética decimal e a política de arredondamento definida.
5. Retornar valores, taxa, fonte e horários para a interface.

Conversão: `valorDestino = valorOrigem × taxa`. Não adicionar impostos, tarifas ou spread.

### Confirmar operação — referência histórica da V1

A criação direta descrita abaixo foi substituída por propostas e aceite. O endpoint antigo agora bloqueia criação com `APPROVAL_REQUIRED`; operações existentes continuam consultáveis. O fluxo atual está na seção 10.

1. Validar sessão, autorização, cliente e os dados da simulação no servidor.
2. Recuperar ou verificar a referência de cotação confiável usada na simulação; não aceitar taxa e resultado arbitrários enviados pelo navegador.
3. Verificar a assinatura e a validade de 15 minutos da simulação. Se expirar, exigir nova simulação e reapresentar o resultado antes da confirmação.
4. Em uma transação do Prisma, criar a operação Pendente e seu evento inicial de auditoria.

A simulação será devolvida em um token assinado com HMAC-SHA256 no servidor, usando uma chave derivada de `AUTH_SECRET` com contexto exclusivo para simulações. O conteúdo inclui versão, identificador UUID da simulação, funcionário, moedas, valores decimais, taxa, fonte, data de referência, horário de consulta, emissão e expiração. Tokens anteriores sem UUID continuam verificáveis até sua expiração. Usar `node:crypto`, sem nova dependência ou tabela de simulações. O token garante integridade, não sigilo, e não deve conter dados cadastrais de clientes.

Na confirmação, validar formato, assinatura com comparação em tempo constante, funcionário da sessão e expiração; validar também o cliente selecionado e recalcular o resultado a partir dos valores assinados como verificação de consistência. Persistir exatamente a taxa e os valores apresentados, sem consultar outra cotação. A validade começa na emissão da simulação; a idade do cache é uma informação separada. Uma simulação ainda válida pode ser confirmada mesmo se o provedor estiver indisponível. A confirmação calcula um hash do conteúdo validado e usa a restrição única `confirmationKey` no PostgreSQL para impedir duas operações da mesma simulação, inclusive em requisições simultâneas. Um reenvio válido para o mesmo cliente retorna a operação existente sem criar evento; a tentativa de reutilizar a simulação para outro cliente retorna conflito. A verificação da validade acontece antes dessa consulta: tokens expirados continuam recusados, mesmo em reenvios; nesse caso, consultar a lista de operações antes de simular de novo. A assinatura isolada não garante uso único; a restrição persistida faz essa proteção.

### Confirmação na interface — decisões aprovadas

A tela de revisão apresentará cliente (nome e identificador), moedas, valor de origem, taxa, valor de destino, fonte, data de referência, horário de consulta e validade restante. Ações **Voltar** e **Confirmar operação**. Durante o envio, mostrar carregamento e desabilitar a confirmação; o servidor também impede duplicação, independentemente do botão.

Sucesso direcionará aos detalhes da operação Pendente, com o evento inicial. Expiração exigirá nova simulação e revisão do resultado. Falhas de gravação serão apresentadas em alerta sem indicar sucesso. Em resposta incerta por falha de conexão, reenviar o mesmo token enquanto válido recupera a operação existente. Essas decisões aprovadas estão implementadas na etapa 6, na rota `/simulacoes`; a revisão precede o envio e o sucesso direciona a `/operacoes/:id`.

### Alterar status

1. Validar sessão, autorização e status solicitado.
2. Dentro da transação, verificar o status atual e a transição permitida.
3. Atualizar a operação e inserir o evento de auditoria com funcionário e horário.
4. Confirmar as duas gravações juntas ou desfazer ambas.

Usar uma atualização condicionada ao status esperado, ou mecanismo equivalente, para impedir que ações simultâneas produzam transições incompatíveis. Se outra alteração já tiver ocorrido, recusar a tentativa e orientar a atualização da tela.

Os serviços de confirmação, listagem, detalhes e mudança de status estão implementados em `src/server/services/operations.ts`, com entradas em `/api/operacoes`, `/api/operacoes/:id` e `/api/operacoes/:id/status`. A mudança recebe `expectedStatus` e `status`; a atualização condicionada e a auditoria ocorrem na mesma transação. Valores saem como strings com duas/oito casas, a data de referência como `YYYY-MM-DD`, e hashes e senhas não integram a seleção.

Fluxo único: `PENDING → UNDER_REVIEW → COMPLETED | CANCELED`. Estados finais não permitem novas transições.

## 6. Integração de cotações

O adaptador deve isolar os nomes e o formato do provedor. Seu retorno interno deve identificar moedas, taxa decimal, fonte, horário da cotação quando disponível e horário da consulta.

O provedor escolhido é [Frankfurter v2](https://frankfurter.dev/), pela rota pública `https://api.frankfurter.dev/v2/providers/ecb/rates?base=BRL&quotes=USD,EUR`. Não exige chave e publica taxas diárias. O adaptador solicitará o sentido origem → destino diretamente, sem inverter ou compor taxas na aplicação.

Na avaliação do provedor, as três bases BRL, USD e EUR retornaram os dois destinos esperados, cobrindo os seis pares. Cada item retornou `date`, `base`, `quote` e `rate`. Isso orientou o campo `quoteReferenceDate`; o teste manual da API não substitui os testes de normalização e falhas que acompanharão o adaptador. A interface deve atribuir a fonte como Frankfurter / ECB e identificar os valores como referência diária.

### Política definida para a etapa 4

- Timeout de **5 segundos** por chamada, sem repetição automática. O usuário pode tentar novamente após uma falha.
- Cache em memória do processo por **15 minutos**, por par de moedas, apenas para respostas válidas. No máximo seis entradas, correspondentes aos seis pares permitidos. Reiniciar o processo apenas esvazia o cache; instâncias diferentes podem consultar separadamente. Não adicionar Redis ou tabela de cotações na V1.
- Preservar o horário da consulta original ao reutilizar o cache. Cache expirado exige nova consulta; falhas não renovam o prazo nem autorizam usar uma entrada vencida.
- Validar os campos relevantes: moedas correspondentes ao pedido, taxa positiva e finita, data válida e não futura. Aplicar a política decimal após essa validação e recusar taxas ou resultados fora da capacidade definida. Os valores internos e de saída são strings decimais.
- Aceitar a última data diária retornada pelo provedor, inclusive uma data anterior ao dia da consulta. O cache mede o tempo desde a consulta, não a idade da observação diária. Mostrar sempre a data de referência e o horário de consulta separadamente.
- Em timeout, erro HTTP, resposta inválida ou par ausente, informar indisponibilidade e impedir uma nova simulação. Não usar taxa fictícia como alternativa. Uma simulação assinada já emitida continua válida até sua expiração.
- Consultar somente mediante solicitação autenticada de simulação, reutilizando o cache enquanto válido. Sem atualização em segundo plano, polling, limitador distribuído ou infraestrutura adicional nesta etapa.

A entrada será `POST /api/simulacoes`, com moedas e valor de origem como string decimal. O serviço verifica `quotes:simulate`, valida a entrada e retorna o resultado, a referência, `expiresAt` e o token de confirmação. A resposta HTTP usa `Cache-Control: no-store`; o cache de cotações fica exclusivamente no servidor. O adaptador, o serviço, a entrada HTTP e as funções de assinatura/verificação estão implementados. A criação da operação e o consumo desse token estão implementados na etapa 5. Não é necessário criar um endpoint separado de cotações para esta entrega.

### Apresentação de falhas na interface

Usar um alerta estilizado junto ao formulário de simulação, seguindo o padrão existente `notice notice-error`, com ícone, texto em português e `role="alert"`. Mensagem padrão: **“Não foi possível consultar a cotação agora. Tente novamente em instantes.”** Oferecer a ação **“Tentar novamente”**, preservando as moedas e o valor preenchidos. Durante a tentativa, indicar carregamento e impedir envios repetidos.

O alerta permanece visível até uma nova tentativa ou alteração dos dados; não desaparece por um temporizador. Falhas esperadas de consulta não exigem modal. Não exibir detalhes técnicos do provedor, taxas fictícias, resultado zero como substituto ou cache vencido. Uma tentativa que falhou não produz um novo resultado confirmável. Se uma simulação anterior ainda válida permanecer na tela, identificá-la como anterior, com seu prazo original, sem apresentá-la como resultado da tentativa que falhou; alterações nas moedas ou no valor exigem nova simulação antes da confirmação.

## 7. Autenticação e autorização

Auth.js cuida da autenticação e sessão; a aplicação continuará responsável por autorizar cada ação. A verificação deve ocorrer em toda entrada de servidor que leia ou altere dados protegidos, incluindo o acesso a um recurso específico.

### Acesso atual — perfis V1.1 sobre o fluxo V1

- Uma única equipe. `CONSULTANT` cadastra clientes, simula e registra operações, e consulta apenas suas operações, totais, auditoria e simulações. `OPERATIONS_ANALYST` e `MANAGER` consultam clientes e operações da equipe. Apenas o analista conduz as transições do fluxo existente e não pode analisar operações que criou. `ADMIN` cadastra/lista funcionários e consulta operações, auditoria e clientes vinculados para suporte; não herda ações operacionais. O escopo é aplicado nos serviços, inclusive leituras por ID e totais. Registros fora do escopo de leitura retornam 404; ações sem permissão retornam 403.
- Login por e-mail e senha usando [Credentials do Auth.js](https://authjs.dev/getting-started/authentication/credentials). A aplicação consulta seu próprio `User` pelo e-mail normalizado e verifica o hash; Auth.js não cria usuários automaticamente.
- Hash Argon2id com `@node-rs/argon2`, memória de 19 MiB, duas iterações e paralelismo 1. Senhas de 12 a 128 caracteres; não remover espaços nem exigir combinações de símbolos. Nome com 2 a 100 caracteres; e-mail normalizado e único, com até 254 caracteres.
- Sessão JWT em cookie gerenciado pelo Auth.js, com `maxAge` de oito horas e renovação padrão da biblioteca, sem um mecanismo próprio de sessões. O perfil é obtido de dados confiáveis no servidor. Logout remove o cookie da sessão no navegador; revogação central de tokens e gestão de dispositivos ficam fora da V1.
- Sem adaptador de persistência do Auth.js para essa configuração: o próprio serviço lê e cadastra usuários via Prisma. Não criar tabelas OAuth ou sessões persistidas sem necessidade.
- Primeiro administrador por comando local de bootstrap, recebendo nome, e-mail e senha pelo ambiente. Exigir os campos explicitamente, validar, produzir o hash, recusar se já houver administrador e nunca atualizar um usuário existente nem imprimir a senha/hash. A rotina está em `src/server/auth/bootstrap.ts` e é executada por `npm run admin:create`; uma trava transacional no PostgreSQL serializa execuções concorrentes.
- Funcionários posteriores são cadastrados pelo administrador autenticado, que define e entrega manualmente a senha para acesso ao sistema. Sem cadastro público, login social, MFA, fluxo de convite ou recuperação por e-mail.
- Dados de autorização enviados pelo cliente nunca substituem a sessão. A função de domínio `can` expressa a matriz, mas não autentica ninguém: as entradas chamam serviços que obtêm a sessão e aplicam a política no servidor. O guarda também consulta o usuário no banco para obter seu perfil atual.

A matriz completa está em [REQUIREMENTS.md](./REQUIREMENTS.md). Login, cookies, verificação de senha, bootstrap e cadastros estão implementados. A configuração usa `next-auth@5.0.0-beta.32`, conforme a [instalação oficial do Auth.js v5](https://authjs.dev/getting-started/installation). Os endpoints são Route Handlers finos em `src/app/api`. As telas de login e saída usam Server Actions do Auth.js; o formulário visual de funcionários usa a API existente. As páginas internas também verificam o acesso no servidor, além da autorização dos serviços. O uso da API está em [API.md](./API.md).

## 8. Interface e testes

A interface usa Tailwind CSS e os padrões existentes de cores, formulários, cartões e alertas. Decisão aprovada: começar somente com os contadores reais por status e o total, sem gráficos. `getOperationSummary` agrega as quantidades no PostgreSQL depois de verificar a permissão; não carrega operações completas para calcular os números. Recharts fica adiado e não foi adicionado às dependências.

Rotas operacionais: `/clientes`, `/clientes/novo`, `/simulacoes`, `/operacoes` e `/operacoes/:id`. As leituras usam serviços autorizados em componentes de servidor; formulários chamam as APIs existentes. Valores monetários são formatados diretamente de strings decimais, preservando centavos mesmo nos limites suportados. Instantes exibidos são identificados como horário de Brasília; a data diária é formatada sem conversão de fuso. A validade da simulação aparece em contagem regressiva e impede confirmação após expiração; o servidor continua sendo a autoridade final. Erros ficam em alertas persistentes, e tentativas de confirmação repetidas reutilizam o mesmo token.

Usar Vitest apenas para os comportamentos essenciais abaixo, ao implementar cada fluxo. Sem meta de cobertura ou quantidade de testes. Um teste deve proteger uma regra relevante ou uma falha concreta; não criar um teste por arquivo, função ou componente:

- Fórmula de conversão, precisão e arredondamento definidos.
- Validação de moedas, valores e campos de cadastro.
- Todas as transições permitidas e recusadas.
- Bloqueio de cadastro de funcionários por operador e de ações sem sessão.
- Normalização da cotação e tratamento de falhas do provedor, com casos representativos e respostas simuladas.
- Expiração do cache e recusa de token adulterado, expirado ou pertencente a outro funcionário.
- Integridade da transação e tratamento de concorrência, com banco de teste isolado.

Não duplicar a mesma regra em testes unitários, de serviço e HTTP sem uma diferença de risco. Não testar getters, encaminhamento de chamadas, classes CSS, renderização estática ou detalhes internos de Prisma, Auth.js e Zod. Os seis pares podem usar um teste parametrizado; não multiplicar a suíte por todas as combinações de moedas, valores e erros.

Durante o desenvolvimento, executar os testes relacionados à mudança. Executar a suíte unitária completa, lint e tipos ao fechar uma entrega de código; build e integração quando a mudança afetar os respectivos fluxos ou antes de publicar. Integrações PostgreSQL ficam em comando separado e concentradas em persistência, transações e concorrência. A API externa real será conferida manualmente ao implementar o adaptador; os testes automatizados não dependem da rede. Alterações apenas de documentação exigem revisão do diff e consistência, sem rodar a suíte da aplicação.

Já existem testes unitários das regras e guardas, testes de integração dos cadastros com PostgreSQL e teste HTTP real de autenticação e permissões. A integração usa um banco separado com nome terminado em `_test`. O fluxo visual foi verificado em desktop e em telas de 390 e 320 pixels, usando exclusivamente banco de testes e usuários de verificação. Foram conferidos cadastro, falha de rede do provedor com alerta e campos preservados, nova tentativa com cotação real, revisão, confirmação, conclusão pelo administrador e cancelamento pelo operador, com auditoria e contadores correspondentes. Os testes de servidor de expiração, concorrência e rollback permanecem separados dessa verificação visual.

## 9. Decisões técnicas pendentes

| Tema | Decisão a registrar |
| --- | --- |
| Ambiente | Base definida: Node.js 22.14.0, npm 11.6.2 e PostgreSQL 17; versões e scripts em `package.json` |
| Cotações e simulação | Servidor e tela implementados conforme seções 5 e 6 |
| Entradas de servidor | Simulação por Route Handler definida; entradas dos demais fluxos serão escolhidas ao implementá-los |
| Visão geral | Contadores por status implementados; gráficos e Recharts adiados por decisão do usuário |
| Ambiente | Desenvolvimento local com PostgreSQL; publicação e escolha de hospedagem adiadas |

As decisões devem ser atualizadas nestes documentos quando resolvidas. Microsserviços, filas, pagamentos, saldos e mecanismos financeiros adicionais não são necessários para o escopo da V1.

### Painel pessoal e simulações persistidas

A tabela `Simulation` registra cada consulta bem-sucedida com `createdById`, moedas, valores decimais, taxa, fonte, referência diária, consulta, emissão e expiração. Uma chave SHA-256 calculada sobre o payload normalizado com o mesmo schema do token permite associar o histórico à `ExchangeOperation.confirmationKey`, sem guardar o token. A geração da chave é compartilhada pela simulação e confirmação. O histórico é gravado antes de entregar o resultado confirmável; falha de persistência impede esse resultado. Não há dados retroativos de consultas anteriores.

`listSimulations` e `getSimulationCount` exigem `simulations:read` e sempre filtram o consultor autor. `listOperations`, `getOperationSummary` e detalhes usam `operationScope`: próprias para consultor, equipe para os demais perfis autorizados. Alterações são exclusivas do analista; a checagem de autoria impede análise própria, e o update condicional continua protegendo concorrência. `/simulacoes/historico` e `GET /api/simulacoes` retornam no máximo 50 consultas recentes, com autor público e operação associada, sem chave nem token. A ação de repetir somente preenche o formulário: nova consulta e confirmação são obrigatórias.

`/inicio` adapta navegação e conteúdo por perfil, mostrando contagens reais do escopo, cinco simulações e cinco operações recentes, orientações do fluxo e limites dos valores exibidos. Clientes são compartilhados entre consultor, analista e gerente; para suporte administrativo, o serviço filtra clientes com operações, inclusive no acesso direto por ID.

### Migração e separação dos perfis

A migração `20261031210000_v1_1_roles` substitui o enum de perfis em transação e preserva IDs e vínculos. Recusa contas `OPERATOR` sem atribuição explícita; o ambiente local possuía apenas um administrador, preservado integralmente. A migração foi testada também em schema isolado, verificando recusa sem alterações e preservação de vínculos.

`requireActor`/`requirePageActor` verificam o funcionário sem exigir uma permissão comercial. Layout e login usam essa verificação. Páginas e serviços mantêm suas próprias autorizações. Navegação usa a matriz de `can`; o painel carrega simulações apenas para consultores. O JWT mantém a identidade e o servidor consulta o perfil atual para autorizar, inclusive após troca de função.

O fluxo de estados existente permanece `PENDING → UNDER_REVIEW → COMPLETED | CANCELED`. Não há entidades ou endpoints de propostas, aceite ou processamento simulado nesta entrega.

## 10. Propostas, aceite e solicitações

`Proposal` guarda um retrato da simulação validada, com cliente, autor, valores decimais, cotação, emissão e prazo original. A chave única de confirmação impede duplicações por simulação. Não se guarda token. Antes de criar, o serviço também recusa uma simulação já consumida por operação V1.

`acceptedAt` é opcional. O estado exibido é derivado: aceita quando preenchido; expirada quando o prazo termina sem aceite; caso contrário, aguardando aceite. Não existe tarefa periódica para expirar propostas. A migração impõe valores positivos, moedas diferentes, validade de 15 minutos desde a emissão e aceite dentro dessa janela.

`acceptProposal` atualiza condicionalmente por autor, ausência de aceite e prazo vigente. Na mesma transação cria `ExchangeRequest` com vínculo único à proposta e evento `ACCEPTED` em `ProposalAuditEvent`. Uma tentativa concorrente lê o resultado vencedor; reenvios após aceite são idempotentes mesmo depois do prazo. Falha real do evento desfaz aceite e solicitação.

O consultor consulta apenas suas propostas e solicitações. O analista só consulta propostas com solicitação gerada. Gerente e administrador consultam a equipe. `getProposal`, `listProposals`, `getExchangeRequest` e `listRequests` verificam sessão, perfil atual e escopo no servidor. Consulta administrativa não concede mutação.

A entrada antiga de criação de operação está bloqueada. A aprovação ainda será implementada e será a única responsável por criar a operação. Os testes de operações V1 usam fixtures legadas no banco descartável, preservando a verificação de transições, concorrência e rollback sem simular uma entrada de criação ainda disponível.
