# MVP READY — v0.1.0-mvp-ready

Baseline oficial do MVP de identidade e acesso escolar do Matemagico. Esta release não introduz funcionalidades: consolida, valida e publica o estado já aprovado.

## Checkpoints concluídos

| Checkpoint          | Escopo                                                                         |
| ------------------- | ------------------------------------------------------------------------------ |
| CP-AUTH-004         | Auth: AuthenticateUser, GetSession, LogoutUser, RevokeSession, HealthCheckAuth |
| CP-MEM-001          | CreateMembership (`PENDING`)                                                   |
| CP-MEM-002          | ActivateMembership (`PENDING` → `ACTIVE`)                                      |
| CP-MEM-003          | GrantRole                                                                      |
| CP-SC-001           | ResolveSchoolContext e ResolvePermissions                                      |
| CP-SC-002           | ValidateSchoolContext                                                          |
| MVP-INTEGRATION-001 | Fluxo ponta a ponta e cenários negativos (E2E-001 a E2E-008)                   |
| INFRA-001           | Adapters Prisma de Auth e Membership                                           |

## Decisões arquiteturais

- Documentos em `docs/architecture` são a fonte de verdade. Precedência: contrato aprovado > Application Services > Code Tasks > prompt. Divergências foram registradas e resolvidas a favor do documento.
- Módulos: `Auth` e `Membership` (que abriga School Context). Fronteiras impostas por `dependency-cruiser` (`npm run test:architecture`).
- Portas de User, School e autorização são interfaces; a persistência é trocável entre in-memory e Prisma, com a mesma suíte de contrato.
- `ResolveSchoolContext` não inclui Permissions; elas são derivadas por `ResolvePermissions` (SCHOOL-CONTEXT-MVP.md vence o prompt original).
- Nomes aprovados: `SchoolMembershipRepository`, `HealthCheckAuth` com estados `READY`/`NOT_READY`.

## Principais regras

- **Fail closed:** dependência indisponível nega acesso (AUTH-004, MEM-005, MEM-003/MEM-002 na criação, SC-005).
- **Membership:** nasce `PENDING`; só `PENDING` → `ACTIVE`; `REVOKED` é terminal; no máximo uma Membership aberta por par User–School (índice único parcial no banco).
- **Grant:** exige Membership `ACTIVE` na mesma School e Role escolar `APPROVED`; no máximo um Grant vivo por Membership–Role; Role privilegiada exige dupla aprovação e bloqueia autoelevação.
- **Permission:** nunca concedida direto; deriva de Grants vigentes → Roles → RolePermission. Grant expirado ou revogado, Role removida ou Permission ausente nega (SC-004).
- **Session:** limite de 5 Sessions ativas por User; revogação idempotente.
- **Erros por módulo:** AUTH-00x, MEM-00x, SC-00x, conforme os contratos.

## Qualidade

| Verificação                 | Resultado                               |
| --------------------------- | --------------------------------------- |
| `npm run lint`              | OK (8 tarefas)                          |
| `npm run test`              | 225 testes passam, 24 pulados sem banco |
| Com PostgreSQL real         | Auth 65, Membership 162, todos passam   |
| `npm run test:architecture` | Sem violações (152 módulos)             |

## Dívidas técnicas

Veja [TECH-DEBT.md](../../TECH-DEBT.md).
