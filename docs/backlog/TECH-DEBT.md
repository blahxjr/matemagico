# Dívidas técnicas

Pendências conhecidas após `v0.1.0-mvp-ready`. Nenhuma altera regras de negócio aprovadas.

| #   | Item                 | Descrição                                                                                                                                              | Prioridade |
| --- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| 1   | CI PostgreSQL        | O CI não tem Postgres de serviço, então os 24 testes de adapters Prisma são pulados. Adicionar serviço, `prisma migrate deploy` e `TEST_DATABASE_URL`. | Alta       |
| 2   | ActorAuthorizer real | Hoje só existe a porta e fakes. Implementar a verificação de `SCHOOL_ADMIN` ativo na School.                                                           | Alta       |
| 3   | UserDirectory real   | Implementação do contrato público de Users (`isActiveUser`).                                                                                           | Alta       |
| 4   | SchoolDirectory real | Implementação do contrato público de Schools (`isEnabledSchool`).                                                                                      | Alta       |
| 5   | API Layer            | Sem HTTP. Mapear Session → `actor` e os códigos de erro dos serviços.                                                                                  | Alta       |
| 6   | Outbox Pattern       | Eventos `MembershipCreated` e `RoleGranted` são publicados sem outbox transacional.                                                                    | Média      |
| 7   | Observabilidade      | Sem logs estruturados, métricas ou tracing nos serviços.                                                                                               | Média      |
| 8   | Auditoria            | Falta trilha de auditoria de ativação, Grants e revogações (ator, motivo).                                                                             | Média      |

## Outras observações

- O índice único parcial de Membership existe só na migration; `prisma db push` não o cria. Usar `migrate deploy`.
- `ValidateSchoolContext` valida contexto e escopo; a checagem de ação e Permission por recurso fica na composição com `ResolvePermissions`.
- Não há cache de Permissions; a resolução faz uma consulta por Role.
- Sem integração real de `GetSession` com `ResolveSchoolContext`; o `actor` é composto manualmente nos testes.
