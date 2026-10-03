# MVP Implementation Blueprint

## Convenções e limites

Este blueprint converte o recorte funcional documentado em incrementos sugeridos. Não é uma ratificação dos ADRs, um modelo físico, nem uma especificação de contratos de API.

- **Fato documentado** — consta nas fontes obrigatórias.
- **Inferência** — necessário para ordenar ou conectar entregas sem criar regra de domínio.
- **Recomendação** — decisão de execução proposta neste blueprint, sujeita aos responsáveis do produto e da arquitetura.

**Status das fontes:** ADR-0002, ADR-0003 e ADR-0004 permanecem `Proposed`. As Aggregate Roots e partes das regras de ranking também têm ressalvas nos artefatos MVP. As ambiguidades são gates de decisão; este documento não as resolve por suposição.

## Fontes obrigatórias

- [MVP-AGGREGATES.md](./MVP-AGGREGATES.md)
- [MVP-USE-CASES.md](./MVP-USE-CASES.md)
- [MVP-DOMAIN-EVENTS.md](./MVP-DOMAIN-EVENTS.md)
- [MVP-DOMAIN-MODEL.md](./MVP-DOMAIN-MODEL.md)
- [ADR-0002 — Module Boundaries](./ADRs/ADR-0002-module-boundaries.md)
- [ADR-0003 — Database Strategy](./ADRs/ADR-0003-database-strategy.md)
- [ADR-0004 — Authentication and Authorization](./ADRs/ADR-0004-authentication-authorization.md)

---

## Parte 1 — Visão do MVP

### Resumo executivo

**Menor produto funcional — recomendação:** um estudante autenticado consegue entrar no contexto de uma escola autorizado por `SchoolMembership`, acessar questão publicada, resolver uma questão e consultar o resultado da tentativa. A operação escolar consegue organizar ao menos uma turma e seus vínculos de aluno; professor acessa somente turma atribuída e roster autorizado. Uma projeção simples de ranking é uma entrega subordinada, condicionada à aprovação de suas regras.

**Problemas que resolve — fatos documentados:** autenticação global separada de autorização escolar; acesso delimitado à escola/turma; organização mínima de estudantes em turmas; acesso a conteúdo publicado; registro autoritativo de tentativas e resultados; consulta competitiva básica, se elegibilidade e escopo forem definidos.

**Usuários atendidos — fatos documentados:** alunos (`STUDENT`), professores (`TEACHER`), administradores escolares (`SCHOOL_ADMIN` e `COORDINATOR`) e, para provisionamento/plataforma, `GLOBAL_ADMIN`. A publicação de conteúdo pertence ao fluxo editorial autorizado, não ao papel `TEACHER`.

**Limite de onboarding — recomendação:** iniciar com uma escola piloto provisionada operacionalmente caso criar/configurar escolas no produto comprometa o fluxo central. Não criar escola, membership ou matrícula de turma implicitamente como efeito de login.

---

## Parte 2 — Módulos MVP

As prioridades abaixo refletem a ordem recomendada de entrega, não a prioridade P0/P1 funcional dos documentos-fonte. Os nomes são os módulos/owners documentados; Membership é uma capacidade de Auth/Authorization, não um novo bounded context.

| Módulo / capacidade                     | Objetivo                                                                                     | Dependências                                                                                                                              | Prioridade                                                        |
| --------------------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| **Auth**                                | Autenticar identidade global por email/senha V1 e manter sessão conforme ADR-0004.           | User provisionado e credencial disponível; validação server-side para operações protegidas.                                               | **P0**                                                            |
| **Membership** _(Auth / Authorization)_ | Resolver vínculo User–School, grants e autorização contextual; não confundir com Enrollment. | Auth e User; referência a School validada por contrato; `schoolId` do recurso validado no servidor.                                       | **P0**                                                            |
| **Schools**                             | Manter a instituição/tenant e configuração essencial; prover o contexto escolar.             | Auth/Membership para ações autorizadas; Classes consome estado escolar por contrato. Escola piloto pode ser provisionada fora do produto. | **P0** para contexto; **P1** para criação/configuração no produto |
| **Classes**                             | Criar turmas, gerir Enrollment e atribuições docentes, consultar roster permitido.           | School/`schoolId`; identidades referenciadas; Membership e permission checks.                                                             | **P0**                                                            |
| **Questions**                           | Disponibilizar questão publicada e versão/snapshot para prática.                             | Conteúdo curado; referências de taxonomia por seus owners; Question Engine por contrato para avaliação.                                   | **P0**                                                            |
| **Attempts**                            | Registrar início, respostas e resultado contextual; preservar a conclusão imutável.          | Auth e autorização; questão publicada/snapshot; contrato de avaliação do Question Engine; `schoolId` em tentativa institucional.          | **P0**                                                            |
| **Ranking**                             | Expor uma projeção somente de leitura baseada em tentativas elegíveis.                       | `AttemptCompleted`; escopo, elegibilidade e regra aprovados; processamento eventualmente consistente.                                     | **P1**, após o fluxo de Attempt                                   |

**Fato arquitetural:** cada owner é autoridade exclusiva de escrita. Comunicação entre módulos ocorre por contrato público síncrono ou evento após commit; consumidores são idempotentes e não adquirem ownership nem autorização por receber evento. Evitar dependências circulares.

---

## Parte 3 — Ordem de implementação

| Fase                                              | Entrega                                                                                                                        | Justificativa                                                                                                                                                  |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1 — Ratificar decisões e reduzir ambiguidades** | Confirmar ADRs aplicáveis e decisões mínimas de raízes, provisionamento de identidade, conteúdo/snapshot, avaliação e ranking. | **Recomendação.** Os ADRs continuam `Proposed`; não se deve congelar implementação em cima de decisões que as fontes declaram pendentes.                       |
| **2 — Auth + Membership + contexto School**       | Login, leitura de sessão, autorização server-side e resolução de membership/`schoolId`; escola piloto disponível.              | **Fato:** o contexto escolar protegido depende de sessão, vínculo, permissão e escopo compatíveis. É a barreira de segurança para todas as jornadas seguintes. |
| **3 — Classes**                                   | Criar Class e gerir Enrollment por atores autorizados; consultar turma atribuída e roster permitido.                           | **Fato:** Classes depende do contexto de School e de identidades referenciadas; Enrollment não é SchoolMembership.                                             |
| **4 — Questions + Attempts**                      | Disponibilizar conteúdo publicado, avaliar por contrato do Question Engine, registrar tentativa e resultado.                   | **Fato:** esta é a jornada de aprendizagem central; Question permanece owner do conteúdo e Attempts da execução.                                               |
| **5 — Ranking + validação de release**            | Projetar ranking simples após `AttemptCompleted`; completar testes de isolamento e fluxos de aceite.                           | **Recomendação:** ranking vem depois do resultado autoritativo da tentativa e não deve atrasar a prática segura.                                               |

**Dependência arquitetural transversal:** seguir ADR-0002 e ADR-0003 como propostas sujeitas à ratificação: Modular Monolith, ownership por módulo, `schoolId` para escopo institucional, sem escrita cruzada, event-driven para efeitos secundários e sem event sourcing integral. Não especificar aqui armazenamento, schema, endpoints ou contratos de transporte.

---

## Parte 4 — Entregas incrementais

**Premissa de planejamento — recomendação:** quatro sprints sequenciais de aproximadamente uma semana cada, mais até dois dias para aceite, correções e release, dentro de 30 dias corridos. A duração é uma hipótese de planejamento, não uma estimativa documentada nem garantia de capacidade. Cada sprint deve encerrar com fluxo demonstrável e critérios de aceite revisados.

| Sprint                                       | Funcionalidades                                                                                                                                                                                                                                       | Agregados / owners envolvidos                                                                               | Casos de uso                                                                              | Eventos já documentados relevantes                                                                                                                                                                                                                             |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Sprint 1 — Identidade e acesso escolar**   | Login email/senha e sessão; validação server-side; provisionar/resolver User e SchoolMembership; escola piloto e contexto escolar acessível. Criação de escola no produto permanece opcional se a piloto for operacionalmente provisionada.           | User (raiz candidata); Auth/Authorization e SchoolMembership (status de raiz requer reconciliação); School. | A-01, P-01, D-01, A-02, D-04; D-02/D-03 apenas se necessários para onboarding no produto. | `UserRegistered` / `UserCreated` somente se o fluxo de provisionamento estiver no escopo; `UserLoggedIn`, `AuthenticationFailed`; `MembershipCreated`, `MembershipRemoved`, `RoleGranted`, `RoleRevoked`; `SchoolCreated` quando a criação ocorrer no produto. |
| **Sprint 2 — Turmas e vínculos pedagógicos** | Criar turma; matricular/remover aluno; validar acesso de professor atribuído; roster conforme escopo.                                                                                                                                                 | Class e Enrollment; referências a School, User e Membership.                                                | D-05, D-06, P-02, P-03, D-07.                                                             | `ClassCreated`, `ClassUpdated`, `StudentEnrolled`, `StudentUnenrolled`.                                                                                                                                                                                        |
| **Sprint 3 — Conteúdo e prática**            | Tornar questões publicadas disponíveis; iniciar e submeter tentativa; obter avaliação do Question Engine; consultar resultado contextual. Conteúdo inicial pode ser curado/pré-carregado.                                                             | Question/QuestionVersion ou snapshot; Attempt/AttemptAnswer; Question Engine como dependência por contrato. | A-03, A-04; publicação editorial autorizada se pré-carga não for suficiente.              | `QuestionPublished` se o lifecycle/publicação for executado; `AttemptStarted`, `QuestionAnswered`, `AttemptCompleted`; `AnswerEvaluated` como retorno síncrono ou evento, conforme contrato a decidir.                                                         |
| **Sprint 4 — Ranking e hardening**           | Ranking simples somente de leitura se as regras forem aprovadas; validar consistência eventual, acesso cross-school negativo, fluxos integrados e critérios de release. Se ranking não passar pelo gate, não bloqueia a entrega de prática funcional. | Ranking como projeção; Attempts como origem; todos os owners afetados pelos testes integrados.              | A-05 condicionado; repetição dos casos P0 do fluxo principal para aceite.                 | `AttemptCompleted` consumido; `RankingUpdated` e `ParticipantRankChanged` emitidos pela projeção quando aplicável.                                                                                                                                             |

### Regras de progressão entre sprints

- Não avançar para leituras/escritas escolares sem validar sessão, membership, permission e correspondência de `schoolId` no servidor.
- Não tratar login como criação de membership; não tratar matrícula em turma como membership escolar.
- Não iniciar uma Attempt com conteúdo/versão não resolvidos pelo contrato vigente para a prática.
- Não considerar o ranking fonte de verdade de Attempt nem confirmação síncrona da submissão.
- As operações síncronas permanecem no owner; eventos nomeados são usados apenas para os efeitos documentados. Não inventar novos eventos para preencher lacunas.

---

## Parte 5 — MVP V1

### Dentro do MVP

1. Login V1 por email/senha e sessão utilizável por aluno, professor e atores administrativos autorizados.
2. User global e autorização escolar resolvida separadamente; membership e papéis verificados no servidor.
3. Uma escola piloto e contexto `schoolId` validado em operações escolares.
4. Criação/consulta/configuração de School no produto se necessário ao onboarding; caso contrário, provisionamento operacional documentado.
5. Gestão mínima de turmas e Enrollment por `SCHOOL_ADMIN`/`COORDINATOR`; acesso e roster de professor limitados à turma atribuída.
6. Acesso do aluno a questões publicadas e curadas.
7. Resolução de questão por Question Engine, registro de Attempt/respostas e resultado contextual.
8. Ranking simples somente de leitura **se** owner e produto aprovarem escopo, elegibilidade, score/desempate/período necessários à projeção. Sem essa decisão, ranking é adiado e não bloqueia o núcleo funcional.

### Fora do MVP V1

- Analytics avançado, IA, recomendações adaptativas, certificados, badges complexos, telemetria, campeonatos, simulados e Study Paths.
- Criar turma ou publicar conteúdo pelo papel `TEACHER`; fluxo formal de solicitação de matrícula pelo professor.
- Consulta de turmas próprias pelo aluno enquanto o contrato/visibilidade não estiverem especificados.
- Workflow editorial amplo, caso conteúdo curado/pré-carregado seja suficiente para a piloto.
- Raízes ou conceitos novos `Login`, `Evaluation`, `Result`, `Score`, `Completion`, `Tenant`, ou novos eventos.

**Base do recorte:** A-01 a A-04 e capacidades escolares P0 documentadas em [MVP-USE-CASES.md](./MVP-USE-CASES.md); A-05 é MVP condicional. Priorizar prática segura sobre ranking se houver conflito de prazo/capacidade.

---

## Parte 6 — Dependências críticas

| Dependência                                                                           | Tipo                 |                        Severidade | Efeito / tratamento                                                                                                                             |
| ------------------------------------------------------------------------------------- | -------------------- | --------------------------------: | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| ADR-0002/0003/0004 aprovados ou decisões aplicáveis formalmente ratificadas           | Documental           |                          **ALTA** | Os ADRs ainda são `Proposed`; ownership e limites são orientação, não decisões aceitas. Confirmar responsáveis antes de congelar execução.      |
| Status de Aggregate Roots e composição de SchoolMembership/User/School/Class/Question | Documental / negócio |                          **ALTA** | O modelo registra divergências entre artefatos. Ratificar limites necessários sem ampliar o escopo nem criar raiz nova.                         |
| Identidade/credencial provisionada antes do primeiro login                            | Negócio              |                          **ALTA** | O login depende de User e credencial disponíveis; cadastro/provisionamento completo não está coberto de forma uniforme pelo recorte de 30 dias. |
| Membership, permission e contexto `schoolId` coerentes                                | Negócio / técnica    |                          **ALTA** | Sem isso, operações escolares seguras não podem ser aceitas; `schoolId` do cliente não comprova autorização.                                    |
| Escola piloto e ator com privilégios autorizados                                      | Negócio / operação   |                         **MÉDIA** | A criação de School no produto pode ser substituída inicialmente por provisionamento operacional, sem criar vínculos implicitamente.            |
| Turma, Enrollment e atribuição docente no escopo correto                              | Negócio              |                          **ALTA** | Necessário para autorizar roster e acesso docente; não basta papel `TEACHER` isolado.                                                           |
| Conteúdo publicado e versão/snapshot consumível                                       | Negócio / técnica    |                          **ALTA** | A prática exige conteúdo disponível e referência reprodutível; pré-carga curada é a alternativa documentada para o prazo.                       |
| Contrato de avaliação Question Engine–Attempts                                        | Técnica / documental |                          **ALTA** | `AnswerEvaluated` pode ser síncrono ou evento; decidir o contrato antes de implementar a submissão interativa.                                  |
| Regra mínima do Ranking e origem elegível                                             | Negócio / documental | **ALTA** se Ranking estiver na V1 | Score, período, elegibilidade e desempate não estão completamente definidos. Adiar projeção se não houver decisão aprovada.                     |
| Idempotência e tolerância a duplicidade/ordem de eventos                              | Técnica              |                         **MÉDIA** | Eventos assíncronos documentados devem ser processados com segurança; ranking eventualmente consistente não confirma a Attempt.                 |
| Privacidade, minimização, retenção e revisão legal para dados de menores              | Documental / negócio |     **ALTA** antes de dados reais | Resolver os gates descritos nos ADRs antes da operação com dados reais de estudantes.                                                           |

---

## Parte 7 — Riscos

| Risco                                                                     | Classificação | Mitigação / gate recomendado                                                                                                                                                         |
| ------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Isolamento entre escolas não comprovado em runtime                        | **CRÍTICO**   | Não liberar dados reais antes de testes negativos cross-school em leituras e escritas, incluindo caminhos de evento/cache se usados. O modelo exige `schoolId` validado server-side. |
| Papéis ou membership stale/inválidos concederem acesso                    | **ALTO**      | Autorizar cada operação no servidor com sessão válida, User ativo, permissão, membership/atribuição vigente e recurso/escopo correspondente; deny-by-default.                        |
| Confusão entre SchoolMembership e Enrollment                              | **ALTO**      | Manter os casos de uso, owners e eventos distintos; a primeira concede acesso User–School, a segunda vincula estudante à Class.                                                      |
| ADRs Proposed e divergência sobre Aggregate Roots                         | **ALTO**      | Resolver em gate documental com owners; não transformar recomendação MVP em ratificação implícita.                                                                                   |
| Tentativa não reproduzível por versão/snapshot indefinido                 | **ALTO**      | Confirmar a referência/snapshot de conteúdo usada na tentativa antes do Sprint 3; preservar ownership Question/Attempts.                                                             |
| Contrato de avaliação síncrona/assíncrona não decidido                    | **ALTO**      | Acordar comportamento necessário ao retorno da tentativa; não tratar `AnswerEvaluated` como evento obrigatório sem confirmação.                                                      |
| Ranking incorreto, atrasado ou com regras inventadas                      | **ALTO**      | Manter projeção read-only, consumir `AttemptCompleted` e só habilitar após decisão de elegibilidade/escopo e regra de classificação.                                                 |
| Professor executar ações não permitidas pela matriz                       | **MÉDIO**     | Restringir criação de turma e publicação a atores autorizados; acesso docente exige atribuição ativa à turma.                                                                        |
| Analytics/consumers ou eventos receberem dados pessoais além do permitido | **ALTO**      | Manter analytics avançado fora do MVP e observar minimização, finalidade, consentimento e políticas antes de expor dados.                                                            |
| Escopo crescer e comprometer prática central em 30 dias                   | **MÉDIO**     | Usar escola piloto e conteúdo curado; ranking é subordinado; excluir explicitamente itens Pós-MVP.                                                                                   |

---

## Parte 8 — Checklist de MVP

### Decisões e preparação

- [ ] ADR-0002, ADR-0003 e ADR-0004 foram aprovados ou as decisões necessárias para o MVP foram formalmente ratificadas pelos responsáveis.
- [ ] Divergências sobre status de Aggregate Roots e fronteiras necessárias à execução foram resolvidas ou explicitamente aceitas como limitação.
- [ ] Fluxo de provisionamento de User/credencial para a piloto foi definido.
- [ ] Responsáveis e processo operacional de provisionamento da escola piloto foram definidos.
- [ ] Autorização para cada ator/ação incluída está alinhada à permission matrix documentada.
- [ ] Versão/snapshot de questão e contrato de avaliação entre Question Engine e Attempts foram definidos.
- [ ] Escopo do ranking foi aprovado ou a projeção foi removida do release V1 sem bloquear a prática.
- [ ] Privacidade, finalidade, minimização e retenção de dados de menores foram revisadas antes de dados reais.

### Fluxos funcionais

- [ ] Aluno, professor e ator administrativo permitido conseguem autenticar pelo fluxo V1; falhas de autenticação não revelam credenciais.
- [ ] A sessão identifica o User; roles e school não são confiadas ao cliente/token como autorização permanente.
- [ ] Acesso escolar exige SchoolMembership e permissão contextual vigentes.
- [ ] Contexto de School e Class é validado no servidor; ator não acessa recurso de outra escola.
- [ ] Membership escolar pode ser administrada por ator autorizado sem criar Enrollment implicitamente.
- [ ] Class pode ser criada por `SCHOOL_ADMIN`/`COORDINATOR` no escopo correto.
- [ ] Enrollment pode ser criado/removido por ator autorizado e permanece distinto de SchoolMembership.
- [ ] Professor acessa apenas Classes atribuídas e roster autorizado; professor não cria turma nem publica questão por padrão.
- [ ] Aluno consegue consultar conteúdo publicado disponível.
- [ ] Attempt registra início, respostas e resultado contextual da avaliação; tentativa concluída não é alterada fora do limite documentado.
- [ ] `AttemptCompleted` é publicado/consumido conforme contrato aprovado; consumer não assume autorização por evento.
- [ ] Se habilitado, Ranking é somente leitura, atualiza a partir das tentativas elegíveis documentadas e comunica eventual defasagem.

### Segurança e qualidade de release

- [ ] Testes negativos comprovam negação de acesso cross-school e cross-class não autorizado.
- [ ] Testes verificam separação Auth/Users/Schools/Classes/Questions/Attempts/Rankings e ausência de escrita cruzada.
- [ ] Consumidores assíncronos aplicáveis toleram entrega duplicada e fora de ordem, conforme ADR-0002.
- [ ] Logs/eventos não expõem credenciais ou dados além da finalidade aprovada.
- [ ] Fluxo ponta a ponta login → contexto escolar → turma/Enrollment → questão → Attempt → resultado foi demonstrado.
- [ ] Ranking, se incluído, foi demonstrado de ponta a ponta sem tratar a projeção como fonte de verdade transacional.

---

## Parte 9 — Definição de pronto

O MVP pode ser considerado concluído quando todos os critérios obrigatórios abaixo forem verificáveis em uma escola piloto com atores e dados de teste autorizados:

1. **Fluxo central demonstrável:** aluno autentica, resolve o contexto escolar autorizado, consulta questão publicada, conclui tentativa e recebe resultado contextual.
2. **Operação escolar suficiente:** ator administrativo autorizado cria/gerencia turma e Enrollment; professor acessa somente turma atribuída e roster permitido.
3. **Autorização efetiva:** sessões, memberships, permissões, estado do recurso e escopo são validados server-side; casos sem permissão e cross-school são negados.
4. **Ownership respeitado:** módulos não escrevem nos dados de outro owner; comunicação síncrona usa contratos e efeitos secundários usam somente eventos já documentados.
5. **Attempt autoritativa:** resultado e conclusão residem em Attempts; projeções não alteram nem confirmam a tentativa.
6. **Ranking condicional:** se anunciado como parte da V1, critérios de elegibilidade/escopo e regra de classificação foram aprovados e a projeção responde corretamente a `AttemptCompleted`; caso contrário, ranking fica explicitamente fora do release.
7. **Qualidade mínima comprovada:** testes de integração dos fluxos e testes negativos de tenancy passam; falhas não produzem estado de sucesso nem bypass de autorização.
8. **Prontidão de uso:** decisões documentais que bloqueiam os fluxos foram ratificadas e os gates de privacidade para dados reais foram atendidos.

**Não é critério de conclusão:** analytics avançado, escala não medida, recomendações, IA, badges complexos, certificados, telemetria ou cobertura de todos os casos Pós-MVP.

---

## Parte 10 — EXECUTIVE SUMMARY

# MVP EXECUTION PLAN

## Escopo

Entregar autenticação global, autorização escolar segura, operação mínima de School/Class/Enrollment, acesso a questões publicadas e resolução de questão com Attempt/resultados. Uma escola piloto e conteúdo curado podem reduzir dependências de onboarding/editorial. Ranking é somente uma projeção de leitura e depende de decisão funcional ainda aberta.

## Entregas

- **Sprint 1:** Auth, Membership, User/School context e escola piloto.
- **Sprint 2:** Classes, Enrollment e acesso/roster autorizado.
- **Sprint 3:** Questions, avaliação pelo Question Engine e Attempts.
- **Sprint 4:** Ranking condicional, integração, testes de isolamento e aceite de release.

Sprints e ordenação são recomendações de planejamento; os casos de uso e owners são fatos documentados nas fontes.

## Riscos

- **Crítico:** isolamento de tenancy ainda precisa ser comprovado por testes executáveis.
- **Alto:** ADRs continuam `Proposed`; status das raízes, provisionamento, snapshot/avaliação e regras de Ranking têm lacunas.
- **Alto:** privacidade/minimização/retenção de dados de menores deve ser resolvida antes de dados reais.

## Roadmap

Ratificar decisões → Auth/Membership/School → Classes/Enrollment → Questions/Attempts → Ranking opcional e validação de release.

## Próximo Passo Recomendado

**Realizar uma sessão de ratificação do escopo e das decisões bloqueadoras do MVP com Product, Architecture e os owners de Auth, Schools, Classes, Questions, Attempts e Rankings**, registrando a aprovação dos ADRs aplicáveis e as decisões de provisionamento, versão/avaliação, tenancy e elegibilidade de Ranking.
