# ExchangeDesk — Guia do usuário por perfil e seção

Atualizado em 1º de novembro de 2026.

Este guia descreve as telas disponíveis, o que você encontra em cada uma e como usar suas funções. Ele também serve como referência do funcionamento atual para orientar futuras mudanças nas seções do sistema.

## Índice

- [1. Conheça o fluxo de atendimento](#1-conheça-o-fluxo-de-atendimento)
- [2. Acesso e navegação](#2-acesso-e-navegação)
- [3. Como trabalhar com cada perfil](#3-como-trabalhar-com-cada-perfil)
- [4. Início — sua área de trabalho](#4-início--sua-área-de-trabalho)
- [5. Clientes — consultar e cadastrar](#5-clientes--consultar-e-cadastrar)
- [6. Simulações — consultar valores e criar uma proposta](#6-simulações--consultar-valores-e-criar-uma-proposta)
- [7. Propostas — revisar valores e registrar o aceite](#7-propostas--revisar-valores-e-registrar-o-aceite)
- [8. Solicitações — acompanhar e decidir a análise](#8-solicitações--acompanhar-e-decidir-a-análise)
- [9. Operações — acompanhar o processamento e o histórico](#9-operações--acompanhar-o-processamento-e-o-histórico)
- [10. Indicadores — entender o andamento dos atendimentos](#10-indicadores--entender-o-andamento-dos-atendimentos)
- [11. Funcionários — cadastrar e gerenciar acessos](#11-funcionários--cadastrar-e-gerenciar-acessos)
- [12. Mensagens e dúvidas durante o uso](#12-mensagens-e-dúvidas-durante-o-uso)
- [13. Referência para próximas mudanças nas seções](#13-referência-para-próximas-mudanças-nas-seções)

## 1. Conheça o fluxo de atendimento

O atendimento segue esta sequência:

**Simulação → Proposta → Aceite simulado → Solicitação para análise → Operação → Processamento simulado.**

| Etapa | O que acontece | Quem conduz |
| --- | --- | --- |
| Simulação | Consulta uma referência de conversão entre moedas. | Consultor de Câmbio |
| Proposta | Registra os valores da simulação para um cliente. | Consultor de Câmbio |
| Aceite simulado | Confirma o aceite dentro da validade e gera uma solicitação para análise. | Consultor que criou a proposta |
| Solicitação | Permite aprovar ou rejeitar o atendimento. | Analista de Operações |
| Operação | É criada quando a solicitação é aprovada. | Acompanhamento pelos perfis autorizados |
| Processamento simulado | Registra uma tentativa com resultado de sucesso ou falha. | Analista de Operações |

Criar uma proposta não cria uma operação. Registrar o aceite gera uma solicitação; a operação nasce após a aprovação do analista.

O sistema acompanha o atendimento e preserva seu histórico. Os aceites e processamentos são simulados: nenhum pagamento, transferência ou liquidação financeira é executado.

## 2. Acesso e navegação

Entre com o e-mail e a senha fornecidos pelo administrador. Se você ainda não possui acesso, solicite o cadastro a ele.

No computador, use o menu lateral. No celular, toque em **Menu de navegação** para abrir as opções. A seção em uso fica destacada.

O menu é organizado em quatro grupos:

| Grupo | Seções |
| --- | --- |
| Seu espaço | Início |
| Atendimento | Clientes, Simulações e Propostas, conforme o perfil |
| Acompanhamento | Solicitações, Operações e Indicadores |
| Administração | Funcionários, exclusivo do administrador |

Seu nome e perfil aparecem no cabeçalho. Use **Sair** para encerrar o acesso.

### Seções disponíveis por perfil

| Seção | Consultor de Câmbio | Analista de Operações | Gerente | Administrador |
| --- | --- | --- | --- | --- |
| Início | Próprios atendimentos | Atendimentos da equipe | Atendimentos da equipe | Atendimentos da equipe e atalho para acessos |
| Clientes | Consulta todos e cadastra | Consulta todos | Consulta todos | Consulta clientes com operações |
| Simulações e histórico | Faz simulações e consulta o próprio histórico | Não disponível | Não disponível | Não disponível |
| Propostas | Cria, consulta as próprias e registra o aceite | Consulta propostas que já geraram solicitação | Consulta as propostas da equipe | Consulta as propostas da equipe |
| Solicitações | Consulta as próprias | Consulta e decide sobre solicitações da equipe, respeitando a autoria | Consulta as solicitações da equipe | Consulta as solicitações da equipe |
| Operações | Consulta as próprias | Consulta e conduz o fluxo operacional, respeitando a autoria | Consulta as operações da equipe | Consulta as operações da equipe |
| Indicadores | Próprios registros | Visão operacional da equipe | Visão da equipe | Visão da equipe |
| Funcionários | Não disponível | Não disponível | Não disponível | Cadastra e gerencia acessos |

Cada funcionário possui um único perfil. O perfil de administrador é voltado à gestão de acessos e suporte; ele não permite simular, registrar aceites, aprovar solicitações ou processar operações.

## 3. Como trabalhar com cada perfil

### Consultor de Câmbio

Seu foco é iniciar o atendimento e acompanhar seu andamento.

1. No **Início**, confira as propostas aguardando aceite e os atendimentos em andamento.
2. Em **Clientes**, consulte o cadastro ou use **Novo cliente**.
3. Use **Nova simulação**, escolha as moedas e informe o valor.
4. Revise o resultado, selecione o cliente e crie a proposta.
5. Na proposta, registre o aceite simulado antes de vencer o prazo.
6. Acompanhe a decisão em **Solicitações** e, após a aprovação, o andamento em **Operações**.
7. Consulte **Indicadores** quando precisar entender a evolução dos seus registros.

Você pode consultar os clientes cadastrados da equipe. As propostas, solicitações, operações e informações dos indicadores ficam limitadas aos seus próprios registros.

### Analista de Operações

Seu foco é analisar solicitações e dar continuidade às operações aprovadas.

1. No **Início**, use **Analisar solicitações** ou abra um item da fila.
2. Confira o cliente, os valores e a proposta de origem.
3. Escolha aprovar ou rejeitar a solicitação. Na rejeição, informe o motivo.
4. Após aprovar, abra a operação gerada.
5. Escolha o cenário e inicie o processamento simulado.
6. Acompanhe o resultado. Se houver falha, poderá iniciar uma nova tentativa.
7. Use **Indicadores** para consultar entradas na análise, pendências, conclusões, falhas e tempos de espera.

Você não pode decidir sobre uma solicitação nem processar uma operação de sua própria autoria, mesmo que tenha mudado de perfil depois de criá-la.

### Gerente

Seu foco é acompanhar o trabalho da equipe e identificar pontos de atenção.

1. No **Início**, confira solicitações aguardando análise e operações em andamento.
2. Use **Clientes**, **Propostas**, **Solicitações** e **Operações** para consultar os registros e seus detalhes.
3. Em **Indicadores**, escolha um período para acompanhar as entradas, as conclusões e as pendências.
4. Abra os cartões ou as solicitações mais antigas para entender os registros que compõem os números.

O gerente consulta informações e históricos. Não cadastra clientes ou funcionários, não faz simulações e não altera as decisões ou o processamento.

### Administrador

Seu foco é manter os acessos da equipe e consultar registros para suporte.

1. No **Início**, use **Gerenciar acessos** para abrir **Funcionários**.
2. Cadastre funcionários e atribua o perfil correspondente à função de cada um.
3. Nos detalhes do funcionário, altere o perfil ou a situação do acesso quando necessário.
4. Consulte o histórico de alterações de acesso para saber quem fez cada mudança.
5. Use **Propostas**, **Solicitações**, **Operações** e **Indicadores** para investigar dúvidas da equipe.

Em **Clientes**, este perfil vê apenas clientes que possuem operações registradas. Não há cadastro de clientes para o administrador.

## 4. Início — sua área de trabalho

### Para que serve

Retomar atendimentos e encontrar o próximo passo do trabalho diário. Os contadores gerais ficam em **Indicadores**.

### O que você encontra

| Área | Conteúdo e uso |
| --- | --- |
| Ação principal | **Nova simulação** para o consultor, **Analisar solicitações** para o analista, **Acompanhar operações** para o gerente e **Gerenciar acessos** para o administrador. |
| Seus próximos passos | Visível ao consultor. Reúne propostas válidas aguardando aceite, solicitações aguardando análise e operações em andamento. |
| No radar da equipe | Visível aos demais perfis. Reúne solicitações aguardando análise e operações em andamento da equipe. |
| Operações recentes | Até cinco operações mais recentes, com cliente, valores, data e situação. Clique no registro para abrir os detalhes. |
| Acesso rápido | Atalhos para clientes e para o histórico de simulações ou propostas, conforme o perfil. |
| Os números, quando precisar | Atalho para **Indicadores**. |
| Como funciona o atendimento | Explicação recolhida do fluxo. Clique no título para expandir. |

As filas mostram até cinco registros por grupo. Propostas aparecem pela validade mais próxima; solicitações, pelo envio mais antigo; operações em andamento, pela atualização mais antiga.

As operações para acompanhar podem estar pendentes, em análise, processando ou com falha. Quando não há itens nesses grupos, aparece **Tudo em dia por aqui**. Isso não significa que o sistema não tenha histórico: as listas completas continuam disponíveis pelo menu.

## 5. Clientes — consultar e cadastrar

### O que você encontra

A listagem apresenta nome, CPF, e-mail e telefone dos clientes. O consultor também encontra a ação **Simular conversão** em cada cadastro.

### Como cadastrar um cliente — consultor

1. Abra **Clientes** e clique em **Novo cliente**.
2. Preencha nome completo, CPF, e-mail e telefone com DDD.
3. Clique em **Cadastrar cliente**.
4. Aguarde a confirmação e localize o cadastro na lista.

Todos os campos são obrigatórios. Se o CPF já estiver cadastrado, consulte a lista antes de tentar cadastrar novamente.

### Como iniciar um atendimento pelo cadastro

No cadastro desejado, clique em **Simular conversão**. Você será levado à simulação com esse cliente pré-selecionado para a criação da proposta.

Na versão atual, a seção permite consultar os cadastros e, para o consultor, criar novos. Não oferece edição ou exclusão de clientes pela interface.

## 6. Simulações — consultar valores e criar uma proposta

**Disponível para:** Consultor de Câmbio.

### O que você encontra

Campos para moeda de origem, moeda de destino e valor de origem. As moedas disponíveis são real (BRL), dólar (USD) e euro (EUR).

### Como simular

1. Abra **Simulações** ou clique em **Nova simulação** no Início.
2. Escolha as moedas de origem e destino.
3. Informe o valor de origem. Use vírgula ou ponto para os centavos, sem separador de milhar: por exemplo, `1500,50`.
4. Clique em **Simular conversão**.
5. Confira os valores, a taxa, a fonte, a data da referência e a consulta realizada.

As cotações são referências diárias, sem atualização em tempo real. O cálculo não inclui tarifas, spread ou impostos.

### Como criar a proposta

1. No resultado da simulação, selecione o **Cliente da proposta**.
2. Confira os dados e o prazo restante.
3. Clique em **Criar proposta**.
4. Na tela seguinte, revise a proposta e siga para o aceite simulado, se estiver tudo correto.

O prazo é de **15 minutos contados desde a simulação**. Criar a proposta não reinicia essa contagem. Se a simulação expirar, faça uma nova consulta e revise os novos valores.

Se não houver clientes disponíveis, use o link **Novo cliente**. Se houver dúvida sobre o resultado de um envio, consulte **Propostas** antes de iniciar outro atendimento.

### Histórico de simulações

Abra pelo botão **Ver histórico de simulações**, na seção Simulações, ou pelo atalho do Início.

O histórico mostra até 50 simulações mais recentes feitas por você, incluindo consultas que não viraram propostas. Cada item apresenta moedas, valores, taxa, fonte e data de referência.

- Expanda **Consulta e validade original** para conferir as datas da consulta e do prazo original.
- Use **Ver proposta** quando houver uma proposta vinculada.
- Em registros antigos com operação vinculada diretamente, pode aparecer **Ver operação registrada**.
- Use **Simular novamente** para preencher moedas e valor em uma nova consulta. É necessário simular outra vez e conferir o resultado atual.

Consultar o histórico não renova a validade original.

## 7. Propostas — revisar valores e registrar o aceite

### O que você encontra

A listagem apresenta cliente, valores, data de criação, responsável quando aplicável e situação da proposta. Clique no nome do cliente para abrir os detalhes.

Nos detalhes estão os valores de origem e destino, taxa aplicada, fonte, datas da referência e da consulta, consultor responsável, prazo para aceite e histórico da proposta.

### Como interpretar as situações

| Situação | Significado |
| --- | --- |
| Aguardando aceite | A proposta ainda está válida e o aceite não foi registrado. |
| Aceita | O aceite simulado foi registrado e uma solicitação foi gerada. Consulte a solicitação para saber a decisão da análise. |
| Expirada | O prazo terminou sem aceite. É necessário fazer uma nova simulação e criar outra proposta. |

Uma proposta **Aceita** ainda pode estar com sua solicitação aguardando análise, aprovada ou rejeitada. A situação da proposta indica o aceite; a decisão fica em **Solicitações**.

### Como registrar o aceite — consultor autor

1. Abra uma proposta criada por você e que ainda esteja válida.
2. Confira os dados e a contagem do prazo restante.
3. Marque a confirmação do aceite simulado.
4. Clique em **Registrar aceite simulado**.
5. Acompanhe a solicitação gerada para análise.

Se o aceite já foi registrado, use **Ver solicitação**. Se a proposta expirou, use **Nova simulação**.

Analistas consultam apenas propostas que já geraram solicitação. Gerentes e administradores consultam as propostas da equipe. O aceite é registrado pelo consultor autor.

## 8. Solicitações — acompanhar e decidir a análise

### O que você encontra

A lista mostra cliente, valores aceitos, data de envio, consultor e situação. Nos detalhes, você encontra a proposta de origem e, quando houver decisão, o responsável, a data e o motivo da rejeição.

| Situação | Significado |
| --- | --- |
| Aguardando análise | O aceite foi registrado e falta a decisão do analista. |
| Aprovada | A análise foi aprovada e uma operação foi gerada. |
| Rejeitada | A análise foi encerrada com um motivo e sem gerar operação. |

### Como aprovar ou rejeitar — analista

1. Abra uma solicitação **Aguardando análise**.
2. Confira o cliente, os valores e os dados da proposta.
3. No campo **Decisão**, escolha aprovar ou rejeitar.
4. Se rejeitar, preencha o **Motivo da rejeição**.
5. Marque a confirmação de que conferiu os dados.
6. Clique em **Confirmar aprovação** ou **Confirmar rejeição**.
7. Se aprovar, use **Ver operação gerada** para continuar o atendimento.

A decisão registrada não pode ser alterada por essa tela. A aprovação cria uma única operação. O analista não pode decidir uma solicitação de sua própria autoria.

Consultores acompanham suas solicitações. Gerentes e administradores consultam as da equipe, sem registrar decisões.

Após o aceite, o prazo original da proposta não impede a consulta ou a análise da solicitação: os valores aceitos permanecem preservados.

## 9. Operações — acompanhar o processamento e o histórico

### O que você encontra

Na lista estão cliente, valores, moedas, data, responsável quando aplicável e situação. Clique no cliente ou na seta para abrir o registro.

Nos detalhes, consulte:

- Valores registrados, taxa aplicada, fonte e datas da referência e da consulta.
- Dados do cliente e responsável pelo registro.
- Solicitação aprovada e proposta de origem, quando vinculadas.
- Tentativas de processamento, com cenário, responsável, início, resultado e motivo da falha, quando houver.
- **Histórico e auditoria**, com criação e alterações em ordem cronológica.

### Como interpretar as situações

| Situação | Significado |
| --- | --- |
| Pendente | A operação foi criada e aguarda continuidade. |
| Em análise | Uma operação do fluxo antigo está em conferência antes de ser encerrada. |
| Processando | Existe uma tentativa de processamento simulado em andamento. |
| Falha no processamento | A tentativa falhou; o analista pode iniciar outra tentativa no fluxo de processamento simulado. |
| Concluída | O fluxo foi encerrado com sucesso. |
| Cancelada | O registro foi encerrado sem conclusão no fluxo antigo. |

### Como processar uma operação aprovada — analista

1. Abra a operação gerada pela aprovação da solicitação.
2. No painel **Processamento simulado**, escolha **Simular sucesso** ou **Simular falha**.
3. Marque a confirmação do início da tentativa.
4. Clique em **Iniciar processamento simulado**.
5. Aguarde a consulta automática do resultado na própria tela.

Se a tentativa falhar, escolha o cenário, confirme novamente e use **Iniciar nova tentativa**. A nova tentativa preserva a operação, os valores aprovados e as tentativas anteriores.

Se a conexão for interrompida, volte à operação. Use **Consultar ou retomar resultado** para consultar a mesma tentativa em andamento, sem iniciar outra.

Operações de autoria do próprio analista não podem ser processadas por ele. Operações concluídas não oferecem uma nova tentativa.

### Como lidar com registros do fluxo antigo — analista

Algumas operações podem não ter uma solicitação vinculada. Nesses registros, a tela pode apresentar o painel **Próximo passo**:

1. Se estiver **Pendente**, use **Enviar para análise**.
2. Se estiver **Em análise**, confira os dados e escolha **Concluir operação** ou **Cancelar operação**.
3. Confirme a alteração solicitada.

Estados finais não podem ser reabertos por esse painel. O histórico continua disponível. A restrição de autoria também se aplica à análise desses registros.

## 10. Indicadores — entender o andamento dos atendimentos

### Para que serve

Consultar os números quando necessário, observar a evolução do trabalho e investigar pendências. O Início permanece focado nos atendimentos do dia a dia.

### O que muda por perfil

| Perfil | Registros considerados | Primeiro cartão e gráfico |
| --- | --- | --- |
| Consultor de Câmbio | Apenas seus próprios registros | Propostas criadas |
| Analista de Operações | Registros da equipe | Solicitações recebidas |
| Gerente | Registros da equipe | Propostas criadas |
| Administrador | Registros da equipe | Propostas criadas |

Os demais cartões são **Aguardando análise**, **Operações concluídas** e **Falhas pendentes**. A seção também apresenta evolução e espera por análise. Na versão atual, não há indicadores específicos de acessos de funcionários nesta página.

### Como escolher o período

1. Abra **Indicadores** pelo menu ou pelo atalho do Início.
2. Use **7 dias**, **30 dias** ou **90 dias** para uma consulta rápida. Esses períodos incluem o dia atual.
3. Para outro intervalo, preencha **De** e **Até** e clique em **Aplicar período**.
4. Confira as datas e o alcance da consulta: **Somente seus registros** ou **Toda a equipe**.

A consulta inicial mostra os últimos 30 dias. O intervalo personalizado pode ter até 90 dias, deve estar em ordem e não pode incluir datas futuras. As datas inicial e final são incluídas, em horário de Brasília.

Se o intervalo for inválido, a página informa o problema e mostra os últimos 30 dias para você poder corrigir a seleção.

### O que cada cartão significa

| Cartão | O que entra na contagem | O que abre ao clicar |
| --- | --- | --- |
| Propostas criadas | Propostas criadas dentro do período. Aparece para consultor, gerente e administrador. | Propostas criadas no intervalo. |
| Solicitações recebidas | Solicitações enviadas para análise dentro do período. Substitui o primeiro cartão para o analista. | Solicitações recebidas no intervalo. |
| Aguardando análise | Solicitações recebidas no período que continuam aguardando análise no momento da consulta. | Solicitações do período ainda pendentes. |
| Operações concluídas | Operações com conclusão registrada no histórico dentro do período, mesmo que tenham sido criadas antes. | Operações com evento de conclusão no intervalo. |
| Falhas pendentes | Operações ainda em falha, com uma falha registrada dentro do período. | Operações que atendem a essas duas condições. |

Cada operação é contada uma única vez em cada cartão. Várias tentativas de falha da mesma operação não aumentam o cartão **Falhas pendentes**. Se a operação voltar a processar ou for concluída, ela deixa de fazer parte das falhas pendentes.

**Exemplo:** uma operação criada em outubro e concluída em novembro aparece nas conclusões de novembro. Uma solicitação recebida em outubro que continua pendente não aparece na contagem de pendências de um período que abrange apenas novembro.

Os cartões medem etapas diferentes. Não some os números para calcular um total de atendimentos e não use a divisão entre eles como taxa de conversão.

### Como investigar um número

1. Clique no cartão ou em **Ver registros**.
2. Na listagem aberta, confira a faixa com o critério e as datas aplicadas.
3. Clique no cliente para abrir o registro e consultar seus detalhes.
4. Na listagem, use **Voltar aos indicadores** para retornar ao mesmo período.
5. Use **Limpar filtro** se quiser voltar à listagem completa permitida para seu perfil.

As situações podem mudar entre a consulta dos indicadores e a abertura da lista, por exemplo, se outro funcionário concluir uma análise nesse intervalo.

### Evolução dos atendimentos

O gráfico mostra a distribuição das entradas pela data de criação: propostas para consultor, gerente e administrador; solicitações para analista.

- Em períodos de até 14 dias, cada coluna representa um dia.
- Em períodos maiores, cada coluna reúne até sete dias a partir do início do intervalo. A última coluna pode ter menos dias.
- O número acima de cada coluna mostra quantos registros entraram naquele intervalo.
- Use **Ver dados do gráfico** para abrir uma tabela com as datas e os valores exatos.

Ao comparar colunas, confira se representam intervalos de mesma duração. Uma última coluna com menos dias não deve ser interpretada, sozinha, como queda no movimento.

Se não houver entradas, a página informa que não existem registros no período. Você pode escolher outro intervalo.

### Espera por análise

Esse painel considera apenas solicitações recebidas no período selecionado que continuam pendentes no momento da consulta.

| Informação | Como interpretar |
| --- | --- |
| Espera média atual | Média do tempo que essas solicitações estão aguardando desde o envio. |
| Maior espera | Tempo de espera da solicitação mais antiga dentro desse grupo. |
| Há mais tempo na fila | Até três solicitações mais antigas do grupo, com cliente, envio e tempo de espera. Clique para abrir os detalhes. |
| Ver solicitações pendentes | Abre a lista das solicitações do período que continuam aguardando análise. |

A espera inclui noites e fins de semana. Ela não representa o tempo que a equipe levou para decidir solicitações já aprovadas ou rejeitadas.

Se não houver pendências no período, o painel mostra uma mensagem específica. Ainda podem existir pendências recebidas fora do intervalo escolhido; consulte **Solicitações** sem filtro para conferir a lista completa permitida ao seu perfil.

### Como interpretar esta consulta

Expanda esse bloco no fim da página para rever os critérios e conferir a data e o horário da consulta. Os números refletem o estado dos registros no momento em que a página foi carregada; para consultar novamente, recarregue a página ou aplique o período outra vez.

## 11. Funcionários — cadastrar e gerenciar acessos

**Disponível para:** Administrador.

### O que você encontra

A lista apresenta nome, e-mail, perfil e situação de cada funcionário. Use **Gerenciar** ou **Gerenciar acesso** para abrir os detalhes.

### Como cadastrar um funcionário

1. Abra **Funcionários** e clique em **Novo funcionário**.
2. Preencha nome e e-mail.
3. Escolha o **Perfil de acesso** de acordo com a função na equipe.
4. Informe e confirme a **Senha inicial**, com 12 a 128 caracteres.
5. Clique em **Criar funcionário**.

Após a confirmação, o acesso já pode ser utilizado com as credenciais cadastradas.

### Como alterar perfil, desativar ou reativar

1. Abra o funcionário pelo link de gerenciamento.
2. Escolha o **Perfil de acesso** e a **Situação do acesso** desejados.
3. Confira o resumo da mudança exibido na tela.
4. Marque a confirmação.
5. Clique em **Confirmar alteração de acesso**.
6. Confira a situação atual e o **Histórico de alterações de acesso**.

| Mudança | Efeito para o funcionário |
| --- | --- |
| Troca de perfil | Substitui o perfil atual e atualiza as permissões nas próximas ações, inclusive em sessões abertas. |
| Desativação | Bloqueia novos acessos e o uso das sessões já abertas. Preserva os registros e o histórico do funcionário. |
| Reativação | Permite entrar novamente com a senha existente. É necessário fazer um novo login; as sessões anteriores à desativação continuam bloqueadas. |

Você não pode alterar o próprio perfil nem desativar a própria conta. Peça a outro administrador quando precisar dessas mudanças no seu acesso.

O histórico informa a alteração, quem a realizou e quando ocorreu. A tela atual não oferece exclusão de funcionários ou redefinição de senha.

## 12. Mensagens e dúvidas durante o uso

| Situação | Como continuar |
| --- | --- |
| Um campo está destacado com erro | Leia a mensagem próxima ao campo, corrija o valor e envie novamente. |
| Uma seção ou ação não aparece | Confira seu perfil no cabeçalho e consulte a tabela deste guia. Nem todas as funções estão disponíveis a todos os perfis. |
| O sistema pede para entrar novamente | Faça login. Se não conseguir, consulte o administrador sobre a situação do seu acesso. |
| A simulação ou proposta expirou | Faça uma nova simulação, revise os valores e crie outra proposta. |
| A decisão ou o acesso mudou enquanto você estava na tela | Atualize os dados e confira a situação atual antes de continuar. |
| O resultado de um envio ficou incerto | Consulte a lista e o histórico correspondente antes de iniciar outro atendimento. Em processamento, retome a tentativa na própria operação. |
| Um número dos indicadores parece diferente da lista completa | Confira período, perfil e critério do cartão. A lista completa pode conter registros fora desse recorte. |
| Não há itens no Início, mas existem registros nas outras seções | O Início mostra filas curtas de trabalho e operações recentes. Propostas expiradas, decisões e operações encerradas continuam nas respectivas listas. |

## 13. Referência para próximas mudanças nas seções

Este documento registra o que já está disponível. Funcionalidades novas devem ser incorporadas aqui quando forem implementadas.

Ao propor uma mudança, use estas perguntas para descrever a experiência desejada:

1. Qual seção e qual perfil precisam da mudança?
2. O que a pessoa quer fazer ao entrar nessa tela?
3. Que informação precisa aparecer primeiro?
4. O que pode ficar em detalhes, filtros ou ajuda recolhida?
5. Qual é a ação principal e qual será o próximo passo depois dela?
6. Como a tela deve se comportar quando não há registros, há uma pendência ou ocorre um erro?
7. Como essa mudança afeta os outros perfis e o uso no celular?

Para localizar rapidamente o comportamento atual, consulte o capítulo da seção correspondente. Em **Indicadores**, por exemplo, este guia descreve os filtros, os cartões, o gráfico, as esperas e os caminhos para investigar os registros.
