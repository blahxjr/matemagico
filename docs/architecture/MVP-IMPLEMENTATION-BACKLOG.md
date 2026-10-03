# MVP IMPLEMENTATION BACKLOG

## Escopo e convenções

Este é o backlog executável único para Auth V1, Membership V1 e School Context no MVP/Sprint 1. Consolida artefatos aprovados sem reabrir domínio, persistência, contratos, decisões ou escopo. Não define código, framework, banco, schema, SQL, API tecnológica ou frontend.

As dependências entre Auth, Users, Schools e os owners dos recursos são consumidas somente pelas fronteiras públicas existentes. Disponibilidade de integração e persistência é condição de execução, não uma decisão arquitetural nova. School Context é uma capacidade de aplicação de Auth / Authorization, não um módulo ou bounded context adicional.

**IDs:** `AUTH-###`, `MEM-###` e `SC-###` nesta seção identificam itens de backlog. Os mesmos formatos curtos são usados como códigos de erro nos contratos Auth/Membership/School Context; ao se referir a falhas, o código deve ser entendido somente no contexto de contrato/erro. `INT-###` identifica integração; `TEST-###` identifica teste consolidado. Prioridade P0/P1 indica ordem de entrega, não uma mudança de escopo; todos os itens deste backlog são necessários para o Definition of Done do MVP.

**Prioridades**

- **P0:** base e caminho crítico de Login → Session → Membership → School Context → Permission → acesso permitido, incluindo as negações de segurança que protegem esse caminho.
- **P1:** operações e verificações restantes para completar o escopo aprovado, incluindo Logout, revogações, Health Check e integração final.
- **P2:** nenhum item adicional é criado ou adiado neste backlog; não há escopo P2 aprovado nas fontes listadas.

## Auth

### AUTH-001 — Codificar contratos funcionais internos

- **Prioridade:** P0
- **Objetivo:** representar entradas, saídas e falhas funcionais de `AuthenticateUser`, `LogoutUser`, `GetSession`, `RevokeSession` e `HealthCheckAuth`.
- **Dependências:** nenhuma.
- **Critério de aceite:** campos funcionais e falhas correspondem aos contratos Auth aprovados; saídas não revelam senha/hash/segredo, internals de Users ou autoridade escolar; não há protocolo/transport ou erro funcional novo.

### AUTH-002 — Implementar conceitos e invariantes Auth

- **Prioridade:** P0
- **Objetivo:** implementar regras de `AuthAccount`, `PasswordCredential` e `Session`, tratando User somente como identidade/estado referenciado.
- **Dependências:** AUTH-001.
- **Critério de aceite:** elegibilidade exige User `ACTIVE`, uma conta credentials e uma credencial vigente válidas; sessão observa 8h absolutas, 30 minutos de inatividade e revogação server-side; nenhuma regra viola cardinalidades aprovadas ou torna Auth owner de User.

### AUTH-003 — Integrar consulta pública de User

- **Prioridade:** P0
- **Objetivo:** localizar User por email normalizado e validar estado por `userId` exclusivamente pelo contrato público de Users.
- **Dependências:** AUTH-001.
- **Critério de aceite:** retorna somente identidade/estado mínimos; Auth não consulta/escreve internals de Users; erro/indisponibilidade ao validar User resulta em falha fechada para operações protegidas.

### AUTH-004 — Implementar leitura de AuthAccount e PasswordCredential

- **Prioridade:** P0
- **Objetivo:** resolver a única conta `credentials` e a única PasswordCredential vigente usadas no Login.
- **Dependências:** AUTH-001, AUTH-002.
- **Critério de aceite:** relações 1:1 do MVP são aplicadas; conta/credencial ausente ou inesperadamente múltipla nunca autentica; dados secretos não são expostos nos resultados funcionais.

### AUTH-005 — Implementar repositório e operações de Session

- **Prioridade:** P0
- **Objetivo:** suportar validação, criação, atividade e revogação server-side, incluindo limite simultâneo.
- **Dependências:** AUTH-001, AUTH-002.
- **Critério de aceite:** nenhuma Session persiste JWT/cookie em claro; máximo de cinco sessões ativas por User é mantido; no sexto Login, revogar a mais antiga e criar a nova é uma operação lógica, preservando a antiga se a nova criação falhar; empate usa `createdAt` e `sessionId` como definido nas decisões.

### AUTH-006 — Implementar GetSession

- **Prioridade:** P0
- **Objetivo:** validar Session server-side e estado atual do User.
- **Dependências:** AUTH-003, AUTH-005.
- **Critério de aceite:** só retorna dados permitidos quando Session não está revogada, expirada por limite absoluto/inatividade e User continua válido; falha de validação fecha o acesso e não concede autorização escolar.

### AUTH-007 — Implementar AuthenticateUser

- **Prioridade:** P0
- **Objetivo:** autenticar por email/senha e criar Session válida sem conceder School Context ou Membership.
- **Dependências:** AUTH-002, AUTH-003, AUTH-004, AUTH-005.
- **Critério de aceite:** aplica cinco falhas por email normalizado/15 min e 30 solicitações por IP/15 min; exige User `ACTIVE`, conta/credencial únicas e senha correta; resposta externa é genérica; falha não cria Session; sucesso cumpre limites temporais e simultâneos.

### AUTH-008 — Implementar RevokeSession

- **Prioridade:** P1
- **Objetivo:** revogar somente a Session corrente autenticada.
- **Dependências:** AUTH-005, AUTH-006.
- **Critério de aceite:** alvo é validado e corresponde à Session corrente; revogação só confirma após efetivação; alvo inválido/divergente ou falha de persistência não retorna sucesso; validações posteriores rejeitam a Session revogada.

### AUTH-009 — Implementar LogoutUser

- **Prioridade:** P1
- **Objetivo:** compor a revogação da Session corrente.
- **Dependências:** AUTH-008.
- **Critério de aceite:** retorna confirmação somente após revogação efetiva; encerra somente a Session corrente; não implementa logout global.

### AUTH-010 — Implementar HealthCheckAuth

- **Prioridade:** P1
- **Objetivo:** verificar disponibilidade das dependências Auth obrigatórias e do contrato público de Users.
- **Dependências:** AUTH-003, AUTH-004, AUTH-005.
- **Critério de aceite:** retorna somente `READY`/`NOT_READY`; qualquer dependência obrigatória indisponível resulta em `NOT_READY`, sem dados sensíveis ou detalhe interno.

### AUTH-011 — Verificar Auth V1 integrado

- **Prioridade:** P1
- **Objetivo:** demonstrar que os serviços Auth e seus limites funcionam em conjunto.
- **Dependências:** AUTH-006–AUTH-010.
- **Critério de aceite:** AT-001–AT-005 passam; Health Check cobre pronto/não pronto; falhas necessárias fecham o acesso; respostas e efeitos observados respeitam contratos; nenhuma funcionalidade fora do Auth V1 foi introduzida.

## Membership

### MEM-001 — Codificar contratos funcionais internos de Membership

- **Prioridade:** P0
- **Objetivo:** representar entradas, saídas e erros dos seis serviços Membership aprovados.
- **Dependências:** AUTH-001 (contexto autenticado definido).
- **Critério de aceite:** contratos internos refletem `MEMBERSHIP-API-CONTRACTS.md`, incluindo erros, campos obrigatórios/opcionais e limites de saída, sem transporte/API tecnológica ou requisitos novos.

### MEM-002 — Implementar conceitos e invariantes Membership

- **Prioridade:** P0
- **Objetivo:** implementar SchoolMembership, Role, Permission, Grant e RolePermission conforme decisões congeladas.
- **Dependências:** MEM-001.
- **Critério de aceite:** lifecycle `PENDING → ACTIVE → REVOKED` permitido e `REVOKED` terminal; Grant tem validade inclusiva/exclusiva e revogação imediata; escopo coincide; Permission deriva somente de RolePermission; Grant não é Aggregate Root.

### MEM-003 — Integrar fronteiras públicas Auth, Users e Schools

- **Prioridade:** P0
- **Objetivo:** disponibilizar contexto autenticado e validações de User/School aos serviços Membership pelas fronteiras dos owners.
- **Dependências:** MEM-001, AUTH-003, AUTH-006.
- **Critério de aceite:** Session/User e estado ativo podem ser confirmados; User/School são resolvidos por contratos públicos; nenhuma falha ou indisponibilidade autoriza; internals de Users/Schools não são acessados.

### MEM-004 — Implementar RoleRepository e PermissionRepository

- **Prioridade:** P0
- **Objetivo:** consultar catálogos controlados de Role/Permission e associação Role–Permission.
- **Dependências:** MEM-001, MEM-002.
- **Critério de aceite:** Role escolar aprovada/permitida e Permission aplicável podem ser resolvidas; Role global, desconhecida ou inelegível não é concedida; Permission não é atribuída diretamente a User/Membership.

### MEM-005 — Implementar SchoolMembershipRepository

- **Prioridade:** P0
- **Objetivo:** resolver, criar e transicionar SchoolMembership preservando suas invariantes.
- **Dependências:** MEM-001, MEM-002.
- **Critério de aceite:** cria `PENDING`; suporta somente transições aprovadas; no máximo uma Membership `ACTIVE` por User–School; `REVOKED` é terminal; referências a User/School e histórico são preservados, sem propriedade cruzada.

### MEM-006 — Implementar GrantRepository

- **Prioridade:** P0
- **Objetivo:** consultar, criar e revogar ciclos de Grant associados à Membership.
- **Dependências:** MEM-001, MEM-002.
- **Critério de aceite:** Grant coincide com `schoolId` da Membership; validade segue `validFrom` inclusivo e `validUntil` exclusivo opcional; no máximo um Grant vigente por Membership–Role; revogação imediata preserva histórico.

### MEM-007 — Implementar ResolveSchoolContext Membership

- **Prioridade:** P0
- **Objetivo:** compor Session/User, School, Membership, Grant, Role, Permission e escopo do recurso para a operação solicitada.
- **Dependências:** MEM-001–MEM-006, AUTH-006.
- **Critério de aceite:** retorna contexto validado somente para User/Membership `ACTIVE`, School habilitada, Grant vigente, Permission derivada e recurso/escopo correspondentes; qualquer dado ausente/divergente ou falha fecha o acesso sem fallback.

### MEM-008 — Implementar CreateMembership

- **Prioridade:** P0
- **Objetivo:** criar vínculo `PENDING` depois de validar User, School e ator autorizador.
- **Dependências:** MEM-001, MEM-002, MEM-003, MEM-005, MEM-007.
- **Critério de aceite:** apenas `SCHOOL_ADMIN` autorizado na School cria para User ativo e School habilitada; retorna IDs canônicos e `PENDING`; não cria Grant nem emite `MembershipCreated`; MAT-001 passa.

### MEM-009 — Implementar ActivateMembership

- **Prioridade:** P0
- **Objetivo:** ativar Membership `PENDING` após revalidar User, School e ator.
- **Dependências:** MEM-001, MEM-002, MEM-003, MEM-005, MEM-007, MEM-008.
- **Critério de aceite:** retorna `ACTIVE`, registra instante/ator e emite `MembershipCreated` após transição efetiva; não concede Role; não reativa `REVOKED`; MAT-002 passa.

### MEM-010 — Implementar GrantRole

- **Prioridade:** P0
- **Objetivo:** conceder Role escolar aprovada a Membership `ACTIVE`.
- **Dependências:** MEM-001–MEM-007, MEM-009.
- **Critério de aceite:** ator autorizado no mesmo `schoolId`; Role em allowlist, sem autoelevação; validade e unicidade de Grant aplicadas; concessão de `SCHOOL_ADMIN` exige aprovação adicional; emite `RoleGranted` somente após efetivação; MAT-004 passa.

### MEM-011 — Implementar DeactivateMembership e RevokeRole

- **Prioridade:** P1
- **Objetivo:** implementar encerramento terminal de Membership e revogação individual de Grant.
- **Dependências:** MEM-001–MEM-007, MEM-009; para RevokeRole, Grant vigente existente.
- **Critério de aceite:** DeactivateMembership transiciona `PENDING`/`ACTIVE` a `REVOKED`, emite `MembershipRemoved` e torna Grants inefetivos sem apagar histórico; RevokeRole revoga Grant vigente no mesmo escopo, exige aprovação adicional para `SCHOOL_ADMIN`, mantém Membership e emite `RoleRevoked`; MAT-003 e MAT-005 passam.

### MEM-012 — Verificar Membership V1 integrado

- **Prioridade:** P1
- **Objetivo:** verificar operações, integridade e testes de aplicação Membership aprovados.
- **Dependências:** MEM-008–MEM-011.
- **Critério de aceite:** MAT-001–MAT-006 passam conforme MCT-001–MCT-006; invariantes MRI-001–MRI-010 e escritas MCMD-001–MCMD-005 estão cobertas; seis serviços atendem aos critérios sem alterar escopo.

## School Context

School Context permanece uma capacidade aplicada dentro das fronteiras Auth / Authorization e dos módulos donos de School/recursos.

### SC-001 — Codificar contratos funcionais School Context

- **Prioridade:** P0
- **Objetivo:** representar ResolveSchoolContext, ValidateSchoolContext, ResolvePermissions e erros `SC-001`–`SC-005` do contrato funcional.
- **Dependências:** AUTH-001, MEM-001.
- **Critério de aceite:** entradas, saídas, erros e natureza transitória/restrita à operação correspondem a `SCHOOL-CONTEXT-MVP.md`; nenhum transporte, API, módulo ou regra nova.

### SC-002 — Implementar resolução de Session, User e School

- **Prioridade:** P0
- **Objetivo:** validar contexto autenticado e resolver School solicitada via owners públicos.
- **Dependências:** SC-001, AUTH-003, AUTH-006, MEM-003.
- **Critério de aceite:** Session/User válidos e User ativo confirmados; School existe/habilitada; `schoolId` de entrada é apenas solicitação; falha/indisponibilidade nega; sem acesso a internals de Users/Schools.

### SC-003 — Implementar resolução de Membership e Tenant Scope

- **Prioridade:** P0
- **Objetivo:** encontrar Membership do User autenticado para a School canônica solicitada e validar estado/escopo.
- **Dependências:** SC-001, SC-002, MEM-005.
- **Critério de aceite:** somente Membership `ACTIVE` única por par User–School pode compor contexto; ausente, `PENDING`, `REVOKED`, inconsistente ou duplicada é negada; permissões de escolas distintas nunca são combinadas.

### SC-004 — Implementar validação do School Context por recurso

- **Prioridade:** P0
- **Objetivo:** comparar School/Membership canônicas com estado e `schoolId` do recurso e ação corrente.
- **Dependências:** SC-001–SC-003; responsabilidade/contrato público do owner do recurso.
- **Critério de aceite:** recurso existe, estado permite a operação e `schoolId` coincide com School/Membership; validação só vale para o recurso/ação corrente; falha ou contexto não verificável nega.

### SC-005 — Implementar resolução de Roles e Permissions

- **Prioridade:** P0
- **Objetivo:** resolver Grant elegível e derivar Permission de RolePermission para operação/recurso validados.
- **Dependências:** SC-001–SC-004, MEM-004, MEM-006.
- **Critério de aceite:** somente Grant vigente/não revogado de Membership `ACTIVE`, Role escolar no escopo e Permission associada autoriza; ausência, inconsistência ou indisponibilidade nega; sem concessão direta de Permission ou combinação cross-school.

### SC-006 — Verificar School Context integrado

- **Prioridade:** P1
- **Objetivo:** executar testes comportamentais SCT-001–SCT-006 e verificar as capacidades consolidadas.
- **Dependências:** SC-002–SC-005.
- **Critério de aceite:** testes de Membership/School/Permission válidas e inválidas e fail closed passam; contexto não tem fallback nem persistência autorizadora.

## Integration

### INT-001 — Integrar Login → Session

- **Prioridade:** P0
- **Objetivo:** comprovar que Login válido resulta em Session Auth válida e que Login não concede acesso escolar.
- **Dependências:** AUTH-001–AUTH-007.
- **Critério de aceite:** autenticação válida retorna identidade e Session dentro dos limites Auth; falha de Login não cria Session; nenhuma Membership, School ou Permission é implicitamente concedida.

### INT-002 — Integrar Session → Membership

- **Prioridade:** P0
- **Objetivo:** propagar identidade de Session validada para localizar Membership do mesmo User e School solicitada.
- **Dependências:** INT-001, AUTH-006, MEM-003, MEM-005, SC-002, SC-003.
- **Critério de aceite:** Session/User validados resolvem somente Membership correspondente; Membership ausente/inativa nega apenas acesso escolar e não desfaz Login; User/School não são resolvidos por dados não confiáveis do cliente.

### INT-003 — Integrar Membership → School Context

- **Prioridade:** P0
- **Objetivo:** validar correspondência entre Membership ativa, School habilitada e escopo do recurso.
- **Dependências:** INT-002, MEM-007, SC-002–SC-004.
- **Critério de aceite:** contexto só é retornado para a mesma School canônica da Membership e recurso; User com várias Memberships usa somente a School solicitada, sem escola padrão ou mistura de escopos.

### INT-004 — Integrar ResolvePermissions

- **Prioridade:** P0
- **Objetivo:** derivar e avaliar Permission para o contexto escolar validado.
- **Dependências:** INT-003, MEM-004, MEM-006, SC-005.
- **Critério de aceite:** permissão concedida somente pelo caminho Grant vigente → Role escolar → RolePermission → Permission aplicável; ausência/revogação/expiração/inaplicabilidade nega.

### INT-005 — Verificar fluxo MVP completo

- **Prioridade:** P1
- **Objetivo:** executar o caminho positivo de ponta a ponta e seus principais casos de negação.
- **Dependências:** INT-001–INT-004, TEST-001–TEST-009.
- **Critério de aceite:** fluxo Login → Session → Membership ativa → School Context válido → Permission aplicável retorna acesso permitido apenas à ação/recurso validados; caso contrário nega fail closed; teste completo TEST-010 passa.

## Tests

| ID         | Cenário            | Itens principais                                                   | Critério objetivo                                                                                                                                                                                                     |
| ---------- | ------------------ | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TEST-001` | Login válido       | AUTH-002–AUTH-007, INT-001                                         | User `ACTIVE`, credencial válida e limites disponíveis criam Session associada, dentro dos limites; resultado não inclui autoridade escolar. Corresponde a AT-001.                                                    |
| `TEST-002` | Login inválido     | AUTH-001–AUTH-004, AUTH-007, INT-001                               | Senha incorreta, User inexistente/inelegível ou rate limit excedido têm falha externa genérica e não criam Session. Corresponde a AT-002/AT-003.                                                                      |
| `TEST-003` | Membership ativa   | MEM-005, MEM-008–MEM-010, SC-003, INT-002                          | Membership `ACTIVE` corresponde ao User autenticado e School solicitada; User/School canônicos são os mesmos do contexto. Corresponde a MAT-001/MAT-002 quando se observa o lifecycle e SCT-001 para resolução.       |
| `TEST-004` | Membership inativa | MEM-005, MEM-007, SC-003, INT-002                                  | `PENDING`, `REVOKED` ou Membership ausente/inconsistente não gera contexto nem acesso; Login permanece válido. Corresponde a SCT-002 e a negações de MAT-002/MAT-003/MAT-006.                                         |
| `TEST-005` | Role válida        | MEM-004, MEM-006, MEM-010, SC-005, INT-004                         | Role escolar permitida e Grant vigente derivam Permission aplicável no mesmo escopo; autorização é limitada à operação/recurso. Corresponde a MAT-004/SCT-005.                                                        |
| `TEST-006` | Role removida      | MEM-006, MEM-011, SC-005, INT-004                                  | Após `RevokeRole`, Grant deixa de autorizar imediatamente, histórico permanece e Membership não é removida. Corresponde a MAT-005.                                                                                    |
| `TEST-007` | School válida      | SC-002–SC-004, INT-003                                             | Owner Schools confirma School existente/habilitada e `schoolId` coincide com Membership e recurso. Corresponde a SCT-003.                                                                                             |
| `TEST-008` | School inválida    | SC-002–SC-004, INT-003                                             | School inexistente/desabilitada, não verificável ou divergente resulta em negação sem fallback. Corresponde a SCT-004.                                                                                                |
| `TEST-009` | Fail Closed        | AUTH-006–AUTH-008, MEM-003–MEM-007, SC-002–SC-005, INT-002–INT-004 | Falha/indisponibilidade de Session, User, Membership, School, Grant, Role, Permission ou recurso não produz autorização nem contexto permissivo. Corresponde a SCT-006 e AT-004/AT-005.                               |
| `TEST-010` | Fluxo completo     | INT-001–INT-005                                                    | A cadeia Login → Session → CreateMembership → ActivateMembership → GrantRole → ResolveSchoolContext → ResolvePermissions permite somente ação/recurso válidos no escopo confirmado; qualquer predicado inválido nega. |

Correspondências adicionais preservadas: AT-004 cobre expiração absoluta/inatividade da Session; AT-005 cobre logout/revogação; MAT-003 cobre DeactivateMembership; SCT-005/006 cobrem Permission aplicável e falha fechada. Os testes originais AT/MAT/SCT e contratos MCT permanecem rastreáveis às fontes.

## MVP Path

1. **Login:** `AUTH-007` autentica User `ACTIVE` com credencial válida; `TEST-001` verifica sucesso e nenhuma autoridade escolar implícita.
2. **Session:** `AUTH-005` cria Session server-side; `AUTH-006` valida estado vigente; `INT-001` confirma Login → Session.
3. **CreateMembership:** `MEM-008` cria Membership `PENDING` usando User ativo e School habilitada.
4. **ActivateMembership:** `MEM-009` transiciona a Membership criada para `ACTIVE`; é obrigatório porque GrantRole exige Membership ativa.
5. **GrantRole:** `MEM-010` cria Grant vigente para Role escolar permitida na mesma School.
6. **ResolveSchoolContext:** `MEM-007`/`SC-002–SC-004` confirmam Session/User, School, Membership e escopo do recurso no servidor.
7. **ResolvePermissions:** `SC-005` deriva Permission pela cadeia Grant → Role → RolePermission.
8. **Acesso autorizado:** `INT-004` permite somente a ação/recurso validados; `TEST-010` verifica o caminho completo.

```text
Login
  ↓
Session válida
  ↓
CreateMembership (PENDING)
  ↓
ActivateMembership (ACTIVE)
  ↓
GrantRole (Grant vigente)
  ↓
ResolveSchoolContext (School + Membership + recurso/escopo)
  ↓
ResolvePermissions (RolePermission aplicável)
  ↓
Acesso autorizado somente à operação/recurso verificados
```

Pré-condições do caminho: User alvo ativo; School existente/habilitada; ator administrativo autenticado e autorizado conforme decisões existentes; Role escolar aprovada e permitida; Grant dentro da validade; recurso e Permission correspondentes. Não criar automaticamente qualquer desses vínculos ou privilégios.

## Definition of Done

O MVP de Auth, Membership e School Context pode ser considerado funcional quando todos os itens abaixo forem verdadeiros:

- [ ] AUTH-001–AUTH-010 implementados e verificados conforme seus critérios.
- [ ] AUTH-011 — verificação integrada Auth V1 concluída.
- [ ] MEM-001–MEM-011 implementados e verificados conforme seus critérios.
- [ ] MEM-012 — verificação integrada Membership V1 concluída.
- [ ] SC-001–SC-005 implementados e verificados conforme seus critérios.
- [ ] SC-006 — verificação integrada School Context concluída.
- [ ] INT-001–INT-004 concluídos; INT-005 passa o fluxo completo.
- [ ] TEST-001–TEST-010 passam de forma repetível; AT-001–AT-005, MAT-001–MAT-006, MCT-001–MCT-006 e SCT-001–SCT-006 permanecem rastreáveis e cobertos.
- [ ] HealthCheckAuth retorna `READY` quando dependências obrigatórias estão disponíveis e `NOT_READY` quando alguma falha.
- [ ] Sessões respeitam validade absoluta, inatividade, revogação server-side e limite máximo de cinco sessões ativas.
- [ ] Membership respeita lifecycle, unicidade ativa por User–School, referências canônicas, escopo e preservação de histórico.
- [ ] Grant respeita validade, revogação imediata, unicidade vigente por Membership–Role e escopo; Permissions derivam somente de RolePermission.
- [ ] `schoolId` é validado no servidor para School/Membership/recurso; múltiplas Memberships não combinam permissões nem selecionam escola implicitamente.
- [ ] Qualquer falha de validação necessária resulta em negação; não há fallback permissivo.
- [ ] Login sem Membership continua sendo autenticação válida, mas não permite acesso escolar.
- [ ] Eventos usados limitam-se aos documentados e só são emitidos após mutações efetivas; criação pendente não emite `MembershipCreated`.
- [ ] Ownership e comunicação entre módulos respeitam fronteiras públicas; Auth não lê/escreve internals de Users/Schools e não há novos módulos/bounded contexts.
- [ ] Nenhuma funcionalidade fora do escopo Auth V1, Membership V1 e School Context MVP foi incluída.

## READY TO IMPLEMENT

**SIM**

Os artefatos aprovados definem serviços, responsabilidades, dependências, entradas/saídas, invariantes, critérios e testes necessários para iniciar e concluir a implementação dentro do escopo congelado. Disponibilidade de contratos públicos e infraestrutura de execução é dependência de entrega, não dependência arquitetural restante.
