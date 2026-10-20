# Requisitos — ExchangeDesk V1

## 1. Objetivo e limites

Permitir que uma equipe cadastre clientes fictícios, simule conversões e acompanhe operações demonstrativas com auditoria. O sistema não executa transações financeiras reais.

Este é um projeto pessoal de estudo e portfólio, voltado a demonstrar organização, regras de negócio e testes essenciais. Os cadastros devem usar dados fictícios; não há objetivo de operar um serviço financeiro comercial.

Os requisitos abaixo refletem o escopo fechado. Detalhes apresentados como proposta ou pendência não devem ser tratados como decisões já aprovadas.

## 2. Perfis e acesso

| Perfil | Responsabilidade definida |
| --- | --- |
| Administrador | Acessar o sistema e cadastrar funcionários |
| Operador | Acessar o sistema para trabalhar nos fluxos operacionais |
| Cliente fictício | Ser vinculado às operações; não possui login |

A V1 representa uma única equipe, sem separação por empresa ou por carteira de clientes.

| Ação | Administrador | Operador |
| --- | --- | --- |
| Cadastrar e listar funcionários | Sim | Não |
| Cadastrar e consultar clientes fictícios | Sim | Sim |
| Simular conversões | Sim | Sim |
| Criar e consultar operações de toda a equipe | Sim | Sim |
| Alterar status de qualquer operação, respeitando o fluxo | Sim | Sim |
| Consultar auditoria das operações da equipe | Sim | Sim |

Nenhuma dessas ações é permitida sem sessão. O perfil usado para autorizar vem da sessão verificada no servidor, nunca de um campo enviado pelo navegador. Listar funcionários retorna apenas identificador, nome, e-mail e perfil; nunca hash ou senha.

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
- Associar cada funcionário a um perfil: administrador ou operador.
- Dados obrigatórios: nome, e-mail, senha e perfil; o perfil padrão é operador.
- Normalizar o e-mail para minúsculas, remover espaços nas extremidades e exigir unicidade.
- Aceitar senhas entre 12 e 128 caracteres, sem regras de composição e sem remover espaços da senha.
- Criar o primeiro administrador por um comando local controlado, com nome, e-mail e senha fornecidos pelo ambiente, sem credenciais fixas. O comando deve recusar execução se já existir um administrador, sem sobrescrever usuários.
- O administrador define a senha ao cadastrar um funcionário e a entrega manualmente para uso no projeto pessoal; não há envio de e-mail nem convite público.

**Aceite:** o administrador consegue cadastrar um funcionário válido; uma tentativa de cadastro feita por operador é recusada no servidor, mesmo por acesso direto.

Edição, desativação, recuperação de acesso e gestão de sessões não foram fechadas e não são exigências adicionais da V1 neste documento.

### RF03 — Clientes fictícios

- Cadastrar e consultar clientes com nome, CPF fictício, e-mail e telefone.
- Identificar na interface que os dados são fictícios.
- Validar os campos no servidor com Zod.
- Permitir selecionar um cliente para registrar uma operação.

**Aceite:** dados obrigatórios ausentes ou inválidos são recusados; um cliente cadastrado pode ser consultado e vinculado a uma operação.

Não há consulta de CPF nem validação dos seus dígitos verificadores. O CPF fictício é um identificador de 11 dígitos único no cadastro: aceitar máscara, removê-la antes de salvar e preservar zeros à esquerda. Nome: 2 a 100 caracteres após remover espaços nas extremidades. E-mail: formato válido, até 254 caracteres, em minúsculas; não é único entre clientes. Telefone fictício: 10 ou 11 dígitos com DDD, sem código de país; aceitar máscara e salvar apenas dígitos, sem unicidade. Os campos são obrigatórios. Usar contatos de exemplo nos dados de demonstração. Edição e exclusão de clientes não estão fechadas.

### RF04 — Cotações

- Suportar exclusivamente BRL, USD e EUR.
- Obter dados reais de referência de uma API pública pelo servidor.
- Apresentar o par de moedas, a taxa utilizada, a fonte e o horário da referência.
- Informar indisponibilidade ou ausência de um par sem inventar uma taxa.

**Aceite:** uma resposta válida da API pode alimentar a simulação; falhas geram uma mensagem compreensível; o usuário consegue identificar a referência utilizada.

O provedor escolhido é Frankfurter v2, consultando a fonte ECB para os seis pares direcionais entre BRL, USD e EUR. As taxas são referências diárias, sem atualização em tempo real. Cache e validade para confirmar uma simulação serão definidos na etapa 4. A data de referência diária deve aparecer separada do horário de consulta; uma data sem hora não deve virar um horário de mercado inventado. Se a API não informar o horário da cotação, mostrar o horário de consulta com esse rótulo, sem apresentá-lo como horário de mercado.

### RF05 — Simulações

- Receber moeda de origem, moeda de destino e valor de origem positivo.
- Recusar moedas fora da lista permitida e conversões entre moedas iguais.
- Calcular o valor estimado de destino: **valor de origem × taxa de conversão**.
- Usar a taxa no sentido origem → destino e mostrar os dados da referência.
- Não aplicar impostos, spread ou tarifas.
- Não criar uma operação apenas por executar uma simulação.

**Aceite:** o resultado corresponde à fórmula e à política decimal definida em ARCHITECTURE.md; entradas inválidas são recusadas; uma simulação isolada não aparece como operação.

Não é obrigatório persistir um histórico de simulações independentes.

### RF06 — Operações

- Criar uma operação a partir de uma simulação confirmada, vinculada a um cliente e ao funcionário responsável.
- Registrar moedas, valor de origem, valor de destino, taxa, fonte e horário da referência, data de criação e status inicial Pendente.
- Preservar a cotação e os valores registrados, mesmo que o mercado mude depois.
- Listar operações e permitir consultar seus detalhes e histórico de status.
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

- Usar Next.js Full Stack, TypeScript, PostgreSQL, Prisma, Auth.js, Zod, Tailwind CSS, Recharts e Vitest.
- Validar entradas e autorizar ações no servidor, sem depender de botões ocultos.
- Manter segredos e chamadas autenticadas à API de cotação no servidor.
- Usar `Decimal(18,2)` para valores e `Decimal(18,8)` para taxas, com aritmética decimal e `ROUND_HALF_UP`, conforme ARCHITECTURE.md. Valores de entrada aceitam até duas casas; o resultado é arredondado para duas casas após a multiplicação pela taxa normalizada.
- Exibir estados de carregamento, ausência de dados, erro e sucesso em português do Brasil.
- Permitir uso em telas de computador e celular, com campos rotulados e navegação por teclado.
- Cobrir com Vitest conversão, transições de status, validações, autorização e tratamento de respostas do provedor.
- Verificar a transação de operação/auditoria e conflitos de atualização em testes de integração com banco de teste.

Recharts está definido na stack. **Proposta a confirmar:** um resumo de quantidade de operações por status usando os próprios dados do sistema, sem criar um requisito de histórico de mercado.

## 5. Pendências antes da implementação correspondente

| Decisão | O que falta definir |
| --- | --- |
| Cotações | Normalização do adaptador, prazo de validade, cache, timeout e falhas; provedor e pares definidos |
| Interface | Conteúdo mínimo do resumo com Recharts |
| Ambiente | Hospedagem e variáveis das integrações; base local e scripts definidos no README |

## 6. Critério de conclusão da V1

A V1 estará concluída quando as pendências necessárias estiverem resolvidas e registradas, os critérios de aceite forem atendidos e o fluxo completo funcionar: login → cliente fictício → cotação → simulação → operação Pendente → Em análise → Concluída ou Cancelada, com auditoria consistente. O cadastro de funcionários deve permanecer exclusivo do administrador.
