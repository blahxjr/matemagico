# Diagnóstico e plano de MVP: MateMágico Champions

**Resumo:** o status "MVP READY" do README vale só para a camada de identidade e acesso escolar (Auth, Membership, School Context). O produto educacional ainda não existe: não há questões, simulados, tentativas, correção nem ranking, e a web é só uma página placeholder. Os prompts abaixo cobrem esse caminho.

Li o README, `ARCHITECTURE.md`, `docs/releases/MVP-READY.md`, `docs/backlog/TECH-DEBT.md`, `memory/*`, o CI, o schema Prisma, `apps/api`, `apps/web` e o composition-root.

A pesquisa de mercado que consegui fazer é uma comparação geral, sem fontes verificáveis. Valide os detalhes de cada plataforma antes de tomar decisões de produto.

---

## 1. Diagnóstico

### O que está sólido

| Área                        | Evidência                                                                                                                                                                  |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Arquitetura e governança    | Monorepo npm + Turborepo, 10 ADRs, `dependency-cruiser` impondo fronteiras (152 módulos, sem violações), commitlint, husky e prettier.                                     |
| Auth                        | `AuthenticateUser`, `GetSession`, `LogoutUser`, `RevokeSession` e `HealthCheckAuth`, com limite de 5 sessões, rate limit em memória e adapters Prisma.                     |
| Membership e School Context | `CreateMembership`, `ActivateMembership`, `GrantRole`, `ResolveSchoolContext`, `ResolvePermissions` e `ValidateSchoolContext`, seguindo _fail closed_ e _deny by default_. |
| Testes                      | 225 passam sem banco e 24 são pulados. Com Postgres real, Auth tem 65 e Membership 162, todos verdes. Há um E2E de fluxo em `packages/testing`.                            |
| API HTTP                    | `apps/api` já existe: `/health`, `/ready`, rotas de auth e `POST /memberships`, `/activate` e `/grants`, com testes E2E.                                                   |

### Lacunas e riscos

1. **O "MVP" é só infraestrutura de identidade.** O schema Prisma tem apenas `AuthAccount`, `PasswordCredential`, `Session`, `SchoolMembership`, `Role`, `RolePermission`, `RoleGrantAllowlist` e `Grant`. Não há `User`, `School`, `Topic`, `Question`, `Exam` nem `Attempt`. O módulo Users não existe em `packages/modules`.
2. **O runtime real nega tudo.** `provisional-ports.ts` define `noUserRepository`, `rejectAllPasswordVerifier`, `noUserDirectory`, `noSchoolDirectory` e `denyAllActorAuthorizer`. São seguros porque falham fechado, mas ninguém consegue fazer login ou criar membership fora dos testes. O Argon2id real não está implementado.
3. **A API tem uma falha de segurança de design.** Em `membership-routes.ts`, o `actorUserId` vem do corpo da requisição, então o cliente informa quem ele é. O `actor` precisa vir da Session (cookie ou token). A TECH-DEBT #5 já aponta isso.
4. **O CI não exercita o banco.** Não há serviço Postgres, então 24 testes de adapters Prisma são pulados. Também não há deploy e o `.env.example` não está documentado como fluxo.
5. **A web é um placeholder.** `apps/web/src/app/page.tsx` mostra "Foundation / Configured". Não há login, rotas, design system nem BFF, e `packages/ui` e `validation` não existem.
6. **A documentação está desalinhada com a realidade.**
   - `ARCHITECTURE.md` e `memory/*` citam pnpm, Jest e Shadcn, mas o repo usa npm e Vitest.
   - `memory/project-state.md` diz "No code written yet" e está datado de 2026-09-29.
   - TECH-DEBT diz "Sem HTTP", mas `apps/api` existe.
   - Os ADRs 0005 a 0010 estão duplicados ou supersedidos, e vários ainda estão como "Proposed".
7. **Outras dívidas.** Faltam outbox transacional, observabilidade, auditoria e cache de permissões, e há uma consulta por Role. O `scripts/` e o `tests/` raiz estão vazios.
8. **Risco de escopo.** São 16 bounded contexts planejados e apenas 2 implementados. Fazer todos antes de um MVP vai travar a entrega.

### Maturidade por camada

```
Governança/Docs   ████████░░  alta (porém desatualizada)
Domínio Auth/Mem  ████████░░  alta
Infra/CI/Deploy   ███░░░░░░░  baixa
API               ███░░░░░░░  parcial (só auth/membership)
Web               ░░░░░░░░░░  placeholder
Domínio pedagógico░░░░░░░░░░  inexistente
```

---

## 2. Benchmark de projetos similares

| Plataforma             | Banco de questões               | Simulados              | Ranking           | Gamificação | Painel do professor |
| ---------------------- | ------------------------------- | ---------------------- | ----------------- | ----------- | ------------------- |
| Portal OBMEP           | Sim (provas anteriores, listas) | Sim                    | Não               | Pouca       | Sim                 |
| Khan Academy           | Extenso                         | Exercícios adaptativos | Parcial           | Forte       | Detalhado           |
| Art of Problem Solving | Excelente para olimpíadas       | Sim                    | Parcial           | Pouca       | Em cursos           |
| Brilliant              | Sim                             | Parcial                | Sim               | Forte       | Básico              |
| Math Kangaroo          | Sim                             | Perto da prova         | Só em competições | Baixa       | Limitado            |
| Matific                | Sim (gamificado)                | Não                    | Sim, por turma    | Muito forte | Completo            |

**O que isso indica para o MVP:**

- Todos têm **banco de questões com filtros por nível e tema**. Isso é obrigatório.
- A maioria tem **simulado com correção automática e revisão**. Esse é o núcleo de valor para olimpíada.
- **Painel do professor ou da escola** é comum quando o produto é B2B escolar. Isso combina com o foco em Membership e Schools do projeto.
- **Ranking e gamificação** aparecem de forma simples (pontos, ranking por turma) e não como motor completo de campeonato. Brackets, certificados e IA ficam para depois.
- **Conteúdo oficial da OBMEP** (provas anteriores) é o maior ativo de valor, e há questão de licença e uso a confirmar.

### Definição de MVP

> Um aluno entra pela escola, resolve um simulado de questões OBMEP, recebe correção automática e vê seu desempenho e ranking simples da turma. Um professor ou admin da escola gerencia alunos e vê o desempenho.

**Fora do MVP:** Championships (brackets), Badges, Certificates, AI, Analytics avançado e Study Paths adaptativos.

---

## 3. Plano de entrega em 10 prompts

### Prompt 1: Estabilização do baseline e CI com banco

- Adicionar serviço Postgres ao CI, rodar `prisma migrate deploy` e definir `TEST_DATABASE_URL`, para que os 24 testes pulados passem a rodar (TECH-DEBT #1).
- Sincronizar a documentação: README, TECH-DEBT, `memory/*` e `ARCHITECTURE.md` (npm, Vitest, API existente), e consolidar os ADRs 0005 a 0010 em uma única decisão canônica.
- Criar o script de seed e o fluxo `docker-compose` + `.env.example` documentado.
- Definir o escopo do MVP em um documento e marcar o que está fora.
- **Pronto quando:** CI verde com 249 testes rodando e docs coerentes com o código.

### Prompt 2: Users + Schools e portas reais

- Criar os módulos `users` e `schools` (domínio, serviços, adapters Prisma, migration) e o evento `UserRegistered`.
- Implementar `UserDirectory`, `SchoolDirectory` e `ActorAuthorizer` reais (`SCHOOL_ADMIN` ativo), substituindo os `provisional-ports` (TECH-DEBT #2, #3, #4).
- Implementar o `UserRepository` real e o verificador **Argon2id** de senha.
- Seed de roles (`STUDENT`, `TEACHER`, `SCHOOL_ADMIN`) e do `RolePermission`.
- **Pronto quando:** o composition-root sobe sem `provisional-ports` e o E2E de fluxo passa com adapters reais.

### Prompt 3: Camada de API segura (Session → actor)

- Remover `actorUserId` do corpo das requisições e derivar o `actor` da Session (cookie `HttpOnly` + `Secure`, ou bearer).
- Adicionar rotas de registro, login, logout e `me`, e middleware de autenticação e autorização por Permission com `ResolvePermissions` e `ValidateSchoolContext`.
- Validação de entrada com Zod, mapa padronizado de erros (AUTH, MEM, SC), CORS, rate limit persistente e contrato OpenAPI.
- Decidir se mantém `node:http` ou adota Fastify ou Hono, registrando isso em um ADR.
- **Pronto quando:** todas as rotas exigem Session e há testes negativos de escalonamento de privilégio.

### Prompt 4: Topics + Questions (banco de questões)

- Criar os módulos `topics` e `questions`: modelo (nível Mirim, N1, N2, N3, tema, enunciado, alternativas, gabarito oficial e fonte), migration e repositórios.
- Casos de uso: criar, publicar, versionar e filtrar por nível e tema. Só professor ou admin escreve.
- Pipeline de importação com formato JSON/CSV e um seed com um conjunto inicial de questões de provas anteriores da OBMEP.
- Registrar a decisão de licença e uso do conteúdo.
- **Pronto quando:** existem pelo menos 100 questões publicadas, consultáveis por filtro, com testes de contrato.

### Prompt 5: Question Engine + Mock Exams

- Criar o `question-engine` (seleção de questões por nível, tema e quantidade, sem repetição) e o módulo `mock-exams`.
- Casos de uso: `CreateMockExam`, `StartExam` com duração e janela de tempo, e `ListAvailableExams` por escola ou turma.
- Regras de domínio: um simulado em andamento por aluno, expiração e imutabilidade após a publicação.
- **Pronto quando:** é possível gerar e publicar um simulado, e a seleção é determinística e testada.

### Prompt 6: Attempts + correção automática + eventos

- Criar o módulo `attempts`: `SubmitAnswer`, `FinishAttempt` e `AutoCorrect` (pontuação, acertos por tema).
- Implementar o **outbox transacional** e publicar `AttemptCompleted` e os eventos de Membership (TECH-DEBT #6).
- Garantir idempotência de submissão e fechamento automático por tempo.
- **Pronto quando:** uma tentativa completa gera nota e evento no outbox, com testes de concorrência e expiração.

### Prompt 7: Fundação da web (design system, auth e BFF)

- Criar `packages/ui` (Tailwind + componentes base) e `packages/validation` (Zod compartilhado).
- Telas de login e registro, layout autenticado, guarda de rotas via middleware do Next e BFF server-side consumindo a API, sem expor credenciais ao client.
- Estado conforme o ADR canônico, tratamento de erro e loading, e acessibilidade básica.
- Testes de componentes e um E2E Playwright de login.
- **Pronto quando:** o usuário faz login pela web e vê uma área autenticada com navegação por papel.

### Prompt 8: Jornada do aluno

- Telas: lista de simulados, execução com timer e salvamento de respostas, resultado com revisão por questão e gabarito, e histórico de tentativas.
- Navegação de banco de questões para treino livre, com filtros por nível e tema.
- Responsivo para mobile, já que o público é estudante.
- E2E Playwright cobrindo entrar, fazer o simulado, ver a nota e revisar.
- **Pronto quando:** um aluno completa o fluxo inteiro pela interface.

### Prompt 9: Jornada do professor/escola + Rankings simples

- Módulo `rankings` mínimo, consumindo `AttemptCompleted` por evento: ranking por simulado e por escola.
- Telas do `SCHOOL_ADMIN` e do professor: convidar e ativar alunos (fluxo de Membership), conceder roles, criar e publicar simulados e ver desempenho por aluno e tema.
- Classes mínimas, só se necessário para agrupar alunos, mantendo o escopo enxuto.
- **Pronto quando:** o admin leva um aluno de `PENDING` a `ACTIVE`, publica um simulado e vê o ranking.

### Prompt 10: Hardening, observabilidade e release

- Logs estruturados com `packages/logger`, métricas, tracing básico e auditoria de ativação, Grants e revogações com ator e motivo (TECH-DEBT #7, #8).
- Cache de permissões, revisão de segurança (OWASP, rate limit, headers, segredos) e adequação à LGPD, pois há dados de menores.
- Pipeline de deploy (web, API e banco gerenciado), migrations em produção, backups, ambiente de staging e smoke tests pós-deploy.
- Suíte E2E completa em CI, meta de cobertura e _runbook_.
- Tag `v0.2.0-mvp` e atualização das notas de release e da memória do projeto.
- **Pronto quando:** o MVP está em staging ou produção, com monitoramento, CI verde e checklist de segurança fechado.

---

## 4. Dependências e riscos do plano

```
P1 → P2 → P3 ─┬→ P7 → P8 ─┐
              └→ P4 → P5 → P6 ─→ P9 → P10
```

- **Caminho crítico:** P2 e P3 desbloqueiam tudo. Sem login real e actor vindo da Session, nada é entregável.
- **P4 e P7 podem rodar em paralelo**, pois o backend de conteúdo e o frontend não se bloqueiam.
- **Risco 1, conteúdo e licença:** confirmar o direito de uso das provas da OBMEP antes de publicar o banco.
- **Risco 2, escopo:** resistir a implementar os 16 contextos. Cada prompt só entrega o mínimo para o fluxo do MVP.
- **Risco 3, menores de idade:** consentimento, minimização de dados e LGPD precisam ser tratados no P2 e no P10, não só no fim.
- **Risco 4, documentação como fonte de verdade:** como a precedência declarada é documento > serviços > tasks > prompt, atualize os docs em cada prompt para evitar nova divergência.

Se quiser, posso transformar cada um desses 10 itens em um issue com critérios de aceite, ou abrir o Prompt 1 com o Copilot coding agent.
