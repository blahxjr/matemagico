# Parecer Executivo — Prontidão para Modelagem Normativa do Domínio

**Data de referência:** 2026-10-01  
**Órgão:** Architecture Review Board / CTO  
**Natureza:** parecer executivo baseado nos artefatos existentes. Não cria arquitetura, não altera ADRs/status, não autoriza implementação e não substitui aprovação dos deciders.

## Decisão em uma linha

# NO GO

**Fato:** há uma direção arquitetural e modelos conceituais amplos. **Decisão:** não iniciar modelagem normativa do domínio como baseline aprovada; a evidência de aprovação e a autoridade documental ainda não estão reconciliadas. Modelagem exploratória em Draft pode continuar, explicitamente não vinculante.

## Método e níveis de evidência

- **Fato documentado:** afirmado diretamente por uma fonte identificada.
- **Inferência:** interpretação limitada de relações escritas nas fontes.
- **Recomendação:** ação proposta, não decisão adotada.
- **VERDE:** definido e com evidência/status suficiente para o uso avaliado.
- **AMARELO:** direção útil, mas proposta, incompleta ou sem validação/evidência total.
- **VERMELHO:** não atende ao gate de uso normativo/prontidão especificado.

A avaliação distingue modelagem conceitual, modelagem normativa e prontidão de runtime/produção. Resultados em uma dessas dimensões não são transferidos automaticamente às demais.

## 1. Inventário de maturidade

| Dimensão        | Status                                                                        | Evidência                                                                                                                                                                                                                                     | Risco residual                                                                                                                                                                     |
| --------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Arquitetura     | **AMARELO**                                                                   | ADR-0001 embutido declara Modular Monolith + DDD + Clean Architecture; o arquivo autônomo formaliza a mesma direção. O `INDEX.md` mantém o texto embutido como canônico, com aprovação pendente. ADR-0002–0004 estão Proposed.                | Direção inteligível, mas não há baseline formal coerente Accepted. Metas de escala/performance não são capacidade comprovada.                                                      |
| Governança      | **VERMELHO**                                                                  | ADR-GOVERNANCE está Proposed e afirma que só se torna política oficial após Accepted. O processo de ratificação também é recomendação; ADR-0001 mantém status Accepted embutido versus sign-off pendente no índice.                           | Não existe autoridade procedural aceita para transformar conclusões em decisão oficial; risco de aprovação presumida.                                                              |
| Glossário       | **AMARELO**                                                                   | [GLOSSARY.md](GLOSSARY.md) consolida muitos termos, mas seu próprio cabeçalho diz que aguarda revisão/ratificação e não está no índice. Define lacunas como Evaluation/Result/Score, Integration Event, Dashboard e Educational Insight.      | Vocabulário serve à exploração, mas termos essenciais/parciais impedem tratá-lo como léxico normativo único.                                                                       |
| Ownership       | **AMARELO**                                                                   | [DOMAIN-OWNERSHIP-MAP.md](DOMAIN-OWNERSHIP-MAP.md) consolida owners e limites de escrita; declara que deriva de ADRs 0002–0004 Proposed. Marca Notifications, Dashboard/Educational Insight e algumas leituras como ambíguos/não definidos.   | Owner conceitual dos contextos principais está claro; não ratificado e sem enforcement; há pontos de leitura/integration por esclarecer.                                           |
| Tenancy         | **AMARELO**                                                                   | [TENANCY-VALIDATION-REPORT.md](TENANCY-VALIDATION-REPORT.md) registra multi-escola lógico, banco/schema compartilhado, `schoolId`, User global, memberships e scopes. ADR-0003/0004 estão Proposed.                                           | Constraints e testes negativos cross-school não estão demonstrados; modelagem é conceitual, não prova de isolamento em runtime.                                                    |
| Segurança       | **VERMELHO** para uso com dados reais; **AMARELO** para exploração conceitual | ADR-0004 detalha User global/RBAC e controles, mas permanece Proposed. ADR-0003/0004 condicionam produção a revisão legal/privacidade, MFA privilegiada e controles de autenticação. Não há evidência de implementação/testes completos.      | Não declarar segurança, conformidade LGPD/OWASP ou prontidão para dados reais. Isso é gate de produção; não cria por si só um novo conceito de domínio.                            |
| Rastreabilidade | **VERMELHO** para decisão oficial                                             | `INDEX.md` aponta ADR-0001 para `ARCHITECTURE.md` seção 6; existe arquivo autônomo não listado; o cabeçalho embutido diz Accepted enquanto o índice exige reconciliação. ADR-GOVERNANCE ainda é Proposed.                                     | Não há fonte/status únicos e aprovados para ratificação; decisões derivadas não herdam aprovação.                                                                                  |
| Documentação    | **AMARELO**                                                                   | Há Documento Mestre, ADRs, índice, glossário, mapa de ownership, pareceres de conformidade/tenancy e processo de ratificação. O Diagnostic Report de 2026-09-29 contém achados que conflitam com harmonizações posteriores e evidência atual. | Boa cobertura documental, mas status divergem e alguns relatórios/snapshots precisam ser lidos com data/escopo; nenhuma proposta se torna Accepted por quantidade de documentação. |

## 2. Avaliação da baseline

### A baseline está consistente?

**NÃO, como baseline normativa aprovada.**

**Fatos:**

- O índice chama a seção 6 de `ARCHITECTURE.md` de referência canônica de ADR-0001 e registra approval pendente.
- O cabeçalho embutido declara Accepted; a formalização autônoma recomenda Proposed e não consta como canônica no índice.
- ADR-0002, ADR-0003 e ADR-0004 continuam Proposed; suas relações dependem da arquitetura base ou de suas derivadas.
- A direção conceitual de Modular Monolith/DDD/Clean Architecture, boundaries, PostgreSQL/Prisma e Auth.js é amplamente coerente, mas coerência técnica não equivale a decisão ratificada.

**Inferência:** a baseline de referência é localizável e conceitualmente alinhada em alto nível; a baseline de autoridade/status não é consistente o suficiente para congelamento normativo.

## 3. Avaliação de governança

### A governança é suficiente?

**NÃO, como política oficial atualmente vigente.**

ADR-GOVERNANCE especifica estados, papéis, checklist, supersession e atualização do índice, mas permanece Proposed. O [parecer de conformidade de ADR-0001](ADR-0001-COMPLIANCE-REVIEW-2026-10-01.md) registra ausência de deciders individualmente identificados, sign-off e revisões concluídas. O processo de ratificação diz explicitamente que é recomendação e condiciona o uso oficial à aprovação da própria governança.

**Consequência:** os processos são um modelo procedimental proposto e útil para organizar a revisão; ainda não há evidência de adoção formal que confira autoridade a eles.

## 4. Avaliação de linguagem ubíqua

### Os conceitos essenciais estão definidos?

**NÃO para um vocabulário normativo completo; SIM para iniciar exploração com ressalvas.**

O glossário e os ADRs definem conceitos centrais como User, School, SchoolMembership, Enrollment, Role, Permission, Question/QuestionVersion, Attempt, Study Path, Championship, Ranking, Badge, Certificate, Analytics e `schoolId`. Contudo, GLOSSARY.md não foi ratificado e identifica lacunas.

### Lacunas terminológicas documentadas

- **Não definido como conceito autônomo:** Student Assignment, Dashboard como aggregate/domain owner, Educational Insight e OBMEP Classification como entidade singular.
- **Parcial/ambíguo:** Evaluation como entidade, Result, Score, Completion, QuestionPublication lifecycle, SchoolDomain behavior, distinção Domain Event/Integration Event, Notification owner.
- **Não é conflito atual:** `tenantId` como campo não é nomenclatura ativa; os ADRs ativos padronizam `schoolId`.
- **Não é duplicidade atual:** SchoolMembership e Enrollment têm significados/owners distintos nos ADRs ativos.

## 5. Avaliação de ownership

### Ownership é suficiente?

**NÃO para baseline normativa ratificada; SIM, provisoriamente, para exploração conceitual.**

**Fato:** ADR-0002/0003 atribuem os owners principais: Auth/Authorization, Users, Schools, Classes, Topics, Questions, Question Engine, Study Paths, Attempts, Mock Exams, Championships, Rankings, Badges, Certificates e Analytics. O mapa reproduz esses limites e declara que não prova enforcement.

**Lacunas:** leitura de métricas Question Engine–Analytics não tem modo explicitamente harmonizado; Notification/NotificationDelivery não tem bounded context owner inequívoco; Dashboard/Educational Insight não têm owner como conceito de domínio. Como os ADRs são Proposed, ownership ainda não é decisão aprovada.

## 6. Avaliação de tenancy

### Tenancy é suficiente para modelagem?

- **Exploratória:** **SIM.** As fontes dão vocabulário, escopos, owners e relações suficientes para discutir e registrar hipóteses em Draft sem congelamento.
- **Normativa:** **NÃO.** A decisão de dados e autorização segue Proposed; alguns conceitos têm escopo global-or-school que depende de declaração contextual; constraints, queries e testes cross-school não estão comprovados.
- **Runtime/produção:** **NÃO VALIDADO.** Não inferir isolamento executável, conformidade, performance ou autorização correta a partir das especificações.

### Evidência de tenancy relevante

- ADR-0003 rejeita database/schema por escola e especifica `schoolId` para dados institucionais.
- ADR-0004 descreve User global, memberships, roles globais/escolares e validação de scope/recurso no servidor.
- ADR-0002 diz que evento não concede autorização e que cada consumer valida escopo.
- TENANCY-VALIDATION-REPORT afirma bloqueio para declarar isolamento executável/usar dados reais sem gates; isso não contradiz a suficiência do modelo lógico para exploração.

## 7. Bloqueadores reais

Lista limitada a bloqueadores para **modelagem normativa e declaração de baseline aprovada**. Não inclui conflitos já resolvidos documentalmente (`tenantId`/`schoolId`, membership/enrollment) nem transforma gaps de produção em proibição de exploração.

| Severidade               | Bloqueador                                                                                                                                                                               | Evidência                                                                                                                 |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **CRÍTICO**              | Autoridade da baseline não resolvida: ADR-0001 tem Accepted embutido versus approval pendente no índice; deciders/sign-off nominais ausentes.                                            | INDEX.md; Documento Mestre; [ADR-0001 Compliance Review](ADR-0001-COMPLIANCE-REVIEW-2026-10-01.md); Ratification Process. |
| **ALTO**                 | ADR-GOVERNANCE e ADRs fundacionais/derivados relevantes permanecem Proposed; não há prova de ratificação que permita tratar o processo e as decisões como norma vigente.                 | INDEX.md; cabeçalhos de ADR-0002/0003/0004; ADR-GOVERNANCE.                                                               |
| **ALTO**                 | GLOSSARY.md e DOMAIN-OWNERSHIP-MAP.md são propostas de consolidação, não canônicos aceitos; há conceitos de domínio não definidos e ownership de Notifications/insights não determinado. | Cabeçalho dos artefatos; GLOSSARY §11/14; DOMAIN-OWNERSHIP-MAP §8/10.                                                     |
| **MÉDIO**                | Ownership de projeção QuestionMetricSnapshot e modo de consumo do Question Engine não estão claramente harmonizados entre ADR-0002 e ADR-0003.                                           | ADR-0002 dependency matrix/communication; ADR-0003 §2.6; DOMAIN-OWNERSHIP-MAP §7–8.                                       |
| **MÉDIO, para produção** | Isolamento cross-school não tem evidência de constraints/testes executáveis; privacidade de menores ainda depende de aprovações legais/segurança.                                        | ADR-0003, ADR-0004, TENANCY-VALIDATION-REPORT.                                                                            |

**Não listado como bloqueador de modelagem exploratória:** implementação de schema, constraints, APIs, load tests ou controles de produção. Eles são evidências/gates para validação executável/produção, não pré-requisito para discussão conceitual em Draft nas fontes examinadas.

## 8. Riscos residuais

| Categoria   | Riscos residuais documentados                                                                                                                                                     |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Arquitetura | Decisão fundacional com status contraditório; metas de escala/latência não demonstram capacidade; direção técnica está Proposed.                                                  |
| Governança  | ADR-GOVERNANCE não Accepted; não há deciders/sign-offs nominais; index/source canônico de ADR-0001 dividido.                                                                      |
| Domínio     | Glossário/ownership map não ratificados; Evaluation/Result/Score/Completion, Notification, Dashboard e Educational Insight têm lacunas; modo de leitura Engine–Analytics ambíguo. |
| Dados       | ADR-0003 é conceitual e Proposed; schema/constraints/migrations não comprovam integridade de tenant; registros globais/escolares precisam de scope declarado no uso.              |
| Segurança   | Auth/RBAC e política para dados de menores não comprovados; MFA, privacidade/retention e testes cross-tenant permanecem gates para dados reais/produção.                          |

## 9. Decisão GO / NO GO

# NO GO

**Justificativa:** não há aprovação formal comprovável para ADR-0001; ADR-0002/0003/0004 permanecem Proposed; o processo de governança não está ratificado; o glossário e o mapa de ownership também são propostas. Promover modelagem normativa nessas condições converteria propostas e interpretações em decisões sem autoridade rastreável.

**Escopo compatível com evidência atual:** exploração e descoberta podem ocorrer como Draft não vinculante. Isso não altera o NO GO para modelagem normativa.

## 10. Condições para GO

| Item                                                                                                                                                                 | Impacto                                                                                                           | Prioridade                                                           |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Aprovar ADR-GOVERNANCE (ou registrar processo equivalente aprovado)                                                                                                  | Define autoridade e critérios vinculantes para decisão/status.                                                    | **P0**                                                               |
| Identificar nominalmente os deciders de ADR-0001 e reconciliar Accepted embutido vs pendência de aprovação.                                                          | Sem isso, não há autoridade verificável para baseline.                                                            | **P0**                                                               |
| Registrar pareceres/revisões e decisão explícita de cada decider de ADR-0001; decidir fonte canônica e atualizar índice após decisão.                                | Fecha checklist de aceite e rastreabilidade de ADR-0001.                                                          | **P0**                                                               |
| Decidir formalmente o status de ADR-0002, ADR-0003 e ADR-0004 segundo seus próprios owners/deciders.                                                                 | Torna boundaries, modelo conceitual de dados/tenancy e autorização normativos, ou mantém explicitamente proposta. | **P0** para modelagem normativa dependente deles                     |
| Revisar/ratificar Glossary e Domain Ownership Map; registrar como não definidos os conceitos que não têm fonte.                                                      | Garante terminologia e ownership consultáveis, sem inferências locais.                                            | **P1**                                                               |
| Esclarecer documentalmente a leitura Question Engine–Analytics e o status de owner para Notification, Dashboard/Educational Insight caso venham a integrar o escopo. | Evita interpretar projeção como dependência/owner diferente.                                                      | **P1**                                                               |
| Para validação runtime/dados reais: produzir evidência de constraints/testes cross-school e cumprir gates de privacidade/segurança.                                  | Permite avaliar isolamento e uso real sem confundir especificação com implementação.                              | **P0 antes de produção/dados reais; não gate de Draft exploratório** |

## 11. Escopo autorizado

### Decisão atual: NO GO normativo

**Pode começar / continuar:**

- modelagem exploratória de conceitos já presentes nas fontes, registrada como Draft;
- análise de agregados/lifecycle usando Aggregate Roots já listados em ADR-0003;
- levantamento de casos de uso como perguntas/artefatos de descoberta, sem afirmar decisão oficial;
- registro de ambiguidades, alternativas e dependências para revisão por owners/deciders.

**Continua bloqueado como atividade normativa:**

- declarar novo Aggregate Root, entidade, regra, event contract ou ownership como decisão aceita;
- congelar modelo conceitual como fonte oficial para schema/implementação;
- tratar tenancy/RBAC documentados como isolamento ou segurança executável;
- promover ADR-0001/0002/0003/0004, glossário ou ownership map sem aprovação formal registrada.

Este parecer não autoriza schema Prisma, API, código ou implementação.

## 12. Roadmap pós-GO

Sequência documental/de domínio após os gates de aprovação serem concluídos; não é execução nem criação de entidades neste parecer.

1. Ratificar baseline (ADR-0001) e decidir status das propostas fundacionais/derivadas (ADR-0002/0003/0004).
2. Ratificar o vocabulário e ownership já consolidados; registrar termos sem definição como pendências, sem inventar conceitos.
3. Revisar os Aggregate Roots já documentados e suas fronteiras, mantendo ownership indicado nos ADRs aceitos.
4. Documentar casos de uso e responsabilidades dos contextos com os termos canônicos ratificados.
5. Revisar catálogo de eventos já documentado, seus producers/consumers e ambiguidades de projeção.
6. Somente depois de decisões de domínio/dados aprovadas, avaliar os artefatos subsequentes que o roadmap do projeto prevê; este parecer não define sua implementação.

## 13. EXECUTIVE ARCHITECTURE SUMMARY

### O que foi concluído

- **Fato:** Documento Mestre registra Modular Monolith, DDD, Clean Architecture e stack fundacional.
- **Fato:** ADR-0002 apresenta bounded contexts, ownership, contratos e eventos; ADR-0003 apresenta tenancy lógica e data map; ADR-0004 apresenta identidade global, membership e RBAC contextual — todos ainda Proposed.
- **Fato:** GLOSSARY, DOMAIN-OWNERSHIP-MAP e TENANCY-VALIDATION-REPORT consolidam terminologia, owners e tenancy como documentos de análise/proposta, não ratificados.
- **Fato:** o parecer de compliance recomendou manter ADR-0001 Proposed por falta de evidência de sign-off e status/canonicalidade reconciliados.

### O que permanece pendente

- Ratificação do processo de governança.
- Identificação e sign-off explícito dos deciders de ADR-0001.
- Resolução da fonte canônica/status de ADR-0001 e atualização do índice somente após decisão.
- Aprovação ou manutenção explícita como Proposed de ADR-0002/0003/0004.
- Ratificação de glossário/ownership map e tratamento das ambiguidades que afetam o escopo.
- Evidências de isolamento/segurança antes de produção ou dados reais.

### Riscos residuais

- Proposta tomada como regra aceita por status ou quantidade de documentação.
- Ambiguidade de ownership/read path ser convertida em modelagem normativa por inferência.
- Modelo lógico ser confundido com tenancy validada em runtime.
- Relatórios antigos do Diagnostic Report reabrirem conflitos já corrigidos documentalmente ou esconderem lacunas ainda reais.

### Decisão GO/NO GO

**NO GO para modelagem normativa.** **SIM para exploração em Draft não vinculante**, sujeita a não congelar conceitos/decisões.

### Próxima ação recomendada

**Uma única ação:** submeter ADR-GOVERNANCE aos seus deciders para aprovação formal e registrar o resultado.

**Justificativa:** enquanto a própria autoridade de governança permanece Proposed, critérios de aprovação, autoridade de deciders e uso do índice não são vinculantes. Aprovar esse processo é a condição raiz para regularizar ADR-0001 e, em seguida, decidir as propostas que suportam a modelagem normativa.

---

**Nota:** Este parecer usa apenas os artefatos existentes. Não cria arquitetura, não altera ADRs/status, não aprova conceitos e não autoriza implementação.
