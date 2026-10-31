# Decisões aprovadas — ExchangeDesk V1.1

Este documento registra decisões confirmadas pelo usuário. Aprovação de uma regra não significa que ela já esteja implementada. A aplicação atual ainda utiliza os perfis `ADMIN` e `OPERATOR` da V1.

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

Antes das implementações correspondentes, detalhar o escopo de leitura por registro (inclusive suporte administrativo), a atribuição dos usuários atuais, o tratamento de operações legadas abertas, a validade comercial e as regras de processamento e recuperação. Os identificadores técnicos dos novos perfis também serão definidos na implementação.

## Próxima etapa

Consolidar a referência da V1 e conferir migrações e dados existentes; depois detalhar a matriz de acesso e preparar a evolução dos perfis, incluindo autenticação, autorização, navegação e painéis. As alterações de banco e código ainda não foram realizadas por este registro.
