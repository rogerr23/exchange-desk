# Requisitos — ExchangeDesk V1

## 1. Objetivo e limites

Permitir que uma equipe cadastre clientes fictícios, simule conversões e acompanhe operações demonstrativas com auditoria. O sistema não executa transações financeiras reais.

Os requisitos abaixo refletem o escopo fechado. Detalhes apresentados como proposta ou pendência não devem ser tratados como decisões já aprovadas.

## 2. Perfis e acesso

| Perfil | Responsabilidade definida |
| --- | --- |
| Administrador | Acessar o sistema e cadastrar funcionários |
| Operador | Acessar o sistema para trabalhar nos fluxos operacionais |
| Cliente fictício | Ser vinculado às operações; não possui login |

**Proposta a confirmar:** administrador e operador podem cadastrar e consultar clientes, simular conversões, criar operações e alterar seus status. Apenas o administrador pode cadastrar funcionários. A visibilidade das operações de outros funcionários e da auditoria ainda precisa ser definida.

## 3. Requisitos funcionais

### RF01 — Autenticação

- Disponibilizar login e encerramento de sessão com Auth.js.
- Exigir sessão válida para acessar dados e funções internas.
- Identificar o funcionário e seu perfil no servidor.
- Impedir cadastro público de funcionários.

**Aceite:** uma pessoa sem sessão não acessa dados internos; encerrar a sessão remove o acesso autenticado; ações restritas são verificadas no servidor.

O método de login e a estratégia de sessão estão pendentes.

### RF02 — Cadastro de funcionários

- Permitir que somente o administrador cadastre funcionários.
- Associar cada funcionário a um perfil: administrador ou operador.
- Proposta de dados mínimos: nome, e-mail e perfil; credenciais dependem do método de login escolhido.
- Definir uma rotina segura para criar o primeiro administrador.

**Aceite:** o administrador consegue cadastrar um funcionário válido; uma tentativa de cadastro feita por operador é recusada no servidor, mesmo por acesso direto.

Edição, desativação, recuperação de acesso e gestão de sessões não foram fechadas e não são exigências adicionais da V1 neste documento.

### RF03 — Clientes fictícios

- Cadastrar e consultar clientes com nome, CPF fictício, e-mail e telefone.
- Identificar na interface que os dados são fictícios.
- Validar os campos no servidor com Zod.
- Permitir selecionar um cliente para registrar uma operação.

**Aceite:** dados obrigatórios ausentes ou inválidos são recusados; um cliente cadastrado pode ser consultado e vinculado a uma operação.

Não há integração de consulta de CPF. Formato, unicidade e eventual validação de dígitos do CPF fictício precisam ser definidos sem exigir documentos reais. Edição e exclusão de clientes não estão fechadas.

### RF04 — Cotações

- Suportar exclusivamente BRL, USD e EUR.
- Obter dados reais de referência de uma API pública pelo servidor.
- Apresentar o par de moedas, a taxa utilizada, a fonte e o horário da referência.
- Informar indisponibilidade ou ausência de um par sem inventar uma taxa.

**Aceite:** uma resposta válida da API pode alimentar a simulação; falhas geram uma mensagem compreensível; o usuário consegue identificar a referência utilizada.

O provedor, a atualização e a validade das cotações estão pendentes. Se a API não informar o horário da cotação, mostrar o horário de consulta com esse rótulo, sem apresentá-lo como horário de mercado.

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
| Autenticação | Método de login, estratégia de sessão e criação do administrador inicial |
| Permissões | Ações operacionais por perfil, visibilidade entre funcionários e acesso à auditoria |
| Funcionários | Dados finais do cadastro e forma de entrega do acesso |
| Clientes | Formato e unicidade dos campos, especialmente CPF fictício |
| Cotações | Provedor, pares, normalização, prazo de validade, cache e falhas |
| Interface | Conteúdo mínimo do resumo com Recharts |
| Ambiente | Hospedagem e variáveis das integrações; base local e scripts definidos no README |

## 6. Critério de conclusão da V1

A V1 estará concluída quando as pendências necessárias estiverem resolvidas e registradas, os critérios de aceite forem atendidos e o fluxo completo funcionar: login → cliente fictício → cotação → simulação → operação Pendente → Em análise → Concluída ou Cancelada, com auditoria consistente. O cadastro de funcionários deve permanecer exclusivo do administrador.
