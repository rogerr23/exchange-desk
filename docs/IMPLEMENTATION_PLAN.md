# Plano de implementação — ExchangeDesk V1

A ordem abaixo organiza a implementação do escopo documentado. As propostas e pendências dos documentos continuam em aberto; esta sequência não as transforma em decisões aprovadas.

A implementação começa pela API e pelos serviços no próprio Next.js. As telas vêm após os fluxos de servidor. Os testes essenciais acompanham cada fluxo: autorização, conversão/arredondamento, transições, falha do provedor e consistência de operação/auditoria, incluindo conflito de atualização.

## Andamento

- Etapa 1: base e execução local configuradas. PostgreSQL iniciado pelo Docker Compose e conexão validada.
- Organização definida: `src/app`, `src/components`, `src/server` (auth, db, services e quotes), `src/schemas` e `src/domain`.
- Etapa 2: acesso e regras dos dados fictícios definidos; schema com quatro entidades e migração inicial aplicada no PostgreSQL local e no banco de testes. Frankfurter/ECB avaliado nos seis pares, com data diária preservada no modelo.
- Etapa 3: autenticação e cadastros implementados pela API. Login/logout com Auth.js, hash Argon2id, guardas com sessão e perfil atual do banco, bootstrap local e endpoints de funcionários/clientes. Testes unitários, integração PostgreSQL e fluxo HTTP real verificados. Não foi criado acesso padrão no banco da aplicação; o usuário configura seu administrador pelo bootstrap.
- Etapa 6 (parcial): `/login`, `/inicio`, `/funcionarios` e `/funcionarios/novo`, com login/logout, lista de acessos e cadastro exclusivo do administrador. As telas de clientes, simulações, operações e gráficos continuam pendentes.
- Verificações: lint, tipos, schema Prisma, build e testes unitários e de integração. Verificação visual realizada em desktop e celular, incluindo erro de login, confirmação de senha, e-mail duplicado, criação, logout e bloqueio do operador. Alertas já conhecidos nas dependências do lint continuam registrados no README.
- Etapas 4, 5 e 7: não iniciadas. A próxima entrega é o adaptador de cotações e a simulação com cálculo decimal. A etapa 6 foi iniciada pelas telas de acesso e funcionários; as demais telas continuam para depois dos respectivos fluxos de servidor.

## Etapas

1. **Definir o ambiente e preparar a base.** Escolher versões compatíveis e gerenciador de pacotes; iniciar Next.js com TypeScript e App Router; configurar Tailwind CSS, Prisma, PostgreSQL e Vitest. Documentar os scripts e criar `.env.example` sem segredos.
2. **Resolver acesso e modelar os dados.** Definir método de login, sessão, criação do primeiro administrador, matriz de permissões e regras dos campos de clientes. Aplicar a política decimal já definida na arquitetura (valores com duas casas, taxas com oito e ROUND_HALF_UP). Examinar o formato de resposta de um provedor candidato antes de fechar os campos de referência da cotação. Modelar funcionários, clientes, operações e eventos de auditoria com os vínculos descritos na arquitetura.
3. **Implementar autenticação e cadastros.** Implementar primeiro a API e os serviços dentro do Next.js, incluindo Auth.js; proteger leituras e mutações no servidor; implementar cadastro de funcionários exclusivo do administrador e cadastro/consulta de clientes fictícios com Zod. Verificar acesso sem sessão e tentativas feitas por operador.
4. **Implementar cotações e simulações.** Selecionar e verificar um provedor que permita atender aos seis pares direcionais entre BRL, USD e EUR, diretamente ou por inversão/composição definida e testada. Definir normalização, timeout, cache e validade; aplicar o arredondamento já documentado. Implementar o adaptador e o cálculo decimal, apresentando fonte e horário com o rótulo correto. Definir como preservar uma referência verificável da simulação até a confirmação.
5. **Registrar operações com auditoria.** Confirmar no servidor a referência confiável e os valores apresentados ao usuário. Criar operação Pendente e evento inicial na mesma transação. Implementar listagem, detalhes e as transições permitidas, com atualização condicionada ao status esperado para tratar concorrência.
6. **Criar a interface e validar a V1.** Confirmar o conteúdo do resumo com Recharts e implementar as telas responsivas em português, incluindo estados vazios, carregamento e erros. Reexecutar os testes essenciais criados nas etapas da API, sem exigir cobertura total nem testes de detalhes visuais ou de bibliotecas; verificar transações e concorrência em banco de teste isolado; conferir manualmente o fluxo completo nos dois perfis, em computador e celular.
7. **Preparar a publicação.** Definir hospedagem e PostgreSQL, configurar variáveis e migrações, documentar a execução local e verificar os critérios de aceite de cada requisito antes de considerar a V1 concluída.

A estrutura de código definida está em [ARCHITECTURE.md](./ARCHITECTURE.md). Os critérios para verificar cada entrega estão em [REQUIREMENTS.md](./REQUIREMENTS.md).
