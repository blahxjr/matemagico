# Dívidas técnicas

Registro canônico (movido de `docs/backlog/TECH-DEBT.md`). Atualizado em 2026-10-10, após o Prompt 05. Espelho resumido em [memory/technical-debt.md](memory/technical-debt.md).

| #   | Item                 | Descrição                                                                                                     | Prioridade | Status                                                          |
| --- | -------------------- | ------------------------------------------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------- |
| 1   | CI PostgreSQL        | Serviço Postgres, `prisma migrate deploy`, `TEST_DATABASE_URL`, seed e `test:db` no job `quality`.            | Alta       | **Resolvida** (Prompt 01); confirmar na primeira execução do CI |
| 2   | ActorAuthorizer real | `GrantBasedActorAuthorizer` (Membership): `SCHOOL_ADMIN` ativo + Grant efetivo + permissões.                  | Alta (P1)  | **Resolvida** (Prompt 02)                                       |
| 3   | UserDirectory real   | `UserDirectory` real sobre `PrismaUserRepository` (`isActiveUser`).                                           | Alta (P1)  | **Resolvida** (Prompt 02)                                       |
| 4   | SchoolDirectory real | `SchoolDirectory` real sobre `PrismaSchoolRepository` (`isEnabledSchool`).                                    | Alta (P1)  | **Resolvida** (Prompt 02)                                       |
| 5   | API Layer            | `apps/api`: Auth (register/login/logout/me), Memberships, Schools, `/openapi.json`, CORS por env (Prompt 03). | Média      | **Resolvida** (Prompt 03)                                       |
| 6   | Outbox Pattern       | `MembershipCreated` e `RoleGranted` são publicados sem outbox transacional.                                   | Média      | Aberta                                                          |
| 7   | Observabilidade      | Logs estruturados básicos na API; sem métricas ou tracing.                                                    | Média      | Parcial                                                         |
| 8   | Auditoria            | Falta trilha de auditoria de ativação, Grants e revogações (ator, motivo).                                    | Média      | Aberta                                                          |
| 9   | ADRs sem aprovação   | ADR-0001–0005 e 0009 seguem `Proposed`; aprovação formal pendente.                                            | Média      | Aberta (não bloqueia Prompts 02/03)                             |

| 10 | Gate de ações de Membership | `ActivateMembership` usa `canActivateMembership` e `GrantRole` usa `canGrantRole`; negação → MEM-005 com 403. | Média | **Resolvida** (Prompt 03) |
| 11 | CreateSchool sem ator | `POST /schools` exige Session; o criador vira `SCHOOL_ADMIN` (`FoundSchoolService`). | Alta (P1) | **Resolvida** (Prompt 03) |
| 12 | Cadastro e reset de senha | `POST /auth/register` existe; reset de senha e verificação de e-mail não. | Média | Parcial; reset aberto |
| 13 | Eventos de Users/Schools | UserRegistered e SchoolCreated são apenas registrados em log (event-publishers.ts), sem outbox. | Média | Aberta (junto do item 6) |
| 14 | Rate limit em memória | `LoginAttemptLimiter` é substituível (`CompositionOverrides.attemptLimiter`), mas o padrão é em memória (por instância, perde estado ao reiniciar). Adapter Prisma/Redis não implementado. | Média | Aberta |
| 15 | Fundação de escola não atômica | `FoundSchoolService` cria a escola e depois Membership/Grant/allowlist em transação própria; falha desativa a escola (compensação). | Baixa | Aberta |
| 16 | Criação ilimitada de escolas | Qualquer usuário autenticado pode criar escolas (sem quota/aprovação). | Média | Aberta |
| 17 | Sessão só por Bearer | Sem cookie/CSRF, sem refresh/rotação do token de Session. | Média | Aberta |
| 18 | Enumeração em register | Registro duplicado retorna 409 USR-003 (revela e-mail existente); mitigado por rate limit por IP. | Baixa | Aceita; documentada |
| 19 | Segunda aprovação de papéis privilegiados | Não exposta na API (SCHOOL_ADMIN não pode ser concedido via `/grants`). | Média | Aberta |
| 20 | Conteúdo do banco é MOCK | As 100 questões do seed são geradas (ADR-0011); conteúdo OBMEP real exige autorização por escrito. | Alta (produto) | Aberta |
| 21 | Autoria presa a escola | Escrita em tópicos/questões exige `question:*` em um `schoolId` informado; o banco é global (sem posse por escola), então qualquer professor de qualquer escola edita qualquer questão. | Média | Aberta (decidir curadoria global x por escola) |
| 22 | Importação só por CLI | JSON/CSV via `npm run questions:import`; sem endpoint HTTP nem fila. | Baixa | Aberta |
| 23 | Sem busca textual/ordenação | Listagem filtra por nível, tópico, status e ano; ordem fixa por criação. | Baixa | Aberta |
| 24 | Testes DB destrutivos | Suítes DB de Membership apagam todas as Roles do banco de teste; rode `npm run seed` depois em bancos de desenvolvimento. | Baixa | Aberta |
| 25 | Consistência entre seleção e publicação | A publicação confirma que cada versão congelada foi publicada (`publishedAt` preenchido), mesmo se uma versão mais nova já arquivou seu status. Não há serialização explícita entre transações concorrentes de publicação. | Baixa | Monitorar |
| 26 | Sem Attempt/AutoCorrect | `StartExam` apenas autoriza e retorna o conjunto congelado; tentativa, envio e correção pertencem ao Prompt 06. | Informativa | Planejado |

## Outras observações

- Os provisional-ports foram removidos do Composition Root; PasswordVerifier usa Argon2id (OWASP: m=19456, t=2, p=1).

- O índice único parcial de Membership existe só na migration; `prisma db push` não o cria. Usar `migrate deploy`.
- `ValidateSchoolContext` valida contexto e escopo; a checagem de Permission por recurso fica na composição com `ResolvePermissions`.
- Não há cache de Permissions; a resolução faz uma consulta por Role.
- `GetSession` ainda não está integrado a `ResolveSchoolContext` de forma automática.

## Bloqueadores P0

Nenhum aberto para os Prompts 02, 03, 04 e 05.
