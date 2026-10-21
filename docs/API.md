# API — ExchangeDesk V1

Autenticação e cadastros estão disponíveis pelo servidor. Já existem telas de login, listagem e criação de funcionários; as demais telas de trabalho continuam para as próximas etapas. Use somente clientes e contatos fictícios.

## Preparar o acesso

1. Configure `.env` conforme o README e aplique as migrações com `npm run db:deploy`.
2. Gere `AUTH_SECRET` com o comando indicado no `.env.example`. Use `AUTH_URL=http://localhost:3000` no desenvolvimento local.
3. Preencha temporariamente `BOOTSTRAP_ADMIN_NAME`, `BOOTSTRAP_ADMIN_EMAIL` e `BOOTSTRAP_ADMIN_PASSWORD` no `.env`. Escolha a senha de 12 a 128 caracteres; não há senha padrão.
4. Execute `npm run admin:create`. O comando cria um administrador apenas se ainda não existir nenhum; não sobrescreve funcionários. Remova as três variáveis de bootstrap após a criação.
5. Execute `npm run dev` e abra `/login`. Após entrar, administradores podem usar `/funcionarios` e `/funcionarios/novo`; ambos os perfis acessam `/inicio`.

O comando de bootstrap é local e usa a condição Node `react-server` apenas para importar os módulos marcados com `server-only`. Isso não cria uma rota pública de cadastro.

## Sessão

Auth.js gerencia os cookies de sessão e a proteção CSRF das suas rotas. A configuração usa Credentials e JWT com `maxAge` de oito horas. E-mails são normalizados antes da consulta e as senhas são verificadas com Argon2id. Não são retornados senha ou hash.

| Rota | Uso |
| --- | --- |
| `/login` | Formulário próprio de login; `/api/auth/signin` também direciona para essa tela |
| `GET /api/auth/session` | Consultar a sessão atual; sem login, não retorna usuário |
| `/api/auth/signout` | Formulário padrão para encerrar a sessão |

A tela `/login` usa uma Server Action que valida os dados e chama `signIn` do Auth.js. O botão **Sair** usa `signOut` em uma Server Action e retorna ao login. As proteções de origem do Next.js se aplicam a essas ações. O fluxo direto de `/api/auth/signout` continua exigindo confirmação por POST com CSRF; abrir essa página por GET não encerra a sessão sozinho. O cadastro visual usa `POST /api/funcionarios`, com tratamento de validação, e-mail duplicado e expiração da sessão.

## Cadastros

Todos os endpoints abaixo exigem sessão. Os serviços consultam o funcionário no banco para obter seu perfil atual. Apenas administrador pode cadastrar e listar funcionários. Os dois perfis podem cadastrar e consultar clientes da equipe.

| Método e rota | Permissão | Resultado |
| --- | --- | --- |
| `GET /api/funcionarios` | Administrador | Lista com id, nome, e-mail e perfil |
| `POST /api/funcionarios` | Administrador | Cria funcionário e retorna seus dados públicos |
| `GET /api/clientes` | Administrador ou operador | Lista os clientes fictícios |
| `POST /api/clientes` | Administrador ou operador | Cria cliente fictício |
| `GET /api/clientes/:id` | Administrador ou operador | Consulta um cliente; retorna 404 se não existir |

As listagens retornam os registros do conjunto de estudo, em ordem de criação decrescente. Paginação não está implementada nesta etapa. Todas as respostas de cadastro usam `Cache-Control: no-store`.

### Cadastrar funcionário

Envie JSON com `name`, `email`, `password` e, opcionalmente, `role` (`ADMIN` ou `OPERATOR`, padrão `OPERATOR`). O administrador escolhe a senha e a entrega manualmente para uso no projeto pessoal. E-mail normalizado é único; campos extras são recusados.

### Cadastrar cliente fictício

Após entrar, este exemplo pode ser executado no console do navegador na página da aplicação:

```js
const response = await fetch("/api/clientes", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "Cliente de Demonstração",
    fictionalCpf: "000.000.000-00",
    email: "cliente@example.test",
    phone: "(11) 90000-0000",
  }),
});
console.log(response.status, await response.json());
```

O servidor remove a máscara do CPF e do telefone e normaliza o e-mail. CPF fictício é único, mas não passa por validação de dígitos verificadores. E-mail e telefone de clientes não são únicos.

### Respostas

Sucesso: `{ "data": ... }`, com HTTP 200 em consultas e 201 em criações. Erros: `{ "error": { "code": "...", "message": "..." } }`; falhas de validação também incluem `fields`.

| HTTP | Situação |
| --- | --- |
| 400 | Campos inválidos ou JSON malformado |
| 401 | Sessão ausente ou funcionário não encontrado |
| 403 | Perfil sem permissão ou origem diferente da aplicação |
| 404 | Cliente não encontrado |
| 409 | E-mail de funcionário ou CPF fictício já cadastrado |
| 415 | Corpo enviado sem `Content-Type: application/json` |
| 500 | Falha interna com mensagem genérica, sem detalhes do banco |

Mutações exigem JSON e recusam o cabeçalho `Origin` quando diferente da origem configurada. Requisições entre sites não recebem permissão CORS. Clientes HTTP fora do navegador precisam manter os cookies e seguir o fluxo CSRF do Auth.js para entrar e sair.
