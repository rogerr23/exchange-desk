# Plano de implementação — ExchangeDesk V1

A ordem abaixo organiza a implementação do escopo documentado. As propostas e pendências dos documentos continuam em aberto; esta sequência não as transforma em decisões aprovadas.

A implementação começa pela API e pelos serviços no próprio Next.js. As telas vêm após os fluxos de servidor. Os testes essenciais acompanham cada fluxo: autorização, conversão/arredondamento, transições, falha do provedor e consistência de operação/auditoria, incluindo conflito de atualização.

## Andamento

- Etapa 1: base criada com Next.js, TypeScript, Tailwind CSS, Prisma e Vitest; versões fixadas e comandos de execução documentados no README. PostgreSQL local configurado via Docker Compose; a verificação da conexão depende de um serviço Docker disponível. Ainda não há modelos, migrações ou testes de regras.
- Verificações da base: lint, tipos, schema Prisma, Docker Compose e build com Webpack aprovados; Vitest executado sem casos de teste. Alertas de dependências do lint e limitação do PostgreSQL registrados no README.
- Etapas 2 a 7: não iniciadas.

## Etapas

1. **Definir o ambiente e preparar a base.** Escolher versões compatíveis e gerenciador de pacotes; iniciar Next.js com TypeScript e App Router; configurar Tailwind CSS, Prisma, PostgreSQL e Vitest. Documentar os scripts e criar `.env.example` sem segredos.
2. **Resolver acesso e modelar os dados.** Definir método de login, sessão, criação do primeiro administrador, matriz de permissões e regras dos campos de clientes. Aplicar a política decimal já definida na arquitetura (valores com duas casas, taxas com oito e ROUND_HALF_UP). Examinar o formato de resposta de um provedor candidato antes de fechar os campos de referência da cotação. Modelar funcionários, clientes, operações e eventos de auditoria com os vínculos descritos na arquitetura.
3. **Implementar autenticação e cadastros.** Implementar primeiro a API e os serviços dentro do Next.js, incluindo Auth.js; proteger leituras e mutações no servidor; implementar cadastro de funcionários exclusivo do administrador e cadastro/consulta de clientes fictícios com Zod. Verificar acesso sem sessão e tentativas feitas por operador.
4. **Implementar cotações e simulações.** Selecionar e verificar um provedor que permita atender aos seis pares direcionais entre BRL, USD e EUR, diretamente ou por inversão/composição definida e testada. Definir normalização, timeout, cache e validade; aplicar o arredondamento já documentado. Implementar o adaptador e o cálculo decimal, apresentando fonte e horário com o rótulo correto. Definir como preservar uma referência verificável da simulação até a confirmação.
5. **Registrar operações com auditoria.** Confirmar no servidor a referência confiável e os valores apresentados ao usuário. Criar operação Pendente e evento inicial na mesma transação. Implementar listagem, detalhes e as transições permitidas, com atualização condicionada ao status esperado para tratar concorrência.
6. **Criar a interface e validar a V1.** Confirmar o conteúdo do resumo com Recharts e implementar as telas responsivas em português, incluindo estados vazios, carregamento e erros. Reexecutar os testes essenciais criados nas etapas da API, sem exigir cobertura total nem testes de detalhes visuais ou de bibliotecas; verificar transações e concorrência em banco de teste isolado; conferir manualmente o fluxo completo nos dois perfis, em computador e celular.
7. **Preparar a publicação.** Definir hospedagem e PostgreSQL, configurar variáveis e migrações, documentar a execução local e verificar os critérios de aceite de cada requisito antes de considerar a V1 concluída.

A estrutura de código proposta está em [ARCHITECTURE.md](./ARCHITECTURE.md). Os critérios para verificar cada entrega estão em [REQUIREMENTS.md](./REQUIREMENTS.md).
