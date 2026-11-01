# Propostas e solicitações — desenho da próxima entrega

Ciclo, validade e consulta administrativa aprovados em 31/10/2026. Propostas, aceite simulado, solicitações e decisão do analista estão implementados. O processamento simulado e a recuperação estão implementados em [V1_1_PROCESSING_FLOW.md](./V1_1_PROCESSING_FLOW.md).

## Ciclo aprovado

1. O consultor consulta uma cotação e revisa os valores da simulação.
2. Seleciona um cliente e salva uma proposta, preservando autor, moedas, valores, taxa, fonte, data de referência, consulta e prazo de aceite.
3. O próprio consultor registra explicitamente o aceite simulado. A ação não representa assinatura ou aceite recebido de um cliente autenticado.
4. O aceite gera uma única solicitação para análise. Reenvios retornam o mesmo registro.
5. O analista aprova ou rejeita a solicitação; não pode decidir sobre solicitação de sua autoria, inclusive após mudança de função.
6. A aprovação gera uma única operação. O processamento simulado está detalhado em seu documento de fluxo.

Salvar proposta, registrar aceite e aprovar são ações distintas. A interface deve mostrar o efeito de cada uma antes da confirmação. Nenhuma ação executa pagamento ou liquidação financeira.

## Primeira entrega implementada

Criação, listagem e detalhes de propostas, aceite simulado e consulta das solicitações geradas estão implementados. A decisão do analista está implementada na entrega seguinte, descrita abaixo. O processamento e sua recuperação estão descritos em [V1_1_PROCESSING_FLOW.md](./V1_1_PROCESSING_FLOW.md).

| Registro | Estado | Regra |
| --- | --- | --- |
| Proposta | Aguardando aceite | Pode receber aceite pelo consultor autor enquanto válida |
| Proposta | Expirada | Prazo encerrado sem aceite; exige nova simulação e nova proposta |
| Proposta | Aceita | Valores preservados e solicitação única gerada; sem novo aceite |
| Solicitação | Aguardando análise | Consulta pelo autor e pelos perfis autorizados; decisão exclusiva do analista |

A expiração deve ser conferida no servidor na ação de aceite. A apresentação de uma proposta expirada não depende de agendamento ou alteração em segundo plano. Uma proposta aceita não volta a expirar por leitura posterior.

## Integridade e concorrência

- Criação exige simulação íntegra, válida e pertencente ao consultor autenticado. Valores, taxa, autor e prazo não vêm de campos livres do navegador.
- Uma mesma simulação não pode gerar propostas para clientes diferentes nem contornar a confirmação única já existente no fluxo V1.
- Reenvios simultâneos de criação ou aceite não geram duplicações.
- Aceite, solicitação e evento de histórico são persistidos na mesma transação. Falha de histórico desfaz a ação.
- O histórico registra criação e aceite com autor e instante; proposta aceita e valores preservados não podem ser editados.
- Listagem, detalhes por ID, histórico e contadores aplicam o mesmo escopo no servidor.
- Tokens assinados e chaves internas não são retornados nas consultas nem armazenados como credenciais na proposta.

## Acesso

- Consultor: cria e consulta suas próprias propostas, registra aceite e acompanha suas solicitações.
- Analista: consulta solicitações da equipe e a proposta vinculada para conferência; não consulta propostas ainda sem aceite.
- Gerente: consulta propostas e solicitações da equipe para supervisão.
- Administrador: consulta propostas e solicitações da equipe para suporte, sem ações comerciais ou operacionais. Os detalhes incluem nome e CPF do cliente vinculado; a listagem cadastral administrativa continua restrita a clientes com operações.

## Compatibilidade

O fluxo V1 já permite criar operações diretamente da simulação. A entrada comercial passa pela proposta para impedir que a criação direta burle a análise definida para a V1.1. `POST /api/operacoes` agora retorna 409 `APPROVAL_REQUIRED` para o consultor autenticado; os demais perfis continuam sem permissão de criação direta. `/simulacoes` salva uma proposta e abre seus detalhes. Operações e auditoria existentes foram preservadas.

Operações anteriores permanecem identificáveis e consultáveis. Não converter registros existentes em propostas ou inventar aceite retroativo. Qualquer regra de evolução de operações legadas abertas será definida antes de alterar suas transições.

## Decisões e próxima entrega

- Operação: somente após aprovação do analista.
- Validade da proposta: prazo restante dos 15 minutos da simulação, sem renovação ao salvar.
- Administrador: consulta de propostas e solicitações para suporte aprovada.
- Decisão do analista: implementada conforme as regras abaixo.
- Processamento simulado, falhas e recuperação: implementados em entrega própria.

## Entrega técnica

- Migração aditiva: `20261031220000_proposals_and_requests`; novas tabelas `Proposal`, `ExchangeRequest` e `ProposalAuditEvent`, sem converter operações existentes.
- Estado da proposta derivado de `acceptedAt` e `expiresAt`; solicitação criada como `PENDING_REVIEW`.
- Rotas de tela: `/propostas`, `/propostas/:id`, `/solicitacoes` e `/solicitacoes/:id`.
- API: criação/listagem/detalhes de propostas, registro de aceite e leitura de solicitações, conforme [API.md](./API.md).
- Simulações preservam o vínculo por chave interna, exibindo acesso à proposta no histórico sem expor chave ou token.

## Validação desta entrega

Passaram 40 testes unitários e 23 de integração, além de lint, tipos, schema e build. A integração cobre criação e aceite simultâneos, prazo original e limite de expiração, reenvio após aceite, escopos por perfil, HTTP real, bloqueio da criação direta de operação, rollback em falha real de histórico e preservação de operações legadas. O aviso conhecido do `pg` sobre consultas no mesmo cliente apareceu sem falha nos testes.

A conferência visual usou somente o banco descartável: criação de proposta com cotação real Frankfurter/ECB, aceite simulado, solicitação e histórico, proposta expirada, consulta administrativa sem ação de aceite, desktop e telas de 390 e 320 pixels sem rolagem horizontal da página. Contas e registros temporários são removidos ao concluir.

A migração foi aplicada nos bancos locais da aplicação e de testes. O banco da aplicação ficou alinhado com as cinco migrações existentes, sem conversão ou exclusão de registros anteriores. A conferência terminou com remoção dos dados temporários do banco descartável e encerramento do servidor temporário.

## Decisão do analista — segunda entrega

- Estados: `PENDING_REVIEW → APPROVED | REJECTED`. A decisão é definitiva, sem edição de motivo ou reabertura.
- Somente `OPERATIONS_ANALYST` tem `requests:decide`. O autor não pode aprovar nem rejeitar a própria solicitação, inclusive após mudança de perfil.
- A rejeição exige motivo textual com 1 a 1000 caracteres após remoção de espaços nas extremidades e não cria operação. Novo atendimento exige nova proposta.
- A aprovação cria uma operação `PENDING`, vinculada exclusivamente à solicitação, preservando cliente, consultor autor, moedas, valores e todos os metadados da cotação aceita. O analista fica registrado como responsável pela decisão e pela criação na auditoria, sem substituir o consultor na autoria comercial.
- O prazo de aceite não é reavaliado na decisão: o aceite válido já preservou os valores para análise posterior.
- Solicitação, operação, vínculo e eventos de auditoria são gravados atomicamente. Falha em qualquer histórico desfaz toda a decisão.
- Reenvio da mesma decisão (e do mesmo motivo normalizado na rejeição) retorna o resultado original, sem substituir responsável ou data. Decisão diferente ou edição de motivo retorna 409 `REQUEST_ALREADY_DECIDED`.
- Decisões concorrentes disputam uma atualização condicional de `PENDING_REVIEW`; apenas uma produz efeitos. Aprovações simultâneas geram uma operação e um evento de cada histórico.
- A consulta informa responsável, instante, motivo e `operationId`, conforme o escopo já existente. A proposta exibe os eventos `APPROVED` e `REJECTED` em seu histórico.
- Operações criadas por aprovação não usam as transições legadas: o endpoint antigo retorna 409 `PROCESSING_REQUIRED`. A tela oferece a consulta da decisão de origem e as ações de processamento simulado. Operações legadas preservam seu comportamento.

Migração aditiva: `20261031230000_request_decisions`. Não altera propostas aceitas, solicitações pendentes ou operações preexistentes.

Validação da segunda entrega: lint, tipos, schema Prisma e build passaram; 40 testes unitários e 28 de integração passaram. Inclui HTTP real com cookies dos quatro perfis, decisão própria após mudança de função, concorrência de decisões iguais e opostas, preservação dos valores após o prazo original, motivo obrigatório e imutável, bloqueio das transições legadas e rollback em falhas reais dos dois históricos. O aviso conhecido de consultas simultâneas do `pg` apareceu sem falhas.

Conferência visual: aprovação em desktop, rejeição com motivo e confirmação explícita em celular; larguras de 320 e 390 pixels sem rolagem horizontal da página. Foram usadas fixtures identificadas como fictícias apenas no banco descartável; as contas e os registros temporários foram removidos. Migração aplicada nos bancos locais da aplicação e de testes.
