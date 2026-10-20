# Arquitetura — ExchangeDesk V1

## 1. Visão geral

A V1 será uma aplicação Next.js Full Stack com TypeScript, PostgreSQL e Prisma. Interface e lógica de servidor ficarão no mesmo projeto, sem necessidade de um backend separado.

A stack está definida. A organização de pastas, o modelo de dados e as estratégias descritas abaixo são propostas técnicas para implementar o escopo de [REQUIREMENTS.md](./REQUIREMENTS.md), sujeitas às pendências indicadas neste documento.

```text
Navegador
  └─ Next.js: interface com Tailwind CSS e Recharts
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

## 3. Organização proposta

Usar o App Router do Next.js, com componentes de servidor para leitura quando adequado e componentes de cliente para interações e gráficos.

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

Grupos de rotas organizam arquivos; não substituem controles de acesso. Server Actions e/ou Route Handlers serão entradas finas que chamam os mesmos serviços. A divisão final será definida na implementação, sem duplicar regras em cada entrada.

## 4. Modelo de dados proposto

### Funcionário (`User`)

- `id`, `name`, `email`, `role`, `createdAt`.
- Perfil: `ADMIN` ou `OPERATOR`.
- E-mail único para identificação do funcionário.
- Campos de credenciais e tabelas auxiliares dependem da configuração escolhida para Auth.js.

Não existe entidade de cliente autenticável. Não disponibilizar rota pública de criação de funcionários.

### Cliente (`Customer`)

- `id`, `name`, `fictionalCpf`, `email`, `phone`, `createdAt`.
- CPF e telefone armazenados como texto para preservar zeros e formatação.
- Restrições de unicidade e normalização dos dados do cliente ainda pendentes.

### Operação (`ExchangeOperation`)

- `id`, `customerId`, `createdById`, `createdAt`, `updatedAt`.
- `sourceCurrency`, `targetCurrency`: `BRL`, `USD` ou `EUR`.
- `sourceAmount`, `targetAmount`, `exchangeRate`: decimais.
- `quoteProvider`, `quoteTimestamp`, `quoteTimestampKind`, `quoteFetchedAt`.
- `status`: `PENDING`, `UNDER_REVIEW`, `COMPLETED` ou `CANCELED`.

`quoteTimestampKind` diferencia horário informado pelo provedor de horário de consulta usado como referência quando a API não informa o primeiro. Os nomes finais podem mudar, preservando essa distinção na interface.

Os valores e a referência de cotação formam um retrato da simulação confirmada. Não recalcular operações já registradas com a cotação atual. A precisão e o arredondamento seguem a política definida abaixo.

### Política decimal definida para a V1

- Valores de origem e destino: `Decimal(18,2)` no PostgreSQL/Prisma, com duas casas decimais para BRL, USD e EUR.
- Taxa aplicada à simulação e salva na operação: `Decimal(18,8)`, com oito casas decimais.
- Validar o valor de origem positivo e com no máximo duas casas; recusar excesso de casas em vez de alterar silenciosamente a entrada.
- Usar aritmética decimal no servidor. Normalizar a taxa final origem → destino para oito casas com `ROUND_HALF_UP` (metade para cima) antes de multiplicar. Se houver inversão ou composição, manter a precisão intermediária e normalizar apenas a taxa final.
- Multiplicar o valor de origem pela taxa normalizada e arredondar o resultado uma única vez para duas casas, também com `ROUND_HALF_UP`.
- Exemplo fictício: `100,00 × 5,12345678 = 512,345678`, resultando em `512,35`. No empate, `1,005` resulta em `1,01`.
- A simulação deve usar a mesma taxa e o mesmo resultado que serão persistidos. Não recalcular no navegador nem usar uma taxa oculta com mais casas.
- Transportar valores monetários e taxas da API interna como strings decimais; formatar em português apenas para exibição.
- Recusar valores fora da capacidade das colunas e resultados que arredondem para zero, com mensagem clara. Esses são limites técnicos, sem introduzir limites comerciais.

### Evento de auditoria (`OperationAuditEvent`)

- `id`, `operationId`, `actorId`, `occurredAt`.
- `action`: criação ou mudança de status.
- `previousStatus` opcional e `newStatus` obrigatório.

Relacionamentos: cliente → operações; funcionário → operações criadas e eventos realizados; operação → eventos. Usar chaves estrangeiras para preservar esses vínculos. Não criar exclusão em cascata que apague o histórico por acidente; exclusão de operações não faz parte da V1.

Uma tabela separada de simulações não é necessária para o escopo atual. Dados de sessão e contas do Auth.js serão modelados após a escolha da estratégia de autenticação.

## 5. Fluxos de servidor

### Simular

1. Validar sessão, acesso, moedas e valor de origem com Zod.
2. Consultar o adaptador de cotações.
3. Validar e normalizar a resposta para uma taxa origem → destino.
4. Calcular com aritmética decimal e a política de arredondamento definida.
5. Retornar valores, taxa, fonte e horários para a interface.

Conversão: `valorDestino = valorOrigem × taxa`. Não adicionar impostos, tarifas ou spread.

### Confirmar operação

1. Validar sessão, autorização, cliente e os dados da simulação no servidor.
2. Recuperar ou verificar a referência de cotação confiável usada na simulação; não aceitar taxa e resultado arbitrários enviados pelo navegador.
3. Aplicar a política de validade da referência, que ainda será definida. Se houver necessidade de nova cotação, reapresentar o resultado antes da confirmação.
4. Em uma transação do Prisma, criar a operação Pendente e seu evento inicial de auditoria.

A forma de preservar a simulação entre essas etapas está pendente: por exemplo, uma referência armazenada no servidor ou um conteúdo verificável pelo servidor. O requisito é registrar exatamente o resultado confirmado pelo usuário.

### Alterar status

1. Validar sessão, autorização e status solicitado.
2. Dentro da transação, verificar o status atual e a transição permitida.
3. Atualizar a operação e inserir o evento de auditoria com funcionário e horário.
4. Confirmar as duas gravações juntas ou desfazer ambas.

Usar uma atualização condicionada ao status esperado, ou mecanismo equivalente, para impedir que ações simultâneas produzam transições incompatíveis. Se outra alteração já tiver ocorrido, recusar a tentativa e orientar a atualização da tela.

Fluxo único: `PENDING → UNDER_REVIEW → COMPLETED | CANCELED`. Estados finais não permitem novas transições.

## 6. Integração de cotações

O adaptador deve isolar os nomes e o formato do provedor. Seu retorno interno deve identificar moedas, taxa decimal, fonte, horário da cotação quando disponível e horário da consulta.

O provedor deve permitir atender às conversões entre BRL, USD e EUR. A eventual inversão ou composição de taxas precisa ser definida e testada; não deve ser assumida silenciosamente.

Definir tempo limite para chamadas e tratar falhas, respostas inválidas e pares indisponíveis. Na ausência de uma referência válida conforme a política definida, bloquear a confirmação e explicar a indisponibilidade. Não usar taxa fictícia como alternativa em uso normal. Testes podem usar respostas simuladas, claramente separadas da integração real.

Cache, duração da referência e limites de consulta são decisões pendentes, dependentes do provedor.

## 7. Autenticação e autorização

Auth.js cuidará da autenticação e sessão; a aplicação continuará responsável por autorizar cada ação. A verificação deve ocorrer em toda entrada de servidor que leia ou altere dados protegidos, incluindo o acesso a um recurso específico.

Está fechado que apenas administradores cadastram funcionários. A matriz de acesso operacional ainda precisa confirmar quem pode visualizar operações de outros funcionários, alterar status e consultar auditoria.

O método de login não está escolhido. Se forem usadas credenciais com senha, armazenar somente hash produzido por biblioteca apropriada e definir a entrega do acesso inicial. Não assumir que Auth.js fornece, por si só, cadastro e armazenamento de senhas.

O primeiro administrador deverá ser criado por uma rotina controlada, sem senha fixa versionada nem cadastro público. Estratégia de sessão, expiração e variáveis de ambiente serão documentadas após a decisão de autenticação.

## 8. Interface e testes

Tailwind CSS será usado na interface. Recharts será usado em uma visualização simples cujo conteúdo ainda será confirmado; a proposta é contar operações por status. Não é necessário contratar ou persistir séries históricas de mercado para essa finalidade.

Usar Vitest apenas para os comportamentos essenciais abaixo, ao implementar cada fluxo. Não exigir cobertura total, testes de detalhes visuais ou de comportamentos internos das bibliotecas:

- Fórmula de conversão, precisão e arredondamento definidos.
- Validação de moedas, valores e campos de cadastro.
- Todas as transições permitidas e recusadas.
- Bloqueio de cadastro de funcionários por operador e de ações sem sessão.
- Normalização da cotação e tratamento de falhas do provedor.
- Integridade da transação e tratamento de concorrência, com banco de teste isolado.

A verificação manual deve cobrir login, cadastro por perfil, mensagens de erro e o fluxo completo em tela de computador e celular.

## 9. Decisões técnicas pendentes

| Tema | Decisão a registrar |
| --- | --- |
| Ambiente | Base definida: Node.js 22.14.0, npm 11.6.2 e PostgreSQL 17; versões e scripts em `package.json` |
| Auth.js | Método de login, estratégia de sessão e criação do administrador inicial |
| Autorização | Matriz de ações e visibilidade dos dados por perfil |
| Clientes | Normalização, formato e unicidade dos campos |
| API de cotações | Provedor, pares, chave, normalização, limites, cache e validade |
| Simulação | Como preservar e verificar a referência até a confirmação |
| Entradas de servidor | Uso de Server Actions e Route Handlers por fluxo |
| Gráficos | Conteúdo mínimo com Recharts |
| Publicação | Hospedagem, PostgreSQL, variáveis e aplicação das migrações |

As decisões devem ser atualizadas nestes documentos quando resolvidas. Microsserviços, filas, pagamentos, saldos e mecanismos financeiros adicionais não são necessários para o escopo da V1.
