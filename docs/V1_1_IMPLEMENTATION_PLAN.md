# Plano de implementação — ExchangeDesk V1.1

As responsabilidades e os escopos aprovados estão em [V1_1_DECISIONS.md](./V1_1_DECISIONS.md). A gestão de acessos está detalhada em [V1_1_ACCESS_MANAGEMENT.md](./V1_1_ACCESS_MANAGEMENT.md). Este plano separa a base verificada, a preparação técnica e as decisões ainda necessárias. Os quatro perfis já estão implementados sobre os estados operacionais da V1; propostas, aceite e solicitações aguardando análise estão implementados; decisão do analista e processamento simulado com recuperação estão implementados.

## 1. Referência da V1

Conferência realizada em 31/10/2026, a partir do commit `1cfd0c6`, com árvore de trabalho inicialmente limpa.

| Item | Resultado local |
| --- | --- |
| Ambiente | Node.js 22.14.0; PostgreSQL do Compose iniciado e saudável |
| Migrações da aplicação | As três aplicadas, concluídas e sem rollback; checksums iguais aos arquivos versionados |
| Funcionários | Um `ADMIN`; nenhum `OPERATOR` |
| Dados operacionais | Nenhum cliente, simulação, operação ou evento de auditoria |
| Operações legadas abertas | Nenhuma neste banco |
| Banco de testes | A migração `20261031183000_operator_workspace` estava pendente e foi aplicada exclusivamente no banco descartável |

A consulta ao banco da aplicação foi feita em transação de leitura, usando apenas contagens e metadados de migrações. Não foram alterados funcionários ou dados operacionais. O inventário é uma fotografia deste ambiente; não define a migração de outros bancos nem substitui uma cópia de segurança antes de futuras alterações.

Validação da referência: lint, tipos, schema Prisma e build passaram; 40 testes unitários e 17 testes de integração passaram. A integração utilizou exclusivamente o banco descartável e verificou também login e permissões por HTTP real. Houve aviso de depreciação do `pg` sobre consultas simultâneas no mesmo cliente, sem falha na execução. Esta etapa não realizou nova conferência visual das telas.

As migrações existentes são `20261020190000_init`, `20261031183000_operator_workspace` e `20261031200000_operation_confirmation`. No banco local, a migração de histórico foi aplicada depois da migração de confirmação; ambas estão concluídas. Não renomear ou editar migrações já aplicadas. A evolução usará novas migrações.

### Comportamento preservado como referência

- `ADMIN` pode executar as ações operacionais e gerenciar funcionários; `OPERATOR` acessa suas próprias operações, totais, auditoria e simulações. Clientes são compartilhados.
- Operações seguem `PENDING → UNDER_REVIEW → COMPLETED | CANCELED`.
- Confirmação é idempotente, os valores e a cotação são preservados, e operação/auditoria são gravadas atomicamente.
- O histórico de simulações é persistido por autor e não renova o prazo da referência assinada.

Essa referência descreve a V1 e não deve ser usada como matriz dos novos perfis.

## 2. Matriz funcional da V1.1

| Ação ou escopo | Consultor de Câmbio | Analista de Operações | Gerente | Administrador |
| --- | --- | --- | --- | --- |
| Cadastrar clientes | Sim | Não | Não | Não |
| Simular conversões | Sim | Não | Não | Não |
| Consultar simulações individuais | Apenas próprias | Não | Não | Não |
| Consultar clientes | Todos | Todos | Todos | Apenas vinculados a operações |
| Consultar auditoria de operações | Próprias | Equipe | Equipe | Equipe, para suporte |
| Criar propostas e registrar aceite simulado | Sim | Não | Não | Não |
| Consultar propostas | Próprias | Solicitações da equipe para conferência | Registros da equipe para supervisão | Equipe, para suporte |
| Consultar operações | Próprias | Equipe | Equipe | Equipe, para suporte |
| Aprovar ou rejeitar solicitações | Não | Sim, exceto as criadas pelo próprio funcionário | Não | Não |
| Iniciar processamento simulado | Não | Sim | Não | Não |
| Consultar indicadores da equipe | Não, somente próprios | Solicitações e operações | Propostas, solicitações e operações | Atendimento, operações e acessos para suporte |
| Cadastrar funcionários e gerenciar acessos | Não | Não | Não | Sim |

A leitura de operações pelo administrador foi aprovada em 31/10/2026. Ela não concede aprovação, rejeição, processamento, criação de propostas, aceite, cadastro de clientes ou simulação. Também foram aprovados e implementados os escopos de clientes e auditoria da matriz acima.

As ações de proposta, aceite, aprovação e processamento estão implementadas, conforme os documentos de fluxo. Os status da V1 não devem ser renomeados automaticamente para representar etapas diferentes da V1.1.

## 3. Entrega implementada: perfis, acesso e navegação

Identificadores técnicos implementados: `CONSULTANT`, `OPERATIONS_ANALYST`, `MANAGER` e `ADMIN`. Cada funcionário terá um único valor em `User.role`.

### Autenticação e autorização implementadas

- Entrada autenticada separada de permissões de negócio; os quatro perfis acessam seu painel.
- Perfil, situação e versão de sessão consultados no banco em cada autorização.
- Permissões e escopos explícitos em listagens, detalhes, contadores e mutações.
- Histórico de simulações próprio e distinto da criação de simulações.
- Aprovação, rejeição e processamento separados das transições legadas, com bloqueio por identidade do autor.
- Gestão de acessos com substituição de perfil, desativação, reativação, histórico e proteção de administrador ativo.

### Navegação e painéis implementados

- Links e ações conforme as permissões, com redirecionamento de sessão inválida ou acesso negado.
- Consultor: propostas, solicitações, operações e simulações próprias, com atalhos comerciais.
- Analista: indicadores de solicitações/operações e fila da equipe, sem consulta a propostas sem aceite.
- Gerente: indicadores de propostas, solicitações e operações da equipe para supervisão.
- Administrador: suporte de atendimento/operações e totais de contas ativas/desativadas com gestão de funcionários.
- Fila limitada às cinco solicitações pendentes mais antigas, preservando contadores totais e indicando autoria própria bloqueada ao analista.
- Contadores agrupados no banco em uma fotografia consistente; dados recentes consultados separadamente. Nenhum somatório financeiro ou gráfico foi adicionado.

### Migração dos dados

Foi aprovado preservar o administrador como `ADMIN` e cadastrar contas distintas para as demais funções. A migração `20261031210000_v1_1_roles` foi aplicada nos bancos locais da aplicação e de testes, preservando integralmente a conta existente. Nenhuma conta automática ou dado de demonstração foi criado no banco da aplicação. O cadastro dos demais perfis está disponível em `/funcionarios/novo`.

A conversão de eventuais contas `OPERATOR` em outros ambientes depende de atribuição explícita. Operações legadas abertas também precisam de regra antes de migrar um banco que as contenha. A migração deve preservar IDs, autoria, vínculos, valores e histórico.

### Verificação da entrega de perfis

Cobrir os quatro perfis com testes essenciais de autorização, escopo por registro e HTTP direto, incluindo acesso negado para mutações administrativas e operacionais, navegação após login e sessão já existente após mudança de perfil. A restrição de aprovação da própria solicitação será verificada junto à implementação dessa ação. Conferir manualmente os painéis e links em desktop e celular, sem testes de componentes ou meta de cobertura.

## 4. Decisões antes das implementações correspondentes

1. Leitura de clientes e auditoria: aprovada e implementada conforme a matriz.
2. Administrador local: preservado conforme aprovação. Atribuição de contas `OPERATOR` em outros ambientes continua exigindo definição explícita; a migração recusa bancos que ainda contenham essas contas.
3. Fluxo de propostas, aceite e decisão implementado; processamento e recuperação detalhados em [V1_1_PROCESSING_FLOW.md](./V1_1_PROCESSING_FLOW.md).
4. Validade definida como prazo restante da simulação; aceite válido preserva os valores para análise e processamento posteriores.
5. Gestão de acessos implementada: troca de perfil, desativação e reativação, com revogação de sessões, histórico e preservação de administrador ativo. Recuperação de senha não faz parte desta entrega.

## 5. Andamento

- Referência local da V1 e inventário: conferidos.
- Banco descartável de testes: migrações alinhadas.
- Matriz funcional: leitura de operações, clientes e auditoria aprovada e implementada.
- Quatro perfis: implementados no banco, domínio, sessão, autorização, cadastro, navegação e painéis.
- Fluxo existente: registro pelo consultor e transições pelo analista; análise da própria operação bloqueada por identidade, inclusive após mudança de função.
- Validação: 40 testes unitários e 20 de integração passaram, incluindo migração com preservação de vínculos, escopos, HTTP dos quatro perfis e sessão existente após mudança de função; lint, tipos, schema e build passaram.
- Conferência visual: login e painel dos quatro perfis em desktop; detalhes com auditoria e ações exclusivas do analista; layouts de 390 e 320 pixels sem rolagem horizontal da página. Foram usadas apenas contas temporárias no banco descartável, removidas ao concluir; o servidor temporário foi encerrado.
- Propostas, aceite e solicitações: primeira entrega implementada conforme [V1_1_PROPOSAL_FLOW.md](./V1_1_PROPOSAL_FLOW.md). Validade original da simulação preservada; administrador pode consultar para suporte; operação somente após aprovação.
- Decisão do analista: aprovação/rejeição implementadas, com motivo obrigatório na rejeição, bloqueio por identidade, idempotência e criação atômica de uma operação na aprovação. Novas operações aguardam processamento e não usam transições legadas.
- Validação da decisão: 40 testes unitários e 28 de integração passaram, além de lint, tipos, schema e build. Conferência visual de aprovação/rejeição concluída, incluindo telas de 320 e 390 pixels. Migração aplicada nos bancos locais da aplicação e de testes.
- Processamento simulado: implementado com tentativas persistidas, cenários explícitos, falha, retomada e nova tentativa na mesma operação; regras em [V1_1_PROCESSING_FLOW.md](./V1_1_PROCESSING_FLOW.md).
- Validação do processamento: 40 testes unitários e 34 de integração passaram, além de lint, tipos, schema e build. Fluxo visual de falha e nova tentativa conferido em desktop e celular. Migração aplicada nos bancos locais da aplicação e de testes.
- Gestão de acessos: implementada conforme [V1_1_ACCESS_MANAGEMENT.md](./V1_1_ACCESS_MANAGEMENT.md), preservando autoria, senha e vínculos existentes.
- Validação dos acessos: 41 testes unitários e 43 de integração passaram, além de lint, tipos, schema e build. Interface conferida em desktop e telas de 320 e 390 pixels. Migração aplicada nos bancos locais da aplicação e de testes.
- Painéis finais: indicadores de propostas, solicitações, operações e acessos implementados conforme o perfil; fila de análise com limite e ordenação definidos.
- Fechamento: lint, tipos, schema e build passaram; 41 testes unitários e 45 de integração passaram. Quatro painéis conferidos em desktop e celular; bancos locais alinhados com as oito migrações.
- Situação: escopo local da V1.1 concluído. O relatório completo está em [V1_1_RELATORIO_IMPLEMENTACAO.md](./V1_1_RELATORIO_IMPLEMENTACAO.md). Publicação e os itens explicitamente fora do escopo permanecem separados da entrega local.
