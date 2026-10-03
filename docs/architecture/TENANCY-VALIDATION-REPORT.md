# Relatório de Validação de Tenancy — MateMágico Champions

**Data de referência:** 2026-10-01  
**Natureza:** consolidação documental; não cria tenancy, ownership, regras, entidades, tabelas ou schema.  
**Status das fontes:** ADR-0002, ADR-0003 e ADR-0004 estão Proposed no [INDEX.md](ADRs/INDEX.md). Este relatório não os ratifica.

## Convenções

- **Fato documentado:** consta explicitamente nas fontes.
- **Inferência limitada:** conclusão derivada de relações explicitamente descritas, sem acrescentar regra.
- **Recomendação:** encaminhamento documental, não decisão aprovada.
- **Explícito / Implícito / Ambíguo / Não Definido:** força da evidência disponível.
- **Escopo conceitual:** o que a arquitetura documenta como modelo pretendido.
- **Escopo executável:** comportamento provado em schema, constraints, consultas e testes. As fontes não fornecem essa prova completa.

Fontes principais: [ADR-0002](ADRs/ADR-0002-module-boundaries.md), [ADR-0003](ADRs/ADR-0003-database-strategy.md), [ADR-0004](ADRs/ADR-0004-authentication-authorization.md), [GLOSSARY.md](GLOSSARY.md), [DOMAIN-OWNERSHIP-MAP.md](DOMAIN-OWNERSHIP-MAP.md), [INDEX.md](ADRs/INDEX.md), [ADR-GOVERNANCE.md](ADRs/ADR-GOVERNANCE.md), [ADR Diagnostic Report](ADRs/ADR-DIAGNOSTIC-REPORT.md), [Documento Mestre](../../ARCHITECTURE.md) e [ADR-0001 Base Architecture](ADRs/ADR-0001-base-architecture.md).

## 1. Modelo de tenancy identificado

O modelo documentado é **multi-escola lógico**, em banco PostgreSQL/schema compartilhado, com `schoolId` como identificador do escopo escolar. Banco ou schema por escola são rejeitados no ADR-0003. O conceito `tenant` refere-se à escola; não há entidade/campo canônico `tenantId`.

| Conceito                          | Definição encontrada                                                                                                                                                 | Fonte documental                                  | Evidência     |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ------------- |
| **Tenant**                        | Conceito de negócio para o contexto institucional; uma School representa o tenant escolar. “Tenant” não é nome de campo.                                             | ADR-0002 §2.1–2.2; ADR-0003 §2.1–2.2; GLOSSARY.md | **Explícito** |
| **School**                        | Instituição e ciclo de vida escolar; `schoolId` identifica a escola.                                                                                                 | ADR-0002 §2.3; ADR-0003 §2.2–2.3                  | **Explícito** |
| **Membership / SchoolMembership** | Vínculo de acesso entre User global e School; roles escolares são atribuídas dentro desse vínculo. Não é inscrição em turma.                                         | ADR-0002 §2.3; ADR-0003 §2.2–2.3; ADR-0004 §2.1   | **Explícito** |
| **Global Scope**                  | Escopo de atribuição global, sem `schoolId`, com permissões próprias; não concede acesso irrestrito a dados escolares/PII.                                           | ADR-0003 §2.2; ADR-0004 §2.1–2.4; GLOSSARY.md     | **Explícito** |
| **School Scope**                  | Escopo ligado ao `schoolId` da membership/recurso; a autorização valida que membership e recurso correspondem à mesma escola.                                        | ADR-0002 §2.2; ADR-0004 §2.4                      | **Explícito** |
| **Class Scope**                   | Escopo de turma que depende de atribuição docente ou papel escolar conforme a permission matrix; `class.schoolId` deve corresponder à escola do contexto autorizado. | ADR-0004 §2.2–2.4                                 | **Explícito** |
| **Personal Scope**                | Recurso pertencente ao próprio `userId`; troca de ID não altera ownership. Representantes requerem mandato/consentimento conforme fonte.                             | ADR-0004 §2.4                                     | **Explícito** |

### Modelo, cobertura e limites

- **Fato documentado:** banco PostgreSQL e schema compartilhados; isolamento lógico por escola; dados institucionais carregam `schoolId` obrigatório, exceto catálogos/registro realmente globais com escopo explícito.
- **Fato documentado:** User é global e pode participar de várias escolas; acesso escolar é contextual via SchoolMembership e atribuições de papel.
- **Fato documentado:** `schoolId` vindo de URL/body/cache não prova autorização; o servidor valida membership, permissão e recurso em cada operação.
- **Fato documentado:** os documentos determinam `schoolId` em dados/projeções/eventos institucionais e proíbem inferir tenant pelo consumidor.
- **Não inferir:** a existência de requisitos escritos não prova constraints, filtragem de toda consulta, isolamento de cache ou segurança contra cross-school em runtime.

## 2. Matriz de isolamento

Classificação:

- **Global:** o modelo declara identidade/catálogo/atribuição global, sem pertencer a uma escola específica.
- **School:** o dado institucional/atividade é escopado a `schoolId`.
- **Compartilhado:** conceito global pode ser usado por escolas, ou entidade/projeção pode ter escopo global ou escolar explicitamente declarado; não significa escrita compartilhada entre owners.
- **Não Definido:** as fontes não determinam escopo suficientemente.

| Conceito                                      | Escopo documentado                                                                                        | Owner conforme ADR-0002/0003                                                   | Evidência / ressalva                                                                                         |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| User                                          | **Global**                                                                                                | Users                                                                          | Identidade global, sem `schoolId` principal de autorização.                                                  |
| Profile / UserProfile                         | **Global**                                                                                                | Users                                                                          | Perfil único associado a User; campos devem ser minimizados.                                                 |
| AuthAccount                                   | **Global**                                                                                                | Auth / Authorization                                                           | Identidade/provider ligado a User.                                                                           |
| PasswordCredential                            | **Global**                                                                                                | Auth / Authorization                                                           | Credencial de login ligada à identidade; não é dado escolar.                                                 |
| AuthSession / session registry                | **Global**                                                                                                | Auth / Authorization                                                           | Sessão da identidade; validação server-side, sem role/escola autoritativa no token.                          |
| Role / Permission / RolePermission            | **Compartilhado**                                                                                         | Auth / Authorization                                                           | Catálogo controlado de autoridades; atribuições têm escopo, catálogo não implica concessão.                  |
| School                                        | **Global no identificador; tenant como instituição**                                                      | Schools                                                                        | Registro da instituição representa o tenant; escola não possui banco/schema próprio.                         |
| SchoolSettings                                | **School**                                                                                                | Schools                                                                        | Configurações escopadas à escola.                                                                            |
| SchoolDomain                                  | **School**                                                                                                | Schools                                                                        | Catálogo conceitual vinculado a School; semântica operacional parcial.                                       |
| SchoolMembership                              | **School**                                                                                                | Auth / Authorization                                                           | Liga User global a School por `schoolId`.                                                                    |
| MembershipRoleAssignment                      | **School**                                                                                                | Auth / Authorization                                                           | Papel associado à membership, limitado à escola.                                                             |
| GlobalRoleAssignment                          | **Global**                                                                                                | Auth / Authorization                                                           | Atribuição global sem `schoolId`.                                                                            |
| Class                                         | **School**                                                                                                | Classes                                                                        | Turma sempre escopada a `schoolId`.                                                                          |
| Enrollment / ClassEnrollment                  | **School**                                                                                                | Classes                                                                        | Matrícula de estudante em turma, diferente de SchoolMembership.                                              |
| ClassTeachingAssignment                       | **School**                                                                                                | Classes                                                                        | Atribuição docente à turma, escopada à escola.                                                               |
| Student Assignment (separado)                 | **Não Definido / não documentado como conceito separado**                                                 | Não Definido                                                                   | As fontes chamam o vínculo estudante–turma de Enrollment.                                                    |
| Topics / Taxonomy / Competency / Skill        | **Global**, com extensão escolar somente se namespace/owner explícito                                     | Topics                                                                         | Taxonomia oficial é catálogo global; extensão escolar não altera registro global.                            |
| Difficulty Scale                              | **Global/versionado**                                                                                     | Topics / Taxonomy                                                              | Escalas identificadas/versionadas; avaliação específica associa-se a QuestionVersion.                        |
| Source / OBMEP edition / phase                | **Global/catalogal**                                                                                      | Topics / Taxonomy                                                              | Fonte/edição/fase têm proveniência; treino original pode não ter edição/fase OBMEP.                          |
| Question                                      | **Compartilhado**                                                                                         | Questions                                                                      | Banco curado global por padrão; questão privada/personalizada pode ter `schoolId`.                           |
| QuestionVersion                               | **Segue o escopo da Question**                                                                            | Questions                                                                      | Versões publicadas imutáveis; o detalhe físico de cada escopo segue a questão.                               |
| QuestionPublication                           | **Segue Question/QuestionVersion; detalhe parcial**                                                       | Questions                                                                      | Owner documentado; lifecycle/escopo de publicação não está completo.                                         |
| Question Engine rules / RecommendationRuleSet | **Global ou School, explicitamente declarado**                                                            | Question Engine                                                                | Regras podem ser globais ou escolares; não há escopo implícito via null.                                     |
| AdaptiveProfile                               | **School**                                                                                                | Question Engine                                                                | Estado por `schoolId + userId + profileVersion`.                                                             |
| LearningPattern                               | **School/user-context**                                                                                   | Question Engine                                                                | Derivado por estudante/escola; janela e versão de cálculo.                                                   |
| SkillMastery                                  | **School/user/skill**                                                                                     | Question Engine                                                                | Estimativa de domínio por aluno, escola e habilidade; não é nota oficial.                                    |
| ErrorPattern                                  | **School/user-context**                                                                                   | Question Engine                                                                | Categoria derivada; acesso/retenção requerem política.                                                       |
| StudyPathTemplate                             | **Compartilhado**                                                                                         | Study Paths                                                                    | Template pode ser global ou escolar com owner explícito.                                                     |
| StudyPath / Step / Progress                   | **School** quando percurso/progresso de aluno; template pode ser global ou escolar                        | Study Paths                                                                    | Percurso/progresso de aluno exige `schoolId`.                                                                |
| Attempt / AttemptAnswer / AttemptEvidence     | **School** para tentativa institucional                                                                   | Attempts                                                                       | Toda tentativa institucional carrega `schoolId`, inclusive atividade individual em contexto escolar.         |
| MockExam / MockExamVersion / Items            | **Compartilhado**                                                                                         | Mock Exams                                                                     | Configuração pode ser global ou escolar com owner explícito.                                                 |
| MockExamSession                               | **School**                                                                                                | Mock Exams                                                                     | Sessões sempre levam `schoolId`.                                                                             |
| Championship / Version / Entry                | **Compartilhado**                                                                                         | Championships                                                                  | Campeonato pode ter escopo global ou escolar declarado; participantes/resultados preservam escopo efetivo.   |
| EligibleAttempt                               | **Segue escopo do campeonato/atividade**                                                                  | Championships para elegibilidade; Attempts para tentativa fonte                | Relação lógica e constraints físicas não estão completamente especificadas.                                  |
| RankingDefinition / Snapshot / Entry          | **Compartilhado**                                                                                         | Rankings                                                                       | Ranking declara escopo global, escola ou campeonato; entries preservam escopo e versão.                      |
| BadgeDefinition                               | **Compartilhado**                                                                                         | Badges                                                                         | Definição pode ser global ou escolar.                                                                        |
| BadgeAward / BadgeEvidence                    | **School** quando escolar; escopo explícito conforme concessão                                            | Badges                                                                         | Award de aluno leva `schoolId` e evidência.                                                                  |
| Certificate / Evidence / Revocation           | **Compartilhado**                                                                                         | Certificates                                                                   | Emissão leva `schoolId` quando ligada a atividade escolar; certificado global deve explicitar escopo global. |
| Metric / Analytics projection                 | **School** quando institucional; global somente quando dimensão e autorização globais são explícitas      | Analytics                                                                      | Projeções institucionais preservam `schoolId`; não misturar escolas sem dimensão/autorização explícitas.     |
| Ranking metrics                               | **Escopo do Ranking / métrica declarada**                                                                 | Analytics para métrica; Rankings para ranking                                  | Analytics pode agregar evolução competitiva, mas não é owner do ranking.                                     |
| Events / Outbox / Inbox                       | **School** quando fato pertence a escola; evento global omite `schoolId` somente se fato realmente global | Producer para evento; infraestrutura/consumer para outbox/inbox                | Tenant não pode ser inferido; payload minimizado.                                                            |
| Notification / NotificationDelivery           | **Não Definido de modo inequívoco**                                                                       | ADR-0003 lista em Events; módulo Notifications não consta como bounded context | Não atribuir novo owner nem escopo definitivo.                                                               |
| Dashboard / Educational Insight               | **Não Definido** como dado de domínio                                                                     | Não Definido                                                                   | Podem apresentar/derivar dados autorizados, mas não há escopo/owner de entidade próprio definido.            |

## 3. Matriz de acesso

A matriz resume somente regras explicitamente descritas na permission matrix e nos limites de módulos. `Não Definido` significa que a fonte não autoriza concluir; não equivale a permissão.

| Papel / ator       | Acessar/consultar                                                                              | Modificar                                                                                                 | Limites de tenancy documentados                                                                                 |
| ------------------ | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| STUDENT            | Perfil, progresso e certificados próprios; conteúdo publicado; atividades permitidas           | Prática/respostas próprias e ações permitidas                                                             | Personal scope; não lista outros estudantes; contexto escolar depende de membership/atividade.                  |
| TEACHER            | Progresso individual de alunos atribuídos; turmas atribuídas e analytics pedagógico autorizado | Ações docentes dentro das turmas atribuídas; algumas criações são “se habilitadas/política permitir”      | Class Scope e schoolId da membership; não acessa outra escola nem turma não atribuída.                          |
| COORDINATOR        | Indicadores da escola e turmas/equipe pedagógica no escopo autorizado                          | Ações escolares indicadas na matrix, como criação/gestão limitada de turma e membership conforme política | School Scope; sem acesso a outra escola ou privilégios globais.                                                 |
| SCHOOL_ADMIN       | Configuração escolar, usuários/memberships, turmas e dados autorizados da própria escola       | Administração dentro da própria escola; papéis escolares allowlisted                                      | `schoolId` precisa corresponder ao recurso; não concede papéis globais; sem acesso automático a segredos.       |
| GLOBAL_ADMIN       | Operação global; indicadores globais agregados; detalhe sensível somente break-glass           | Operações globais conforme permission matrix, auditadas e privilegiadas                                   | Global scope não é acesso universal; PII/acadêmico detalhado é excepcional, justificado, temporário e auditado. |
| CONTENT_CURATOR    | Conteúdo global em escopo editorial; não dados pessoais/turmas/resultados individuais          | Criar/editar rascunho/importar conteúdo conforme fluxo                                                    | Global/conteúdo; sem acesso escolar automático.                                                                 |
| EDITOR_OPERATOR    | Conteúdo para revisão/publicação; não dados de aluno/escola                                    | Aprovar/publicar/retirar conteúdo no fluxo editorial                                                      | Global/conteúdo; autoria/revisão separadas.                                                                     |
| Representante      | **Não Definido sem mandato/consentimento formal**                                              | **Não Definido**                                                                                          | ADR-0004 diz que representantes só atuam por fluxo formal de consentimento/mandato.                             |
| Consumer de evento | Payload minimizado e autorizado para sua projeção/efeito                                       | Escreve apenas sua projeção/estado próprio, não o agregado produtor                                       | Evento não concede permissão; consumer valida tenant/escopo.                                                    |
| Analytics          | Eventos/contratos autorizados para projeções e relatórios                                      | Escreve apenas métricas/projeções/jobs próprios                                                           | Não escreve nos domínios produtores; cross-school requer escopo global e autorização.                           |

### Predicados documentados de autorização

ADR-0004 determina que uma operação protegida exige sessão válida/não revogada, User ativo quando aplicável, permission atribuída, escopo resolvido no servidor, membership/atribuição vigente e correspondência entre recurso e school/class/user. O cliente não pode escolher `schoolId` como prova de acesso. Essa é a regra documentada; não comprova que cada caminho de runtime já a cumpre.

## 4. Validação de RBAC

### O RBAC é consistente com o tenancy?

**SIM, conceitualmente, conforme ADR-0004.**

**Fatos documentados:** User global; roles escolares atribuídas via SchoolMembership e limitadas por `schoolId`; roles globais via GlobalRoleAssignment sem escola; Permission é ação atômica; autorização considera recurso/scope/contexto e é validada no servidor; deny-by-default; não há herança automática personal → school → global.

**Limites:** ADR-0004 está Proposed. A permission matrix ainda precisa ser convertida em permissões nomeadas/testes segundo o próprio ADR; schema/constraints, guards, MFA, rate limit e testes cross-school não estão evidenciados como prontos. “Consistente no desenho” não é “seguro em runtime”.

## 5. Travessia de contextos

Atravessar tenancy significa operar ou consumir fatos em mais de um escopo, não compartilhar ownership. Consumers devem respeitar contratos, autorização e `schoolId` declarado.

| Bounded context      | Escopos tocados conforme documentos                                                | Relação cross-context                                                                                                            | Modo documentado                                                 | Limite de ownership                                                                           |
| -------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Auth / Authorization | Global + School + Class/Personal ao avaliar acesso                                 | Coordena identidade, memberships, grants e verificação de escopo                                                                 | Contratos síncronos; eventos de identidade/roles                 | Dono de credenciais/sessão/membership/grants, não de School/Class/Profile.                    |
| Users                | Global; profile/consent pode ter finalidade/escola contextual                      | Provisiona User/Profile de `UserRegistered`; emite ciclo de vida global                                                          | Evento Auth→Users; contratos de perfil                           | Não possui credenciais/memberships/enrollment.                                                |
| Schools              | Global owner de instituições; configurações school-scoped                          | Publica estado para Classes/Auth/Analytics                                                                                       | Contrato/eventos                                                 | Não depende de Classes nem administra memberships.                                            |
| Classes              | School                                                                             | Consulta estado de School; publica matrícula/atribuição para consumers                                                           | Contrato síncrono e eventos                                      | Não escreve em Schools/Auth/Users.                                                            |
| Topics               | Global taxonomy; extensões escolares somente com owner/namespace explícito         | Questions/Engine consultam taxonomia                                                                                             | Fachada e eventos de alteração                                   | Não possui Questions nem analytics.                                                           |
| Questions            | Global por padrão; conteúdo customizado pode ser escolar                           | Consulta Topics; serve snapshots a Engine/Exams                                                                                  | Contrato e eventos                                               | Não seleciona adaptativamente nem registra Attempts.                                          |
| Question Engine      | Estado de learner por `schoolId + userId`; regras globais ou escolares             | Consulta Questions/Topics; avaliação para Attempts; consome métricas de Analytics por snapshot conforme ADR-0003                 | Contratos síncronos e projeção/snapshot                          | Não possui conteúdo, tentativas, ranking ou Analytics. Modo de consumo de métricas é Ambíguo. |
| Study Paths          | Templates global/escolar; percurso do aluno é school-scoped                        | Usa Engine; reage a Attempts/Mock Exams; emite conclusão                                                                         | Contrato síncrono e eventos                                      | Não escreve Attempts nem Rankings.                                                            |
| Attempts             | Tentativa institucional School-scoped                                              | Usa Engine para avaliação; envia fatos a vários consumers                                                                        | Contrato síncrono, evento pós-commit                             | Único owner de tentativa/respostas; consumers não atualizam attempts.                         |
| Mock Exams           | Definição global/escolar; sessão School-scoped                                     | Usa Engine/Attempts; emite ciclo de vida                                                                                         | Contratos + eventos                                              | Não possui Questions/AttemptAnswers.                                                          |
| Championships        | Competição global ou escolar conforme escopo declarado                             | Valida elegibilidade via Users/Schools/Classes; consome AttemptCompleted; publica fatos a Rankings/Analytics/Badges/Certificates | Contratos pontuais + eventos                                     | Não escreve Attempts nem ordena Rankings.                                                     |
| Rankings             | Global, School ou Championship scope                                               | Consome Attempts/Championships; Badge/Analytics podem consumir projeção                                                          | Eventos/projeções assíncronos                                    | Owner do ranking projetado; não owner de fatos/eligibilidade de origem.                       |
| Badges               | Definições globais/escolares; award scoped ao participante/escola quando aplicável | Consome fatos de múltiplos contexts; Certificate/Analytics podem consumir award                                                  | Assíncrono por eventos                                           | Owner de regras/concessões, não de fatos fonte.                                               |
| Certificates         | Global ou School conforme evidência/atividade                                      | Consome eventos autoritativos de conclusão/Badge quando regra prevê                                                              | Assíncrono; contrato para verificar/consultar                    | Não depende de Analytics nem de School internals.                                             |
| Analytics            | Projeções globais agregadas ou School-scoped autorizadas                           | Consome eventos de vários contexts; pode fornecer métrica-snapshot ao Engine                                                     | Assíncrono principalmente; leituras públicas pontuais permitidas | Não é source of truth nem escreve em domínios produtores.                                     |
| `packages/events`    | Envelopes levam `schoolId` quando fato escolar; global só quando fato global       | Transporta produtores a consumers                                                                                                | Assíncrono                                                       | Infraestrutura, não bounded context owner de fatos.                                           |

## 6. Dados globais

| Conceito                                                                                                | Owner                                                       | Motivo documentado                                                                                                     | Evidência                        |
| ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| User / identidade                                                                                       | Users (perfil); Auth para credenciais/conta de autenticação | User é identidade global que pode atuar em várias escolas.                                                             | ADR-0003 §2.2; ADR-0004 §2.1     |
| AuthAccount / PasswordCredential / AuthSession                                                          | Auth / Authorization                                        | Identidades e credenciais são globais; sessão identifica sujeito.                                                      | ADR-0003 §2.2; ADR-0004 §2.1/2.5 |
| GlobalRoleAssignment                                                                                    | Auth / Authorization                                        | Papel de plataforma sem `schoolId`, separado de membership.                                                            | ADR-0003 §2.2; ADR-0004 §2.1–2.4 |
| Catalogs oficiais Topics/Competencies/Skills/education levels/editions/phases/sources/difficulty scales | Topics / Taxonomy                                           | Taxonomia oficial é global/versionada; extensões escolares não alteram o registro global.                              | ADR-0003 §2.2/2.5                |
| Questions curadas                                                                                       | Questions                                                   | Banco curado é global por padrão; custom/private can be school-scoped.                                                 | ADR-0003 §2.2                    |
| StudyPathTemplate                                                                                       | Study Paths                                                 | Template pode ser global ou escolar com owner explícito.                                                               | ADR-0003 §2.2                    |
| MockExam definition/version                                                                             | Mock Exams                                                  | Configuração pode ser global ou escolar, escopo precisa ser declarado.                                                 | ADR-0003 §2.2                    |
| Championship                                                                                            | Championships                                               | Pode ter escopo global ou escolar declarado; participante/resultado conserva escopo efetivo.                           | ADR-0003 §2.2                    |
| RankingDefinition/Snapshot                                                                              | Rankings                                                    | Ranking declara explicitamente scope global, school ou championship.                                                   | ADR-0003 §2.2                    |
| BadgeDefinition                                                                                         | Badges                                                      | Definição pode ser global ou escolar explicitamente.                                                                   | ADR-0003 §2.2                    |
| Global reports/projections                                                                              | Analytics, quando explicitamente globais                    | Cruzamento de escolas requer dimensão global explícita e autorização; agregação deve reduzir risco de reidentificação. | ADR-0003 §2.2/2.7                |

## 7. Dados por escola

| Conceito                                                        | Owner                  | Motivo documentado                                                                                        | Evidência                        |
| --------------------------------------------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------- |
| SchoolSettings                                                  | Schools                | Configuração pertence a `schoolId`.                                                                       | ADR-0003 §2.2                    |
| SchoolMembership / school grants / invitations                  | Auth / Authorization   | Membership/grant/invite escolar carrega `schoolId`.                                                       | ADR-0003 §2.2; ADR-0004 §2.1–2.4 |
| Class / ClassEnrollment / ClassTeachingAssignment               | Classes                | Turma e vínculos são sempre escopados a `schoolId`, distintos de membership.                              | ADR-0003 §2.2–2.3                |
| AdaptiveProfile / SkillMastery / LearningPattern / ErrorPattern | Question Engine        | Estado de aluno associado a `schoolId + userId`; regra pode ter scope explícito.                          | ADR-0003 §2.2/2.6                |
| StudyPath / StudyPathProgress                                   | Study Paths            | Percurso/progresso de aluno exige `schoolId`; template pode ser global/escolar.                           | ADR-0003 §2.2–2.3                |
| Attempt / AttemptAnswer institucional                           | Attempts               | Toda tentativa institucional exige `schoolId`.                                                            | ADR-0003 §2.2                    |
| MockExamSession                                                 | Mock Exams             | Sessões sempre levam `schoolId`.                                                                          | ADR-0003 §2.2                    |
| Championship participation/result                               | Championships          | Participante/resultado guarda escopo efetivo; competição pode ser global/escolar.                         | ADR-0003 §2.2                    |
| Ranking entries/snapshots                                       | Rankings               | Preservam scope e versão declarados.                                                                      | ADR-0003 §2.2                    |
| BadgeAward                                                      | Badges                 | Award ao aluno leva `schoolId` quando escolar.                                                            | ADR-0003 §2.2                    |
| Certificate                                                     | Certificates           | Guarda `schoolId` se ligado a atividade escolar; certificado global declara escopo global.                | ADR-0003 §2.2                    |
| Analytics projections/metrics                                   | Analytics              | Projeção institucional preserva `schoolId`; não agrega escolas sem dimensão/autorização global explícita. | ADR-0003 §2.2/2.7                |
| Domain event/notification delivery escolar                      | Producer / integration | Evento/entrega leva `schoolId` quando fato pertence a escola; consumer não infere tenant.                 | ADR-0002 §2.7; ADR-0003 §2.2     |

## 8. Conflitos de tenancy

A severidade distingue contradição textual atual de falta de evidência executável. Não se reaplica automaticamente a classificação antiga do Diagnostic Report quando ADRs atuais documentam harmonização posterior.

| Achado                                         | Classificação                                                                             | Origem                                                                                                                                            | Impacto                                                                                                 | Recomendação                                                                                           |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `schoolId` vs `tenantId`                       | **Não é conflito ativo nos ADRs atuais**; finding histórico                               | ADR-0002/0003 dizem `schoolId`; Diagnostic Report registra divergência anterior; GLOSSARY e DOMAIN-OWNERSHIP-MAP padronizam `schoolId`.           | Trechos históricos podem reintroduzir `tenantId`; vocabulário ativo está definido.                      | Preservar `schoolId`; tratar `tenantId` apenas como histórico/termo proibido para campo escolar.       |
| SchoolMembership vs Enrollment                 | **Não é conflito textual ativo**                                                          | ADR-0002/0003/0004 atribuem acesso escolar a Auth e enrollment/teaching assignment a Classes. Diagnostic antigo pede validação de constraints.    | A confusão pode causar autorização indevida; documentação atual separa os conceitos.                    | Não mudar ownership; marcar integridade/runtime como não validada.                                     |
| User global vs escola única                    | **Não é conflito textual ativo**                                                          | ADR-0003/0004 corrigem User global; Documento Mestre contém exemplos antigos que o ADR-0003 declara legados.                                      | Leitores de exemplos históricos podem modelar escola/role em User.                                      | Tratar exemplos como históricos; usar ADR-0003/0004 atuais como referência proposta.                   |
| Global Scope vs School Scope / roles           | **Ambiguidade MÉDIA de evidência/runtime**                                                | ADR-0004 define scope e membership; implementações/constraints/testes não estão evidenciados.                                                     | Não há prova de que cada request/consulta respeite o escopo.                                            | Não afirmar enforcement; manter aprovação e testes negativos como pendentes.                           |
| Dados globais versus escolares                 | **Ambiguidade MÉDIA em conceitos de escopo misto**                                        | ADR-0003 declara vários conceitos global-or-school explicitamente; algumas regras/per-entity classifications permanecem parciais.                 | Escopo pode ser inferido indevidamente para templates, exames, campeonatos, badges e certificados.      | Para cada uso, declarar o scope conforme ADR-0003; não inferir por `schoolId` nulo.                    |
| Question Engine consulta métricas de Analytics | **MÉDIO**                                                                                 | ADR-0003 diz que Engine consome métricas/snapshot; matriz ADR-0002 exclui Analytics como dependência do Engine e indica consumidores por eventos. | Modo de leitura pode virar acoplamento síncrono ou leitura cross-tenant mal delimitada.                 | Esclarecer documentalmente projeção/evento vs contrato permitido, sem transferir ownership da métrica. |
| Ownership de Notification/NotificationDelivery | **MÉDIO / Não Definido**                                                                  | ADR-0003 coloca notificações em Events; ADR-0002 não lista bounded context Notifications.                                                         | Owner de conteúdo, preferências, entrega e escopo tenant pode ficar difuso.                             | Não reatribuir neste relatório; registrar como lacuna explícita para owners/ADR.                       |
| Dashboard/Educational Insight                  | **MÉDIO / Não Definido**                                                                  | ADR-0009 fala dashboards/insights; sem owner/agregado específico definido.                                                                        | UI/Analytics pode ser tratado como owner de conceitos pedagógicos sem decisão.                          | Mantê-los como apresentação/objetivos documentados, não entidade/owner presumido.                      |
| Constraints e testes cross-school              | **Bloqueador CRÍTICO para declarar isolamento validado em runtime; não conflito textual** | ADR-0003 diz que constraints/testes cross-tenant ainda faltam; Diagnostic Report registra ausência de evidência executável.                       | Não se pode certificar segurança de tenancy ou usar a especificação como prova de isolamento executado. | Distinguir modelo conceitual de validação executável; não declarar production-ready sem evidência.     |
| Privacidade/menores e telemetria               | **Bloqueador CRÍTICO para dados reais/telemetria externa; não conflito de owner**         | ADR-0003/0004 e Diagnostic Report exigem revisão legal, finalidade, retenção e controles ainda pendentes.                                         | Dados escolares/estudantis podem ser usados/exportados sem política aprovada.                           | Manter como gate de dados reais conforme fontes; não inferir consentimento/base legal.                 |

## 9. Consistência com ADR-0002

### Os limites de tenancy respeitam ADR-0002?

**SIM, no nível documental/conceitual.**

- **Fato:** `schoolId` é identificador canônico do tenant escolar; tenant não é nome de campo.
- **Fato:** cada módulo é autoridade de escrita de seus dados; chamadas síncronas são por contratos públicos, eventos para efeitos secundários.
- **Fato:** consumers validam autorização/escopo; evento não concede permissão.
- **Fato:** Auth → Classes/Schools internals, acesso cruzado a repositories e ciclos de dependência são proibidos.
- **Limite:** ADR-0002 é Proposed; runtime, contratos e testes de isolamento não estão evidenciados.

## 10. Consistência com ADR-0003

### O modelo de tenancy respeita ADR-0003?

**SIM, no nível do modelo de dados conceitual.**

- **Fato:** PostgreSQL e schema compartilhados; database/schema por escola são rejeitados.
- **Fato:** dados institucionais levam `schoolId`; catálogos globais são explicitamente globais.
- **Fato:** User é global, papéis têm assignments com scope, dados analíticos não substituem OLTP, evento não é fonte transacional completa.
- **Limite:** ADR-0003 é Proposed e não aprova schema físico. Constraints, migrações, consultas e testes cross-school ainda não comprovam enforcement.

## 11. Consistência com ADR-0004

### O modelo de tenancy respeita ADR-0004?

**SIM, conceitualmente.**

- **Fato:** identidade User é global e memberships ligam User a cada School.
- **Fato:** roles globais são separadas de assignments escolares; role não é claim suficiente e autorização revalida membership/scope/recurso no servidor.
- **Fato:** school/class/personal/global scopes são distintos; trocar `schoolId` no cliente não confere acesso.
- **Limite:** ADR-0004 é Proposed; Auth/RBAC, MFA, rate limiting, session registry e testes de autorização/tenant não estão comprovados como implementados.

## 12. Prontidão para modelagem

### Definição suficiente para modelagem exploratória?

**SIM.** ADR-0002/0003/0004 e o glossary/ownership map descrevem tenants, `schoolId`, escopos, memberships, dados globais/escolares e owners conceituais com granularidade suficiente para exploração e anotação de hipóteses.

A atividade deve permanecer exploratória/Draft e diferenciar fato confirmado, inferência e lacuna. Não congela schema, constraints nem decisão normativa.

### Definição suficiente para modelagem normativa?

**NÃO.** Os ADRs de referência permanecem Proposed; há escopos global-or-school cuja seleção é contextual; os consumers/mode de leitura Engine–Analytics têm ambiguidade; e as constraints/testes negativos cross-school não estão demonstrados. A documentação orienta a direção, mas não justifica declarar um modelo normativo/aprovado.

## 13. Backlog de ajustes

Somente itens decorrentes de ambiguidades/lacunas encontradas; nenhuma ação de implementação é proposta aqui.

| Prioridade                         | Item                                                                                                                            | Impacto                                                                      | Documento                                 |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------- |
| **CRÍTICA para validação runtime** | Documentar/evidenciar se constraints e testes negativos cross-school validam isolamento real; hoje são explicitamente pendentes | Não se pode declarar tenancy segura/isolada em runtime                       | ADR-0003, ADR-0004, Diagnostic Report     |
| **CRÍTICA antes de dados reais**   | Resolver aprovações de privacidade/legal para dados de menores, retenção, finalidade e telemetria conforme gates descritos      | Bloqueia uso de dados reais e exportação/analytics não aprovados             | ADR-0003, ADR-0004, ADR Diagnostic Report |
| **ALTA**                           | Harmonizar modo de leitura Question Engine–Analytics para QuestionMetricSnapshot (projeção/evento vs dependência)               | Evita acoplamento cross-context e confusão entre owner da métrica e consumer | ADR-0002, ADR-0003                        |
| **MÉDIA**                          | Registrar como não definido o owner de Notification/NotificationDelivery até decisão documental dos responsáveis                | Evita ownership presumido dentro de Events                                   | ADR-0002, ADR-0003                        |
| **MÉDIA**                          | Marcar Dashboard/Educational Insight como não definidos como owner/agregado de domínio                                          | Evita confundir apresentação ou analytics com domínio pedagógico             | ADR-0009, GLOSSARY.md                     |
| **MÉDIA**                          | Clarificar os escopos global/escolar das definições/operações contextuais quando os ADRs forem revisados                        | Evita inferir scope a partir de null ou do caller                            | ADR-0003, ADR-0004                        |
| **BAIXA**                          | Tratar achados antigos do Diagnostic Report como históricos ou atualizar a auditoria em revisão futura                          | Evita reabrir conflitos resolvidos de `schoolId` e membership                | ADR-DIAGNOSTIC-REPORT, ADR-0002/0003/0004 |

## 14. Decisão executiva

### Existem bloqueadores críticos de tenancy?

**SIM, para declarar isolamento executável validado ou operar com dados reais sem os gates pendentes.**

**Fato:** ADR-0003/Diagnostic Report dizem que constraints e testes negativos cross-school faltam; ADR-0003/0004 sujeitam dados de menores a revisão legal/privacidade e controles. Isso bloqueia afirmar segurança/isolamento em runtime.

**Distinção:** não foi identificado conflito crítico ativo no modelo conceitual de `schoolId`/membership nos ADRs atuais. O blocker é de evidência/privacidade para validação/uso real, não uma decisão que este relatório repara.

### O tenancy atual suporta os requisitos documentados?

**SIM, como modelo lógico proposto.**

O desenho documenta multi-escola lógico em banco/schema compartilhado, User global, membership escolar, `schoolId` obrigatório em dados institucionais e scopes global/school/class/personal. Isso cobre conceitualmente os requisitos de múltiplas escolas/professores e papeis documentados.

**Não significa:** que exista suporte implementado, que constraints estejam aplicadas, que cache/exports/events estejam provados isolados ou que 100 mil alunos tenham sido validados.

## 15. MEMÓRIA PARA PROMPT 10

### Tenancy Consolidado

- **Fato documentado:** tenancy multi-escola é lógica, em banco/schema PostgreSQL compartilhado; banco/schema por escola foi rejeitado em ADR-0003.
- **Fato documentado:** `schoolId` é identificador canônico do tenant escolar; `tenant` é conceito, não campo.
- **Fato documentado:** User é global; SchoolMembership concede acesso à escola; Enrollment/TeacherAssignment pertencem a Classes e são distintos de membership.
- **Fato documentado:** dados institucionais e atividades por escola carregam `schoolId`; catálogos globais são explícitos; conceitos de escopo misto declaram global ou escolar.
- **Fato documentado:** autorização é server-side, deny-by-default e contextual por global/school/class/personal scopes.

### Conceitos Globais

- User/identidade e Profile de produto; AuthAccount/PasswordCredential/AuthSession.
- GlobalRoleAssignment e catálogo de Roles/Permissions, com atribuições separadas por scope.
- Taxonomia oficial Topics/Competency/Skill/OBMEP editions/phases/Sources/Difficulty Scales.
- Questions curadas por padrão; StudyPathTemplate, MockExam configuration, Championship, RankingDefinition, BadgeDefinition e Certificates podem ter escopo global ou escolar explicitamente declarado.

### Conceitos por Escola

- SchoolSettings; SchoolMembership/grants/invitations; Class/Enrollment/TeacherAssignment.
- AdaptiveProfile/LearningPattern/SkillMastery/ErrorPattern por `schoolId + userId` conforme conceito.
- StudyPath/progress de aluno, Attempts institucionais, MockExamSession.
- Entries/results competitivos e projeções escolares; awards/metrics/certificates levam `schoolId` quando ligados à atividade escolar.

### Ambiguidades Restantes

- Modo de consumo de QuestionMetricSnapshot pelo Question Engine versus matriz de dependências sem Analytics como dependência direta.
- Owner de Notification/NotificationDelivery não aparece como bounded context inequívoco.
- Dashboard/Educational Insight não têm owner/agregado próprio definido.
- Escopo concreto de registros configuráveis global-or-school depende de declaração em cada contexto/uso.
- Constraints, filtragem e testes cross-school ainda não validam isolamento em runtime.
- Privacy/legal/retention para menores e telemetry continuam pendentes.

### Conflitos Restantes

- **Conflito textual ativo:** não foi identificado entre `schoolId`, SchoolMembership e Enrollment nos ADRs atuais.
- **Ambiguidade de acoplamento:** Question Engine–Analytics para snapshot de métricas.
- **Gaps de ownership:** Notifications, Dashboard e Educational Insight não têm owner de domínio definido.
- Findings antigos sobre `tenantId`, User.role e membership devem ser considerados históricos até evidência nova, pois ADR-0003/0004 documentam harmonização posterior.

### Recomendação Final

**Uma única recomendação:** solicitar uma revisão documental conjunta dos owners de ADR-0002 e ADR-0003 para esclarecer o modo de consumo de `QuestionMetricSnapshot` por Question Engine, sem alterar o owner Analytics da métrica nem o owner Question Engine do estado adaptativo.

**Justificativa técnica:** é a principal ambiguidade atual que cruza tenant-aware read data e fronteiras entre contextos; resolvê-la documentalmente reduz risco de confundir projeção assíncrona com dependência síncrona sem criar regra ou arquitetura nova.

---

**Nota:** Este relatório consolida modelos documentados/propostos. Não altera ADRs, tenancy, ownership, schema ou regras e não atesta isolamento executável.
