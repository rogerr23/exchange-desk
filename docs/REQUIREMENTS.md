# Requisitos — ExchangeDesk V1

## 1. Objetivo e limites

Centralizar o cadastro de clientes, as simulações de conversão e o acompanhamento de operações de câmbio da equipe, com histórico e auditoria. Pagamentos e liquidação financeira não são executados pelo sistema.

O ExchangeDesk é uma aplicação de gestão interna, com acesso restrito a funcionários e permissões por perfil. A V1 contempla os fluxos e limites descritos neste documento.

Os requisitos abaixo refletem o escopo fechado. Detalhes apresentados como proposta ou pendência não devem ser tratados como decisões já aprovadas.

Os quatro perfis da V1.1 estão implementados sobre o fluxo de operações da V1. As responsabilidades futuras de propostas, aceite e processamento estão registradas em [V1_1_DECISIONS.md](./V1_1_DECISIONS.md) e ainda dependem de detalhamento.

## 2. Perfis e acesso

Cada funcionário tem exatamente um perfil. Clientes não possuem login. A aplicação representa uma única equipe.

| Ação | Consultor | Analista | Gerente | Administrador |
| --- | --- | --- | --- | --- |
| Cadastrar e listar funcionários | Não | Não | Não | Sim |
| Cadastrar clientes | Sim | Não | Não | Não |
| Consultar clientes | Todos | Todos | Todos | Vinculados a operações |
| Criar simulações e consultar seu histórico | Próprias | Não | Não | Não |
| Criar operações pelo fluxo existente | Sim | Não | Não | Não |
| Consultar operações, totais e auditoria | Próprias | Equipe | Equipe | Equipe, para suporte |
| Alterar status no fluxo existente | Não | Exceto operações criadas por si | Não | Não |

Nenhuma ação é permitida sem sessão. O servidor consulta o perfil atual do funcionário no banco, sem confiar em perfil enviado pelo navegador ou em um JWT antigo. A proibição de analisar operação própria considera a identidade e continua valendo após mudança de função. Listar funcionários retorna somente identificador, nome, e-mail e perfil, sem hash ou senha.

## 3. Requisitos funcionais

### RF01 — Autenticação

- Disponibilizar login e encerramento de sessão com Auth.js.
- Exigir sessão válida para acessar dados e funções internas.
- Identificar o funcionário e seu perfil no servidor.
- Impedir cadastro público de funcionários.

**Aceite:** uma pessoa sem sessão não acessa dados internos; encerrar a sessão remove o acesso autenticado; ações restritas são verificadas no servidor.

O login usa e-mail e senha pelo provider Credentials do Auth.js. A sessão usa JWT gerenciado pelo Auth.js, com `maxAge` de oito horas e renovação conforme o comportamento padrão da biblioteca. Senhas são armazenadas somente como hash Argon2id. Não há login social, MFA ou recuperação por e-mail na V1.

### RF02 — Cadastro de funcionários

- Permitir que somente o administrador cadastre funcionários.
- Associar cada funcionário a um dos quatro perfis, sem acúmulo de funções.
- Dados obrigatórios: nome, e-mail, senha e perfil; o perfil padrão é Consultor de Câmbio.
- Normalizar o e-mail para minúsculas, remover espaços nas extremidades e exigir unicidade.
- Aceitar senhas entre 12 e 128 caracteres, sem regras de composição e sem remover espaços da senha.
- Criar o primeiro administrador por um comando local controlado, com nome, e-mail e senha fornecidos pelo ambiente, sem credenciais fixas. O comando deve recusar execução se já existir um administrador, sem sobrescrever usuários.
- O administrador define a senha ao cadastrar um funcionário e a entrega manualmente para acesso ao sistema; não há envio de e-mail nem convite público.

**Aceite:** o administrador consegue cadastrar um funcionário válido; uma tentativa de cadastro feita por qualquer outro perfil é recusada no servidor, mesmo por acesso direto.

Edição, desativação, recuperação de acesso e gestão de sessões não foram fechadas e não são exigências adicionais da V1 neste documento.

### RF03 — Clientes

- Cadastrar e consultar clientes com nome, CPF, e-mail e telefone.
- Apresentar os dados cadastrais de forma clara para consulta e seleção do cliente.
- Validar os campos no servidor com Zod.
- Permitir selecionar um cliente para registrar uma operação.

**Aceite:** dados obrigatórios ausentes ou inválidos são recusados; um cliente cadastrado pode ser consultado e vinculado a uma operação.

Não há consulta de CPF nem validação dos seus dígitos verificadores. O CPF é um identificador de 11 dígitos único no cadastro: aceitar máscara, removê-la antes de salvar e preservar zeros à esquerda. Nome: 2 a 100 caracteres após remover espaços nas extremidades. E-mail: formato válido, até 254 caracteres, em minúsculas; não é único entre clientes. Telefone: 10 ou 11 dígitos com DDD, sem código de país; aceitar máscara e salvar apenas dígitos, sem unicidade. Os campos são obrigatórios. Usar contatos de exemplo nos ambientes de desenvolvimento e teste. Edição e exclusão de clientes não estão fechadas.

### RF04 — Cotações

- Suportar exclusivamente BRL, USD e EUR.
- Obter dados reais de referência de uma API pública pelo servidor.
- Apresentar o par de moedas, a taxa utilizada, a fonte e o horário da referência.
- Informar indisponibilidade ou ausência de um par sem inventar uma taxa.
- Em falhas de consulta, exibir alerta estilizado junto ao formulário, com mensagem intuitiva e ação “Tentar novamente”, preservando os campos preenchidos. O alerta deve ser acessível e permanecer até nova tentativa ou alteração dos dados, conforme ARCHITECTURE.md. Nunca apresentar cotação fictícia ou resultado substituto como se fossem válidos.

**Aceite:** uma resposta válida da API pode alimentar a simulação; falhas geram uma mensagem compreensível; o usuário consegue identificar a referência utilizada.

O provedor escolhido é Frankfurter v2, consultando a fonte ECB para os seis pares direcionais entre BRL, USD e EUR. As taxas são referências diárias, sem atualização em tempo real. O cache de cotações será de 15 minutos em memória, com timeout de consulta de 5 segundos e sem repetição automática. A simulação terá validade própria de 15 minutos, com conteúdo assinado pelo servidor conforme ARCHITECTURE.md. A data de referência diária deve aparecer separada do horário de consulta; uma data sem hora não deve virar um horário de mercado inventado. Se a API não informar o horário da cotação, mostrar o horário de consulta com esse rótulo, sem apresentá-lo como horário de mercado.

### RF05 — Simulações

- Receber moeda de origem, moeda de destino e valor de origem positivo.
- Recusar moedas fora da lista permitida e conversões entre moedas iguais.
- Calcular o valor estimado de destino: **valor de origem × taxa de conversão**.
- Usar a taxa no sentido origem → destino e mostrar os dados da referência.
- Não aplicar impostos, spread ou tarifas.
- Não criar uma operação apenas por executar uma simulação.

**Aceite:** o resultado corresponde à fórmula e à política decimal definida em ARCHITECTURE.md; entradas inválidas são recusadas; uma simulação isolada não aparece como operação.

Cada simulação bem-sucedida deve persistir um histórico independente por autor. A tela e a API exibem até 50 consultas recentes do escopo do usuário, sem tokens ou chaves internas. Simulações anteriores à implementação não são recuperadas. A referência assinada deve preservar os valores apresentados; assinatura inválida, expiração ou funcionário diferente impedem a confirmação. Uma simulação expirada exige nova simulação e nova confirmação do resultado.

### RF06 — Operações

- Criar uma operação a partir de uma simulação confirmada, vinculada a um cliente e ao funcionário responsável.
- Registrar moedas, valor de origem, valor de destino, taxa, fonte e horário da referência, data de criação e status inicial Pendente.
- Preservar a cotação e os valores registrados, mesmo que o mercado mude depois.
- Listar operações e permitir consultar seus detalhes e histórico de status.
- Impedir registros duplicados por clique repetido ou reenvio da mesma confirmação, inclusive simultâneo. Reenvio válido para o mesmo cliente retorna a operação existente; outro cliente exige nova simulação.
- Na interface, revisar cliente, valores, cotação, referência e validade antes de confirmar; oferecer Voltar e Confirmar operação, bloquear envios durante o carregamento e direcionar aos detalhes após sucesso.
- Aceitar somente as transições abaixo.

| Status atual | Próximo status permitido |
| --- | --- |
| Pendente | Em análise |
| Em análise | Concluída ou Cancelada |
| Concluída | Nenhum |
| Cancelada | Nenhum |

**Aceite:** uma nova operação inicia como Pendente; saltos, regressões e reabertura são recusados; consultar uma operação antiga mantém sua cotação original.

O fluxo fechado não prevê cancelamento direto de Pendente. A V1 não exige edição dos valores nem exclusão de operações.

### RF07 — Histórico e auditoria

- Registrar a criação da operação e cada alteração de status.
- Guardar data e hora, funcionário autor, operação, ação, status anterior e novo status; na criação, o status anterior fica vazio.
- Apresentar os eventos em ordem cronológica nos detalhes da operação, conforme as permissões definidas.
- Não oferecer edição ou exclusão de eventos pela interface.
- Gravar a alteração da operação e seu evento de auditoria na mesma transação.

**Aceite:** toda transição bem-sucedida tem um evento correspondente; uma transição recusada não muda a operação; falha na gravação da auditoria impede a confirmação da alteração.

Auditoria completa de login e de todas as alterações cadastrais não faz parte do mínimo fechado.

## 4. Requisitos técnicos e de qualidade

- Usar Next.js Full Stack, TypeScript, PostgreSQL, Prisma, Auth.js, Zod, Tailwind CSS e Vitest.
- Validar entradas e autorizar ações no servidor, sem depender de botões ocultos.
- Manter segredos e chamadas autenticadas à API de cotação no servidor.
- Usar `Decimal(18,2)` para valores e `Decimal(18,8)` para taxas, com aritmética decimal e `ROUND_HALF_UP`, conforme ARCHITECTURE.md. Valores de entrada aceitam até duas casas; o resultado é arredondado para duas casas após a multiplicação pela taxa normalizada.
- Exibir estados de carregamento, ausência de dados, erro e sucesso em português do Brasil.
- Permitir uso em telas de computador e celular, com campos rotulados e navegação por teclado.
- Manter testes essenciais com Vitest para conversão, transições de status, validações, autorização, falhas do provedor e integridade/expiração da referência de simulação. Sem meta de cobertura, teste por componente ou repetição da mesma regra em várias camadas; a política de execução está em ARCHITECTURE.md.
- Verificar a transação de operação/auditoria e conflitos de atualização em testes de integração com banco de teste.

O painel apresenta as quantidades de operações Pendentes, Em análise, Concluídas e Canceladas, o total de operações e o total de simulações salvas. O consultor vê somente suas operações e simulações; os demais perfis veem operações da equipe, sem histórico de simulações. Inclui cinco operações recentes e, para consultores, cinco simulações próprias, atalhos e orientações sobre cálculo, prazo, referência diária e transições. Os números vêm do banco e exibem zero quando não há registros. Gráficos e a dependência Recharts ficam adiados; não são critérios de conclusão da V1 atual.

## 5. Pendências antes da implementação correspondente

| Decisão | O que falta definir |
| --- | --- |
| Cotações, simulações e operações | Servidor e telas operacionais implementados |
| Interface | Contadores por status aprovados e implementados; gráficos adiados |
| Ambiente | Desenvolvimento local e scripts definidos no README; publicação e escolha de hospedagem adiadas |

## 6. Critério de conclusão da V1

A V1 estará concluída quando as pendências necessárias estiverem resolvidas e registradas, os critérios de aceite forem atendidos e o fluxo completo funcionar: login → cliente → cotação → simulação → operação Pendente → Em análise → Concluída ou Cancelada, com auditoria consistente. O cadastro de funcionários deve permanecer exclusivo do administrador.
