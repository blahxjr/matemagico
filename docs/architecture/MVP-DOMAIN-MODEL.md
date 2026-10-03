# MVP Domain Model

**Data de referência:** 2026-10-01  
**Escopo:** consolidação do modelo de domínio mínimo para o MVP.  
**Natureza:** análise documental; não cria entidades, agregados, bounded contexts, eventos, APIs, schema ou código.  
**Status:** ADR-0002, ADR-0003 e ADR-0004 permanecem `Proposed`; este documento não os ratifica.

## Convenções de evidência

- **Explícito:** conceito, ownership, evento ou regra está nomeado diretamente em uma fonte autorizada.
- **Implícito:** a relação é descrita, mas sua forma como agregado/entidade ou seu vínculo ao fluxo não está formalizado completamente.
- **Inferido:** conclusão limitada derivada das relações documentadas, sem acrescentar regra de domínio.
- **Ambíguo:** as fontes autorizadas divergem, ou não fornecem evidência suficiente para escolher uma interpretação.
- “Aprovado para o MVP” significa incluído no recorte de análise dos documentos anteriores; não significa que uma decisão `Proposed` foi ratificada.
- Identificadores/campos não são classificados como Value Objects sem evidência de que as fontes lhes atribuam essa forma de modelagem.
- Eventos abaixo são exclusivamente nomes constantes de [MVP-DOMAIN-EVENTS.md](MVP-DOMAIN-EVENTS.md); não são declarações de que estejam implementados.

## Fontes permitidas

- [MVP-AGGREGATES.md](MVP-AGGREGATES.md)
- [MVP-USE-CASES.md](MVP-USE-CASES.md)
- [MVP-DOMAIN-EVENTS.md](MVP-DOMAIN-EVENTS.md)
- [ADR-0002 — Module Boundaries](ADRs/ADR-0002-module-boundaries.md)
- [ADR-0003 — Database Strategy](ADRs/ADR-0003-database-strategy.md)
- [ADR-0004 — Authentication and Authorization](ADRs/ADR-0004-authentication-authorization.md)

---

## Parte 1 — Inventário do domínio

O inventário contém somente conceitos requeridos pelo MVP ou necessários para expressar os limites documentados. Referências a módulos auxiliares são dependências existentes, não novos agregados do MVP.

### Aggregate Roots

| Aggregate Root / candidato | Fonte                                                                                | Owner                | Evidência                                                                                                                                                                                                                                           |
| -------------------------- | ------------------------------------------------------------------------------------ | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **User**                   | MVP-AGGREGATES: Parte 1 §1; ADR-0004 §2.1                                            | Users                | User como identidade global é **Explícito**. O mapa de agregados classifica User como raiz candidata **Inferida**; MVP-DOMAIN-EVENTS o trata como raiz aprovada/listada. Status da raiz entre os artefatos é **Ambíguo**.                           |
| **SchoolMembership**       | MVP-AGGREGATES: Partes 1 §2 e 6; MVP-DOMAIN-EVENTS: Parte 2; ADR-0004 §2.1           | Auth / Authorization | O conceito, owner e vínculo User–School são **Explícitos**. MVP-DOMAIN-EVENTS a apresenta como Aggregate Root aprovado; MVP-AGGREGATES a chama candidata e nega raiz formal de Auth. Autoridade do status de raiz fica **Ambígua** entre artefatos. |
| **School**                 | MVP-AGGREGATES: Parte 1 §3; MVP-DOMAIN-EVENTS: Parte 2; ADR-0002 §2.3; ADR-0003 §2.2 | Schools              | School/owner são **Explícitos**; MVP-AGGREGATES classifica a raiz como candidata **Inferida**, enquanto MVP-DOMAIN-EVENTS a lista como Aggregate Root. Status formal é **Ambíguo**.                                                                 |
| **Class**                  | MVP-AGGREGATES: Parte 1 §4; MVP-DOMAIN-EVENTS: Parte 2; ADR-0002 §2.3; ADR-0003 §2.2 | Classes              | Class/owner são **Explícitos**; raiz é candidata **Inferida** em MVP-AGGREGATES, mas listada como Aggregate Root em MVP-DOMAIN-EVENTS. Status formal é **Ambíguo**.                                                                                 |
| **Question**               | MVP-AGGREGATES: Parte 1 §5; MVP-DOMAIN-EVENTS: Parte 2; ADR-0002 §2.3; ADR-0003 §2.2 | Questions            | Question/owner/versionamento são **Explícitos**; evidência de raiz vem do exemplo do Documento Mestre, referido por MVP-AGGREGATES; os ADRs atuais não formalizam sua composição detalhada. Status formal é **Ambíguo**.                            |
| **Attempt**                | MVP-AGGREGATES: Parte 1 §6; MVP-DOMAIN-EVENTS: Parte 2; ADR-0002 §2.3; ADR-0003 §2.2 | Attempts             | Tentativa, respostas/resultados e owner são **Explícitos**. O uso de invariantes do agregado Attempt em MVP-AGGREGATES dá evidência mais forte de raiz que para as demais.                                                                          |

**Limite:** Auth / Authorization é owner de credenciais, sessão, memberships e grants, mas não é incluído como um Aggregate Root adicional chamado `Login` ou `Auth`. Ranking tampouco é raiz: é projeção. Isso evita criar agregados não documentados.

### Entidades e conceitos entidade-like

| Item documentado                                 | Agregado Pai                                                                                         | Owner                                          | Evidência                                                                                                                                              |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Profile / UserProfile**                        | User — composição interna não formalizada                                                            | Users                                          | Profile associado a User e um perfil por User são **Explícitos** em ADR-0004; ser entidade interna do agregado User é **Inferido**.                    |
| **AuthAccount**                                  | Não especificado como filho de uma raiz; referencia User                                             | Auth / Authorization                           | Vínculo User–provider é **Explícito**. Não afirmar que esteja dentro do agregado User.                                                                 |
| **PasswordCredential**                           | Não especificado como filho de uma raiz; associada à identidade                                      | Auth / Authorization                           | Credencial separada de User/Profile é **Explícita**.                                                                                                   |
| **AuthSession / registro de revogação**          | Não especificado como filho de uma raiz                                                              | Auth / Authorization                           | Sessão/revogação server-side é **Explícita**; relacionamento de agregado é **Ambíguo**.                                                                |
| **Role**                                         | Catálogo de Auth; agregado pai não especificado                                                      | Auth / Authorization                           | Papel nomeado com escopo permitido é **Explícito**; concessão não é prova suficiente de autorização.                                                   |
| **Permission**                                   | Catálogo de Auth; agregado pai não especificado                                                      | Auth / Authorization                           | Ação atômica sobre recurso, avaliada com escopo/contexto, é **Explícita**.                                                                             |
| **RolePermission**                               | Relação Role–Permission; agregado pai não especificado                                               | Auth / Authorization                           | Relação documentada e versionada/auditada é **Explícita**; composição em raiz não especificada.                                                        |
| **MembershipRoleAssignment**                     | SchoolMembership ou coleção separada de Auth — pai não formalizado                                   | Auth / Authorization                           | Concessão ligada à membership e limitada ao `schoolId` é **Explícita**; inclusão dentro da fronteira do agregado é **Ambígua**.                        |
| **GlobalRoleAssignment**                         | Atribuição Auth global; agregado pai não especificado                                                | Auth / Authorization                           | Concessão global separada de membership, sem `schoolId`, é **Explícita**; composição em raiz não especificada.                                         |
| **SchoolSettings**                               | School — pertencimento ao owner explícito, composição interna inferida                               | Schools                                        | Configuração institucional por escola é **Explícita**; entidade interna do agregado School é **Inferida**.                                             |
| **Enrollment / ClassEnrollment**                 | Class — vínculo pedagógico; inclusão interna é inferida                                              | Classes                                        | Relação Student–Class e owner Classes são **Explícitos**; cardinalidade e composição sob Class são **Inferidas**.                                      |
| **ClassTeachingAssignment**                      | Class — vínculo docente; inclusão interna é inferida                                                 | Classes                                        | Atribuição a turma e escopo escolar são **Explícitos**; composição exata sob Class é **Inferida**.                                                     |
| **QuestionVersion**                              | Question (relação de versionamento explícita; forma de entidade interna não totalmente especificada) | Questions                                      | Question possui versões e versões publicadas são conceitualmente imutáveis (**Explícito**); fronteira exata de persistência/aggregate é **Implícita**. |
| **QuestionOption**                               | Question/QuestionVersion — associação exata não especificada                                         | Questions                                      | Opções constam no data map do ADR-0003; associação ao agregado é **Implícita**.                                                                        |
| **QuestionAsset**                                | Question/QuestionVersion — associação exata não especificada                                         | Questions                                      | Asset consta no data map do ADR-0003; associação ao agregado é **Implícita**.                                                                          |
| **QuestionPublication**                          | Question/QuestionVersion — lifecycle/escopo parcial                                                  | Questions                                      | Conceito consta no data map, mas seu lifecycle está marcado como parcial; associação ao agregado é **Ambígua**.                                        |
| **Question topic/competency/skill/source links** | Referenciam Question/versão e conceitos sob owners próprios; agregado pai físico não definido        | Questions para os links; Topics para taxonomia | Relações por IDs/links e ownership separados são **Explícitos**; sua forma como entidades internas é **Implícita**.                                    |
| **AttemptAnswer**                                | Attempt                                                                                              | Attempts                                       | Respostas pertencem à tentativa e não são cópia aberta no Question Engine (**Explícito**).                                                             |
| **AttemptEvidence**                              | Attempt, se necessária                                                                               | Attempts                                       | Item condicional no data map (“se necessário”); existência no MVP é **Ambígua / não obrigatória**.                                                     |
| **RankingSnapshot / RankingEntry**               | Não são entidades internas de Attempt; componentes da projeção de Rankings                           | Rankings                                       | Snapshot/Entry e seu caráter de read model são **Explícitos**; não são agregados canônicos.                                                            |

“Entidade” nesta tabela distingue conceitos documentados de value objects. A presença de um nome no data map conceitual não resolve automaticamente se é entidade de domínio, entidade interna ou referência entre agregados.

### Value Objects

**Fato documentado:** as fontes permitidas não definem uma lista de Value Objects para os agregados MVP nem declaram formalmente que os itens abaixo sejam VOs.

| Conceito de valor/identificador presente nas fontes                                                  | Owner / contexto                                      | Classificação                                                                                                                                               |
| ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `userId`, `membershipId`, `schoolId`, `classId`, `questionId`, `attemptId`, `roleId`, `permissionId` | Contextos proprietários correspondentes               | **Explícito** como identificadores distintos/referências; Value Object **não confirmado**.                                                                  |
| Email normalizado                                                                                    | Auth / identidade                                     | Regra de normalização e unicidade global para login por email são **Explícitas** em ADR-0004; Value Object de Email é **Inferido**, não aprovado como tipo. |
| Escopo (global, school, class, personal)                                                             | Auth / Authorization e consumidor do recurso          | Escopos de autorização são **Explícitos**; VO formal é **não confirmado**.                                                                                  |
| Resposta submetida, timestamp, resultado categorizado, versão/critério e período                     | Attempts, Question Engine ou Rankings conforme o fato | São dados/atributos conceituais **Explícitos**; tipos imutáveis/VOs são **não confirmados**.                                                                |

**Resultado do inventário de VOs:** não se nomeia nenhum Value Object como elemento formal aprovado do MVP. Essa ausência é documental; este modelo não cria tipos para preenchê-la.

### Projeções

| Projeção / read model                        | Owner                                                            | Origem                                                                                                     | Evidência                                                                                                                             |
| -------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Ranking / RankingSnapshot / RankingEntry** | Rankings                                                         | `AttemptCompleted`; eventos de Championships se a regra exigir campeonato                                  | Como projeção derivada de fatos elegíveis é **Explícito**. Elegibilidade, score, desempate e período do ranking MVP são **Ambíguos**. |
| **Analytics Read Model**                     | Analytics                                                        | Eventos autorizados dos módulos produtores, incluindo eventos MVP quando aplicável                         | Projeções analíticas e consumo assíncrono são **Explícitos**; Analytics avançado está fora do escopo funcional deste MVP.             |
| **Projeções de membership/autorização**      | Consumer correspondente / Auth para autorização                  | `MembershipCreated`, `MembershipRemoved`, `RoleGranted`, `RoleRevoked` e eventos de estado de User         | Invalidação de autorização/cache por eventos é **Explícita**; existência/formato de um read model específico é **Inferida**.          |
| **Projeções de Classes / matrícula**         | Consumer que mantém a projeção; fonte Class continua sob Classes | `School*`, `StudentEnrolled`, `StudentUnenrolled`                                                          | Consumers e projeções de matrícula são documentados; projeção concreta é **Inferida**.                                                |
| **Projeções de Questions/Engine**            | Questions ou Question Engine, conforme projeção própria          | Mudanças de Topics/Questions, `QuestionPublished`, `QuestionRetired`, eventualmente `QuestionSetGenerated` | Consumers são documentados; necessidade de cada projeção é condicional (**Implícita**).                                               |

---

## Parte 2 — Aggregate Roots

Status das raízes: a lista abaixo é a seleção MVP requisitada. Onde os artefatos divergem entre “raiz candidata” e “raiz explicitamente listada”, a classificação é **Ambígua** até reconciliação; não se cria nem amplia boundary.

| Aggregate Root       | Responsabilidade documentada                                                                                                                                | Owner                                                         | Eventos emitidos documentados                                                                                                                                                     | Casos de uso associados                                                           |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| **User**             | Identidade global, estado da conta e perfil de produto minimizado; não mantém credenciais, grants ou `schoolId` principal.                                  | Users. Auth referencia a identidade, mas não possui o perfil. | `UserCreated`, `UserActivated`, `UserProfileUpdated`, `UserDeactivated`, `UserReactivated`, `UserSuspended` (Users). `UserRegistered` é de Auth, não User.                        | A-01, P-01, D-01; User é referência em A-02/D-04/D-06, não dono desses fluxos.    |
| **SchoolMembership** | Vínculo de acesso User–School e ciclo de vida institucional; papéis escolares são concessões distintas vinculadas a membership.                             | Auth / Authorization.                                         | `MembershipCreated`, `MembershipRemoved`, `RoleGranted`, `RoleRevoked` (Auth). Os eventos de papel só se aplicam quando há mudança de concessão; não são emitidos por cada login. | A-02, D-04, autorização de P-02/P-03 e operações escolares D-03/D-05/D-06.        |
| **School**           | Instituição/tenant, configuração, estado e `schoolId`. Não possui Class nem membership.                                                                     | Schools.                                                      | `SchoolCreated`, `SchoolUpdated`, `SchoolDeactivated`.                                                                                                                            | D-02, D-03; contexto/referência em A-02, D-04/D-05/D-06 e P-02/P-03.              |
| **Class**            | Organização de turma, Enrollment e atribuições docentes no escopo da escola.                                                                                | Classes.                                                      | `ClassCreated`, `ClassUpdated`, `StudentEnrolled`, `StudentUnenrolled`.                                                                                                           | D-05, D-06, D-07, P-02/P-03; A-06 é Pós-MVP/contrato de leitura não especificado. |
| **Question**         | Curadoria de conteúdo, versões, opções/gabarito/explicação, metadados e publicação. Não seleciona adaptativamente, registra tentativas nem calcula ranking. | Questions.                                                    | `QuestionCreated`, `QuestionUpdated`, `QuestionPublished`, `QuestionRetired`.                                                                                                     | A-03; publicação editorial/pre-carga; Question/versão é dependência de A-04.      |
| **Attempt**          | Registrar início, respostas e resultado de atividade; tentativa concluída é conceitualmente imutável, ressalvada anotação auditada conforme fonte.          | Attempts.                                                     | `AttemptStarted`, `QuestionAnswered`, `AttemptCompleted`.                                                                                                                         | A-04; seu `AttemptCompleted` alimenta a projeção de A-05.                         |

### Limite complementar: autenticação e avaliação

- Login é caso de uso de Auth / Authorization; os conceitos de credencial/sessão pertencem a Auth, mas não há Aggregate Root `Login` ou raiz única de Auth declarada.
- Question Engine fornece seleção/avaliação por contrato. `AnswerEvaluated` é produzido pelo Engine e pode ser retorno síncrono ou evento; não é emitido pelo agregado Attempt.
- Ranking emite `RankingUpdated`/`ParticipantRankChanged` como owner da projeção, não como agregado de domínio canônico.

---

## Parte 3 — Entidades internas

| Entidade                                     | Agregado Pai                                                               | Evidência                                                                                                                          |
| -------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Profile / UserProfile                        | User — relação explícita; inclusão como entidade interna **Inferida**      | ADR-0004 define um perfil por User e separa o perfil das credenciais. MVP-AGGREGATES ressalva que composição não está formalizada. |
| MembershipRoleAssignment                     | SchoolMembership — associação explícita, pertença interna **Ambígua**      | ADR-0004 liga a concessão à membership e ao `schoolId`; não declara formalmente limite da raiz.                                    |
| SchoolSettings                               | School — owner explícito, inclusão interna **Inferida**                    | ADR-0003 atribui configuração escolar a Schools; MVP-AGGREGATES diz que pode integrar School, sem fixar composição.                |
| Enrollment / ClassEnrollment                 | Class — relação Class–Student explícita, inclusão interna **Inferida**     | ADR-0002/0003 atribuem matrícula a Classes; regras/cardinalidades e invariantes completas não estão especificadas.                 |
| ClassTeachingAssignment                      | Class — associação à turma explícita, inclusão interna **Inferida**        | ADR-0002/0003 atribuem vínculo docente a Classes; detalhes de lifecycle e composição não estão formalizados.                       |
| QuestionVersion                              | Question — versionamento explícito, fronteira interna **Implícita**        | ADR-0003 define versões publicadas imutáveis; MVP-AGGREGATES classifica composição atual como a ratificar.                         |
| QuestionOption                               | Question/QuestionVersion — pai exato **Ambíguo**                           | Consta no data map de Questions; versão a que se liga não está fixada no material permitido.                                       |
| QuestionAsset                                | Question/QuestionVersion — pai exato **Ambíguo**                           | Consta no data map de Questions; versão a que se liga não está fixada no material permitido.                                       |
| QuestionPublication                          | Question/QuestionVersion — relação de owner explícita, pai **Ambíguo**     | Consta no mapa de Questions; lifecycle/escopo de publicação são parciais.                                                          |
| Question topic/competency/skill/source links | Referências associadas à Question/versão; associação interna **Implícita** | ADR-0003 lista links; Topics/taxonomia permanece sob owner próprio e a questão não incorpora esses conceitos.                      |
| AttemptAnswer                                | Attempt                                                                    | Resposta é mantida em Attempts; o glossário e ADR-0003 distinguem resposta registrada da avaliação do Engine.                      |
| AttemptEvidence                              | Attempt, se necessária                                                     | ADR-0003 a marca opcional; não é dependência obrigatória do MVP.                                                                   |

**Não são entidades internas dos agregados MVP:** AuthAccount/PasswordCredential/AuthSession não pertencem a User; School não contém Class nem SchoolMembership; Enrollment não é SchoolMembership; Question Engine não contém Question nem Attempt; RankingEntry não é entidade interna de Attempt.

---

## Parte 4 — Projeções

| Projeção                                | Classificação                                                           | Explicação                                                                                                                                                                           |
| --------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Ranking**                             | **Confirmada**                                                          | Rankings é owner de uma classificação projetada a partir de fatos elegíveis; consome `AttemptCompleted` de forma assíncrona. Não altera Attempt nem é fonte de verdade da tentativa. |
| **RankingSnapshot / RankingEntry**      | **Confirmadas como modelos de projeção**                                | Snapshot/Entry são projeções/read models; não são Aggregate Roots. Escopo/versão devem ser declarados, mas regra concreta do ranking MVP está em aberto.                             |
| **Analytics Read Model**                | **Confirmada como capacidade arquitetural; fora da funcionalidade MVP** | Analytics constrói projeções a partir de eventos autorizados. A projeção em si não entra como funcionalidade de desempenho avançado no MVP.                                          |
| **Projeção de matrícula/autorização**   | **Inferida**                                                            | Eventos podem invalidar cache ou alimentar consumidores; as fontes não formalizam um modelo de leitura específico nem exigem sua existência.                                         |
| **Projeção derivada de Question/Topic** | **Inferida / condicional**                                              | Consumers recebem eventos e podem manter estado próprio; contratos de leitura síncrona também são previstos. A projeção específica não está definida.                                |
| **QuestionMetricSnapshot**              | **Ambígua e fora do MVP**                                               | ADR-0003 documenta consumo pelo Question Engine; o modo em relação às fronteiras do ADR-0002 não está harmonizado.                                                                   |

---

## Parte 5 — Eventos no domínio

O encadeamento abaixo usa somente eventos nomeados no catálogo de [MVP-DOMAIN-EVENTS.md](MVP-DOMAIN-EVENTS.md). “Aggregate Root” aponta o fato/agregado ao qual o evento se associa conforme documentação; quando o producer é um contexto e o fato não é evento da raiz indicada, isso está explícito.

| Evento                                                                                       | Aggregate Root / fato associado                                                 | Producer             | Consumer documentado                                                                                   |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------ |
| `UserRegistered`                                                                             | Registro de identidade; User é provisionado depois, não é producer deste evento | Auth / Authorization | Users                                                                                                  |
| `UserCreated`                                                                                | User                                                                            | Users                | Consumers autorizados                                                                                  |
| `UserLoggedIn`                                                                               | Fato de autenticação, sem Aggregate Root Login                                  | Auth / Authorization | Analytics/segurança                                                                                    |
| `AuthenticationFailed`                                                                       | Fato de autenticação, sem Aggregate Root Login                                  | Auth / Authorization | Security Audit; Analytics agregado/minimizado se permitido                                             |
| `UserLoggedOut`                                                                              | Fato de sessão/logout, sem Aggregate Root Login                                 | Auth / Authorization | Analytics/segurança                                                                                    |
| `EmailVerified`                                                                              | Fato de autenticação/verificação, sem raiz User                                 | Auth / Authorization | Users antecede `UserActivated`; Security Audit                                                         |
| `UserActivated`, `UserProfileUpdated`, `UserDeactivated`, `UserReactivated`, `UserSuspended` | User/estado global de conta                                                     | Users                | Audit, Auth e consumers autorizados conforme evento/política                                           |
| `MembershipCreated`, `MembershipRemoved`                                                     | SchoolMembership                                                                | Auth / Authorization | Audit; invalidação de autorização/cache; consumers autorizados                                         |
| `RoleGranted`, `RoleRevoked`                                                                 | Atribuição de papel; ligada à membership quando escolar                         | Auth / Authorization | Audit; invalidação de autorização/cache                                                                |
| `SchoolCreated`, `SchoolUpdated`, `SchoolDeactivated`                                        | School                                                                          | Schools              | Classes; Auth/Authorization conforme necessidade; Analytics                                            |
| `ClassCreated`, `ClassUpdated`, `StudentEnrolled`, `StudentUnenrolled`                       | Class / Enrollment                                                              | Classes              | Analytics; Study Paths em regra por turma quando habilitada; consumers de projeção de matrícula        |
| `TopicUpdated`, `TopicRetired`                                                               | Topic (referência fora das raízes aprovadas deste recorte)                      | Topics               | Questions; Question Engine; Analytics quando necessário                                                |
| `QuestionCreated`, `QuestionUpdated`, `QuestionPublished`, `QuestionRetired`                 | Question                                                                        | Questions            | Question Engine; Analytics                                                                             |
| `QuestionSetGenerated`                                                                       | Seleção/snapshot do Question Engine; não é Question nem Attempt                 | Question Engine      | Attempts; Study Paths; Mock Exams                                                                      |
| `AnswerEvaluated`                                                                            | Avaliação de resposta fornecida pelo Engine; não é entidade/agregado universal  | Question Engine      | Attempts (retorno síncrono ou evento); Analytics minimizado                                            |
| `AttemptStarted`, `QuestionAnswered`, `AttemptCompleted`                                     | Attempt / resposta / conclusão da tentativa                                     | Attempts             | Analytics; Study Paths/Mock Exams/Championships conforme contexto; Rankings consome `AttemptCompleted` |
| `RankingUpdated`, `ParticipantRankChanged`                                                   | Projeção Ranking                                                                | Rankings             | Badges se regra exigir colocação; Analytics                                                            |

**Eventos de fora do fluxo funcional MVP** (p.ex., Study Paths, Mock Exams, Championships, Badges, Certificates, Reports e AI) não são reproduzidos aqui como contratos usados; estão identificados em [MVP-DOMAIN-EVENTS.md](MVP-DOMAIN-EVENTS.md) e excluídos conforme o escopo.

---

## Parte 6 — Casos de uso

| Caso de Uso                               | Aggregate Root                                                                      | Evento(s) relacionado(s)                                                                               | Ligação e evidência                                                                                                                   |
| ----------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| A-01 / P-01 / D-01 — Entrar na plataforma | User como identidade; Auth é owner da autenticação e não tem raiz Login documentada | `UserLoggedIn`, `AuthenticationFailed`; `UserLoggedOut` quando há logout                               | Eventos registram fatos de autenticação; sucesso/falha da operação é síncrono por contrato. Eventos não são condição para autenticar. |
| A-02 — Acessar escola                     | SchoolMembership; School como recurso/escopo                                        | Nenhum evento para mera seleção/validação                                                              | Autorização server-side valida sessão, membership, permission e correspondência `schoolId`; leitura/validação não cria evento novo.   |
| D-02 — Criar escola                       | School                                                                              | `SchoolCreated`                                                                                        | Schools declara criação; Classes e Analytics são consumers documentados.                                                              |
| D-03 — Consultar/configurar escola        | School                                                                              | `SchoolUpdated` quando houver alteração; nenhum evento para mera consulta                              | `getSchool`/`updateSchool` são contratos documentados; evento acompanha mudança de estado, não leitura.                               |
| D-04 — Gerenciar membership               | SchoolMembership                                                                    | `MembershipCreated`, `MembershipRemoved`; `RoleGranted`, `RoleRevoked` quando o papel muda             | Auth possui membership/grants; Audit e invalidação de autorização são consumers nomeados.                                             |
| D-05 — Criar turma                        | Class                                                                               | `ClassCreated`                                                                                         | Classes é producer; Analytics é consumer documentado.                                                                                 |
| D-06 — Matricular/remover estudante       | Class / Enrollment                                                                  | `StudentEnrolled`, `StudentUnenrolled`                                                                 | Classes é owner de Enrollment; evento não altera SchoolMembership.                                                                    |
| P-02 — Professor acessar turma atribuída  | SchoolMembership + Class/atribuição como contexto de autorização                    | Nenhum evento obrigatório para validar acesso; eventos de estado são consumidos quando necessário      | Autorização é síncrona e contextual; a role `TEACHER` sem atribuição não basta.                                                       |
| P-03 / D-07 — Consultar roster            | Class / Enrollment                                                                  | Nenhum evento para consulta; `StudentEnrolled`/`StudentUnenrolled` podem alimentar projeção            | Roster é contrato de leitura; projeção é condicional.                                                                                 |
| A-03 — Consultar questão publicada        | Question                                                                            | Nenhum evento para consulta; `QuestionPublished` informa mudança de publicação a consumers             | Consulta por contrato; `QuestionPublished` não precisa ser emitido de novo por leitura.                                               |
| Publicar conteúdo curado                  | Question                                                                            | `QuestionPublished`                                                                                    | Questions é producer; Question Engine/Analytics são consumers. Ator editorial é `EDITOR_OPERATOR` conforme casos MVP.                 |
| A-04 — Resolver questão                   | Question como referência/snapshot; Attempt como raiz mutável da execução            | `AttemptStarted`, `QuestionAnswered`, `AttemptCompleted`; `AnswerEvaluated` pelo Engine                | Engine retorna avaliação; Attempts registra resposta/resultado e publica outcomes após commit para consumers.                         |
| A-05 — Consultar Ranking                  | Projeção Ranking; fato de origem Attempt                                            | `AttemptCompleted` alimenta projeção; `RankingUpdated`/`ParticipantRankChanged` após mudança projetada | Consulta lê estado eventualmente consistente; não altera Attempt nem espera Analytics.                                                |

### Casos Pós-MVP/descartados

- A-06 (aluno consulta turmas próprias): `Class`/Enrollment documentados, mas caso de leitura não tem contrato explícito. Pós-MVP/validar.
- P-04 (professor solicita matrícula): processo de aprovação não documentado; não há evento de solicitação nomeado.
- P-05 (professor cria Class) e P-06 (professor publica Question): descartados para esse ator pela matriz de permissão; não criar eventos alternativos.
- Desempenho analítico avançado, recommendation, AI, certificados, badges complexos e telemetria ficam fora.

---

## Parte 7 — Invariantes

Somente regras encontradas nos documentos autorizados aparecem abaixo. “Inferida” indica relação necessária para expressar o fluxo, não uma regra adicional aprovada.

| Invariante / regra                                                                                                                              | Classificação                                             | Evidência e limite                                                                                                                                 |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| User é identidade global e pode participar de várias escolas; `User.role`/`User.schoolId` não são autoridade de acesso                          | **Explícita**                                             | ADR-0004 §2.1; User não guarda grants nem role escolar.                                                                                            |
| A autorização protegida é validada no servidor, deny-by-default, com permission, escopo, membership/atribuição vigente e recurso correspondente | **Explícita**                                             | ADR-0004 §2.4; cliente não prova acesso ao enviar `schoolId`.                                                                                      |
| SchoolMembership representa acesso User–School; Enrollment representa vínculo Student–Class e são conceitos distintos                           | **Explícita**                                             | ADR-0002/0003/0004 e conceitos retomados nos mapas MVP.                                                                                            |
| Membership escolar e MembershipRoleAssignment levam escopo escolar e papel não ultrapassa o `schoolId`                                          | **Explícita**                                             | ADR-0004 §2.1; autorização também valida recurso e estado.                                                                                         |
| Há no máximo um vínculo ativo por User/escola                                                                                                   | **Explícita na proposta ADR-0004**                        | Regra textual da entidade SchoolMembership; ADR continua Proposed.                                                                                 |
| Class, Enrollment e atribuições docentes são escopados a `schoolId`; Class Scope deve corresponder à escola do contexto autorizado              | **Explícita**                                             | ADR-0002/0003/0004; validação executável ainda não provada.                                                                                        |
| Dados institucionais/tentativa institucional levam `schoolId`; toda tentativa institucional exige esse escopo                                   | **Explícita**                                             | ADR-0003 §1/§2.2; não aplicar `schoolId` a catálogo global sem escopo declarado.                                                                   |
| Questões publicadas têm versões conceitualmente imutáveis; Question é owner do conteúdo, Engine avalia/seleciona sem possuí-lo                  | **Explícita**                                             | ADR-0002/0003; os detalhes de qual snapshot cada fluxo usa são parcialmente ambíguos.                                                              |
| Uma resolução MVP usa conteúdo publicado/snapshot e registra a execução em Attempt                                                              | **Inferida do fluxo documentado**                         | Casos A-03/A-04 e dependências do Engine em MVP-USE-CASES; relação Question/Attempt é por referência, sem transferência de ownership.              |
| Attempt registra execução/respostas/resultado; após finalizada é imutável, ressalvada anotação auditada conforme conceito documental            | **Explícita**                                             | ADR-0002 §2.3; glossário e MVP-AGGREGATES.                                                                                                         |
| Attempts avalia por contrato do Question Engine; Engine não mantém cópia aberta de respostas brutas nem Attempt altera gabarito                 | **Explícita**                                             | ADR-0002 §2.3/§2.6; ADR-0003 §2.6.                                                                                                                 |
| `AttemptCompleted` pode alimentar Ranking, mas elegibilidade e semântica de Score não são universais nem estão completamente definidas          | **Explícita quanto à origem; Ambígua quanto ao critério** | ADR-0002 §2.3/§2.7; MVP-DOMAIN-EVENTS.                                                                                                             |
| Event consumer não adquire ownership nem permissão pelo evento; projeção não é fonte transacional                                               | **Explícita**                                             | ADR-0002 §2.2–2.3; eventos/projeções não autorizam operação.                                                                                       |
| `QuestionPublished` é pré-condição para todo `Attempt`                                                                                          | **Ambígua como invariante universal**                     | O caso MVP de prática exige questão publicada; fontes também permitem snapshots/contextos de atividade. Não generalizar além do fluxo documentado. |

---

## Parte 8 — Boundaries

### O modelo respeita ADR-0002?

**SIM, no modelo conceitual e no recorte descrito.**

- Cada fato permanece com seu owner: Auth (credenciais/membership), Users (identidade/perfil), Schools (instituição), Classes (Class/Enrollment), Questions (conteúdo), Attempts (execução/respostas), Rankings (projeção).
- Leitura cross-context usa contratos públicos ou eventos; o consumidor não lê/escreve internals de outro owner.
- `Question Engine` avalia/seleciona por contrato sem assumir Question ou Attempt.
- Ranking/Analytics reage a fatos após commit e não grava em Attempts.
- Apresentação/caso de uso não se torna owner de regras nem coordena repositórios alheios.

**Limite da resposta:** “SIM” verifica aderência documental do mapa; não confirma que os boundaries estão implementados ou que os ADRs foram ratificados.

---

## Parte 9 — Tenancy

### School Scope

**Aderência conceitual: SIM.** `School` é a instituição/tenant; `schoolId` é o identificador canônico. Class, Enrollment, atribuição docente e tentativas institucionais preservam esse escopo. Não se cria `Tenant` ou `tenantId`.

### Membership Scope

**Aderência conceitual: SIM.** SchoolMembership associa User a School e papéis escolares permanecem limitados ao `schoolId`. A membership não é matrícula de turma nem prova isolada de autorização sem validação do recurso/permission.

### User Global Scope

**Aderência conceitual: SIM.** User é global; credenciais/sessões pertencem a Auth, perfil pertence a Users, e papéis/escolas não são autoridade armazenada como campo único no User.

### O modelo respeita tenancy?

**SIM, conceitualmente.** A segregação User global, SchoolMembership escolar e Class/Enrollment escolares segue as fontes permitidas; `schoolId` é validado server-side nas operações.

**Não comprovado em runtime:** constraints, filtragem de todas as consultas/cache/eventos e testes negativos cross-school não são demonstrados por estes documentos. Isso continua risco crítico para declarar isolamento executável.

---

## Parte 10 — MVP Domain Model

### Representação textual

```text
User
  ↓ SchoolMembership (acesso User–School)
School
  ↓ Class (sempre associada ao schoolId)
Class
  ↓ Enrollment (vínculo pedagógico Student–Class)
Question publicada / QuestionVersion ou snapshot
  ↓ referenciada na resolução
Attempt / AttemptAnswer
  ↓ AttemptCompleted consumido
Ranking (projeção; não Aggregate Root)
```

### Ownership, eventos e casos de uso por etapa

| Etapa                  | Ownership                                                                   | Eventos documentados                                                                                      | Casos de uso MVP                                    |
| ---------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| **User**               | Users é owner da identidade/perfil; Auth possui credenciais e autenticação. | Auth: `UserRegistered`, `UserLoggedIn`, `AuthenticationFailed`; Users: `UserCreated` e eventos de estado. | A-01/P-01/D-01 — login usa Auth e identidade User.  |
| **SchoolMembership**   | Auth / Authorization possui vínculo/grants de acesso.                       | `MembershipCreated`, `MembershipRemoved`, `RoleGranted`, `RoleRevoked`.                                   | A-02, D-04 e autorização de ações escolares.        |
| **School**             | Schools possui instituição/configuração; não possui Class nem membership.   | `SchoolCreated`, `SchoolUpdated`, `SchoolDeactivated`.                                                    | D-02/D-03; contexto para A-02 e operações de turma. |
| **Class / Enrollment** | Classes possui turma, matrícula e atribuições docentes.                     | `ClassCreated`, `ClassUpdated`, `StudentEnrolled`, `StudentUnenrolled`.                                   | D-05/D-06/D-07, P-02/P-03.                          |
| **Question**           | Questions possui conteúdo e versões; Topics permanece owner distinto.       | `QuestionCreated`, `QuestionUpdated`, `QuestionPublished`, `QuestionRetired`.                             | A-03, publicação editorial e dependência de A-04.   |
| **Attempt**            | Attempts possui início, resposta e resultado; Engine fornece avaliação.     | Engine: `AnswerEvaluated`; Attempts: `AttemptStarted`, `QuestionAnswered`, `AttemptCompleted`.            | A-04 — resolver questão.                            |
| **Ranking**            | Rankings mantém projeção; não é agregado transacional.                      | Consome `AttemptCompleted`; emite `RankingUpdated`/`ParticipantRankChanged`.                              | A-05 — consultar classificação/posição.             |

**Nota sobre Login:** User → Login não é uma composição de agregados. Login é operação em Auth; sucesso/falha e membership são fatos distintos.

---

## Parte 11 — Riscos

| Risco                                                                                                    | Severidade                   | Evidência / impacto                                                                                                                                                                                                                                                       |
| -------------------------------------------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tenancy conceptualmente modelada, mas sem comprovação de constraints/testes cross-school em runtime      | **CRÍTICO**                  | O modelo não pode ser declarado executavelmente isolado apenas com evidência documental.                                                                                                                                                                                  |
| Classificação contraditória das Aggregate Roots entre MVP-AGGREGATES e MVP-DOMAIN-EVENTS                 | **ALTO**                     | User, School, Class e Question são “candidatos” no primeiro, mas raízes listadas como aprovadas no terceiro; SchoolMembership também oscila entre candidata e raiz aprovada. ADR-0002–0004 documentam ownership, mas não resolvem formalmente essa divergência de status. |
| Critério de elegibilidade/score/período/desempate do Ranking sem definição completa                      | **ALTO**                     | Há origem `AttemptCompleted` e projection owner, mas sem semântica suficiente para afirmar ranking definitivo.                                                                                                                                                            |
| Snapshot/versionamento exato de Question utilizado em Attempt                                            | **ALTO**                     | QuestionVersion publicada imutável é documentada; a composição e contrato específico de reprodução no Attempt continuam a ratificar.                                                                                                                                      |
| MembershipRoleAssignment sem limite explícito de agregado pai                                            | **MÉDIO**                    | Entidade/grant está documentada, mas composição interna de SchoolMembership não está fechada.                                                                                                                                                                             |
| QuestionOption, QuestionAsset, QuestionPublication e links com pai interno não totalmente fixado         | **MÉDIO**                    | Constam no data map; não atribuir regras/invariantes além do owner Questions e referências descritas.                                                                                                                                                                     |
| VOs não formalizados                                                                                     | **MÉDIO**                    | Identificadores/campos são documentados, mas nenhuma fonte autorizada confirma sua modelagem como Value Objects.                                                                                                                                                          |
| Analytics Read Model referido, mas fora da funcionalidade MVP e com base legal/finalidade condicionantes | **MÉDIO**                    | Consumo de eventos por Analytics é proposto, não requisito do fluxo mínimo; dados de menores exigem gates próprios.                                                                                                                                                       |
| Eventos associados a cada aggregate root                                                                 | **BAIXO**                    | Os seis roots/contextos selecionados têm eventos de owner listados no catálogo Prompt 3. Auth/Login não tem root separado e Ranking é projeção, então não são exceções sem evento de root.                                                                                |
| Eventos listados sem owner documentado                                                                   | **BAIXO / não identificado** | O catálogo permitido nomeia producers; divergência de aliases afeta o nome canônico, não a existência de um owner Auth.                                                                                                                                                   |
| Dependência/evento de consulta para School, Class, Question                                              | **BAIXO**                    | Leituras podem ser contratos síncronos; ausência de evento de consulta não significa projeção sem origem.                                                                                                                                                                 |

### Resposta: agregados sem eventos, eventos sem owner, projeções sem origem, entidades sem agregado

- **Agregados sem eventos:** nenhum identificado para os seis roots/contextos modelados; fatos de Auth são eventos do contexto, embora Auth não seja um root único aprovado.
- **Eventos sem owner:** nenhum evento com owner ausente foi identificado. Aliases de autenticação são ambíguos como nomes, mas Auth é owner documentado.
- **Projeções sem origem:** Ranking possui origem documentada em `AttemptCompleted`; Analytics consome eventos dos produtores. O problema é semântica/escopo, não ausência total de origem.
- **Entidades sem agregado:** algumas entidades têm relação a root apenas inferida/ambígua (SchoolSettings, MembershipRoleAssignment, QuestionPublication, QuestionOption/Asset e links). Não se cria um root novo para encaixá-las; lacuna de fronteira permanece para resolução documental.

---

## Parte 12 — Resultado final

### O domínio está consistente para o MVP?

**NÃO — ainda não está documentalmente consistente o suficiente para congelar as Aggregate Roots e composições.**

**Justificativa:** ownership e boundaries de alto nível estão coerentes com ADR-0002 (Auth/User/School/Classes/Questions/Attempts/Rankings permanecem separados), e a tenancy conceitual também é coerente. Porém, os próprios artefatos MVP divergem sobre o status formal de User, SchoolMembership, School, Class e Question como Aggregate Roots; composição de entidades como MembershipRoleAssignment e filhos de Question permanece parcial; e o contrato de snapshot/score/elegibilidade de Ranking não está fechado.

Isso não significa que os boundaries estejam errados. Significa que o modelo é suficiente para prosseguir com validação de domínio, mas não para declarar todas as raízes/invariantes ratificadas ou o isolamento executável comprovado.

---

## Parte 13 — MEMÓRIA PARA PROMPT 5

## Aggregate Roots

- Escopo MVP: User, SchoolMembership, School, Class, Question e Attempt.
- User, School, Class e Question são candidatos de raiz em MVP-AGGREGATES, mas aparecem como roots explícitos em MVP-DOMAIN-EVENTS; registrar divergência.
- SchoolMembership é Aggregate Root explicitamente apresentada em MVP-DOMAIN-EVENTS, embora MVP-AGGREGATES a trate como candidata.
- Attempt possui evidência mais forte de raiz e invariantes.
- Ranking é projeção, não agregado. Login/Auth não ganha root novo.

## Entidades

- Profile/UserProfile relacionado a User; AuthAccount, PasswordCredential e AuthSession continuam em Auth e fora de User.
- MembershipRoleAssignment ligado a SchoolMembership, mas pai dentro do aggregate não confirmado.
- SchoolSettings pertence ao owner Schools; inclusão interna em School é inferida.
- Enrollment/ClassTeachingAssignment são conceitos de Classes ligados a Class; composição interna inferida.
- QuestionVersion, QuestionOption, QuestionAsset, QuestionPublication e links são conceitos de Questions; detalhe de pai interno varia de implícito a ambíguo.
- AttemptAnswer pertence a Attempt; AttemptEvidence é opcional/não obrigatória.
- Value Objects formais não foram identificados; IDs, email normalizado e escopos não devem ser chamados VOs aprovados.

## Eventos

- User/Auth: `UserRegistered`, `UserCreated`, `UserLoggedIn`, `UserLoggedOut`, `AuthenticationFailed`, `EmailVerified`, eventos de ciclo de User.
- Membership: `MembershipCreated`, `MembershipRemoved`, `RoleGranted`, `RoleRevoked`.
- School: `SchoolCreated`, `SchoolUpdated`, `SchoolDeactivated`.
- Class: `ClassCreated`, `ClassUpdated`, `StudentEnrolled`, `StudentUnenrolled`.
- Question/Engine: `QuestionCreated`, `QuestionUpdated`, `QuestionPublished`, `QuestionRetired`, `QuestionSetGenerated`, `AnswerEvaluated`.
- Attempt: `AttemptStarted`, `QuestionAnswered`, `AttemptCompleted`.
- Ranking projection: consome `AttemptCompleted`; emite `RankingUpdated`/`ParticipantRankChanged`.
- Nenhum nome de evento novo foi criado. Aliases de Login e modalidade de `AnswerEvaluated` permanecem ambíguos.

## Casos de Uso

- Login: A-01/P-01/D-01.
- Acesso/gestão de escola e membership: A-02, D-02/D-03/D-04.
- Turma/matrícula/roster: D-05/D-06/D-07 e P-02/P-03.
- Conteúdo publicado: A-03 e publicação editorial.
- Tentativa: A-04.
- Ranking: A-05, somente leitura e eventualmente consistente.
- A-06 e solicitação de matrícula do professor ficam adiados por contratos/processo não especificados.

## Invariantes

- User global; sem `User.role` ou `User.schoolId` como autoridade.
- Autorização server-side, deny-by-default, por permission, recurso, scope e membership/atribuição.
- Membership User–School diferente de Enrollment Student–Class.
- `schoolId` acompanha dados escolares e tentativa institucional; escopo do Class deve corresponder à escola autorizada.
- Question/QuestionVersion publicada conceitualmente imutável; Engine avalia, Attempts registra respostas/resultados.
- Attempt concluído é imutável conforme conceito documentado.
- Evento não concede autorização; projection não substitui fato autoritativo.
- Elegibilidade/score do Ranking permanecem ambíguos.

## Riscos

- Divergência documental de status das raízes; composições de entidades parciais.
- Cross-school não provado em runtime; não declarar isolamento executável.
- Snapshot de Question e semântica de resultado/Ranking requerem confirmação.
- Nenhum Value Object formal foi aprovado nas fontes autorizadas.
- ADRs permanecem `Proposed`.

## Próxima Etapa

**MVP IMPLEMENTATION BLUEPRINT**
