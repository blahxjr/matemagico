# MEMBERSHIP CODE IMPLEMENTATION PLAN

## Escopo e fontes

Este plano converte os artefatos congelados de Membership V1 em unidades executáveis de implementação:

- [MEMBERSHIP-FOUNDATION.md](./MEMBERSHIP-FOUNDATION.md)
- [MEMBERSHIP-MVP-DECISIONS.md](./MEMBERSHIP-MVP-DECISIONS.md)
- [MEMBERSHIP-PERSISTENCE-DESIGN.md](./MEMBERSHIP-PERSISTENCE-DESIGN.md)
- [MEMBERSHIP-API-CONTRACTS.md](./MEMBERSHIP-API-CONTRACTS.md)
- [MEMBERSHIP-APPLICATION-SERVICES.md](./MEMBERSHIP-APPLICATION-SERVICES.md)

O plano não revisa nem altera domínio, persistência conceitual, contratos, owners, ADRs ou decisões do MVP. Não define tecnologia, schema, protocolo ou implementação de frontend.

O escopo funcional é somente `CreateMembership`, `ActivateMembership`, `DeactivateMembership`, `GrantRole`, `RevokeRole` e `ResolveSchoolContext`, mais os conceitos de Membership, Role, Permission, Grant e RolePermission. User e School são resolvidos pelas fronteiras públicas de seus owners. Class, Enrollment, Question, Attempt, Ranking, outras operações e funcionalidades fora do MVP estão excluídos.

## Estrutura

| Camada           | Responsabilidade                                                                                                           | Conteúdo a implementar                                                                                                                                                                                                           |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Contratos**    | Fixar as formas internas dos seis casos de uso, resultados e falhas, sem acoplar a transporte.                             | Entradas/saídas e erros `MEM-001`–`MEM-005` de `MEMBERSHIP-API-CONTRACTS.md`; fronteiras conceituais necessárias para contexto autenticado e referências públicas de Users/Schools.                                              |
| **Domínio**      | Expressar conceitos e invariantes Membership aprovados, sem dependência de aplicação ou persistência.                      | SchoolMembership Aggregate Root e estados `PENDING`, `ACTIVE`, `REVOKED`; transições permitidas; Role/Permission de catálogo; Grant como relação lógica com validade, revogação e escopo; Permission derivada de RolePermission. |
| **Persistência** | Implementar os quatro repositórios definidos e preservar integridade/histórico.                                            | `SchoolMembershipRepository`, `RoleRepository`, `PermissionRepository` e `GrantRepository`, respeitando MRI-001–MRI-010, MCQ-001–MCQ-003 e MCMD-001–MCMD-005. User/School não são persistidos pelo módulo Membership.            |
| **Aplicação**    | Orquestrar autenticação/contexto, autorização, domínio, repositórios, fronteiras externas e efeitos posteriores à mutação. | Os seis serviços aprovados; negação fail closed; registro mínimo de auditoria; eventos já documentados, somente após a alteração efetiva.                                                                                        |

Os contratos descritos aqui são contratos funcionais internos. A codificação deles não cria API ou formato de transporte.

## Ordem de implementação

1. **Codificar os contratos funcionais internos.** Estabelecer entradas, saídas e falhas comuns antes de conectar serviços e repositórios.
2. **Implementar conceitos e invariantes de domínio.** Construir SchoolMembership, lifecycle, regras de Grant/Role/Permission e validações puras sem dependências externas.
3. **Implementar fronteiras públicas de User, School e contexto autenticado.** Permitir confirmação de User ativo, School habilitada e ator autenticado/autorizado sem acesso aos internals dos owners.
4. **Implementar repositórios e integridade.** Cobrir catálogo Role/Permission, Membership e Grant; manter as regras de unicidade, validade, escopo e histórico.
5. **Implementar ResolveSchoolContext.** Compor autenticação, School, Membership, Grant, Role, Permission e contexto do recurso para a decisão fail closed; esse fluxo fornece a validação de autorização escolar consumida pelos mutadores.
6. **Implementar CreateMembership.** Estabelecer a criação pendente, sem emissão de evento de ativação, para ator autorizado no contexto escolar.
7. **Implementar ActivateMembership e DeactivateMembership.** Completar o lifecycle e os eventos documentados de ativação e revogação.
8. **Implementar GrantRole e RevokeRole.** Construir concessão/revogação sobre Membership, Role, validade e aprovação privilegiada.
9. **Executar testes integrados de aplicação e persistência.** Rodar MAT-001–MAT-006 e validar que seus comportamentos correspondem a MCT-001–MCT-006; corrigir falhas sem ampliar o escopo.

### Dependências e paralelização

- MCI-001 precede as unidades de domínio, fronteiras e aplicação.
- MCI-002 e MCI-003 dependem de MCI-001; podem avançar em paralelo quando os contratos internos necessários estiverem fixados.
- MCI-004, MCI-005 e MCI-006 dependem de MCI-002 e dos contratos de MCI-001. A implementação de catálogos, Membership e Grants pode ser paralelizada se as interfaces internas estiverem acordadas.
- MCI-011 depende de MCI-001–MCI-006.
- MCI-007 depende de MCI-001, MCI-002, MCI-003, MCI-005 e MCI-011.
- MCI-008 depende de MCI-001, MCI-002, MCI-003, MCI-005 e MCI-011.
- MCI-009 depende de MCI-001–MCI-006 e MCI-011.
- MCI-010 depende de MCI-001–MCI-006 e MCI-011.
- Testes unitários de domínio/repositórios devem acompanhar cada unidade; MAT-001–MAT-006 são testes de aplicação/integração e podem ser preparados com os contratos, mas a verificação final exige os respectivos serviços.

## Backlog Técnico

### MCI-001 — Codificar contratos funcionais internos

- **Objetivo:** representar entradas, saídas e falhas funcionais dos seis serviços aprovados, incluindo `MEM-001`–`MEM-005`.
- **Escopo implementável:** tipos/abstrações internas para identificadores e contextos já definidos nas fontes; resultados distinguem sucesso de negação/falha e não transportam autoridade confiada ao cliente.
- **Critério de conclusão:** cada campo obrigatório/opcional e cada erro do contrato tem representação interna coerente; não há protocolo, endpoint, serialização externa ou novo erro funcional.
- **Dependências:** nenhuma.

### MCI-002 — Implementar conceitos e invariantes de domínio

- **Objetivo:** codificar conceitos de SchoolMembership, Role, Permission, Grant e RolePermission conforme decisões MVP.
- **Escopo implementável:** estados/transições de Membership; Grant inclusivo em `validFrom`, exclusivo em `validUntil`, revogação imediata; coerência de `schoolId`; Permission somente derivada de RolePermission; máximo de um Grant vigente por Membership–Role.
- **Critério de conclusão:** transições e regras válidas são aceitas e violações são negadas sem dependência de persistência; `REVOKED` é terminal; Grant não se torna Aggregate Root independente.
- **Dependências:** MCI-001.

### MCI-003 — Implementar fronteiras públicas de identidade e contexto

- **Objetivo:** fornecer aos serviços acesso somente às verificações públicas de Auth, Users e Schools previstas nas fontes.
- **Escopo implementável:** validar Session/identidade do ator; resolver User e seu estado; resolver/validar existência e habilitação da School; propagar falha de validação como negação.
- **Critério de conclusão:** Membership não lê nem altera internals de Users/Schools; nenhuma falha ou indisponibilidade externa é tratada como autorização; identidade do ator não é aceita como autoridade a partir de entrada não confiável.
- **Dependências:** MCI-001.

### MCI-004 — Implementar repositórios de Role e Permission

- **Objetivo:** implementar leitura dos catálogos controlados e da relação Role–Permission.
- **Escopo implementável:** `RoleRepository` e `PermissionRepository` com consulta de Role escolar aprovada, allowlist aplicável, indicador de Role privilegiada e Permission `resource:action` derivada.
- **Critério de conclusão:** Role inexistente, global, não aprovada ou sem Permission aplicável não é elegível; nenhuma Permission pode ser concedida diretamente à Membership/User; owner permanece Auth / Authorization.
- **Dependências:** MCI-001, MCI-002.

### MCI-005 — Implementar SchoolMembershipRepository

- **Objetivo:** implementar leitura e mutações do Aggregate Root SchoolMembership.
- **Escopo implementável:** resolução por `membershipId` e por User–School; criação `PENDING`; transições `PENDING` → `ACTIVE`, `PENDING` → `REVOKED` e `ACTIVE` → `REVOKED`; unicidade de no máximo uma Membership `ACTIVE` por User–School.
- **Critério de conclusão:** identificadores/referências/estado são persistidos conforme desenho; transições inválidas e duplicidade ativa são rejeitadas; revogação preserva histórico; User e School permanecem referências.
- **Dependências:** MCI-001, MCI-002.

### MCI-006 — Implementar GrantRepository

- **Objetivo:** implementar leitura, criação e revogação dos ciclos de Grant vinculados à Membership.
- **Escopo implementável:** busca por `grantId`, consulta de Grants da Membership, gravação de ciclo com `schoolId`/ator/validade e revogação imediata com auditoria.
- **Critério de conclusão:** escopo do Grant coincide com a School da Membership; não há mais de um Grant vigente por Membership–Role; ciclo revogado mantém histórico e não autoriza; Grant nunca é tratado como Aggregate Root independente.
- **Dependências:** MCI-001, MCI-002.

### MCI-007 — Implementar CreateMembership

- **Objetivo:** criar vínculo pendente após verificar ator, User e School.
- **Escopo implementável:** orquestrar validação de Session/ator, User ativo e School habilitada; persistir somente estado `PENDING`; registrar auditoria da criação.
- **Critério de conclusão:** retorna `membershipId`, `userId`, `schoolId` e `PENDING`; não cria Role/Grant e não emite `MembershipCreated`; erros seguem os contratos `MEM-002`, `MEM-003` e `MEM-005`.
- **Dependências:** MCI-001, MCI-002, MCI-003, MCI-005, MCI-011.
- **Teste:** MAT-001 / MCT-001.

### MCI-008 — Implementar ActivateMembership

- **Objetivo:** ativar somente Membership pendente após revalidar User, School e ator.
- **Escopo implementável:** carregar vínculo, verificar `PENDING`, autorização de `SCHOOL_ADMIN` na mesma School, User ativo e School habilitada; persistir instante/ator e emitir evento após transição efetiva.
- **Critério de conclusão:** retorna `ACTIVE`; emite `MembershipCreated` somente após ativação efetiva; não concede Role; Membership inexistente, em estado impróprio ou dependência não verificável é negada conforme contrato.
- **Dependências:** MCI-001, MCI-002, MCI-003, MCI-005, MCI-011.
- **Teste:** coberto por MAT-002 / MCT-002; o caso complementar de ativação negada de Membership `REVOKED` também deve ser verificado.

### MCI-009 — Implementar DeactivateMembership

- **Objetivo:** revogar Membership pendente ou ativa terminalmente.
- **Escopo implementável:** validar ator na School correspondente; persistir estado `REVOKED`, instante/ator e motivo quando fornecido; tornar Grants associados inefetivos e registrar evento/auditoria.
- **Critério de conclusão:** retorna `REVOKED`; emite `MembershipRemoved` após transição efetiva; nega Membership inexistente/já revogada; não altera User/School e preserva histórico de Grants.
- **Dependências:** MCI-001, MCI-002, MCI-003, MCI-005, MCI-006, MCI-011.
- **Teste:** MAT-003 / MCT-003.

### MCI-010 — Implementar GrantRole e RevokeRole

- **Objetivo:** implementar concessão e revogação de Roles escolares por ciclos de Grant.
- **Escopo implementável:** GrantRole verifica Membership `ACTIVE`, ator/escola, Role escolar aprovada/permitida, validade, ausência de Grant vigente duplicado e dupla aprovação para concessão de `SCHOOL_ADMIN`; RevokeRole verifica Grant vigente, Membership e ator no mesmo escopo, dupla aprovação para revogação privilegiada e mantém histórico.
- **Critério de conclusão:** GrantRole retorna os dados do novo ciclo e emite `RoleGranted`; RevokeRole retorna o Grant revogado e emite `RoleRevoked`; revogação é imediata; Membership não é removida por RevokeRole; erros seguem `MEM-001`, `MEM-003`, `MEM-004` e `MEM-005`.
- **Dependências:** MCI-001–MCI-006, MCI-011.
- **Testes:** GrantRole: MAT-004 / MCT-004; RevokeRole: MAT-005 / MCT-005.

### MCI-011 — Implementar ResolveSchoolContext

- **Objetivo:** compor os predicados de autorização escolar para a operação/recurso solicitado.
- **Escopo implementável:** validar Session/User ativo, School existente/habilitada, Membership ativa correspondente, Grant vigente, Role/Permission derivadas e `schoolId` idêntico entre contexto e recurso.
- **Critério de conclusão:** retorna somente contexto canônico validado para a Permission/operação solicitada; qualquer ausência, inconsistência ou dependência indisponível nega sem fallback; contexto não é reutilizável como autorização permanente para outros recursos/operações.
- **Dependências:** MCI-001–MCI-006.
- **Teste:** MAT-006 / MCT-006.

### MCI-012 — Executar verificação integrada e fechar critérios

- **Objetivo:** validar a implementação Membership V1 contra as matrizes aprovadas.
- **Escopo implementável:** executar MAT-001–MAT-006 e verificar a correspondência MCT-001–MCT-006; completar testes de domínio, persistência e falha fechada pertinentes aos MCI anteriores.
- **Critério de conclusão:** todos os MAT passam; invariantes MRI-001–MRI-010 e operações MCMD-001–MCMD-005 são cobertas; os seis serviços cumprem seus critérios individuais; não há mudança de escopo ou decisão congelada.
- **Dependências:** MCI-007–MCI-011 e componentes/repositórios MCI-001–MCI-006.

## Testes

| Teste de aplicação | Contrato  | Implementação primária | Verificação esperada                                                                                                                                  |
| ------------------ | --------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MAT-001`          | `MCT-001` | MCI-007                | Criação PENDING autorizada; sem Grant e sem evento `MembershipCreated`.                                                                               |
| `MAT-002`          | `MCT-002` | MCI-008                | Ativação de PENDING após validar User/School; `MembershipCreated` emitido após sucesso; REVOKED não é reativada.                                      |
| `MAT-003`          | `MCT-003` | MCI-009                | Revogação de PENDING/ACTIVE; `MembershipRemoved`; nenhuma autorização posterior nem reativação.                                                       |
| `MAT-004`          | `MCT-004` | MCI-010                | Grant escolar válido, mesmo escopo, validade correta, sem Permission direta e com `RoleGranted`.                                                      |
| `MAT-005`          | `MCT-005` | MCI-010                | Grant revogado deixa de autorizar imediatamente; Membership permanece; `RoleRevoked`.                                                                 |
| `MAT-006`          | `MCT-006` | MCI-011                | Contexto válido retorna referências canônicas; escopo divergente, Membership/Grant/Permission inválido ou dependência indisponível nega sem fallback. |

Testes de falha para User/School não validável, ator não autorizado, Role fora da allowlist, duplicidade de Grant vigente e aprovação privilegiada ausente devem ser cobertos junto das unidades correspondentes, sem criar novos requisitos nem alterar os contratos.

## Critérios de conclusão dos serviços

### CreateMembership

- Cria somente em `PENDING` para User ativo e School habilitada.
- Exige ator `SCHOOL_ADMIN` autorizado na School alvo.
- Retorna os identificadores canônicos definidos no contrato.
- Não cria Grant nem emite `MembershipCreated`.
- MAT-001 passa e falhas necessárias negam.

### ActivateMembership

- Ativa somente `PENDING`; `REVOKED` permanece terminal.
- Revalida User ativo, School habilitada e ator autorizado na mesma School.
- Registra estado/instante/ator e emite `MembershipCreated` após sucesso efetivo.
- Não concede Role automaticamente.
- MAT-002 passa.

### DeactivateMembership

- Revoga somente Membership `PENDING` ou `ACTIVE` e mantém `REVOKED` terminal.
- Exige ator autorizado na mesma School.
- Registra auditoria, emite `MembershipRemoved` após sucesso e mantém histórico de Grants, agora inefetivos.
- MAT-003 passa.

### GrantRole

- Concede Role escolar permitida somente à Membership `ACTIVE` e no mesmo `schoolId`.
- Respeita validade, unicidade de Grant vigente, allowlist, não autoelevação e dupla aprovação quando Role alvo for `SCHOOL_ADMIN`.
- Emite `RoleGranted` após concessão efetiva; não concede Permission diretamente.
- MAT-004 passa.

### RevokeRole

- Revoga somente Grant vigente no escopo autorizado e exige dupla aprovação para Role `SCHOOL_ADMIN`.
- A revogação é imediatamente efetiva, auditada e histórica; não altera a Membership.
- Emite `RoleRevoked` após a alteração efetiva.
- MAT-005 passa.

### ResolveSchoolContext

- Exige Session/User válidos, School habilitada, Membership `ACTIVE`, Grant vigente, Permission derivada e recurso/escopo correspondentes.
- Retorna somente contexto canônico validado para a operação solicitada.
- Nega qualquer validação impossível/inconsistente sem fallback ou divulgação de contexto alternativo.
- MAT-006 passa.

## Checklist

- [ ] MCI-001 — Contratos internos cobrem os seis serviços e erros `MEM-001`–`MEM-005`, sem transporte.
- [ ] MCI-002 — Domínio respeita lifecycle, escopo, validade, revogação e derivação Role–Permission.
- [ ] MCI-003 — User, School, Session e ator são validados pelas fronteiras/owners definidos; falha fecha o acesso.
- [ ] MCI-004 — RoleRepository e PermissionRepository consultam somente catálogos/relações aprovados.
- [ ] MCI-005 — SchoolMembershipRepository implementa referências, transições, histórico e unicidade ativa.
- [ ] MCI-006 — GrantRepository implementa ciclos, validade, unicidade vigente, revogação e histórico.
- [ ] MCI-007 — CreateMembership concluído conforme critério; MAT-001 passa.
- [ ] MCI-008 — ActivateMembership concluído conforme critério; MAT-002 passa.
- [ ] MCI-009 — DeactivateMembership concluído conforme critério; MAT-003 passa.
- [ ] MCI-010 — GrantRole e RevokeRole concluídos conforme critérios; MAT-004 e MAT-005 passam.
- [ ] MCI-011 — ResolveSchoolContext concluído conforme critério; MAT-006 passa.
- [ ] MCI-012 — MAT-001–MAT-006 passam e cada um mapeia ao contrato MCT correspondente.
- [ ] MRI-001–MRI-010 e MCMD-001–MCMD-005 permanecem cobertos.
- [ ] Eventos utilizados limitam-se a `MembershipCreated`, `MembershipRemoved`, `RoleGranted` e `RoleRevoked`, após mutações efetivas conforme fontes.
- [ ] Nenhuma mutação de Membership/Grant acessa ou altera internals de Users/Schools.
- [ ] Escopo permanece nos seis serviços e conceitos aprovados; não inclui Class, Enrollment ou demais domínios excluídos.
- [ ] Nenhum requisito congelado foi alterado; nenhuma tecnologia, API, schema ou frontend foi introduzido por este plano.

## READY TO START CODING

### Existe dependência arquitetural restante?

**NÃO.** Owners, boundaries, conceitos, lifecycle, validade, invariantes, serviços, contratos funcionais, responsabilidades dos repositórios e critérios de teste estão definidos pelas fontes congeladas. Não é necessária uma decisão arquitetural adicional para iniciar a implementação dentro deste plano.

Esta resposta não significa que integrações de Users/Schools, Auth ou infraestrutura de persistência já estejam disponíveis. Elas devem ser consumidas por suas fronteiras públicas e constituem dependências de implementação/entrega, não decisões arquiteturais abertas. O plano não autoriza alterar decisões do MVP nem expandir o escopo.
