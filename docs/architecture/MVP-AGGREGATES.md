# MVP Aggregate Map

**Data de referência:** 2026-10-01  
**Escopo:** agregados e capacidades mínimas do MVP do MateMágico Champions.  
**Natureza:** análise documental; não cria entidades, ownership, regras, schema, APIs ou código.  
**Status das fontes:** ADR-0002, ADR-0003 e ADR-0004 continuam `Proposed`; este mapa é uma seleção para modelagem, não sua ratificação.

## Como ler este documento

- **Fato documentado:** consta explicitamente nas fontes.
- **Inferência:** delimitação de raiz/composição derivada dos conceitos e limites documentados, sem acrescentar entidade ou regra de negócio.
- **Recomendação:** escolha sugerida para o MVP, pendente de validação pelos owners e aprovação dos ADRs.

As fontes descrevem ownership e conjuntos conceituais de dados, mas não formalizam todas as raízes e invariantes de agregados. Assim, “raiz candidata” não significa raiz já aprovada em ADR. O Documento Mestre contém material histórico que antecede ADR-0002–0004; em conflito, este mapa segue os ADRs e as consolidações atuais de ownership, glossário e tenancy.

## Fontes obrigatórias e precedência

- [Documento Mestre](../../ARCHITECTURE.md)
- [ADR-0002 — Module Boundaries](ADRs/ADR-0002-module-boundaries.md)
- [ADR-0003 — Database Strategy](ADRs/ADR-0003-database-strategy.md)
- [ADR-0004 — Authentication and Authorization](ADRs/ADR-0004-authentication-authorization.md)
- [GLOSSARY.md](GLOSSARY.md)
- [DOMAIN-OWNERSHIP-MAP.md](DOMAIN-OWNERSHIP-MAP.md)
- [TENANCY-VALIDATION-REPORT.md](TENANCY-VALIDATION-REPORT.md)

---

## Parte 1 — Identificação dos agregados

### 1. User / identidade de produto

| Aspecto                             | Delimitação                                                                                                                                                                |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Aggregate Root**                  | **User** — candidato inferido para a identidade global.                                                                                                                    |
| **Entidades internas documentadas** | Profile/UserProfile; UserPreferences e UserConsent são dados de Users no mapa conceitual. A composição exata não está formalizada.                                         |
| **Value Objects**                   | Nenhum VO está formalmente definido para este agregado. Email normalizado é um valor com regra documentada para login, mas sua modelagem como VO é recomendação, não fato. |
| **Responsabilidades**               | Identidade global de produto, perfil minimizado e estado global da conta. Não armazena credenciais, memberships, papéis ou resultados acadêmicos.                          |
| **Owner**                           | **Fato documentado:** Users é owner de User/Profile e estado global de conta.                                                                                              |
| **Boundary**                        | Global; não incorpora AuthAccount, PasswordCredential, AuthSession, SchoolMembership ou dados da School.                                                                   |
| **Motivo**                          | Mantém identidade e perfil separados da autenticação e da autorização, preservando o usuário global que pode participar de mais de uma escola.                             |

**Evidência:** User é explicitamente definido como identidade global. Chamá-lo de Aggregate Root e agrupar Profile são **inferências** para modelagem; a raiz/composição não está ratificada nas fontes.

### 2. Acesso e login (Auth / Authorization)

| Aspecto                    | Delimitação                                                                                                                                                                                                                  |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Aggregate Root**         | **Não definido nas fontes.** SchoolMembership é candidata a raiz do vínculo de acesso escolar; não deve ser presumida como raiz da autenticação inteira.                                                                     |
| **Entidades documentadas** | AuthAccount, PasswordCredential, AuthSession/registro de revogação, SchoolMembership e MembershipRoleAssignment, entre outras entidades de Auth.                                                                             |
| **Value Objects**          | `membershipId`, `schoolId`, `roleId` e `permissionId` são identificadores distintos (**fato**); modelá-los como VOs é uma **recomendação**, não definição existente.                                                         |
| **Responsabilidades**      | Autenticar, manter credenciais/sessões, gerir membership e grants, e avaliar autorização no servidor por escopo explícito.                                                                                                   |
| **Owner**                  | **Fato documentado:** Auth / Authorization possui credenciais, sessão, memberships e atribuições de acesso.                                                                                                                  |
| **Boundary**               | Auth não possui User/Profile de produto, School ou matrícula em Class. Login não consulta módulos de produto como condição para autenticar.                                                                                  |
| **Motivo**                 | Login é um caso de uso que usa identidade e elementos de autenticação sob ownership de Auth; as fontes não documentam um agregado chamado `Login` nem autorizam unir User, credencial, sessão e escola em um único agregado. |

**Evidência:** Email/senha é o método V1 documentado; acesso escolar é contextual por SchoolMembership. Criar uma raiz específica de login seria entidade/agregado não documentado e fica **fora** do mapa.

### 3. School

| Aspecto                             | Delimitação                                                                                                                                                                                                |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Aggregate Root**                  | **School** — raiz candidata por inferência limitada a partir do registro institucional e do ownership de Schools.                                                                                          |
| **Entidades internas documentadas** | SchoolSettings pode ser parte da fronteira da escola; a composição não está explicitamente fixada. SchoolDomain tem semântica operacional parcial e não é incluído como membro necessário do agregado MVP. |
| **Value Objects**                   | `schoolId` é o identificador canônico de escopo (**fato**); tratá-lo como VO é **recomendação**. Nenhum outro VO de School é formalizado.                                                                  |
| **Responsabilidades**               | Administrar a instituição, configuração, estado e identificador `schoolId`.                                                                                                                                |
| **Owner**                           | **Fato documentado:** Schools.                                                                                                                                                                             |
| **Boundary**                        | A escola representa o tenant institucional. Não administra memberships de acesso, turmas, questões, tentativas ou rankings.                                                                                |
| **Motivo**                          | Dá uma fronteira própria ao ciclo de vida institucional sem criar um Tenant separado: School é a instituição; `tenant` é conceito e `schoolId` o identificador.                                            |

**Evidência:** School e SchoolSettings constam no data map; considerar School como raiz é **inferência**, não nomeação explícita de Aggregate Root.

### 4. Class

| Aspecto                             | Delimitação                                                                                                                                                                                                   |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Aggregate Root**                  | **Class** — raiz candidata inferida para organizar a turma.                                                                                                                                                   |
| **Entidades internas documentadas** | Enrollment/ClassEnrollment e ClassTeachingAssignment são vínculos documentados por Classes. Sua inclusão sob a raiz Class é uma **inferência**; as fontes não fixam cardinalidades nem invariantes completas. |
| **Value Objects**                   | `schoolId`, `classId` e identificadores de estudante/professor são referências/escopos documentados. Tratá-los como VOs é **recomendação**.                                                                   |
| **Responsabilidades**               | Organizar turmas, matrículas de estudantes e atribuições docentes dentro de `schoolId`.                                                                                                                       |
| **Owner**                           | **Fato documentado:** Classes.                                                                                                                                                                                |
| **Boundary**                        | Sempre escolar. Class referencia School por `schoolId`; não possui School, User, Auth membership nem credenciais.                                                                                             |
| **Motivo**                          | A turma agrupa vínculos pedagógicos, enquanto o acesso User–School permanece em Auth. A separação evita confundir matrícula em turma com SchoolMembership.                                                    |

**Evidência:** O owner e os conceitos Class/Enrollment/Teacher Assignment são explícitos; Class como raiz e vínculos como entidades internas são **inferências** a validar.

### 5. Question

| Aspecto                             | Delimitação                                                                                                                                                                                                                                                |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Aggregate Root**                  | **Question** — candidato com evidência direta no exemplo DDD legado do Documento Mestre; composição precisa ser reconciliada com os ADRs atuais antes de ratificação.                                                                                      |
| **Entidades internas documentadas** | QuestionVersion, QuestionOption, QuestionAsset, QuestionPublication e links de classificação/proveniência são conceitos do data map. As versões publicadas são conceitualmente imutáveis.                                                                  |
| **Value Objects**                   | Nenhum VO completo é definido nas fontes. Nível/dificuldade e referências versionadas são conceitos documentados, mas não devem ser convertidos em novos tipos/entidades neste documento.                                                                  |
| **Responsabilidades**               | Curar enunciado, alternativas, gabarito, explicação, nível, metadados e versões da questão.                                                                                                                                                                |
| **Owner**                           | **Fato documentado:** Questions.                                                                                                                                                                                                                           |
| **Boundary**                        | Questões e versões pertencem a Questions. Topic/Competency/Skill/Source permanecem sob seus owners e são relacionados por referência; não se incorporam seus agregados à Question. O Question Engine seleciona/avalia, mas não possui o conteúdo original. |
| **Motivo**                          | A questão versionada permite conteúdo publicado reproduzível; referenciar taxonomia evita cruzar ownership.                                                                                                                                                |

**Evidência:** O Documento Mestre apresenta `Question` como raiz do agregado e cita respostas/Topics no exemplo antigo. Como ADR-0002/0003 posteriores definem ownership próprio de Topics e descrevem links por IDs, incorporar Topic dentro do agregado Question não é adotado. A composição interna atual da raiz continua **parcialmente inferida**.

### 6. Attempt (resolução de questão)

| Aspecto                             | Delimitação                                                                                                                                                                                                                     |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Aggregate Root**                  | **Attempt** — candidato com evidência explícita de que a tentativa é o agregado cuja regra de ciclo de vida precisa ser aplicada.                                                                                               |
| **Entidades internas documentadas** | AttemptAnswer; AttemptEvidence é condicional (“se necessário”) e não é obrigatória para o MVP.                                                                                                                                  |
| **Value Objects**                   | Resposta submetida, timestamp, contexto de atividade, IDs e `schoolId` são dados documentados; as fontes não fixam VOs nem um Score universal.                                                                                  |
| **Responsabilidades**               | Registrar início, respostas submetidas e resultado da atividade; conservar a tentativa finalizada imutável, ressalvada anotação auditada conforme o glossário.                                                                  |
| **Owner**                           | **Fato documentado:** Attempts. Question Engine fornece a avaliação; Attempts registra a execução e resultado.                                                                                                                  |
| **Boundary**                        | Attempt referencia usuário, versão/snapshot de questão e contexto escolar quando aplicável. Não altera questão/gabarito, não é dono de avaliação do Engine e não grava ranking. Toda tentativa institucional requer `schoolId`. |
| **Motivo**                          | Centraliza a consistência de resposta e resultado no contexto autoritativo, permitindo publicação de eventos após commit para efeitos/projeções.                                                                                |

**Evidência:** Attempt e AttemptAnswer são definidos; Attempt como raiz é sustentado pelo uso explícito de “invariantes do agregado Attempt” no Documento Mestre atualizado e pela regra de imutabilidade nas fontes conceituais.

### 7. Ranking

| Aspecto                            | Delimitação                                                                                                                                                                             |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Aggregate Root**                 | **Nenhum agregado de Ranking é aprovado neste mapa.** RankingDefinition é configuração documentada, mas sua designação como raiz não foi explicitada.                                   |
| **Entidades/modelos documentados** | RankingDefinition, RankingSnapshot, RankingEntry e cursor de projeção constam no modelo conceitual. Snapshot e Entry são explicitamente projeções/read models, não agregados canônicos. |
| **Value Objects**                  | Escopo, período e desempate são dimensões/regras que precisam ser declaradas; fórmula universal de Score não foi definida. Não se propõe VO novo.                                       |
| **Responsabilidades**              | Rankings projeta classificações a partir de fatos elegíveis, com escopo e desempate declarados. Não decide elegibilidade de origem nem altera Attempts/Championships.                   |
| **Owner**                          | **Fato documentado:** Rankings é owner de sua projeção/configuração; os fatos originais permanecem com seus produtores.                                                                 |
| **Boundary**                       | Consumidor de eventos/resultados de Attempts e, se aplicável, de Championships. Não depende de escrita ou repositório desses contextos.                                                 |
| **Motivo**                         | O requisito de ranking do MVP pode ser atendido por uma projeção de leitura; inventar agregado transacional de leaderboard contrariaria o ownership documentado.                        |

**Evidência:** Ranking é explicitamente uma projeção. **Recomendação:** entregar leitura/ranking simples no MVP, mas manter Snapshot/Entry como projeção e não batizá-los de agregado.

---

## Parte 2 — Agregados do MVP

“Prioridade” indica prioridade funcional/documental da seleção, não ordem de implementação. “Login” e “Ranking” aparecem porque são capacidades solicitadas; não se inventa agregado para representá-las.

| Agregado                               | Prioridade | Justificativa                                                                                                                                                                 |
| -------------------------------------- | ---------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| User / identidade de produto           |         P0 | Identidade global requerida para associar login e atividade; raiz User é candidata inferida. O perfil pertence a Users, não ao Auth.                                          |
| Autenticação e SchoolMembership (Auth) |         P0 | Login V1 usa email/senha; Auth mantém credenciais/sessões. SchoolMembership é o vínculo de acesso escolar, não uma matrícula em turma. Raiz formal de Auth não especificada.  |
| School                                 |         P0 | Necessária para tenancy institucional e `schoolId`; não inclui Classes nem memberships. Raiz candidata.                                                                       |
| Class                                  |         P1 | Organiza turmas e vínculos pedagógicos por escola. Class/Enrollment são do owner Classes. Raiz candidata; validar consistência dos vínculos e escopo.                         |
| Question                               |         P0 | Conteúdo curado e versionado é requisito central para selecionar e resolver questões. Raiz apoiada pelo exemplo legado do Documento Mestre, com composição atual a ratificar. |
| Attempt                                |         P0 | Registro autoritativo da resolução, respostas e resultado; alimenta efeitos posteriores sem transferir ownership. Raiz com evidência documental forte.                        |
| Ranking (projeção, não agregado)       |         P1 | Atende à visualização competitiva mínima sem criar um agregado novo. Baseado em fatos elegíveis/eventos; sua consistência é eventualmente atualizada.                         |

**Resultado da seleção:** seis domínios/capacidades funcionais mínimos — identidade/login, escola, turma, questão, tentativa/resolução e ranking —, mas não seis agregados formais. Os limites documentais permitem quatro raízes candidatas de negócio (User, School, Class, Question) e um agregado com suporte mais explícito (Attempt); Auth não tem raiz consolidada e Ranking permanece projeção.

---

## Parte 3 — Relacionamentos

As setas abaixo representam relações conceituais documentadas, não FKs físicas, comandos síncronos ou cardinalidades finais.

```text
User
↓
Membership
↓
School

School
↓
Class

Class
↓
Enrollment

Question
↓
Attempt

Attempt
↓
Ranking
```

### Interpretação

- **User → Membership → School:** SchoolMembership vincula a identidade global do User à School e concede contexto de acesso. Auth/Authorization é owner da membership e das atribuições de papel ligadas a ela. Uma pessoa pode ter vínculos com mais de uma escola.
- **School → Class:** Class pertence ao escopo escolar identificado por `schoolId`. Schools administra a instituição; Classes administra a turma. Classes valida School por contrato/evento, sem ler seus dados internos.
- **Class → Enrollment:** Enrollment/ClassEnrollment vincula estudante a turma e pertence a Classes. Não é sinônimo da SchoolMembership de Auth. A associação a User usa a identidade/referência autorizada.
- **Question → Attempt:** Attempt referencia questão/versão ou snapshot usado na atividade. Question Engine avalia a resposta através de contrato; Attempts registra a resposta e resultado. Attempt não altera conteúdo de Question.
- **Attempt → Ranking:** eventos/fatos elegíveis de Attempts alimentam projeções de Rankings. A seta indica consumo/projeção assíncrona, não propriedade de Attempt pelo Ranking, nem escrita de Ranking no agregado Attempt.

---

## Parte 4 — Complexidade

Classificação qualitativa da fronteira candidata, não estimativa de esforço. Considera regras e riscos explícitos nas fontes.

| Agregado / capacidade           | Complexidade | Explicação                                                                                                                                                                                  |
| ------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| User / identidade de produto    | **MÉDIA**    | Identidade global é conceitualmente simples, mas separação de perfil, credencial e autorização e os requisitos de privacidade de menores aumentam o cuidado.                                |
| Autenticação / SchoolMembership | **ALTA**     | Credenciais, sessão/revogação, permissões por contexto, papéis globais/escolares, deny-by-default e isolamento entre escolas exigem invariantes de segurança.                               |
| School                          | **MÉDIA**    | O registro institucional é pequeno, mas `schoolId` é limite de tenancy e os controles cross-school ainda não estão comprovados em runtime.                                                  |
| Class / Enrollment              | **MÉDIA**    | Turma, matrícula e atribuição docente têm escopo escolar e devem permanecer separados de membership; regras detalhadas/cardinalidades ainda são parciais.                                   |
| Question                        | **MÉDIA**    | Curadoria e versionamento/publicação são claros em ownership; relações taxonômicas e composição exata da raiz precisam de harmonização.                                                     |
| Attempt                         | **ALTA**     | Respostas e resultados são imutáveis após conclusão, com avaliação por outro contexto, `schoolId` obrigatório em atividade institucional e publicação de eventos/projeções.                 |
| Ranking (projeção)              | **MÉDIA**    | A projeção é separada da origem, mas depende de eventos elegíveis, escopo/período, desempate, idempotência e eventual consistência. Fórmula/semântica universal de score não está definida. |

---

## Parte 5 — Escopo MVP

### Entram

- **User e autenticação mínima:** identidade global e capacidade V1 de email/senha, com Auth dono das credenciais/sessões e Users dono do perfil. Sem agregado artificial chamado Login.
- **School e SchoolMembership:** instituição/tenant e vínculo de acesso escolar, com papéis contextualizados. Membership não substitui Enrollment.
- **Class e Enrollment:** organização mínima de turmas e vínculo de estudante à turma, sempre no `schoolId` correto.
- **Question:** questão curada/versionada e publicada necessária ao fluxo de prática. A taxonomia é referência dos owners existentes; este escopo não cria um agregado Topics adicional.
- **Question Engine como dependência funcional:** seleção/avaliação por contrato; não é dono do conteúdo nem das tentativas. `Evaluation` não vira entidade.
- **Attempt:** tentativa/respostas/resultado da resolução sob Attempts.
- **Ranking mínimo como projeção:** somente consulta/classificação baseada em fatos elegíveis, sem raiz nova nem lógica avançada não especificada.

### Ficam fora deste mapa de agregados MVP

- **Novas raízes formais para Auth e Ranking:** não há raiz explicitamente definida para Auth; Ranking é documentado como projeção. Sua eventual formalização exige decisão dos owners.
- **Topics/Taxonomy como agregado MVP:** catálogo e owner são documentados; para o recorte solicitado basta referenciar conceitos publicados, sem modelar uma nova raiz aqui.
- **Study Paths e recomendação adaptativa:** fora do fluxo mínimo de login, turma, questão, resolução e ranking solicitado; adaptações/recomendações são excluídas.
- **Mock Exams e Championships:** contextos documentados, mas não necessários para o fluxo mínimo de prática selecionado.
- **Analytics avançado, IA, certificados, badges complexos e telemetria:** explicitamente excluídos do escopo solicitado.
- **Evaluation, Result, Score, Completion, Dashboard e Educational Insight como agregados:** as fontes os definem como operação/resultado contextual, evento específico, projeção ou conceito parcial/não definido — não como agregado universal.
- **QuestionAnswer/Topic como filhos internos do agregado Question:** o exemplo antigo do Documento Mestre não prevalece sobre o ownership atual de Questions e Topics; usar versões e referências/links sob seus owners.
- **SchoolDomain, AttemptEvidence e regras adicionais de membership/enrollment:** apenas entram se requisito aprovado demonstrar necessidade; detalhes atuais são parciais ou opcionais.

---

## Parte 6 — Resultado final

### Agregados selecionados para o MVP

1. **User** — raiz candidata, para identidade global de produto; perfil no boundary Users.
2. **School** — raiz candidata, para ciclo de vida institucional e escopo `schoolId`.
3. **Class** — raiz candidata, com vínculos Enrollment/Teacher Assignment candidatos a entidades internas.
4. **Question** — raiz candidata, para conteúdo curado/versionado; referências taxonômicas ficam nos owners próprios.
5. **Attempt** — agregado de execução/respostas/resultados com suporte documental mais direto.
6. **SchoolMembership** — vínculo de acesso necessário ao MVP escolar, mas a raiz é candidata e pertence a Auth; não é login nem matrícula em turma.

**Ranking entra como capacidade de leitura do MVP, não como agregado aprovado.** Snapshots e Entries continuam projeções. Autenticação usa conceitos documentados de Auth sem declará-los um agregado único.

> **Ressalva de aprovação:** “selecionado/aprovado” significa aprovado para o escopo deste mapa. Não altera o estado `Proposed` dos ADRs nem ratifica as raízes candidatas.

### Agregados descartados ou não aprovados

| Conceito/alegação                                                        | Resultado   | Justificativa                                                                                                          |
| ------------------------------------------------------------------------ | ----------- | ---------------------------------------------------------------------------------------------------------------------- |
| `Login` como agregado                                                    | Descartado  | É caso de uso/capacidade de Auth, não entidade ou agregado documentado.                                                |
| User + credenciais + membership + School em um único agregado            | Descartado  | Violaria separação de ownership entre Users, Auth e Schools.                                                           |
| `RankingSnapshot`/`RankingEntry` como agregado canônico                  | Descartado  | São modelos de projeção/read model.                                                                                    |
| `Evaluation`, `Result`, `Score` ou `Completion` universais como agregado | Descartado  | Semântica universal não definida; avaliação é operação de Question Engine e resultados pertencem ao contexto produtor. |
| `Student Assignment` separado de Enrollment                              | Descartado  | Não é conceito autônomo documentado.                                                                                   |
| `Tenant` além de School                                                  | Descartado  | Tenant é conceito de negócio; School é a instituição e `schoolId` o identificador canônico.                            |
| Novos agregados de badges/certificados/analytics/IA/telemetria           | Fora do MVP | Fora do escopo explícito desta análise e/ou capacidades excluídas pelo pedido.                                         |

### Riscos

1. **Raízes ainda não ratificadas:** exceção mais forte para Attempt; User/School/Class/Question e SchoolMembership são candidatos inferidos ou parcialmente apoiados.
2. **Status das decisões:** ADR-0002–0004 e Glossary seguem propostos; este arquivo não os transforma em decisões aceitas.
3. **Tenancy em runtime:** a documentação conceitual exige escopo `schoolId`, mas constraints e testes negativos cross-school não provam enforcement executável.
4. **Privacidade e menores:** retenção, finalidade e gates legais devem ser resolvidos antes de dados reais.
5. **Class e SchoolMembership:** confundir acesso escolar com matrícula em turma pode conceder ou negar acesso incorretamente.
6. **Resolução de questão:** semântica de avaliação e score genérico não está universalmente definida; resultado deve permanecer contextual ao Attempt/atividade.
7. **Ranking eventual:** atrasos, duplicatas ou eventos fora de ordem podem deixar a projeção temporariamente defasada; ela não confirma a transação do Attempt.
8. **Questões versionadas:** mistura de conteúdo atual e snapshot histórico pode prejudicar reprodução; composição exata do agregado Question requer ratificação.

### Dependências

- **Login:** identidade User + AuthAccount/PasswordCredential/AuthSession sob Auth; perfil Users é separado e não deve ser requisito de autorização.
- **Membership/School:** `schoolId` identifica o escopo; Auth valida membership e permissão contra o recurso/escopo pertinente.
- **Class:** necessita contexto de School e referências de identidade; não lê repositórios internos de Schools, Users ou Auth.
- **Question:** usa Topic/Competency/Skill/Source por referências e contratos dos owners; conteúdo publicado/versionado precisa estar disponível à seleção.
- **Attempt:** depende do contrato de avaliação do Question Engine e da questão/snapshot selecionado; grava seu próprio resultado.
- **Ranking:** consome fatos/eventos elegíveis de Attempts e, caso a regra do produto exija, eventos de Championships; atualiza projeção sem escrita nos produtores.

---

## Parte 7 — MEMÓRIA PARA PROMPT 2

## Agregados aprovados

- Para modelagem do MVP: User, School, Class, Question, Attempt e SchoolMembership.
- Attempt tem o suporte mais explícito como agregado; os demais são raízes candidatas/inferências e aguardam confirmação dos owners.
- Ranking é capacidade incluída como projeção, não agregado.
- Login é capacidade de Auth, não agregado novo.

## Agregados descartados

- Login agregado; agregados que atravessem Users/Auth/Schools; RankingSnapshot/RankingEntry como agregados canônicos.
- Evaluation/Result/Score/Completion universais; Student Assignment separado; Tenant separado de School.
- Analytics avançado, IA/recomendação adaptativa, certificados, badges complexos e telemetria no MVP deste recorte.

## Relacionamentos

- User → SchoolMembership → School.
- School → Class → Enrollment.
- Question/version snapshot → Attempt/AttemptAnswer.
- Attempt/eventos elegíveis → projeção de Ranking.
- SchoolMembership é acesso User–School; Enrollment é vínculo estudante–Class.

## Riscos

- Raízes/composições precisam de decisão dos owners; status ADR permanece Proposed.
- Isolamento cross-school ainda carece de comprovação executável; privacidade/legal para menores é gate.
- Contrato de avaliação, score contextual e consistência eventual do ranking devem ser esclarecidos sem introduzir conceitos universais.

## Próxima etapa

**USE CASE MODELING**
