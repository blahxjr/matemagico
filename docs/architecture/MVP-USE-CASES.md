# MVP Use Case Catalog

**Data de referência:** 2026-10-01  
**Escopo:** casos de uso mínimos para um MVP funcional do MateMágico Champions.  
**Natureza:** modelagem documental; não cria banco de dados, schema, APIs, código, entidades ou agregados.  
**Status das fontes:** ADR-0002, ADR-0003 e ADR-0004 permanecem `Proposed`; este catálogo recomenda um recorte, sem ratificar as fontes.

## Convenções e limites

- **Fato documentado:** consta explicitamente nas fontes autorizadas.
- **Inferência:** consequência razoável dos limites e relações documentados, sem criar conceito novo.
- **Recomendação:** seleção para o MVP, pendente de validação do produto e dos owners.
- **Prioridade:** P0 = indispensável ao fluxo principal; P1 = capacidade útil no primeiro produto, subordinada ao fluxo principal; P2 = adiável.
- **MVP / Pós-MVP / Descartado:** classificação deste catálogo para o recorte solicitado, separada da prioridade.
- “Agregados envolvidos” identifica os owners/raízes já documentados, não uma instrução de transação distribuída. Question Engine e contratos de módulos são citados como dependências funcionais, não como novos agregados.
- Pré e pós-condições são limitadas ao que as fontes descrevem. Onde falta regra, o caso é marcado como inferência ou dependência ainda não definida.

O mapa [MVP-AGGREGATES.md](MVP-AGGREGATES.md) não substitui as definições de ownership. Há uma divergência documental específica: ele chama SchoolMembership de raiz candidata, mas [DOMAIN-OWNERSHIP-MAP.md](DOMAIN-OWNERSHIP-MAP.md) §9 identifica SchoolMembership como Aggregate Root explícito, com confiança alta. Este catálogo segue a fonte explícita de ownership; não amplia o agregado nem resolve outras raízes candidatas por conta própria.

## Fontes autorizadas

- [MVP-AGGREGATES.md](MVP-AGGREGATES.md)
- [GLOSSARY.md](GLOSSARY.md)
- [DOMAIN-OWNERSHIP-MAP.md](DOMAIN-OWNERSHIP-MAP.md)
- [TENANCY-VALIDATION-REPORT.md](TENANCY-VALIDATION-REPORT.md)
- [ADR-0002 — Module Boundaries](ADRs/ADR-0002-module-boundaries.md)
- [ADR-0003 — Database Strategy](ADRs/ADR-0003-database-strategy.md)
- [ADR-0004 — Authentication and Authorization](ADRs/ADR-0004-authentication-authorization.md)

---

## Parte 1 — Jornada do aluno

| ID   | Caso de uso                   | Objetivo                                                                       | Ator                       | Agregados envolvidos                                                                        | Resultado esperado                                                                                                         |
| ---- | ----------------------------- | ------------------------------------------------------------------------------ | -------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| A-01 | Entrar na plataforma          | Autenticar a identidade global com credencial suportada na V1.                 | Aluno (`STUDENT`)          | **Fato:** User; conceitos de Auth (credencial/sessão; Auth não tem raiz única declarada).   | Sessão válida para a identidade; papéis e escola não são confiados ao cliente nem tratados como atributo único do User.    |
| A-02 | Acessar uma escola            | Resolver o contexto de uma escola na qual o usuário pode atuar.                | Aluno com membership ativa | **Fato:** SchoolMembership; School.                                                         | Contexto escolar resolvido no servidor após validação do vínculo, da permissão e da correspondência de `schoolId`.         |
| A-03 | Consultar questões publicadas | Encontrar/obter conteúdo publicado disponível para prática.                    | Aluno autenticado          | **Fato:** Question.                                                                         | Lista ou questão publicada dentro do escopo autorizado; consulta não altera a questão.                                     |
| A-04 | Resolver uma questão          | Iniciar uma tentativa, submeter resposta e consultar seu resultado contextual. | Aluno (`STUDENT`)          | **Fato:** Attempt (com AttemptAnswer); Question/QuestionVersion por referência ou snapshot. | Tentativa e resposta registradas; avaliação recebida do Question Engine; resultado da tentativa consultável.               |
| A-05 | Consultar ranking             | Consultar leaderboard ou posição própria no escopo autorizado.                 | Aluno autenticado          | Ranking é **projeção**, não agregado; pode consumir fatos elegíveis de Attempt.             | Classificação exibida com atualização eventualmente consistente; não altera Attempt nem confirma sua submissão.            |
| A-06 | Consultar as próprias turmas  | Ver as turmas em que o aluno está matriculado.                                 | Aluno com Enrollment       | **Fato:** Class e Enrollment; User apenas como identidade referenciada.                     | Somente vínculos/turmas autorizados ao próprio aluno. A consulta específica para aluno não está explicitada como contrato. |

**Status recomendado:** A-01 a A-04 são núcleo MVP. A-05 é MVP mínimo de leitura, condicionado à regra de elegibilidade/escopo do ranking. A-06 é Pós-MVP ou requer validação: Enrollment está documentado, mas o contrato de consulta para aluno não está especificado.

---

## Parte 2 — Jornada do professor

| ID   | Caso de uso                     | Objetivo                                                                   | Ator                                         | Agregados envolvidos                                                                     | Resultado esperado                                                                                                                                                                                                                             |
| ---- | ------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P-01 | Entrar na plataforma            | Autenticar a identidade global.                                            | Professor (`TEACHER`)                        | User; conceitos de Auth (sem agregado Auth único documentado).                           | Sessão válida; associação escolar continua sendo validada separadamente.                                                                                                                                                                       |
| P-02 | Acessar turma atribuída         | Resolver acesso somente a turma atribuída no escopo escolar da membership. | Professor com `TEACHER` e atribuição à turma | SchoolMembership; Class (com ClassTeachingAssignment, quando aplicável).                 | Contexto da turma validado no servidor; acesso a outra escola ou turma não atribuída é negado.                                                                                                                                                 |
| P-03 | Consultar roster da turma       | Consultar alunos de turma sob responsabilidade do professor.               | Professor atribuído à turma                  | Class e Enrollment.                                                                      | Roster da turma autorizada; nenhuma leitura de turmas de outra escola ou sem atribuição.                                                                                                                                                       |
| P-04 | Propor/solicitar matrícula      | Encaminhar pedido de matrícula de estudante à turma atribuída.             | Professor (`TEACHER`)                        | Class e Enrollment, caso a solicitação seja aceita pelo fluxo autorizado.                | Solicitação/proposta conforme política; a fonte não define processo ou contrato próprio para aprovação.                                                                                                                                        |
| P-05 | Criar turma                     | Criar turma dentro da escola.                                              | Professor                                    | Class.                                                                                   | **Não permitido ao papel TEACHER** na permission matrix documentada. Criação de turma pertence a COORDINATOR/SCHOOL_ADMIN conforme escopo.                                                                                                     |
| P-06 | Publicar questão                | Publicar conteúdo para uso dos alunos.                                     | Professor                                    | Question.                                                                                | **Não permitido ao papel TEACHER** como publicação: autorização de conteúdo publicada reserva aprovação/publicação a `EDITOR_OPERATOR` ou ação global excepcional auditada. Criação de rascunho por professor é desabilitada por padrão na V1. |
| P-07 | Consultar desempenho individual | Consultar desempenho dos alunos atribuídos.                                | Professor atribuído                          | Não se acrescenta agregado: Analytics é projeção; resultados fonte pertencem a Attempts. | A fonte permite consulta pedagógica autorizada, mas analytics avançado está fora do escopo; consulta de desempenho rica fica Pós-MVP.                                                                                                          |

**Status recomendado:** P-01 a P-03 entram no MVP. P-04 fica Pós-MVP enquanto o processo de solicitação não estiver definido. P-05 e P-06 são **Descartados para o ator Professor**, não para as capacidades escolares/editoriais que têm atores autorizados distintos. P-07 avançado é Pós-MVP.

---

## Parte 3 — Jornada do administrador

“Administrador” não é um papel único: escola e plataforma têm escopos distintos. Os casos abaixo identificam o papel documentado por ação.

| ID   | Caso de uso                     | Objetivo                                                                | Ator                                                                                                                                | Agregados envolvidos                                                               | Resultado esperado                                                                                                     |
| ---- | ------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| D-01 | Entrar na plataforma            | Autenticar identidade administrativa.                                   | `SCHOOL_ADMIN`, `COORDINATOR` ou `GLOBAL_ADMIN`                                                                                     | User; conceitos de Auth (credencial/sessão).                                       | Sessão válida; privilégios continuam sujeitos a autorização contextual, MFA/gates aplicáveis e políticas documentadas. |
| D-02 | Criar escola                    | Registrar instituição que representa o tenant escolar.                  | `GLOBAL_ADMIN` autorizado                                                                                                           | School.                                                                            | School criada com `schoolId`; nenhuma turma/membership é criada implicitamente.                                        |
| D-03 | Configurar escola               | Consultar/alterar configuração da própria instituição.                  | `SCHOOL_ADMIN`; `GLOBAL_ADMIN` segundo permissão/escopo                                                                             | School (SchoolSettings quando pertencente à escola).                               | Configuração lida/alterada apenas no `schoolId` autorizado.                                                            |
| D-04 | Gerenciar memberships escolares | Criar ou administrar vínculos de acesso e papéis escolares autorizados. | `SCHOOL_ADMIN`; `COORDINATOR` para membership limitada; `GLOBAL_ADMIN` em escopo global conforme política                           | SchoolMembership; User como identidade referenciada; RoleAssignment conforme ação. | Vínculo/grant escolar dentro do `schoolId` autorizado. Gestão não cria matrícula em turma automaticamente.             |
| D-05 | Criar turma                     | Organizar uma turma na escola.                                          | `SCHOOL_ADMIN` ou `COORDINATOR`                                                                                                     | Class.                                                                             | Turma criada em contexto escolar validado.                                                                             |
| D-06 | Matricular/remover aluno        | Adicionar/remover estudante do vínculo pedagógico com uma turma.        | `SCHOOL_ADMIN` ou `COORDINATOR`; professor pode propor em turma atribuída; `GLOBAL_ADMIN` somente no limite break-glass documentado | Class e Enrollment.                                                                | Enrollment criado/removido no `schoolId` da turma. Não altera SchoolMembership.                                        |
| D-07 | Consultar roster                | Consultar alunos de turma do escopo administrativo autorizado.          | `SCHOOL_ADMIN`, `COORDINATOR`; `GLOBAL_ADMIN` conforme autorização                                                                  | Class e Enrollment.                                                                | Roster retornado somente para escopo autorizado.                                                                       |

**Status recomendado:** D-01, D-04 e D-06 são necessários à operação escolar segura; D-02/D-03 são necessários para onboarding/autonomia multi-escola, mas podem ser adiados no MVP de 30 dias se a escola piloto for provisionada por processo operacional fora do produto. D-05/D-07 entram quando a jornada escolar de turma estiver habilitada.

---

## Parte 4 — Casos de uso MVP

Prioridade: **P0** = indispensável ao fluxo principal; **P1** = capacidade útil no primeiro produto, subordinada ao fluxo principal; **P2** = adiável. A coluna **MVP** classifica separadamente como `MVP`, `Pós-MVP` ou `Descartado`.

| Caso de Uso                                                                                      | Prioridade | MVP                                                                                            |
| ------------------------------------------------------------------------------------------------ | ---------: | ---------------------------------------------------------------------------------------------- |
| A-01 / P-01 / D-01 — Entrar na plataforma (email/senha V1)                                       |         P0 | MVP                                                                                            |
| A-02 — Acessar contexto escolar por SchoolMembership                                             |         P0 | MVP                                                                                            |
| D-04 — Criar/gerenciar SchoolMembership e papéis escolares autorizados                           |         P0 | MVP                                                                                            |
| D-02 — Criar escola (`GLOBAL_ADMIN`)                                                             |         P1 | MVP                                                                                            |
| D-03 — Consultar/configurar escola                                                               |         P1 | MVP                                                                                            |
| D-05 — Criar turma (`SCHOOL_ADMIN`/`COORDINATOR`)                                                |         P0 | MVP                                                                                            |
| D-06 — Matricular/remover aluno (Enrollment)                                                     |         P0 | MVP                                                                                            |
| P-02 — Acessar turma atribuída                                                                   |         P0 | MVP                                                                                            |
| P-03 / D-07 — Consultar roster autorizado                                                        |         P1 | MVP                                                                                            |
| A-06 — Aluno consultar suas próprias turmas                                                      |         P1 | Pós-MVP; contrato/visibilidade não especificados                                               |
| A-03 — Consultar questão publicada                                                               |         P0 | MVP                                                                                            |
| Publicar conteúdo curado por `EDITOR_OPERATOR`                                                   |         P1 | MVP como capacidade editorial mínima ou pré-carga operacional; não como ação de professor      |
| A-04 — Resolver questão: iniciar, responder, concluir/consultar resultado                        |         P0 | MVP                                                                                            |
| A-05 — Consultar ranking simples/posição própria                                                 |         P1 | MVP, condicionado a escopo, elegibilidade e projeção autorizada                                |
| P-04 — Professor solicitar matrícula                                                             |         P2 | Pós-MVP; processo de aprovação não definido                                                    |
| P-05 — Professor criar turma                                                                     |          — | Descartado para `TEACHER`; creator autorizado é `COORDINATOR`/`SCHOOL_ADMIN`                   |
| P-06 — Professor publicar questão                                                                |          — | Descartado para `TEACHER`; autoria rascunho é desabilitada por padrão e publicação é editorial |
| P-07 — Desempenho pedagógico avançado                                                            |         P2 | Pós-MVP                                                                                        |
| Recomendações adaptativas, analytics avançado, IA, certificados, badges complexos e telemetria   |          — | Descartado do escopo solicitado                                                                |
| `Login`, `Evaluation`, `Result`, `Score` ou `Completion` como agregados/casos transversais novos |          — | Descartado; os termos não são agregados definidos pelas fontes                                 |

**Nota:** A classificação de publicação como MVP é recomendação operacional para garantir conteúdo publicado disponível; as fontes documentam `publishQuestion`, mas o primeiro lote de conteúdo também pode estar disponível por pré-carga. A escolha entre workflow editorial interno e pré-carga é de produto/operação, não uma nova regra de domínio.

---

## Parte 5 — Fluxo principal

```text
User
  ↓ autentica
Login (Auth)
  ↓ valida acesso escolar contextual
SchoolMembership
  ↓ referencia / resolve
School
  ↓ organiza
Class
  ↓ contém matrícula pedagógica
Enrollment
  ↓ habilita contexto de turma para aluno autorizado
Question publicada / versão ou snapshot
  ↓ é respondida em
Attempt / AttemptAnswer
  ↓ fato elegível/evento alimenta
Ranking (projeção)
```

### Explicação por etapa

1. **User:** identidade global e independente da escola. As fontes não autorizam `User.schoolId` ou `User.role` como autoridade de acesso.
2. **Login:** Auth autentica email/senha V1 e mantém sessão. Autenticação não é autorização escolar; não depende de carregar perfil ou dados de produto.
3. **SchoolMembership:** Auth valida vínculo e papel escolar aplicável. Este vínculo concede acesso User–School; não é Enrollment.
4. **School:** identifica o contexto institucional por `schoolId`. O cliente não prova autorização apenas enviando esse identificador.
5. **Class / Enrollment:** Classes valida a turma e seu escopo escolar. Enrollment liga estudante à turma; professor depende da atribuição correspondente para operar na turma.
6. **Question publicada:** aluno autorizado obtém conteúdo curado e uma versão/snapshot que permita usar o conteúdo publicado. Questions continua owner; seleção/avaliação é responsabilidade funcional do Question Engine.
7. **Attempt:** Attempts registra a execução/resposta e o resultado da avaliação retornada pelo Engine. Toda tentativa institucional carrega `schoolId`; a tentativa concluída é imutável conforme o conceito documentado.
8. **Ranking:** consumidor projeta fatos elegíveis de Attempts (e eventos de Championships somente se a regra exigir). O ranking pode estar defasado e não é confirmação do resultado transacional.

**Limite:** a cadeia é um roteiro funcional, não uma transação única atravessando agregados. Operações respeitam os contratos dos owners; ranking e demais efeitos são assíncronos quando documentado.

---

## Parte 6 — Dependências: pré e pós-condições

| ID/caso                              | Pré-condições                                                                                                                                                                              | Pós-condições                                                                                                                                                                       |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A-01 / P-01 / D-01 Entrar            | Identidade e credencial de autenticação disponíveis; a conta precisa estar em estado que permita autenticação conforme ADR-0004. Email/senha é o método V1 documentado.                    | **Fato:** sessão autenticada conforme contrato de Auth. **Limite:** nenhum papel ou escola deve ser inferido do token/cliente.                                                      |
| A-02 Acessar escola                  | Sessão válida; SchoolMembership aplicável; permissão e `schoolId` do recurso correspondentes, validados server-side.                                                                       | Contexto escolar autorizado para a operação solicitada. **Inferência:** não cria nem altera membership.                                                                             |
| D-02 Criar escola                    | Ator `GLOBAL_ADMIN` e permissão global específica; autorização global não é acesso irrestrito.                                                                                             | School registrada como instituição/tenant com `schoolId`.                                                                                                                           |
| D-03 Configurar escola               | School existente; `SCHOOL_ADMIN` da própria escola ou `GLOBAL_ADMIN` autorizado; `schoolId` validado no servidor.                                                                          | Configuração da escola consultada/atualizada no owner Schools.                                                                                                                      |
| D-04 Gerenciar membership            | User e School existentes; ator com permissão dentro do escopo escolar/global permitido; papéis atribuídos dentro do `schoolId`.                                                            | SchoolMembership/grant criado, alterado ou encerrado sob Auth. **Fato:** encerrar membership não apaga o histórico de auditoria.                                                    |
| D-05 Criar turma                     | School ativa/validada por contrato conforme necessidade; `SCHOOL_ADMIN` ou `COORDINATOR` autorizado naquele `schoolId`.                                                                    | Class criada e escopada ao `schoolId`.                                                                                                                                              |
| D-06 Matricular/remover aluno        | Class e estudante referenciado; `schoolId` da turma e contexto do ator correspondem. Ator `SCHOOL_ADMIN`/`COORDINATOR`, ou exceção autorizada explicitamente na matriz.                    | Enrollment criado/removido em Classes; SchoolMembership permanece independente.                                                                                                     |
| P-02 Acessar turma                   | Sessão válida; membership da escola; atribuição docente à Class; class.schoolId compatível com escola autorizada.                                                                          | Acesso limitado à turma atribuída.                                                                                                                                                  |
| P-03 / D-07 Consultar roster         | Class existente; ator autorizado ao Class Scope/School Scope; identidade e `schoolId` validados.                                                                                           | Roster autorizado retornado; nenhuma alteração de Enrollment.                                                                                                                       |
| A-03 Consultar questões publicadas   | Sessão/contexto necessário ao conteúdo; questão publicada e visível ao escopo do ator.                                                                                                     | Questões/snapshot consultados sem mutação no agregado Question.                                                                                                                     |
| Publicar conteúdo                    | Conteúdo submetido ao fluxo editorial documentado; ator `EDITOR_OPERATOR` autorizado para aprovação/publicação (ou exceção global auditada). Autoria e revisão não são confundidas.        | Versão/publicação torna-se disponível conforme o ciclo do owner Questions.                                                                                                          |
| A-04 Resolver questão                | Sessão válida; questão publicada/snapshot disponível; autorização para a atividade; para tentativa institucional, `schoolId` contextual válido; Question Engine disponível para avaliação. | Attempt/AttemptAnswer e resultado contextual registrados; `AttemptCompleted` pode alimentar consumers após commit. A tentativa finalizada não é alterada fora de anotação auditada. |
| A-05 Consultar ranking               | Sessão e autorização para o escopo pedido; projeção existente/consultável. A elegibilidade de origem pertence a Attempts/Championships.                                                    | Leaderboard/posição lida; nenhuma mutação em Attempts; freshness pode ser eventual.                                                                                                 |
| A-06 Consultar turmas próprias       | Sessão; Enrollment associado ao próprio estudante e escopo correspondente. **Lacuna:** acesso/contrato de consulta do aluno não está explicitamente definido.                              | Inferência de leitura limitada aos vínculos próprios; não lista outros estudantes.                                                                                                  |
| P-04 Solicitar matrícula             | Professor autenticado, escola ativa e Class atribuída; política de solicitação precisa ser definida pelo owner.                                                                            | **Não especificado:** fontes não definem estado, aprovação ou evento de solicitação; não afirmar matrícula criada.                                                                  |
| P-05 Criar turma como Professor      | Ator autenticado, porém o papel `TEACHER` não tem permissão documentada para criar turma.                                                                                                  | Caso negado; Class não é criado nem alterado. Criação permanece com `COORDINATOR`/`SCHOOL_ADMIN` autorizados.                                                                       |
| P-06 Publicar questão como Professor | Ator autenticado, porém `TEACHER` não possui permissão de publicação; rascunho por professor está desabilitado por padrão na V1.                                                           | Caso negado; Question não é publicada nem alterada. Publicação fica com ator editorial/global autorizado.                                                                           |
| P-07 Consultar desempenho avançado   | Professor atribuído e autorização por Class Scope seriam necessárias; o modelo de consulta avançada não pertence ao MVP e não está definido aqui.                                          | **Fora do MVP:** nenhuma pós-condição de domínio é estabelecida por este catálogo.                                                                                                  |

---

## Parte 7 — Complexidade

| Caso/capacidade                    | Complexidade | Motivo                                                                                                                                                       |
| ---------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Login e sessão                     | **ALTA**     | Credencial, sessão/revogação, conta ativa, deny-by-default e proteção de identidade.                                                                         |
| Acesso escolar/membership          | **ALTA**     | Separação User–SchoolMembership–Enrollment, papéis contextuais, múltiplas escolas e risco cross-school.                                                      |
| Criar/configurar School            | **MÉDIA**    | Operação concisa, mas `schoolId` define a fronteira de tenancy e exige autorização administrativa correta.                                                   |
| Criar Class / matricular estudante | **MÉDIA**    | Exige escopo escolar consistente e separação entre turma, matrícula pedagógica e acesso escolar; detalhes de cardinalidade incompletos.                      |
| Consultar roster                   | **MÉDIA**    | Requer autorização por escola/turma e cuidado de privacidade de estudantes.                                                                                  |
| Consultar questão publicada        | **BAIXA**    | Leitura pelo contrato Questions; a complexidade está em respeitar publicação/versão e o escopo da questão.                                                   |
| Publicar questão                   | **MÉDIA**    | Owner editorial e separação entre autoria e revisão/publicação; versionamento e conteúdo publicado devem ser consistentes.                                   |
| Resolver questão / Attempt         | **ALTA**     | Coordena submissão e avaliação por Question Engine, registra estado/resposta, escopo `schoolId`, idempotência e conclusão imutável.                          |
| Consultar ranking simples          | **MÉDIA**    | Projeção assíncrona requer escopo/eligibilidade claros, processamento idempotente e comunicação de consistência eventual; Score universal não está definido. |
| Consultar desempenho avançado      | **ALTA**     | Exige projeções e métricas além do MVP, autorização individual/escolar e semântica não coberta pelo recorte mínimo.                                          |

---

## Parte 8 — MVP definitivo para 30 dias

### Recomendação: construir o fluxo essencial e restringir o onboarding

**Entram:**

1. Login V1 email/senha e leitura de sessão.
2. Validação de SchoolMembership e de contexto `schoolId` para operações escolares.
3. Uma escola piloto e sua configuração essencial; criação de escolas pode ser operacional/manual no início, com D-02/D-03 como P1 se houver capacidade.
4. Criar turma e matricular aluno por `SCHOOL_ADMIN`/`COORDINATOR`; professor acessa somente turma atribuída e consulta roster permitido.
5. Questões publicadas disponíveis para consulta. Para 30 dias, **recomendação** é usar conteúdo curado/pré-carregado se o workflow editorial completo atrasar; publicar por `EDITOR_OPERATOR` é necessário apenas se a operação exigir autoria/publicação dentro do produto.
6. Iniciar/submeter/concluir Attempt e consultar resultado contextual com validação de escopo.
7. Ranking simples e somente de leitura depois do fluxo Attempt, com apresentação explícita de atualização eventual; se a capacidade atrasar, priorizar prática correta antes da projeção.

**Ficam fora:**

- Criação de turma ou publicação de questão pelo papel `TEACHER`, pois a permission matrix não concede essas ações por padrão.
- Solicitação formal de matrícula por professor, até definir o workflow; professor pode propor/solicitar conforme a matriz, mas o processo não está modelado nas fontes.
- Consulta própria de turmas pelo aluno até confirmar o contrato e os limites de roster.
- Analytics de desempenho avançado, recomendações adaptativas, IA, certificados, badges complexos, telemetria, campeonatos e simulados.
- Qualquer agregado universal `Login`, `Evaluation`, `Result`, `Score` ou `Completion`.

**Justificativa:** esse recorte suporta autenticação, isolamento escolar, organização mínima por turma, acesso a conteúdo e prática com tentativa autoritativa. Evita colocar no prazo curto features dependentes de semântica ainda não definida e reduz o risco de cruzar dados de escolas. É uma **recomendação de escopo**, não fato aprovado pelas fontes.

---

## Parte 9 — Resultado final

### Casos aprovados para o escopo MVP

- Entrar na plataforma (Aluno, Professor e Administrador por Auth).
- Resolver contexto escolar e validar SchoolMembership.
- Provisionar/administrar School e memberships conforme ator autorizado; onboarding pode iniciar com escola piloto provisionada operacionalmente.
- Criar Class e gerir Enrollment por atores escolares permitidos.
- Professor consultar turmas atribuídas e roster autorizado.
- Aluno consultar conteúdo publicado, resolver questão e consultar resultado contextual.
- Consultar ranking simples como projeção; priorizar após o fluxo de resolução.
- Disponibilizar conteúdo publicado por operação editorial ou pré-carga curada.

### Casos descartados ou adiados

- Professor criar turma ou publicar questão.
- Professor publicar questão fora do workflow editorial.
- Solicitação de matrícula pelo professor enquanto o workflow não estiver definido.
- Consulta de turmas próprias pelo aluno até documentar a regra de leitura.
- Desempenho/analytics avançado, adaptatividade, IA, certificados, badges complexos, telemetria, campeonatos e simulados.
- Entidade, agregado ou caso de uso genérico criado para Login/Evaluation/Result/Score/Completion.

### Riscos

1. **Conflito documental SchoolMembership:** o mapa de agregados o chama de raiz candidata, mas DOMAIN-OWNERSHIP-MAP §9 diz Aggregate Root explícito. Este catálogo adota a fonte explícita e registra a divergência para reconciliação.
2. **ADRs não ratificados:** ownership e matrizes são propostas; o catálogo é recomendação, não autorização para implementação de regra nova.
3. **Tenancy não comprovada em runtime:** o modelo determina validação server-side, mas constraints/testes cross-school não estão evidenciados como completos.
4. **Menores e privacidade:** finalidade, minimização, retenção e revisão legal são gates para dados reais.
5. **Account provisioning:** login pressupõe identidade/credencial; ciclo completo de registro/provisionamento de User e vínculo escolar pode não estar incluído neste recorte mínimo.
6. **Questão e versão/snapshot:** a tentativa precisa referenciar o conteúdo publicado correto para reprodutibilidade; o detalhe de versão exigido pela atividade deve ser confirmado.
7. **Autoria/publicação:** professor não tem publicação habilitada por padrão; separar pré-carga de conteúdo e fluxo editorial é uma decisão operacional a fazer.
8. **Ranking:** elegibilidade, desempate, período e score contextual ainda podem ser incompletos; projeção não pode ser tratada como resultado autoritativo.
9. **Professor e matrícula:** permissão de propor/solicitar existe na matriz, mas o processo, aprovação e efeitos não estão definidos.

### Dependências

- **Login →** User global e credencial/sessão sob Auth; autenticação separada de autorização.
- **Acesso à escola →** sessão válida + SchoolMembership + permissão contextual + `schoolId` validado no servidor.
- **Turmas →** School/estado institucional consultado por contrato; Classes é owner de Class, Enrollment e atribuição docente.
- **Acesso do professor →** membership escolar e atribuição docente à turma; não basta a role `TEACHER` isolada.
- **Conteúdo →** Question/versão publicada em Questions; taxonomia referenciada por contratos dos owners existentes.
- **Tentativa →** Question snapshot/publicado + avaliação do Question Engine + persistência/resultados em Attempts.
- **Ranking →** fatos elegíveis/eventos publicados pelos owners; projeção Rankings com escopo e consistência eventual.

---

## Parte 10 — MEMÓRIA PARA PROMPT 3

## Casos de uso aprovados

- Login email/senha V1 e validação de sessão.
- Resolver contexto escolar por SchoolMembership e `schoolId`.
- Gestão mínima de escola/membership e criação de Class/Enrollment por atores autorizados.
- Acesso do professor apenas a turmas atribuídas e consulta de roster autorizado.
- Consulta de questões publicadas, resolução de questão e consulta do resultado contextual de Attempt.
- Ranking simples de leitura como projeção, condicionado a autorização e elegibilidade.

## Casos descartados

- Professor criar turma ou publicar questão; ações não autorizadas para esse papel nas fontes.
- Solicitação de matrícula por professor enquanto processo não estiver especificado.
- Consulta pelo aluno das próprias turmas enquanto não houver contrato de leitura definido.
- Analytics avançado, IA, recomendações adaptativas, certificados, badges complexos, telemetria, simulados e campeonatos no recorte solicitado.
- Novos agregados/casos genéricos para Login, Evaluation, Result, Score ou Completion.

## Fluxo principal

User → Login/Auth → SchoolMembership → School → Class → Enrollment → Question publicada/snapshot → Attempt/AttemptAnswer → Ranking (projeção eventual).

## Dependências

- Identidade autenticável antes das operações protegidas.
- Membership, papel e escopo devem corresponder ao recurso; `schoolId` informado pelo cliente não é prova de acesso.
- Class/Enrollment pertencem a Classes, separados de SchoolMembership em Auth.
- Questão publicada vem de Questions; avaliação vem de Question Engine; tentativa/resultado pertencem a Attempts.
- Ranking consome fatos elegíveis; não altera nem confirma Attempt.

## Riscos

- ADRs ainda Proposed e divergência documental sobre status de SchoolMembership como raiz.
- Enforcement cross-school não está demonstrado em runtime.
- Processo de criação/provisionamento de identidade e fluxo editorial podem ultrapassar o prazo de 30 dias.
- Matriz e processo de matrícula do professor têm limites; não inferir permissão por role genérica.
- Semântica de score/eligibilidade/freshness de ranking e reprodução por versão/snapshot precisam de confirmação.
- Gate de privacidade/legal para dados de crianças e adolescentes.

## Próxima etapa

**EVENT DISCOVERY**
