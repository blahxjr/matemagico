# MEMBERSHIP CODE TASKS

## Escopo

Este backlog decompõe MCI-001–MCI-012 de [MEMBERSHIP-CODE-IMPLEMENTATION-PLAN.md](./MEMBERSHIP-CODE-IMPLEMENTATION-PLAN.md), mantendo as decisões e serviços registrados em [MEMBERSHIP-MVP-DECISIONS.md](./MEMBERSHIP-MVP-DECISIONS.md), [MEMBERSHIP-APPLICATION-SERVICES.md](./MEMBERSHIP-APPLICATION-SERVICES.md) e [MEMBERSHIP-API-CONTRACTS.md](./MEMBERSHIP-API-CONTRACTS.md).

Não altera domínio, persistência conceitual, contratos ou plano aprovado. As tarefas não incluem API tecnológica, banco/schema, framework ou frontend. Cada item MCI permanece rastreável como unidade de implementação; artefatos impactados são os componentes internos esperados, sem definir tecnologia.

## Sequência

### Ordem de execução

1. **MCI-001 — Contratos funcionais internos.**
2. **Em paralelo após MCI-001:** MCI-002 — Domínio e invariantes; MCI-003 — Fronteiras públicas de identidade/contexto.
3. **Em paralelo após MCI-002 e MCI-001:** MCI-004 — Catálogos Role/Permission; MCI-005 — Repositório SchoolMembership; MCI-006 — Repositório Grant.
4. **MCI-011 — ResolveSchoolContext**, após contratos, domínio, fronteiras e repositórios (MCI-001–MCI-006). Esta validação é a base de autorização escolar reutilizada pelos mutadores.
5. **Após MCI-011:** MCI-007 — CreateMembership.
6. **Depois de MCI-007 para fluxo integrado; implementação pode ser paralela:** MCI-008 — ActivateMembership e MCI-009 — DeactivateMembership. A ativação precisa ser concluída para que o caminho de concessão use uma Membership criada por CreateMembership.
7. **MCI-010 — GrantRole e RevokeRole**, sobre as bases de domínio, contexto e persistência. A concessão no caminho integrado depende de Membership em estado `ACTIVE`; a revogação requer Grant previamente vigente.
8. **MCI-012 — Verificação integrada**, após as implementações necessárias de MCI-007–MCI-011.

### Paralelizáveis

- MCI-002 e MCI-003, depois de MCI-001.
- MCI-004, MCI-005 e MCI-006, depois de MCI-001/MCI-002 e com contratos de dependência acordados.
- Desenvolvimento de MCI-008 e MCI-009 após MCI-011; as verificações específicas dependem de Membership existente no estado aplicável.
- MAT-001–MAT-006 podem ser preparados junto aos contratos e implementações, mas só são considerados concluídos após execução com seus serviços.

### Sequenciais

- MCI-001 precede as demais tarefas.
- MCI-002 precede a implementação dos repositórios MCI-004–MCI-006.
- MCI-004–MCI-006 e MCI-003 precedem MCI-011.
- MCI-011 precede os mutadores MCI-007–MCI-010 que dependem de autorização no contexto escolar.
- No fluxo integrado Create → Grant, MCI-007 deve criar a Membership antes de MCI-008 ativá-la; GrantRole exige o estado `ACTIVE`.
- RevokeRole, incluído em MCI-010, só pode ser verificado após existir Grant vigente.
- MCI-012 fecha o caminho depois da implementação e integração dos serviços e repositórios alvo.

## Dependências e decomposição MCI

### MCI-001 — Codificar contratos funcionais internos

- **Objetivo:** representar internamente as entradas, saídas e erros funcionais dos seis serviços, incluindo `MEM-001`–`MEM-005`.
- **Dependências:** nenhuma.
- **Artefatos impactados:** modelos internos de entrada/resultado/falha dos serviços; mapeamento dos erros funcionais; documentação de rastreabilidade aos contratos.
- **Critério de conclusão:** todos os campos obrigatórios/opcionais e resultados documentados têm representação coerente; nenhum protocolo, endpoint ou erro novo é introduzido.

### MCI-002 — Implementar conceitos e invariantes de domínio

- **Objetivo:** expressar os conceitos de SchoolMembership, Role, Permission, Grant e RolePermission e suas regras congeladas.
- **Dependências:** MCI-001.
- **Artefatos impactados:** conceitos de domínio; transições de Membership; regras de validade/revogação de Grant; avaliação da relação Role–Permission.
- **Critério de conclusão:** criação `PENDING`, ativação `PENDING → ACTIVE`, revogação de `PENDING/ACTIVE → REVOKED`, terminalidade de `REVOKED`, escopo consistente e validade inclusiva/exclusiva são aplicados; Permission só deriva de RolePermission; Grant não é raiz independente.

### MCI-003 — Implementar fronteiras públicas de identidade e contexto

- **Objetivo:** disponibilizar as verificações conceituais de Auth, Users e Schools para serviços Membership sem cruzar ownership.
- **Dependências:** MCI-001.
- **Artefatos impactados:** abstrações internas de contexto autenticado; consumidores dos contratos públicos de Users e Schools; resultados de validação de ator, User e School.
- **Critério de conclusão:** Session/ator podem ser validados; User é resolvido e confirmado ativo; School é resolvida e confirmada habilitada; indisponibilidade ou falha de validação nega; nenhum acesso a internals de Users/Schools é feito.

### MCI-004 — Implementar repositórios de Role e Permission

- **Objetivo:** consultar catálogos controlados e a associação Role–Permission.
- **Dependências:** MCI-001, MCI-002.
- **Artefatos impactados:** `RoleRepository`, `PermissionRepository`, consultas de catálogo e associação Role–Permission.
- **Critério de conclusão:** Role escolar aprovada, allowlist, Role privilegiada e Permission aplicável podem ser consultadas; Role inválida/global/não aprovada não é elegível; não existe concessão direta de Permission.

### MCI-005 — Implementar SchoolMembershipRepository

- **Objetivo:** resolver, criar e transicionar o Aggregate Root SchoolMembership.
- **Dependências:** MCI-001, MCI-002.
- **Artefatos impactados:** `SchoolMembershipRepository`; consultas por Membership e por User–School; operações de criação e transição; testes de integridade correspondentes.
- **Critério de conclusão:** resolução retorna referências/estado necessários; criação ocorre em `PENDING`; transições permitidas são persistidas; `REVOKED` é terminal; existe no máximo uma Membership `ACTIVE` por User–School; histórico não é apagado; User/School permanecem referências.

### MCI-006 — Implementar GrantRepository

- **Objetivo:** consultar, criar e revogar ciclos de concessão associados à Membership.
- **Dependências:** MCI-001, MCI-002.
- **Artefatos impactados:** `GrantRepository`; consultas por `grantId` e Membership; operações de concessão e revogação; testes de validade, escopo e unicidade.
- **Critério de conclusão:** `schoolId` do Grant coincide com o da Membership; `validFrom` é inclusivo, `validUntil` exclusivo e opcional; revogação é imediata; há no máximo um Grant vigente por Membership–Role; ciclos revogados preservam histórico.

### MCI-007 — Implementar CreateMembership

- **Objetivo:** criar Membership `PENDING` após validar o ator, o User e a School.
- **Dependências:** MCI-001, MCI-002, MCI-003, MCI-005, MCI-011.
- **Artefatos impactados:** serviço `CreateMembership`; integração com contexto/autorização, fronteiras Users/Schools e `SchoolMembershipRepository`; auditoria de criação; teste MAT-001.
- **Critério de conclusão:** somente `SCHOOL_ADMIN` autorizado cria para User ativo e School habilitada; retorna referências canônicas e estado `PENDING`; não cria Grant nem emite `MembershipCreated`; MAT-001 passa e erros seguem o contrato.

### MCI-008 — Implementar ActivateMembership

- **Objetivo:** transicionar uma Membership `PENDING` para `ACTIVE` após as verificações requeridas.
- **Dependências:** MCI-001, MCI-002, MCI-003, MCI-005, MCI-011.
- **Artefatos impactados:** serviço `ActivateMembership`; repositório SchoolMembership; fronteiras Users/Schools; auditoria e evento `MembershipCreated`; MAT-002.
- **Critério de conclusão:** somente Membership `PENDING` é ativada por `SCHOOL_ADMIN` autorizado na mesma School, com User ativo e School habilitada; retorna `ACTIVE`; emite `MembershipCreated` após transição efetiva; não concede Role; MAT-002 passa.

### MCI-009 — Implementar DeactivateMembership

- **Objetivo:** revogar Membership `PENDING` ou `ACTIVE` de forma terminal.
- **Dependências:** MCI-001–MCI-006, MCI-011.
- **Artefatos impactados:** serviço `DeactivateMembership`; repositórios SchoolMembership/Grant; validação de School/ator; auditoria e evento `MembershipRemoved`; MAT-003.
- **Critério de conclusão:** somente ator autorizado na mesma School pode revogar; o serviço retorna `REVOKED`, emite `MembershipRemoved` após alteração efetiva e torna Grants inefetivos sem apagar histórico; User/School não são alterados; MAT-003 passa.

### MCI-010 — Implementar GrantRole e RevokeRole

- **Objetivo:** implementar concessão e revogação de Role escolar por ciclos de Grant.
- **Dependências:** MCI-001–MCI-006, MCI-011.
- **Artefatos impactados:** serviços `GrantRole` e `RevokeRole`; `SchoolMembershipRepository`, `RoleRepository`, `PermissionRepository`, `GrantRepository`; auditoria, eventos `RoleGranted`/`RoleRevoked`; MAT-004 e MAT-005.
- **Critério de conclusão:** GrantRole exige Membership `ACTIVE`, ator autorizado no mesmo escopo, Role escolar aprovada/permitida, validade e ausência de concessão vigente duplicada; dupla aprovação é exigida para concessão de Role `SCHOOL_ADMIN`; RevokeRole encerra Grant vigente imediatamente e preserva histórico; dupla aprovação é exigida para revogação de `SCHOOL_ADMIN`; Membership permanece inalterada por RevokeRole; MAT-004 e MAT-005 passam.

### MCI-011 — Implementar ResolveSchoolContext

- **Objetivo:** validar no servidor User/Session, School, Membership, Grant, Role/Permission e contexto do recurso para uma operação protegida.
- **Dependências:** MCI-001–MCI-006.
- **Artefatos impactados:** serviço `ResolveSchoolContext`; fronteiras Auth/Users/Schools; quatro repositórios Membership; consulta do contexto do recurso; MAT-006.
- **Critério de conclusão:** contexto só retorna `VALIDATED` quando Membership está `ACTIVE`, Grant está vigente e não revogado, Permission derivada é aplicável e `schoolId` canônico coincide entre School, Membership e recurso; qualquer falha/indisponibilidade nega sem fallback; MAT-006 passa.

### MCI-012 — Executar verificação integrada e fechar critérios

- **Objetivo:** comprovar que serviços e repositórios implementados atendem às matrizes de aplicação e aos invariantes aprovados.
- **Dependências:** MCI-007–MCI-011 e componentes/repositórios MCI-001–MCI-006.
- **Artefatos impactados:** suítes de teste de aplicação, domínio e persistência para Membership V1; rastreabilidade MAT/MCT; checklist final de implementação.
- **Critério de conclusão:** MAT-001–MAT-006 passam e correspondem a MCT-001–MCT-006; MRI-001–MRI-010 e MCMD-001–MCMD-005 estão cobertos; seis serviços atendem aos critérios individuais sem expansão ou mudança de decisão.

## Testes

| Teste de aplicação | Contrato  | MCI(s) de implementação                     | Critério de aceite                                                                                                                                  |
| ------------------ | --------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MAT-001`          | `MCT-001` | MCI-003, MCI-005, MCI-007, MCI-011, MCI-012 | Cria Membership `PENDING` com ator, User e School válidos; não cria Grant nem emite `MembershipCreated`.                                            |
| `MAT-002`          | `MCT-002` | MCI-003, MCI-005, MCI-008, MCI-011, MCI-012 | Ativa Membership `PENDING` após revalidar User/School; emite `MembershipCreated`; Membership `REVOKED` não pode ser reativada.                      |
| `MAT-003`          | `MCT-003` | MCI-005, MCI-006, MCI-009, MCI-011, MCI-012 | Revoga Membership `PENDING`/`ACTIVE`, emite `MembershipRemoved`, deixa Grant inefetivo e não permite reativação.                                    |
| `MAT-004`          | `MCT-004` | MCI-002, MCI-004, MCI-006, MCI-010, MCI-012 | Concede Role escolar permitida à Membership `ACTIVE` no mesmo escopo, dentro da validade; não concede Permission diretamente e emite `RoleGranted`. |
| `MAT-005`          | `MCT-005` | MCI-002, MCI-004, MCI-006, MCI-010, MCI-012 | Revoga Grant vigente, emite `RoleRevoked`, encerra eficácia imediatamente, preserva histórico e mantém Membership.                                  |
| `MAT-006`          | `MCT-006` | MCI-003–MCI-006, MCI-011, MCI-012           | Retorna contexto canônico válido somente quando todos os predicados conferem; falha, divergência ou dependência indisponível nega sem fallback.     |

MAT-001–MAT-006 são os testes de aceitação de aplicação do backlog. Testes unitários e de persistência necessários para os critérios de cada MCI devem ser adicionados dentro do item correspondente e não substituem a execução dos MAT.

## MVP PATH

### Menor caminho funcional para CreateMembership → GrantRole → ResolveSchoolContext

1. **Base comum:** concluir MCI-001–MCI-006: contratos internos, invariantes, fronteiras públicas de Auth/Users/Schools e os quatro repositórios.
2. **Autorização contextual:** concluir MCI-011 para validar o ator `SCHOOL_ADMIN` no mesmo `schoolId`, além dos checks de User/School/Membership/Role/Permission pertinentes.
3. **Criar vínculo:** executar MCI-007 / MAT-001. `CreateMembership` produz Membership `PENDING`, sem Role.
4. **Ativar vínculo:** executar MCI-008 / MAT-002 para a Membership criada. É obrigatório neste caminho porque `GrantRole` exige Membership `ACTIVE`.
5. **Conceder Role:** executar a parte `GrantRole` de MCI-010 / MAT-004, para uma Role escolar permitida, com Grant vigente e escopo igual ao da Membership; fornecer a aprovação adicional quando a Role concedida for `SCHOOL_ADMIN`.
6. **Resolver contexto:** executar MCI-011 / MAT-006 com User/Session válidos, School habilitada, Membership ativa, Grant vigente, Permission derivada aplicável e recurso no mesmo `schoolId`.

**Menor sequência de serviços:** `CreateMembership` → `ActivateMembership` → `GrantRole` → `ResolveSchoolContext`.

**Pré-condições externas do fluxo:** ator com Session válida e autorização de `SCHOOL_ADMIN` aplicável na School; User alvo ativo; School existente e habilitada; Role escolar aprovada/permitida com Permission necessária; recurso válido no mesmo escopo. Os owners externos devem responder pelos contratos públicos existentes; qualquer validação impossível resulta em negação.

`DeactivateMembership`, `RevokeRole` e a verificação final integrada de todos os seis serviços permanecem necessários para concluir MCI-009, MCI-010 e MCI-012 e, portanto, o escopo completo de Membership V1, mas não fazem parte do menor caminho positivo acima.

## READY FOR DEVELOPMENT

**SIM.** O backlog está decomponível em tarefas executáveis e preserva decisões, dependências, contratos, critérios e testes aprovados. Não há dependência arquitetural restante para iniciar desenvolvimento dentro do escopo; disponibilidade de Auth, Users, Schools e persistência é dependência de implementação/integração, não motivo para alterar arquitetura.
