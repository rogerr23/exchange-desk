# Decisões aprovadas — ExchangeDesk V1.1

Este documento registra decisões confirmadas pelo usuário. Aprovação de uma regra não significa que ela já esteja implementada. Os quatro perfis, seus acessos, navegação e painéis já estão implementados sobre o fluxo operacional da V1. Propostas, aceite e processamento simulado ainda não foram implementados.

## Acesso — um perfil por funcionário

Decisão aprovada em 31/10/2026: cada conta de funcionário terá exatamente um dos quatro perfis abaixo, sem acúmulo de funções na V1.1.

| Perfil | Responsabilidade aprovada |
| --- | --- |
| Consultor de Câmbio | Cadastrar clientes, simular conversões, criar propostas e registrar aceite simulado |
| Analista de Operações | Conferir solicitações, aprovar ou rejeitar e iniciar o processamento simulado |
| Gerente | Consultar registros e indicadores da equipe para supervisão |
| Administrador | Cadastrar funcionários e gerenciar seus acessos |

- O administrador não herda automaticamente as funções comerciais ou operacionais dos demais perfis.
- O criador de uma solicitação não pode aprová-la. A restrição considera a identidade do funcionário e continua válida mesmo após mudança de perfil.
- Uma futura mudança de função substitui o perfil da conta, preservando autoria e histórico; não acrescenta um segundo perfil.
- O exemplo de mudança de função não significa que uma tela de edição de perfil já exista.

## Pontos ainda a definir

Esta aprovação fecha a escolha de um perfil por funcionário e as responsabilidades acima. Não aprova automaticamente todas as propostas do plano externo da V1.1.

Antes das implementações correspondentes, detalhar o tratamento de operações legadas abertas em outros ambientes, a validade comercial, as ações de gestão de acessos e as regras de processamento e recuperação. Identificadores implementados: `CONSULTANT`, `OPERATIONS_ANALYST`, `MANAGER` e `ADMIN`.

## Leitura por perfil e suporte administrativo

Escopo confirmado em 31/10/2026:

- Consultor de Câmbio consulta suas próprias propostas e operações.
- Analista de Operações consulta solicitações e operações da equipe para conferência.
- Gerente consulta registros e indicadores da equipe para supervisão.
- Simulações individuais ficam restritas ao consultor autor.
- Administrador também pode consultar operações da equipe para suporte, além de cadastrar funcionários e gerenciar acessos. Essa leitura não concede ações comerciais ou operacionais.

Detalhamento aprovado em 31/10/2026:

- Consultor consulta todos os clientes e a auditoria das suas próprias operações.
- Analista e gerente consultam clientes e auditoria das operações da equipe.
- Administrador consulta somente clientes vinculados às operações e a auditoria das operações, para suporte; não cadastra clientes.
- A conta administrativa local é mantida como `ADMIN`. As demais funções serão cadastradas em contas separadas, sem acessos automáticos.

O acesso administrativo a propostas continua pendente. A separação de perfis foi aplicada ao fluxo existente: o consultor registra a operação e o analista conduz sua análise, sem analisar operações criadas por si. Isso não define os estados futuros de proposta, aceite, aprovação/rejeição e processamento.

## Próxima etapa

A referência local da V1 e os dados existentes foram conferidos. As três migrações da V1 foram conferidas; a migração dos perfis também foi aplicada nos bancos locais da aplicação e de testes. Neste ambiente existe apenas um administrador e nenhum registro operacional.

O [plano da V1.1](./V1_1_IMPLEMENTATION_PLAN.md) registra o inventário, a matriz funcional e os pontos de alteração em autenticação, autorização, navegação e painéis. A evolução dos perfis está implementada e validada. A próxima etapa é definir o ciclo de propostas, aceite e solicitações antes de implementar os novos estados e ações.
