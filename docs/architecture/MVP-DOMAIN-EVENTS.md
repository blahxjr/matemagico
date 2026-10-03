# MVP Event Catalog

**Data de referência:** 2026-10-01  
**Escopo:** eventos necessários para sustentar os casos MVP de Login, Membership, Escola, Turma, Questão, Tentativa e Ranking.  
**Natureza:** descoberta documental; não cria eventos, aggregates, bounded contexts, APIs, schema ou código.  
**Status das fontes:** ADR-0002, ADR-0003 e ADR-0004 permanecem `Proposed`; nomes e contratos citados são propostas documentadas, não eventos implementados/ratificados.

## Convenções

- **Explícito:** nome e producer/owner estão nomeados em uma fonte autorizada.
- **Inferido:** a fonte descreve o fato/consumo, mas o evento citado não tem relação produtor-consumidor inteiramente explícita ou seu papel no fluxo é deduzido.
- **Não Confirmado:** há nomenclatura divergente, semântica incompleta, ou só se sabe que o evento pode existir; não tratar como contrato aprovado.
- **Confirmado** neste catálogo significa “explicitamente documentado”, não implementado nem ratificado.
- **Síncrono/assíncrono** classifica o mecanismo de comunicação documentado. Operação que retorna imediatamente por contrato não é automaticamente um evento.
- A natureza Domain Event versus Integration Event não está formalmente distinguida nas fontes; não se cria uma taxonomia nova.

## Fontes permitidas

- [MVP-AGGREGATES.md](MVP-AGGREGATES.md)
- [MVP-USE-CASES.md](MVP-USE-CASES.md)
- [GLOSSARY.md](GLOSSARY.md)
- [DOMAIN-OWNERSHIP-MAP.md](DOMAIN-OWNERSHIP-MAP.md)
- [TENANCY-VALIDATION-REPORT.md](TENANCY-VALIDATION-REPORT.md)
- [ADR-0002 — Module Boundaries](ADRs/ADR-0002-module-boundaries.md)
- [ADR-0003 — Database Strategy](ADRs/ADR-0003-database-strategy.md)
- [ADR-0004 — Authentication and Authorization](ADRs/ADR-0004-authentication-authorization.md)

**Precedência:** ADR-0002 §2.3 e §2.7 fornece o catálogo conceitual e seus producers; DOMAIN-OWNERSHIP-MAP §5 e §6 consolida ownership e consumers. ADR-0003 estabelece outbox/inbox e rejeita Event Sourcing; ADR-0004 complementa fatos de autenticação/autorização. Os mapas MVP delimitam as capacidades, mas não aprovam novos nomes de evento.

---

## Parte 1 — Eventos documentados

Os nomes abaixo são todos eventos explicitamente listados nas fontes permitidas, mesmo quando seu domínio fica fora do MVP. Famílias com vários nomes ocupam uma linha para manter visível a origem comum; status aplica-se a cada nome listado.

| Evento                                                                                                                                                                                                                                                                                                                               | Fonte                                                    | Contexto Dono          | Classificação                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `UserRegistered`, `UserLoggedIn`, `UserLoggedOut`, `AuthenticationFailed`, `UserInvited`, `MembershipCreated`, `MembershipRemoved`, `RoleGranted`, `RoleRevoked`, `PasswordChanged`, `EmailVerified`, `PasswordResetRequested`, `PasswordResetCompleted`, `SessionRevoked`, `MFAEnrolled`, `MFARecoveryUsed`, `PrivilegedAccessUsed` | ADR-0002 §2.3, §2.7; DOMAIN-OWNERSHIP-MAP §5–6; ADR-0004 | Auth / Authorization   | **Explícito**                                                                                                                                    |
| `UserCreated`, `UserActivated`, `UserProfileUpdated`, `UserDeactivated`, `UserReactivated`, `UserSuspended`                                                                                                                                                                                                                          | ADR-0002 §2.3, §2.7; DOMAIN-OWNERSHIP-MAP §5–6           | Users                  | **Explícito**                                                                                                                                    |
| `SchoolCreated`, `SchoolUpdated`, `SchoolDeactivated`                                                                                                                                                                                                                                                                                | ADR-0002 §2.3, §2.7; DOMAIN-OWNERSHIP-MAP §5–6           | Schools                | **Explícito**                                                                                                                                    |
| `ClassCreated`, `ClassUpdated`, `StudentEnrolled`, `StudentUnenrolled`                                                                                                                                                                                                                                                               | ADR-0002 §2.3, §2.7; DOMAIN-OWNERSHIP-MAP §5–6           | Classes                | **Explícito**                                                                                                                                    |
| `TopicCreated`, `TopicUpdated`, `TopicRetired`                                                                                                                                                                                                                                                                                       | ADR-0002 §2.3, §2.7; DOMAIN-OWNERSHIP-MAP §5–6           | Topics                 | **Explícito**                                                                                                                                    |
| `QuestionCreated`, `QuestionUpdated`, `QuestionPublished`, `QuestionRetired`                                                                                                                                                                                                                                                         | ADR-0002 §2.3, §2.7; DOMAIN-OWNERSHIP-MAP §5–6           | Questions              | **Explícito**                                                                                                                                    |
| `QuestionSetGenerated`, `AnswerEvaluated`                                                                                                                                                                                                                                                                                            | ADR-0002 §2.3, §2.7; DOMAIN-OWNERSHIP-MAP §5–6           | Question Engine        | **Explícito**; `AnswerEvaluated` modo transporte **Não Confirmado**                                                                              |
| `AttemptStarted`, `QuestionAnswered`, `AttemptCompleted`                                                                                                                                                                                                                                                                             | ADR-0002 §2.3, §2.7; DOMAIN-OWNERSHIP-MAP §5–6           | Attempts               | **Explícito**                                                                                                                                    |
| `RankingUpdated`, `ParticipantRankChanged`                                                                                                                                                                                                                                                                                           | ADR-0002 §2.3, §2.7; DOMAIN-OWNERSHIP-MAP §5–6           | Rankings               | **Explícito**                                                                                                                                    |
| `StudyPathStarted`, `StudyPathUpdated`, `StudyPathCompleted`                                                                                                                                                                                                                                                                         | ADR-0002 §2.3, §2.7; DOMAIN-OWNERSHIP-MAP §5–6           | Study Paths            | **Explícito**                                                                                                                                    |
| `MockExamCreated`, `MockExamStarted`, `MockExamCompleted`                                                                                                                                                                                                                                                                            | ADR-0002 §2.3, §2.7; DOMAIN-OWNERSHIP-MAP §5–6           | Mock Exams             | **Explícito**                                                                                                                                    |
| `ChampionshipCreated`, `ParticipantRegistered`, `ChampionshipFinished`                                                                                                                                                                                                                                                               | ADR-0002 §2.3, §2.7; DOMAIN-OWNERSHIP-MAP §5–6           | Championships          | **Explícito**                                                                                                                                    |
| `BadgeEarned`, `BadgeRevoked`                                                                                                                                                                                                                                                                                                        | ADR-0002 §2.3, §2.7; DOMAIN-OWNERSHIP-MAP §5–6           | Badges                 | **Explícito**                                                                                                                                    |
| `CertificateGenerated`, `CertificateRevoked`                                                                                                                                                                                                                                                                                         | ADR-0002 §2.3, §2.7; DOMAIN-OWNERSHIP-MAP §5–6           | Certificates           | **Explícito**                                                                                                                                    |
| `ReportRequested`, `ReportGenerated`                                                                                                                                                                                                                                                                                                 | ADR-0002 §2.3, §2.7; DOMAIN-OWNERSHIP-MAP §5–6           | Analytics              | **Explícito**                                                                                                                                    |
| `RecommendationGenerated`, `TutorFeedbackGenerated`, `AIProviderFailed`                                                                                                                                                                                                                                                              | ADR-0002 §2.3, §2.7; DOMAIN-OWNERSHIP-MAP §5–6           | AI (capacidade futura) | **Explícito**                                                                                                                                    |
| `LoginSucceeded`, `LoginFailed`, `Logout`                                                                                                                                                                                                                                                                                            | ADR-0004, seção de eventos de segurança                  | Auth / Authorization   | **Não Confirmado** como aliases de `UserLoggedIn`, `AuthenticationFailed`, `UserLoggedOut`; ADR-0002 usa os últimos nomes no catálogo principal. |

**Eventos implícitos:** não se propõe nenhum nome novo. Quando um fluxo documenta somente uma operação/efeito ou uma relação de consumo sem nome de evento próprio, ela permanece descrita como contrato, leitura ou transição implícita; não deve ser promovida a evento por conveniência.

---

## Parte 2 — Eventos por agregado aprovado

“Agregado aprovado” abaixo segue o escopo de [MVP-AGGREGATES.md](MVP-AGGREGATES.md) e a correção de ownership do [MVP-USE-CASES.md](MVP-USE-CASES.md): SchoolMembership está explicitamente listado como Aggregate Root em DOMAIN-OWNERSHIP-MAP §9; User, School, Class, Question e Attempt também constam nessa lista. Auth é contexto dono de credenciais/sessões, mas as fontes não nomeiam um agregado único de Login/Auth. Ranking é projeção, não agregado.

| Agregado                               | Eventos emitidos                                                                                                              | Eventos consumidos                                                                                                                                                                                                | Classificação / ressalvas                                                                                                                                                                      |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **User**                               | `UserCreated`, `UserActivated`, `UserProfileUpdated`, `UserDeactivated`, `UserReactivated`, `UserSuspended` — producer Users. | `UserRegistered` de Auth para provisionamento; `EmailVerified` de Auth antecede `UserActivated`. Auth consome `UserDeactivated`/`UserReactivated` ou `UserSuspended` para efeito sobre acesso, conforme catálogo. | Nomes/producers explícitos. `UserReactivated` aparece repetido no catálogo editorial; não interpretar como eventos diferentes.                                                                 |
| **SchoolMembership**                   | `MembershipCreated`, `MembershipRemoved`, `RoleGranted`, `RoleRevoked` — Auth / Authorization.                                | Identidade/estado de User e estado de School são validados por contrato/evento conforme necessidade. As fontes não obrigam um evento específico de School como condição de cada mudança de membership.            | Eventos emitidos explícitos. Consumo de atualização de School é dependente do caso e não universal.                                                                                            |
| **School**                             | `SchoolCreated`, `SchoolUpdated`, `SchoolDeactivated` — Schools.                                                              | Nenhum evento de domínio é necessário para Schools possuir a instituição; dependências de Users/Auth não são leitura interna.                                                                                     | Emissão explícita.                                                                                                                                                                             |
| **Class**                              | `ClassCreated`, `ClassUpdated`, `StudentEnrolled`, `StudentUnenrolled` — Classes.                                             | `SchoolCreated`, `SchoolUpdated`, `SchoolDeactivated` de Schools; identidades de estudantes/docentes são validadas por contrato autorizado.                                                                       | Emissão/consumo documentados; não converter referência a User em evento novo.                                                                                                                  |
| **Question**                           | `QuestionCreated`, `QuestionUpdated`, `QuestionPublished`, `QuestionRetired` — Questions.                                     | `TopicUpdated`/`TopicRetired` quando necessário para validar referências; consulta/validação de Topics também pode ser síncrona por fachada pública.                                                              | Eventos nomeados; a necessidade de consumir mudança de Topic é condicional.                                                                                                                    |
| **Attempt**                            | `AttemptStarted`, `QuestionAnswered`, `AttemptCompleted` — Attempts.                                                          | `AnswerEvaluated` de Question Engine como retorno síncrono ou evento, conforme contrato; contexto de atividade fornecido por contrato quando aplicável.                                                           | Eventos de Attempt explícitos; forma de transporte de `AnswerEvaluated` não confirmada.                                                                                                        |
| **Ranking** _(projeção, não agregado)_ | `RankingUpdated`, `ParticipantRankChanged` — Rankings, quando a projeção/standing muda.                                       | `AttemptCompleted`; `ParticipantRegistered` e `ChampionshipFinished` quando a regra competitiva exigir.                                                                                                           | Eventos explícitos; consumo de Championship é fora do recorte MVP mínimo. Analytics e Badges são consumers documentados dos eventos emitidos por Ranking, mas ficam fora do escopo solicitado. |

### Observação sobre Login

O caso de uso Login pertence a Auth / Authorization, mas não existe agregado `Login` documentado. Eventos Auth associados ao fluxo incluem `UserLoggedIn`, `UserLoggedOut`, `AuthenticationFailed`, e fatos de segurança relacionados. `AnswerEvaluated` não é evento de Login. A sessão/resultado imediato do login é um contrato síncrono; qualquer publicação/event consumer é efeito separado e seu modo de entrega não está detalhado para todos esses eventos.

---

## Parte 3 — Eventos do fluxo MVP

Setas são relações funcionais, não afirmam que todas as etapas publiquem evento nem que exista uma única transação entre contextos.

| Transição               | Evento disparado documentado                                                                                                                                                                 | Owner                                                                                                 | Consumidores documentados                                                                                                                  | Classificação                                                                                                                                     |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **User → Login**        | `UserLoggedIn` após sucesso; `AuthenticationFailed` em falha. `UserRegistered` pode anteceder provisionamento, mas registro não é pré-condição de todo login.                                | Auth / Authorization                                                                                  | `UserLoggedIn`: Analytics/segurança; `AuthenticationFailed`: Security Audit e Analytics agregado/minimizado somente se permitido.          | Eventos nomeados e owners explícitos; modo de transporte desses eventos não definido.                                                             |
| **Login → Membership**  | Nenhum evento necessário só para selecionar/validar membership em uma sessão. `MembershipCreated`/`MembershipRemoved` e `RoleGranted`/`RoleRevoked` ocorrem quando o vínculo/concessão muda. | Auth / Authorization                                                                                  | Audit, invalidação de autorização/cache e consumers autorizados.                                                                           | **Inferência:** login não cria membership; não se inventa evento de “escola selecionada”.                                                         |
| **Membership → School** | Nenhum evento obrigatório pela mera navegação para School. `SchoolCreated`, `SchoolUpdated` e `SchoolDeactivated` são fatos do ciclo de vida escolar.                                        | Schools para fatos de School; Auth para fatos de Membership.                                          | `School*`: Classes, Auth/Authorization conforme necessidade e consumidores/projeções autorizados.                                          | Ownership explícito; relação com a navegação é **Não Confirmada** como evento.                                                                    |
| **School → Class**      | `ClassCreated`, `ClassUpdated`; também `StudentEnrolled`/`StudentUnenrolled` para matrícula em turma.                                                                                        | Classes                                                                                               | `ClassCreated`: Analytics no catálogo; Events de matrícula para Analytics e Study Paths somente quando regras por turma forem habilitadas. | Eventos explícitos; dependência de estado de School pode ser síncrona por contrato, além dos eventos.                                             |
| **Class → Question**    | Nenhum evento direto documentado. Questões são consultadas/publicadas via Questions; Question não depende de Classes.                                                                        | Questions para seus fatos próprios.                                                                   | Question Engine consulta Questions/Topics por contrato; `QuestionPublished` alimenta Question Engine/Analytics conforme catálogo.          | A ligação turma→questão não está definida; não criar `QuestionAssignedToClass`.                                                                   |
| **Question → Attempt**  | `QuestionSetGenerated` pode fornecer set/snapshot; `AttemptStarted` marca início. `AnswerEvaluated` é retorno do Engine; `QuestionAnswered` e `AttemptCompleted` são emitidos por Attempts.  | Question Engine para `QuestionSetGenerated`/`AnswerEvaluated`; Attempts para os eventos de tentativa. | `QuestionSetGenerated`: Attempts/Study Paths/Mock Exams; `AnswerEvaluated`: Attempts (síncrono ou evento, contrato não fechado).           | Nomes explícitos; `QuestionSetGenerated` não é obrigatório se o fluxo usa leitura direta de questão publicada.                                    |
| **Attempt → Ranking**   | `AttemptCompleted` (e `QuestionAnswered`, se relevante à projeção) é fato de origem documentado. Rankings pode emitir `RankingUpdated`/`ParticipantRankChanged` após atualizar a projeção.   | Attempts para o fato elegível; Rankings para a projeção e os eventos de mudança de classificação.     | Rankings consome `AttemptCompleted`; Events/Analytics/Badges estão descritos, mas Analytics e Badges não fazem parte do MVP solicitado.    | Consumo assíncrono de Attempts por Rankings é explícito. A elegibilidade/score usados no MVP requerem regra declarada e podem continuar ambíguos. |

### Representação do fluxo

```text
User
  ── UserLoggedIn / AuthenticationFailed (Auth) ──>
Login (Auth)
  ── sem evento para mera seleção/validação ──>
SchoolMembership
  ── sem evento para mera consulta; MembershipCreated/Removed se o vínculo mudar ──>
School
  ── SchoolCreated/Updated/Deactivated (Schools) ──>
Class
  ── ClassCreated/Updated; StudentEnrolled/Unenrolled (Classes) ──>
Question publicada
  ── QuestionPublished (Questions); leitura/snapshot, sem evento de atribuição à turma ──>
Attempt
  ── AttemptStarted / QuestionAnswered / AttemptCompleted (Attempts) ──>
Ranking (projeção)
  ── RankingUpdated / ParticipantRankChanged (Rankings) ──>
```

---

## Parte 4 — Eventos obrigatórios

| Capacidade                 | Evento(s) documentados                                                                                                 | Necessidade no MVP                                                                                                                                                                                                                         | Justificativa                                                                                                                                                                                                                            |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Login**                  | `UserLoggedIn`, `AuthenticationFailed`; `UserLoggedOut` para logout.                                                   | **Não indispensáveis para autenticar a resposta síncrona.** São fatos documentados para observabilidade/segurança e consumers; o login em si usa contrato Auth.                                                                            | ADR-0002 lista esses eventos; nenhuma fonte exige Analytics ou bus para retornar sucesso/falha de autenticação. Não criar `LoginSucceeded` como nome canônico enquanto a divergência com ADR-0002 não for resolvida.                     |
| **Criação de escola**      | `SchoolCreated`.                                                                                                       | **Condicionalmente indispensável** se Schools/Classes/Auth/consumers tiverem de reagir à criação por evento; não é requisito para completar a gravação/retorno síncrono de `createSchool`.                                                 | O evento está documentado e seu producer é Schools; Classes e Analytics são consumers nomeados.                                                                                                                                          |
| **Criação de turma**       | `ClassCreated`.                                                                                                        | **Não indispensável** para a resposta da operação; necessário somente para consumers/projeções que dependam do fato.                                                                                                                       | Classes é owner; Analytics é consumer listado.                                                                                                                                                                                           |
| **Publicação de questão**  | `QuestionPublished`.                                                                                                   | **Necessário como fato do lifecycle/evento para consumers** que atualizam disponibilidade; consulta direta por contrato também existe.                                                                                                     | Questions é owner e Question Engine/Analytics são consumers documentados. Se conteúdo for pré-carregado sem consumidores, publicação ainda é estado do domínio, mas o evento não precisa ser transporte obrigatório por todas as fontes. |
| **Resolução de questão**   | `AttemptStarted`, `QuestionAnswered`, `AttemptCompleted`; `AnswerEvaluated` como retorno/resultado do Question Engine. | `AttemptStarted` e registro de respostas/conclusão são fatos centrais do Attempt. `QuestionAnswered` e `AttemptCompleted` são eventos explicitamente listados; evento externo indispensável para a resposta ao aluno não está determinado. | Question Engine avalia; Attempts registra. `AnswerEvaluated` pode ser resposta síncrona e não necessariamente evento de transporte. Após commit, os outcomes ficam disponíveis aos consumers.                                            |
| **Atualização de ranking** | `AttemptCompleted` consumido; `RankingUpdated` e, quando a colocação muda, `ParticipantRankChanged` produzidos.        | **`AttemptCompleted` é indispensável à projeção assíncrona documentada**; a publicação de evento Ranking* é necessária apenas aos seus consumers.                                                                                          | Rankings não depende sincronicamente de Attempts e atualiza leaderboard eventualmente consistente. O nome preciso do evento de conclusão de ranking/posição é documentado, mas critério/semântica de “mudou” precisa estar definido.     |

**Síntese:** o contrato síncrono de cada comando preserva o resultado imediato; eventos são necessários para provisionamento/consumers/projeções assíncronas conforme o fluxo. “Evento documentado” não significa “bus obrigatório para concluir qualquer operação”.

---

## Parte 5 — Eventos e projeções

| Projeção / consumer                          | Eventos de origem documentados                                                                                                                                                                                                                                                                                             | Classificação                                                                                  | Observação                                                                                                                                                                            |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Ranking**                                  | `AttemptCompleted`; `ParticipantRegistered` e `ChampionshipFinished` quando a regra de ranking depende de campeonato.                                                                                                                                                                                                      | **Confirmado**                                                                                 | ADR-0002 nomeia Attempts/Championships como produtores e Rankings como consumer; atualização é assíncrona. Escopo, elegibilidade e score do caso MVP permanecem a confirmar.          |
| **Analytics**                                | Eventos autorizados dos módulos produtores; entre os eventos relacionados ao MVP: `UserLoggedIn`, `SchoolCreated`/`SchoolUpdated`/`SchoolDeactivated`, `ClassCreated`, `StudentEnrolled`/`StudentUnenrolled`, `QuestionPublished`, `AttemptStarted`, `QuestionAnswered`, `AttemptCompleted`, `AnswerEvaluated` minimizado. | **Confirmado como capacidade geral; aplicabilidade individual parcialmente ambígua**           | ADR-0002 lista Analytics como consumer dos eventos; inclusão, finalidade, minimização e base legal de dados individuais dependem de política. Analytics avançado está fora deste MVP. |
| **Read Models de Classes**                   | `SchoolCreated`/`SchoolUpdated`/`SchoolDeactivated`; `StudentEnrolled`/`StudentUnenrolled`.                                                                                                                                                                                                                                | **Inferido / parcialmente confirmado**                                                         | Ownership Map nomeia consumers de school state e projeção de matrícula, mas não especifica um único read model ou subscription obrigatório.                                           |
| **Read Models de Questions/Question Engine** | `TopicUpdated`/`TopicRetired`; `QuestionPublished`/`QuestionRetired`; `QuestionSetGenerated`.                                                                                                                                                                                                                              | **Confirmado** para eventos e consumers listados; necessidade de cada projeção **condicional** | Engine e Questions têm contratos síncronos para conteúdo; eventos de atualização/retirement atendem consumers/projeções conforme necessidade.                                         |
| **Read Models de Membership/autorização**    | `MembershipCreated`/`MembershipRemoved`, `RoleGranted`/`RoleRevoked`, `UserDeactivated`/`UserReactivated`/`UserSuspended`.                                                                                                                                                                                                 | **Confirmado** para invalidação de acesso/cache; detalhe de cada projeção **inferido**         | Consumers autorizados e invalidation aparecem nas fontes; formato e existência de read model/cache específico não estão definidos.                                                    |

### Ambiguidade Question Engine–Analytics

ADR-0003 diz que Question Engine consome `QuestionMetricSnapshot` de Analytics; ADR-0002 lista a matriz sem Analytics como dependência direta do Engine. O Ownership Map propõe leitura por projeção/snapshot, mas reconhece a necessidade de harmonizar se é assíncrona ou outra forma. Classificação: **Ambíguo, severidade MÉDIA**. Não incluir esse fluxo no MVP de eventos nem inventar evento para snapshot.

---

## Parte 6 — Eventos síncronos vs assíncronos

| Evento / família                                                                        | Classificação                                                                                             | Explicação                                                                                                                                                                   |
| --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `UserLoggedIn`, `UserLoggedOut`, `AuthenticationFailed`                                 | **Não definido** para transporte do evento; login/logout são operações Auth **síncronas**                 | ADR-0002 nomeia consumidores de segurança/Analytics, mas não fixa se esses fatos são publicados em bus síncrono ou assíncrono. Não bloquear autenticação em Analytics.       |
| `UserRegistered` → `UserCreated`                                                        | **Assíncrono** para provisionamento User/Profile                                                          | Ownership Map declara explicitamente provisionamento assíncrono e sem chamada síncrona de Auth no read de perfil.                                                            |
| `MembershipCreated`/`MembershipRemoved`, `RoleGranted`/`RoleRevoked`                    | **Assíncrono** para audit/invalidação/consumers; mudança é comandada no owner Auth                        | Event consumers reagem à alteração; a verificação de autorização da operação protegida é síncrona no servidor e não deve depender de cache de membership.                    |
| `SchoolCreated`/`SchoolUpdated`/`SchoolDeactivated`                                     | **Não definido** como modo único                                                                          | Schools publica por contrato/evento; Classes pode validar estado por contrato síncrono e também consumir eventos para efeitos/projeções.                                     |
| `ClassCreated`/`ClassUpdated`, `StudentEnrolled`/`StudentUnenrolled`                    | **Assíncrono** para Analytics/consumers; contrato síncrono pode servir consulta/validação quando previsto | ADR-0002 associa efeitos pós-fato a eventos; detalhes de entrega/garantia não estão ratificados.                                                                             |
| `QuestionCreated`/`QuestionUpdated`/`QuestionPublished`/`QuestionRetired`               | **Assíncrono** para consumers/projeções; conteúdo pode ser consultado por contrato síncrono               | Questions valida referências a Topics por fachada síncrona quando necessário; mudanças/publicações têm consumers/eventos documentados.                                       |
| `QuestionSetGenerated`                                                                  | **Não definido** em geral                                                                                 | Nome e consumers são documentados, mas o modo do fluxo MVP direto de questão não obriga gerar conjunto ou publicar esse evento.                                              |
| `AnswerEvaluated`                                                                       | **Síncrono ou assíncrono, não fechado**                                                                   | A fonte diz expressamente que pode ser retorno síncrono ou evento conforme contrato. Para o MVP de resposta interativa, retorno síncrono é recomendação, não fato universal. |
| `AttemptStarted`, `QuestionAnswered`, `AttemptCompleted`                                | **Assíncrono após commit** para efeitos/consumers                                                         | ADR-0002 descreve publicação após commit e o retorno ao aluno sem esperar Analytics/Rankings.                                                                                |
| `AttemptCompleted` → processamento de Rankings                                          | **Assíncrono**                                                                                            | Ownership Map e ADR-0002 definem Rankings como projeção sem dependência síncrona; leaderboard tem consistência eventual.                                                     |
| `RankingUpdated`, `ParticipantRankChanged`                                              | **Assíncrono** para Badges/Analytics; demais consumers não definidos                                      | São mudanças da projeção Rankings; a fonte não descreve resposta síncrona do fluxo de tentativa aguardando esses eventos.                                                    |
| Eventos de Analytics, AI, Badges, Certificates, Study Paths, Mock Exams e Championships | **Assíncrono** quando usados como outcomes/consumers, salvo contrato explícito distinto                   | Maioria fica fora do MVP solicitado. `AnswerEvaluated` segue sua exceção documentada.                                                                                        |

**Limite de infraestrutura:** ADR-0002 não presume entrega exatamente uma vez; Outbox, quando habilitada, registra evento na mesma unidade transacional e o dispatcher entrega após commit. Isso não torna todo evento um comando assíncrono nem transforma armazenamento em Event Store.

---

## Parte 7 — Matriz de produção

| Evento                                                                       | Producer                     | Consumer                                                                                              |
| ---------------------------------------------------------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------- |
| `UserRegistered`                                                             | Auth / Authorization         | Users; Analytics agregado somente se base legal permitir                                              |
| `UserLoggedIn`                                                               | Auth / Authorization         | Analytics/segurança                                                                                   |
| `UserLoggedOut`                                                              | Auth / Authorization         | Analytics/segurança                                                                                   |
| `AuthenticationFailed`                                                       | Auth / Authorization         | Security Audit; Analytics minimizado/permitido                                                        |
| `UserCreated`                                                                | Users, após `UserRegistered` | Consumers autorizados; Analytics agregado permitido                                                   |
| `EmailVerified`                                                              | Auth / Authorization         | Users (antecede `UserActivated`); Security Audit                                                      |
| `UserActivated`                                                              | Users                        | Audit; Analytics agregado permitido                                                                   |
| `UserDeactivated`, `UserReactivated`, `UserSuspended`                        | Users                        | Auth / Authorization para revogar/restaurar acesso; Audit; outros consumers conforme política         |
| `MembershipCreated`, `MembershipRemoved`                                     | Auth / Authorization         | Audit, invalidação de autorização/cache, consumers autorizados                                        |
| `RoleGranted`, `RoleRevoked`                                                 | Auth / Authorization         | Audit, invalidação de autorização/cache                                                               |
| `SchoolCreated`                                                              | Schools                      | Classes; Analytics                                                                                    |
| `SchoolUpdated`                                                              | Schools                      | Classes; Analytics                                                                                    |
| `SchoolDeactivated`                                                          | Schools                      | Classes; Analytics e consumers com dados escopados                                                    |
| `ClassCreated`                                                               | Classes                      | Analytics                                                                                             |
| `ClassUpdated`                                                               | Classes                      | Consumers de estado de turma conforme contrato; consumers específicos não enumerados no catálogo base |
| `StudentEnrolled`                                                            | Classes                      | Analytics; Study Paths somente se regras por turma habilitadas                                        |
| `StudentUnenrolled`                                                          | Classes                      | Analytics e consumers com projeção de matrícula                                                       |
| `TopicUpdated`, `TopicRetired`                                               | Topics                       | Questions; Question Engine; Analytics por necessidade                                                 |
| `QuestionCreated`, `QuestionUpdated`, `QuestionPublished`, `QuestionRetired` | Questions                    | Question Engine; Analytics                                                                            |
| `QuestionSetGenerated`                                                       | Question Engine              | Attempts; Study Paths; Mock Exams                                                                     |
| `AnswerEvaluated`                                                            | Question Engine              | Attempts (síncrono ou evento conforme contrato); Analytics minimizado, sem resposta bruta             |
| `AttemptStarted`                                                             | Attempts                     | Analytics; Study Paths opcional                                                                       |
| `QuestionAnswered`                                                           | Attempts                     | Analytics; Study Paths; Badges somente se regra exigir                                                |
| `AttemptCompleted`                                                           | Attempts                     | Study Paths; Mock Exams; Championships; Rankings; Badges; Analytics                                   |
| `RankingUpdated`, `ParticipantRankChanged`                                   | Rankings                     | Badges se regra exigir colocação; Analytics                                                           |
| `ParticipantRegistered`, `ChampionshipFinished`                              | Championships                | Rankings; Analytics (fora do MVP mínimo se não houver campeonato)                                     |
| Eventos de Topics `TopicCreated`                                             | Topics                       | Questions; Question Engine; Analytics por necessidade                                                 |
| `TopicRetired` / `TopicUpdated` consumidos condicionalmente                  | Topics                       | Questions e Question Engine                                                                           |

**Ressalva:** eventos sem consumers principais no catálogo — por exemplo, `ClassUpdated` — não recebem consumers inventados. Consumidor não enumerado permanece “não especificado”, ainda que a fonte permita consumidores autorizados conforme necessidade.

---

## Parte 8 — Matriz de risco

Escala aplicada à lacuna documental e ao impacto potencial no fluxo MVP; não é classificação de vulnerabilidade operacional comprovada.

| Risco                                                                                                                              | Severidade                   | Evidência e impacto                                                                                                                                                                  |
| ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Falta de proveniência/elegibilidade clara no `AttemptCompleted` para construir o ranking mínimo (escopo, período, desempate/score) | **ALTO**                     | Evento/consumer estão documentados, mas semântica universal de Score e regras concretas de ranking não estão fechadas; projeção pode classificar incorretamente ou misturar escopos. |
| Enforcement cross-school e consumo seguro de eventos não comprovados em runtime                                                    | **CRÍTICO**                  | TENANCY-VALIDATION-REPORT registra constraints/testes negativos cross-school como bloqueador para afirmar isolamento executável; evento não concede autorização.                     |
| `UserLoggedIn`/`AuthenticationFailed` versus aliases `LoginSucceeded`/`LoginFailed`/`Logout`                                       | **MÉDIO**                    | ADR-0004 usa nomes alternativos em seção de segurança; ADR-0002 é o catálogo principal. Consumers podem assinar contratos diferentes se nomes não forem harmonizados.                |
| `AnswerEvaluated` síncrono versus evento                                                                                           | **ALTO**                     | ADR-0002 permite ambos os modos. A resolução interativa depende do resultado; sem contrato único surgem divergência de latência/consistência ou tentativa incompleta.                |
| `QuestionPublished` e sincronização de versão/snapshot com tentativa                                                               | **ALTO**                     | Evento é explícito, mas publicação e leitura do snapshot usado em Attempt devem corresponder; fontes deixam detalhe de contrato/ciclo de publicação parcialmente aberto.             |
| Events/Integration: semântica e contrato de entrega não totalmente definidos                                                       | **MÉDIO**                    | Domain Event versus Integration Event não têm taxonomia distinta; retries/idempotência/versionamento são diretrizes, não garantia de transporte exatamente uma vez.                  |
| `SchoolCreated`/`ClassCreated` não necessários a toda operação e consumidores condicionais                                         | **BAIXO**                    | Events estão nomeados; alguns consumers, como Analytics ou regras de turma em Study Paths, não são requisito do fluxo MVP.                                                           |
| Consumers/uso de `UserLoggedIn` em Analytics com dados pessoais/menores                                                            | **ALTO**                     | Fontes condicionam Analytics a base legal, minimização e retenção; requisitos legais e privacidade de menores permanecem gates.                                                      |
| `ClassUpdated` sem consumer principal especificado                                                                                 | **BAIXO**                    | Evento documentado, mas consumer/payload para o MVP não está fixado; não bloqueia consulta de turma por contrato.                                                                    |
| Membership versus Enrollment                                                                                                       | **ALTO**                     | MembershipCreated/Removed é fato Auth User–School; StudentEnrolled/Unenrolled é fato Classes Student–Class. Confusão cria projeção/acesso incorreto.                                 |
| Eventos sem owner no catálogo listado                                                                                              | **BAIXO / não identificado** | DOMAIN-OWNERSHIP-MAP reporta nenhum evento listado sem owner; isso é evidência documental proposta, não prova de implementação.                                                      |
| Event stores/replay confundidos com source of truth                                                                                | **MÉDIO**                    | ADR-0003 rejeita Event Sourcing; outbox/inbox/eventos não substituem aggregates nem autorizam consumers a sobrescrever a origem.                                                     |

---

## Parte 9 — Catálogo MVP

### Confirmados

- **Auth:** `UserRegistered`, `UserLoggedIn`, `UserLoggedOut`, `AuthenticationFailed`, `MembershipCreated`, `MembershipRemoved`, `RoleGranted`, `RoleRevoked`, `EmailVerified` e fatos correlatos de segurança têm nome/producer Auth explícitos. Para o fluxo mínimo: `UserLoggedIn`/`AuthenticationFailed` e os eventos de membership/role são os nomes aplicáveis.
- **Users:** `UserCreated` é emitido por Users após `UserRegistered`; estados do User também têm eventos nomeados.
- **Schools:** `SchoolCreated`, `SchoolUpdated`, `SchoolDeactivated`.
- **Classes:** `ClassCreated`, `ClassUpdated`, `StudentEnrolled`, `StudentUnenrolled`.
- **Questions:** `QuestionCreated`, `QuestionUpdated`, `QuestionPublished`, `QuestionRetired`.
- **Question Engine / Attempts:** `AnswerEvaluated` é resultado nomeado do Engine; `AttemptStarted`, `QuestionAnswered`, `AttemptCompleted` são facts nomeados de Attempts.
- **Rankings:** `RankingUpdated`, `ParticipantRankChanged`; Rankings consome `AttemptCompleted`.

“Confirmado” aqui significa nomeado com producer/owner nas fontes, não que cada evento seja obrigatório para a operação síncrona nem que exista implementação.

### Inferidos

- **Nenhum nome de evento novo é proposto.** São inferidas apenas as transições: seleção/validação de SchoolMembership não dispara evento próprio documentado; consulta de School ou Question também não requer evento dedicado; evento de criação/publicação é relevante quando consumidores/projeções precisam reagir.
- `AttemptCompleted` alimenta o ranking MVP por processamento assíncrono; esta ligação está explícita na arquitetura, mas escolha de elegibilidade de uma tentativa particular é uma decisão de domínio ainda não descrita.
- Consumers de mudanças em School/Class/Membership mantêm efeitos/projeções próprios conforme contratos; a fonte não torna cada read model obrigatório.

### Ambíguos

- `LoginSucceeded`, `LoginFailed`, `Logout` (ADR-0004) versus `UserLoggedIn`, `AuthenticationFailed`, `UserLoggedOut` (ADR-0002): confirmar nomes canônicos e se são aliases.
- `AnswerEvaluated`: retorno síncrono ou evento assíncrono; contrato precisa escolher conforme fluxo de resolução.
- Se e quando `QuestionSetGenerated` é usado no fluxo MVP de consulta/prática direta.
- Critério de elegibilidade, semântica de resultado/score, desempate, período e escopo efetivo para Rankings.
- Modo de leitura de `QuestionMetricSnapshot` pelo Engine (ambiguidade registrada; fora do MVP atual).
- Consumers concretos para `ClassUpdated` e payload mínimo necessário.
- Modo síncrono/assíncrono de entrega para certos eventos de login e ciclo escolar; o fato de ter nome de evento não define transporte.

---

## Parte 10 — Eventos fora do MVP

Os eventos seguintes estão documentados, mas seus fluxos/consumers não entram neste MVP. Não se propõe implementá-los nem acrescentar outros eventos de mesma finalidade.

| Capacidade fora de escopo                   | Eventos documentados que ficam fora                                                                                                                                                                                                                                                                                           |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Analytics avançado**                      | `ReportRequested`, `ReportGenerated`; consumidores de métricas avançadas de `UserProfileUpdated`, `QuestionAnswered`, `AttemptStarted`, `AttemptCompleted`, `School*`, `Class*` e demais fatos para relatórios. Eventos de origem necessários a consumidores MVP não são excluídos apenas porque Analytics também os consome. |
| **Certificados**                            | `CertificateGenerated`, `CertificateRevoked`; consumo de `StudyPathCompleted`, `MockExamCompleted`, `ChampionshipFinished` ou `BadgeEarned` para emissão.                                                                                                                                                                     |
| **Badges**                                  | `BadgeEarned`, `BadgeRevoked`; qualquer consumo de `AttemptCompleted`, `QuestionAnswered`, `StudyPathCompleted`, `MockExamCompleted`, `ChampionshipFinished` ou `RankingUpdated` para reconhecimento.                                                                                                                         |
| **IA**                                      | `RecommendationGenerated`, `TutorFeedbackGenerated`, `AIProviderFailed`.                                                                                                                                                                                                                                                      |
| **Recomendação adaptativa**                 | `RecommendationGenerated` e `QuestionSetGenerated` quando empregado para seleção adaptativa; recomendações associadas a Study Paths. `QuestionSetGenerated` permanece utilizável somente se o fluxo de questão publicado realmente exigir um set/snapshot, sem incluir adaptatividade.                                        |
| **Outros contextos competitivos/atividade** | `ChampionshipCreated`, `ParticipantRegistered`, `ChampionshipFinished`, `MockExamCreated`, `MockExamStarted`, `MockExamCompleted`, `StudyPathStarted`, `StudyPathUpdated`, `StudyPathCompleted`, e eventos de Topics que não forem necessários à validação/publicação de questão.                                             |
| **Segurança/identidade avançada**           | `MFAEnrolled`, `MFARecoveryUsed`, `PrivilegedAccessUsed`, `PasswordResetRequested`, `PasswordResetCompleted` podem ficar fora da entrega funcional de 30 dias, mas políticas/gates de segurança e requisitos de produção do ADR-0004 não são dispensados por esta classificação.                                              |

---

## Parte 11 — Resultado final

# MVP Event Map

```text
User
  ── UserRegistered (Auth; provisionamento) ──>
Membership
  ── MembershipCreated / MembershipRemoved (Auth) ──>
School
  ── SchoolCreated / SchoolUpdated / SchoolDeactivated (Schools) ──>
Class
  ── ClassCreated / ClassUpdated / StudentEnrolled / StudentUnenrolled (Classes) ──>
Question
  ── QuestionCreated / QuestionUpdated / QuestionPublished / QuestionRetired (Questions) ──>
Attempt
  ── AttemptStarted / QuestionAnswered / AttemptCompleted (Attempts) ──>
Ranking
  ── RankingUpdated / ParticipantRankChanged (Rankings projection) ──>
```

### Como interpretar o mapa

- `UserRegistered` é emitido por Auth e consumido por Users para provisionar User/Profile; não é evento emitido pelo agregado User.
- **Login** é operação Auth. `UserLoggedIn`/`AuthenticationFailed` descrevem os fatos de autenticação; não ocorre `MembershipCreated` por simplesmente entrar.
- Membership é vínculo User–School; Enrollment é vínculo Student–Class. Eventos correspondentes são diferentes e têm owners diferentes.
- Eventos de School e Class informam consumers/projeções; não significam que School cria Class nem que Class é dono de School.
- `QuestionPublished` informa publicação para consumers; Attempt usa questão/versão/snapshot. Question Engine avalia por `AnswerEvaluated`, e Attempts registra resposta/conclusão.
- `AttemptCompleted` é a entrada documentada para a projeção Ranking; `RankingUpdated`/`ParticipantRankChanged` são fatos da projeção, não mutações em Attempt.
- Nem todas as setas significam uma mensagem obrigatória: a mera consulta/seleção de escola, turma ou questão pode usar contratos de leitura síncronos.

---

## Parte 12 — MEMÓRIA PARA PROMPT 4

## Eventos Confirmados

- Auth: `UserRegistered`, `UserLoggedIn`, `UserLoggedOut`, `AuthenticationFailed`, `MembershipCreated`, `MembershipRemoved`, `RoleGranted`, `RoleRevoked`, `EmailVerified` e eventos de segurança explicitamente nomeados.
- Users: `UserCreated` após `UserRegistered`; eventos de ciclo de vida/profile nomeados.
- Schools: `SchoolCreated`, `SchoolUpdated`, `SchoolDeactivated`.
- Classes: `ClassCreated`, `ClassUpdated`, `StudentEnrolled`, `StudentUnenrolled`.
- Questions: `QuestionCreated`, `QuestionUpdated`, `QuestionPublished`, `QuestionRetired`.
- Question Engine/Attempts: `AnswerEvaluated`, `AttemptStarted`, `QuestionAnswered`, `AttemptCompleted`.
- Rankings: `RankingUpdated`, `ParticipantRankChanged`; consumo de `AttemptCompleted`.

## Eventos Inferidos

- Não foram inventados nomes. São inferidas apenas transições sem evento próprio, como escolher/validar uma School ou consultar uma Question.
- `AttemptCompleted` alimenta a projeção Ranking de forma assíncrona, conforme ownership descrito; eligibility do MVP ainda depende de regra confirmada.

## Eventos Ambíguos

- `LoginSucceeded`/`LoginFailed`/`Logout` versus nomes canônicos usados no ADR-0002.
- `AnswerEvaluated` síncrono versus evento.
- Uso de `QuestionSetGenerated` na prática direta, regras de elegibilidade/score do Ranking, consumidor de `ClassUpdated` e modo de entrega de eventos escolares/login.
- Question Engine–Analytics `QuestionMetricSnapshot`, fora do MVP.

## Producers

- Auth / Authorization: autenticação, sessão, memberships e grants.
- Users: perfil e estado global de User.
- Schools: ciclo de vida/configuração de School.
- Classes: turma, enrollment e atribuição.
- Questions: conteúdo/versionamento/publicação.
- Question Engine: seleção e avaliação.
- Attempts: início, respostas e conclusão.
- Rankings: mudanças da projeção de ranking.

## Consumers

- Users consome `UserRegistered`.
- Auth consome eventos de estado global de User para efeitos de acesso conforme política.
- Classes (e Auth quando necessário) consome eventos de School; Classes valida estado por contrato quando necessário.
- Questions/Question Engine consomem atualizações de Topics conforme necessidade e contratos.
- Attempts consome resultado de avaliação do Question Engine.
- Rankings consome `AttemptCompleted` e, se houver regra de campeonato, eventos de Championships.
- Analytics, Badges, Certificates, IA, Study Paths e demais consumers ficam fora do escopo funcional MVP, mesmo quando constam nas fontes.

## Riscos

- Tenancy/consumo cross-school não está validado em runtime.
- Nomes de evento de autenticação divergem entre ADR-0002 e ADR-0004.
- Owner e nomes estão em ADRs ainda Proposed.
- Contrato síncrono de avaliação, elegibilidade/score de ranking e versionamento/snapshot da questão permanecem incompletos.
- Privacidade e base legal para dados de menores limitam consumo analítico de eventos.
- Outbox/inbox não é Event Store; entrega exatamente uma vez não é presumida.

## Próxima Etapa

**DOMAIN MODELING**
