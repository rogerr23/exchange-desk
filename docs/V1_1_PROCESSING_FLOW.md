# Processamento simulado — ExchangeDesk V1.1

O processamento atua somente sobre operações vinculadas a solicitações aprovadas. Não executa pagamento, transferência ou liquidação e não chama serviços financeiros externos.

## Estados e responsabilidades

- `PENDING → PROCESSING → COMPLETED | FAILED`.
- `FAILED → PROCESSING` inicia uma nova tentativa. `COMPLETED` é definitivo.
- Somente o analista tem `operations:process`. O autor comercial da operação não pode processá-la, inclusive após mudança de perfil.
- O analista que aprova pode processar: a restrição é em relação ao consultor autor. Outro analista pode retomar uma tentativa interrompida.
- Consultor, gerente e administrador consultam estado, tentativas e auditoria conforme o escopo existente, sem ações de processamento.
- Operações legadas continuam no fluxo `PENDING → UNDER_REVIEW → COMPLETED | CANCELED`. O novo processamento recusa operações sem solicitação aprovada. O endpoint legado recusa novas operações com `PROCESSING_REQUIRED`.

## Simulação e recuperação

O analista escolhe explicitamente o cenário de sucesso ou falha ao iniciar cada tentativa. Esse cenário fica persistido e não pode ser alterado posteriormente. Não há resultados aleatórios nem retorno de provedores externos.

Cada tentativa registra número, cenário, funcionário iniciador, início, instante mínimo para resultado, conclusão e motivo de falha. A operação preserva valores, cotação, cliente, autoria comercial e vínculo com a aprovação. Uma falha não exige outra proposta ou operação: a recuperação usa uma nova tentativa na mesma operação, preservando as anteriores.

A tentativa fica disponível para resultado após dois segundos, conferidos no servidor. A tela do analista consulta o resultado automaticamente e oferece “Consultar ou retomar resultado”. Uma interrupção de navegador, rede ou processo não perde a tentativa: ela fica em `PROCESSING` até que um analista retome a consulta. Não há worker, agendamento ou processamento autônomo com a tela fechada. Leituras GET não mudam o estado. A retomada finaliza a mesma tentativa; uma nova tentativa só é permitida após `FAILED`.

Falhas simuladas geram `FAILED` com motivo legível persistido. Falhas técnicas de gravação ou auditoria retornam erro e desfazem a transação; uma finalização técnica interrompida mantém a tentativa em andamento e pode ser reenviada. O erro técnico não inventa conclusão nem falha simulada.

## Integridade e concorrência

- O início usa `expectedAttemptCount` para impedir comandos desatualizados e concorrentes de criarem tentativas extras.
- Reenvio do mesmo início (contador anterior e mesmo cenário) retorna a tentativa criada, inclusive depois do resultado. Um cenário diferente, contador desatualizado ou tentativa nova enquanto em andamento retorna `PROCESSING_CONFLICT`.
- Resultado usa o ID da tentativa atual. O servidor obtém o cenário persistido; não aceita status ou resultado livre do navegador.
- Reenvio de resultado finalizado retorna o registro existente. Resultado de tentativa antiga depois de nova tentativa retorna conflito.
- Início, incremento do contador, tentativa e auditoria são atômicos. Resultado, atualização da tentativa e auditoria também são atômicos.
- Cada mudança registra status anterior, novo status, funcionário que executou a ação e instante. A retomada por outro analista não substitui o iniciador da tentativa.
- Alterações concorrentes disputam uma atualização condicional na operação. Apenas uma grava os efeitos e seu evento de auditoria.
- Não são expostos token, chave de confirmação ou hash de senha nas consultas ou respostas de processamento.

## Entrega técnica

Migração aditiva `20261101000000_operation_processing`: novos estados `PROCESSING`/`FAILED`, enum `ProcessingScenario`, contador na operação e tabela `OperationProcessingAttempt`. Mantém registros e estados anteriores, sem conversão de operações legadas.

Rotas POST de início e resultado estão documentadas em [API.md](./API.md). A tela de detalhes mostra ações do analista, tentativas e auditoria; listagem e painel reconhecem os novos estados e totais.

## Validação

Passaram lint, tipos, schema Prisma e build, 40 testes unitários e 34 de integração. Os testes cobrem início e resultado concorrentes, cenários concorrentes, reenvio após conclusão, falha seguida de nova tentativa, comando antigo após reinício, valores preservados, leitura sem mutação, retomada por outro analista após mudança de função e rollback real em falha de auditoria. HTTP real verifica cookies, os quatro perfis e o ciclo de falha e recuperação.

A conferência visual usou somente contas e registros fictícios no banco descartável: início em desktop, falha automática, nova tentativa em celular e conclusão com histórico anterior preservado. Larguras de 320 e 390 pixels sem rolagem horizontal da página. Contas, registros temporários e servidor de conferência foram removidos/encerrados. Migração aplicada nos bancos locais da aplicação e de testes. O aviso conhecido do `pg` sobre consultas simultâneas no mesmo cliente apareceu sem falhas.
