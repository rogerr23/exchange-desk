# Gestão de acessos — ExchangeDesk V1.1

O administrador pode consultar funcionários, substituir o perfil e desativar ou reativar uma conta. A alteração mantém o ID, nome, e-mail, senha, data de cadastro, autoria comercial e vínculos com propostas, solicitações, operações e históricos.

## Regras desta entrega

- Cada funcionário continua com exatamente um perfil: `CONSULTANT`, `OPERATIONS_ANALYST`, `MANAGER` ou `ADMIN`. A troca substitui o perfil anterior, sem acúmulo de permissões.
- Somente `ADMIN` tem `employees:manage-access`. Os demais perfis não consultam detalhes de funcionários nem alteram acessos, mesmo por HTTP direto.
- Não é permitido alterar o próprio acesso. Outro administrador precisa realizar a mudança. A tela do próprio funcionário explica essa restrição e não oferece formulário.
- Deve permanecer pelo menos um administrador ativo. Alterações de acesso são serializadas no banco e o administrador executor é revalidado dentro da transação. Duas contas administrativas não podem remover uma à outra simultaneamente e deixar o sistema sem administrador ativo.
- Nome, e-mail, senha e exclusão de contas não fazem parte desta tela. Reativação usa a senha existente; não equivale a recuperação ou redefinição de senha. O bootstrap continua exclusivo da criação administrativa inicial e não altera contas existentes.
- Contas novas e contas existentes na migração começam ativas. Não há atribuição automática de novos perfis nem dados de demonstração no banco da aplicação.

## Sessões e histórico

A autenticação verifica se o funcionário está ativo. O JWT e as guardas consultam o banco para verificar perfil, situação e versão da sessão. Uma troca de perfil atualiza as permissões nas próximas requisições e preserva a sessão ativa. A sessão pública também reflete o perfil atual.

Desativar incrementa a versão de sessão e bloqueia novos logins e o uso das sessões abertas. Reativar permite um novo login, mas não torna válidos os cookies anteriores à desativação. Sessões anteriores à migração usam a versão zero, compatível com contas ativas que ainda não foram desativadas. Respostas a credenciais inválidas ou de conta desativada permanecem genéricas.

A revogação se aplica às próximas requisições; não cancela uma transação de negócio já iniciada. Na própria gestão de acessos, a revalidação após obter o bloqueio também impede que um administrador desativado, demovido ou com sessão revogada conclua uma mudança que estava aguardando a sua vez.

Cada alteração efetiva grava, na mesma transação, perfil anterior/novo, situação anterior/nova, revisão, administrador executor e instante. Falha de auditoria desfaz a alteração, a revisão e a revogação de sessões. Não são inventados eventos retroativos para funcionários existentes. A criação permanece identificada pela data de cadastro; o novo histórico trata de alterações posteriores de acesso.

A autoria de registros anteriores permanece associada ao mesmo funcionário. As restrições de análise própria continuam usando sua identidade, inclusive após mudança de função.

## Reenvios e concorrência

O formulário envia `expectedRevision`, obtido na consulta. Cada mudança efetiva incrementa `accessRevision` uma única vez.

- Mesmo perfil/situação e revisão atual: retorna o registro sem criar evento.
- Reenvio da mudança imediatamente anterior, com os mesmos valores: retorna a alteração persistida, sem alterar autor, data ou revogar sessões novamente.
- Revisão antiga com valores diferentes ou após outras mudanças: 409 `ACCESS_CONFLICT`.
- Mudanças concorrentes diferentes: somente uma é aplicada. As demais precisam atualizar os dados antes de tentar novamente.

## Interface e API

`/funcionarios` lista perfis e situações e oferece acesso a `/funcionarios/:id`. Os detalhes mostram dados públicos, formulário com confirmação explícita, resumo antes/depois e histórico. Nenhuma senha ou hash é retornado. As ações de troca de perfil, desativação e reativação usam `PATCH /api/funcionarios/:id`; os detalhes usam `GET` na mesma rota. Campos extras são recusados, incluindo tentativas de enviar senha ou versão de sessão.

O cadastro permanece em `/funcionarios/novo` e `POST /api/funcionarios`. O controle de situação é feito depois do cadastro, pela ação de acesso.

Migração aditiva: `20261101010000_employee_access`, com `isActive`, `sessionVersion` e `accessRevision` em `User` e a tabela `EmployeeAccessEvent`. As relações de histórico impedem exclusão de autores e funcionários vinculados.

## Validação

Passaram lint, tipos, schema Prisma e build, 41 testes unitários e 43 de integração. A integração cobre preservação de ID, senha, autoria e auditoria operacional; bloqueio de análise própria após troca de perfil; revogação de sessões e novo login após reativação; idempotência; conflitos e mudanças mútuas concorrentes entre administradores; controles de sessão, perfil, origem e campos estritos; rollback real em falha de histórico. HTTP real verifica cookies, os quatro perfis, navegação, troca de perfil em sessão aberta e impossibilidade de reutilizar os cookies anteriores à desativação, mesmo após reativar.

Conferência visual: troca de perfil em desktop; desativação, reativação e histórico em celular; próprio acesso sem formulário; listagem com situação e links. A tabela permanece em desktop e a listagem usa cartões no celular. Detalhes e listagem conferidos em 320 e 390 pixels sem rolagem horizontal da página. Foram usadas apenas contas fictícias temporárias no banco descartável, removidas ao concluir, e o servidor temporário foi encerrado.

A migração foi aplicada nos bancos locais da aplicação e de testes, sem mudar perfis, senhas ou vínculos dos funcionários existentes. O aviso conhecido do `pg` sobre consultas simultâneas no mesmo cliente apareceu sem falhas.
