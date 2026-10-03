# Glossario Corporativo — MateMágico Champions

**Data:** 2026-10-01  
**Status:** Proposta de referencia terminologica; aguarda revisao e ratificacao  
**Responsavel documental recomendado:** Architecture Lead, conforme proposta em `ADR-GOVERNANCE.md`  
**Escopo:** termos presentes nas fontes arquiteturais obrigatorias. Este glossario nao cria entidades, ownership, tenancy, politicas ou regras de negocio.

> **Limite de autoridade:** a intencao e que este seja o ponto unico de consulta para definicoes corporativas. Como este arquivo ainda nao foi ratificado nem incluido no `INDEX.md`, nao declara autoridade oficial atual. Ate a ratificacao, as fontes citadas continuam a autoridade para o conteudo que nelas esta documentado. Em caso de divergencia, registrar a discrepancia para revisao; nao sobrescrever silenciosamente uma decisao de ADR.

## 1. Principios do glossario

### Objetivo

Consolidar em um lugar os significados documentados dos termos de produto, dominio, dados, eventos e governanca do MateMágico Champions, reduzindo sinonimos concorrentes e tornando explicitas as lacunas.

### Escopo

- Inclui somente conceitos encontrados nas fontes obrigatorias: [ADR-0001](ADRs/ADR-0001-base-architecture.md), [Documento Mestre](../../ARCHITECTURE.md), [ADR-0002](ADRs/ADR-0002-module-boundaries.md), [ADR-0003](ADRs/ADR-0003-database-strategy.md), [ADR-0004](ADRs/ADR-0004-authentication-authorization.md), [ADR-0005](ADRs/ADR-0005-frontend-architecture-state-management-bff.md), [INDEX.md](ADRs/INDEX.md), [ADR-GOVERNANCE](ADRs/ADR-GOVERNANCE.md) e [parecer de conformidade ADR-0001](ADR-0001-COMPLIANCE-REVIEW-2026-10-01.md).
- Alguns nomes pedidos aparecem apenas como tabela conceitual, payload, projeção, exemplo ou palavra narrativa. A presença de um nome não significa que exista entidade de domínio independente.
- Quando as fontes não dão definição, ownership ou relação suficiente, a entrada declara essa ausência e não completa o conceito por inferência.
- As decisões e ownership dos ADRs continuam nos ADRs. O glossário harmoniza vocabulário, não substitui sua autoridade.

### Regras de manutenção propostas

1. Um termo deve ter uma definição corporativa por significado. Se um termo tiver sentidos distintos, criar entradas qualificadas com contexto explícito, não definições concorrentes sob o mesmo rótulo.
2. Cada entrada registra fonte e, quando documentado, contexto owner. “Owner não especificado” significa que não foi identificado nas fontes; não designa um novo owner.
3. Marcar cada entrada como **Definido na fonte**, **Uso documentado; definição parcial** ou **Não definido como conceito autônomo**.
4. Alterar o significado de um termo definido por ADR requer revisão do ADR proprietário e das referências dependentes. O glossário sozinho não muda decisões.
5. Novos termos só entram quando constarem em fonte aprovada ou forem explicitamente identificados como proposta pendente; não criar entidades para preencher lacunas.
6. Revisar definições, links e termos obsoletos junto à revisão de ADRs e na auditoria documental. Registrar data e revisão.
7. Até a aprovação deste documento, as regras acima são recomendações e não processo oficial vigente.

### Autoridade e uso por ADRs futuros

Após ratificação e inclusão no `INDEX.md`, este glossário deverá ser a referência primária de terminologia. ADR futuro deve:

- usar os termos e grafias canônicos aqui definidos;
- citar a entrada aplicável quando o significado for relevante;
- propor explicitamente uma definição nova ou uma alteração quando necessário, identificando owner, escopo e ADR impactado;
- marcar como pendente qualquer termo que ainda conste como não definido;
- não criar um sinônimo local que pareça outra entidade ou ownership.

Se um ADR aprovado e este glossário divergirem, o ADR proprietário permanece a fonte da decisão até a revisão formal do ADR e do glossário. Essa regra evita que uma edição terminológica altere arquitetura por acidente.

### Legenda de evidência

- **Definido na fonte:** há descrição explícita nas fontes citadas.
- **Uso documentado; definição parcial:** o termo e seu papel aparecem, mas detalhes ou limites não estão definidos.
- **Não definido como conceito autônomo:** aparece como rótulo, pergunta ou palavra, sem semântica suficiente para uma definição independente.
- **Responsável/contexto owner:** módulo/contexto ao qual a fonte atribui os dados ou a responsabilidade. A atribuição é documental/proposta nos ADRs que seguem Proposed; não é nova decisão deste glossário.

## 2. Entidades fundacionais

Fontes principais: ADR-0003 para data map/ownership conceitual; ADR-0004 para identidade e autorização. O ownership descrito nos ADRs continua Proposed, não aprovado por este glossário.

| Termo                        | Definição e status de evidência                                                                                                                                    | Contexto / responsável documentado                                               | Relacionamentos documentados                                                                                                         | Fonte                                           |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------- |
| **User**                     | Identidade global de produto, única entre escolas e providers; o perfil de produto não guarda credencial nem decide permissão. **Definido na fonte.**              | Users. Auth/Authorization referencia a identidade e controla credenciais/acesso. | Pode ter Profile, AuthAccount, SchoolMembership e atribuições globais; não tem uma role escolar ou `schoolId` como autoridade única. | ADR-0003 §2.2–2.3; ADR-0004 §2.1                |
| **Profile / UserProfile**    | Dados de perfil de produto minimizados associados ao User; nunca fonte de permissão. **Definido na fonte.**                                                        | Users.                                                                           | Um perfil por User é a regra conceitual do ADR-0004; preferências e consentimentos também pertencem ao contexto Users no ADR-0003.   | ADR-0003 §2.2; ADR-0004 §2.1                    |
| **AuthAccount**              | Vínculo entre User e identidade de um provider de autenticação. **Definido na fonte.**                                                                             | Auth/Authorization.                                                              | Relaciona User com provider/subject; vínculo externo depende de prova de controle conforme ADR-0004.                                 | ADR-0003 §2.2; ADR-0004 §2.1                    |
| **PasswordCredential**       | Credencial de senha derivada por hash; não é guardada no User nem em texto reversível/claro. O ADR-0004 especifica Argon2id. **Definido na fonte.**                | Auth/Authorization.                                                              | Associada à identidade/User para autenticação; separada do perfil.                                                                   | ADR-0003 §2.2; ADR-0004 §2.1 e §2.7             |
| **Role**                     | Conjunto nomeado de responsabilidades e escopo permitido; uma role é concessão candidata a permissões, não prova suficiente de autorização. **Definido na fonte.** | Auth/Authorization.                                                              | Relaciona-se a Permission via RolePermission e a uma atribuição global ou escolar.                                                   | ADR-0003 §2.2; ADR-0004 §2.1–2.4                |
| **Permission**               | Ação atômica sobre recurso, avaliada com escopo e contexto do recurso. **Definido na fonte.**                                                                      | Auth/Authorization.                                                              | Associada a Role; a autorização também verifica membership/atribuição, recurso e estado.                                             | ADR-0003 §2.2; ADR-0004 §2.1–2.4                |
| **SchoolMembership**         | Vínculo de acesso entre User e School; não é inscrição em turma. **Definido na fonte.**                                                                            | Auth/Authorization.                                                              | Leva `schoolId`; pode ter MembershipRoleAssignment. Diferente de Enrollment e ClassTeachingAssignment.                               | ADR-0002 §2.3; ADR-0003 §2.2–2.3; ADR-0004 §2.1 |
| **GlobalRoleAssignment**     | Concessão de papel global de plataforma, sem `schoolId`; escopo global não significa acesso irrestrito a todos os dados. **Definido na fonte.**                    | Auth/Authorization.                                                              | Atribui Role a User no escopo global; separada de membership escolar.                                                                | ADR-0003 §2.2; ADR-0004 §2.1–2.4                |
| **MembershipRoleAssignment** | Concessão de papel escolar ligada a uma SchoolMembership e limitada a `schoolId`. **Definido na fonte.**                                                           | Auth/Authorization.                                                              | Relaciona SchoolMembership e Role; não transfere autoridade a outra escola.                                                          | ADR-0003 §2.2–2.3; ADR-0004 §2.1–2.4            |

## 3. Contexto institucional

Fontes principais: ADR-0002 §2.3–2.6; ADR-0003 §2.2–2.3 e §2.5; ADR-0004 §2.4. “Responsável” abaixo é o owner identificado nas fontes, não uma nova atribuição.

| Termo                                            | Definição e status de evidência                                                                                                                                                        | Responsável / contexto owner                                                                                          | Relacionamentos                                                                                                                           | Fonte                                |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| **School**                                       | Instituição e ciclo de vida institucional; uma School representa o contexto escolar/tenant. **Definido na fonte.**                                                                     | Schools.                                                                                                              | Possui SchoolSettings/SchoolDomain conceituais; relaciona-se a Classes, SchoolMemberships e dados tenant-scoped por identificador.        | ADR-0002 §2.3; ADR-0003 §2.2–2.3     |
| **SchoolSettings**                               | Configurações institucionais pertencentes a uma única escola. **Definido no mapa conceitual; detalhe parcial.**                                                                        | Schools.                                                                                                              | Escopadas à School/`schoolId`; não são configuração global.                                                                               | ADR-0003 §2.2–2.3                    |
| **SchoolDomain**                                 | Domínio associado à instituição escolar. A semântica de verificação, unicidade ou uso não está detalhada. **Uso documentado; definição parcial.**                                      | Schools.                                                                                                              | Referencia School; nome aparece como `school_domains`/SchoolDomain.                                                                       | ADR-0003 §2.2–2.3                    |
| **Class**                                        | Grupo/turma organizado dentro de uma escola. **Definido na fonte.**                                                                                                                    | Classes.                                                                                                              | Pertence a School por `schoolId`; contém ClassEnrollment e ClassTeachingAssignment conforme modelo conceitual.                            | ADR-0002 §2.3; ADR-0003 §2.2–2.3     |
| **Enrollment / ClassEnrollment**                 | Matrícula/inscrição de estudante em uma turma; vínculo pedagógico distinto de acesso User-escola. **Definido na fonte.**                                                               | Classes.                                                                                                              | Liga Class, User/estudante e School; coerência de `schoolId` com turma é indicada no modelo conceitual.                                   | ADR-0002 §2.3; ADR-0003 §2.2–2.3     |
| **Teacher Assignment / ClassTeachingAssignment** | Atribuição docente a uma turma. **Uso documentado; definição parcial.**                                                                                                                | Classes.                                                                                                              | Relaciona Class e identidade docente; escopo escolar deve corresponder ao `schoolId` da turma. Regras detalhadas não estão especificadas. | ADR-0002 §2.3; ADR-0003 §2.2–2.3     |
| **Student Assignment**                           | Não aparece definido como conceito ou entidade separada nas fontes. A relação de estudante com turma é denominada Enrollment/ClassEnrollment. **Não definido como conceito autônomo.** | Classes para Enrollment; não há owner para um conceito separado “Student Assignment”.                                 | Não criar um segundo vínculo para a mesma relação sem decisão documentada.                                                                | ADR-0002 §2.3; ADR-0003 §2.2–2.3     |
| **Tenant**                                       | Conceito de negócio para o contexto institucional. O identificador oficial é `schoolId`; “tenant” não é nome de campo. **Definido na fonte.**                                          | Schools define a instituição; Auth/Authorization e módulos consumidores aplicam escopo conforme seus próprios owners. | A School representa o tenant escolar; dados institucionais e contratos levam `schoolId` quando aplicável.                                 | ADR-0002 §2.1–2.2; ADR-0003 §2.1–2.2 |
| **School Scope**                                 | Limite de autorização/dados associado a uma escola; a membership deve corresponder ao `schoolId` do recurso. **Definido por regra contextual, não como entidade.**                     | Auth/Authorization avalia acesso; cada módulo valida os próprios recursos.                                            | Contrasta com Global Scope; Class Scope é restrição adicional descrita no ADR-0004.                                                       | ADR-0002 §2.2; ADR-0004 §2.4         |
| **Global Scope**                                 | Escopo de concessão sem `schoolId`, com permissão global específica; não implica acesso universal a PII ou dados escolares. **Definido na fonte.**                                     | Auth/Authorization.                                                                                                   | Associado a GlobalRoleAssignment; distinto de School Scope e de roles editoriais limitadas.                                               | ADR-0003 §2.2; ADR-0004 §2.1–2.4     |

## 4. Conteúdo educacional

Fontes principais: ADR-0002 §2.3; ADR-0003 §2.2, §2.3 e §2.5.

| Termo                                  | Definição e status de evidência                                                                                                                                                                                               | Responsável / contexto owner                                                                               | Relacionamentos                                                                                                | Fonte                              |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| **Topic**                              | Conceito matemático da taxonomia, com hierarquia/pré-requisitos; tema raiz ou subtema pode ser representado pelo mesmo tipo Topic. **Definido na fonte.**                                                                     | Topics.                                                                                                    | Pode relacionar-se a Competency/Skill e a versões de Question; pré-requisitos não devem formar ciclos.         | ADR-0002 §2.3; ADR-0003 §2.3, §2.5 |
| **Competency**                         | Capacidade curricular/olímpica relacionada a um ou mais Topics. **Definido na fonte.**                                                                                                                                        | Topics/taxonomia.                                                                                          | Pode decompor-se em Skills; relaciona-se a QuestionVersion por vínculo.                                        | ADR-0003 §2.5                      |
| **Skill**                              | Ação observável que decompõe uma Competency; pode cruzar Topics e tem definição com fonte/versão. **Definido na fonte.**                                                                                                      | Topics/taxonomia.                                                                                          | Relaciona-se a Competency, Topic, QuestionVersion e SkillMastery.                                              | ADR-0003 §2.5–2.6                  |
| **Question**                           | Conteúdo curado: enunciado, alternativas, gabarito, explicação, nível e metadados. **Definido na fonte.**                                                                                                                     | Questions.                                                                                                 | Tem QuestionVersion; relaciona-se a Topics, Competencies, Skills e Sources.                                    | ADR-0002 §2.3; ADR-0003 §2.2–2.3   |
| **Question Version / QuestionVersion** | Versão do conteúdo da questão; versão publicada é imutável para preservar a interpretação e reprodução de resultados passados. **Definido conceitualmente.**                                                                  | Questions.                                                                                                 | Inclui opções/assets e vínculos taxonômicos/de fonte; é referenciada por Attempt/Exam snapshot.                | ADR-0003 §2.3, §2.5, §2.12         |
| **Question Publication**               | Registro conceitual de publicação da questão (`question_publications`). Estados, workflow editorial e transições não estão definidos de forma completa. **Uso documentado; definição parcial.**                               | Questions.                                                                                                 | Relaciona Question/QuestionVersion ao estado publicado; detalhes de autoria/aprovação estão fora do glossário. | ADR-0003 §2.2–2.3                  |
| **Question Source / Source**           | Documento, prova, gabarito ou referência editorial com edição/fase, identificador/URL, licença/proveniência e checksum quando aplicável. **Definido na fonte.**                                                               | Topics/taxonomia possui `sources`; Questions possui os vínculos `question_source_links`.                   | QuestionVersion associa-se à fonte por QuestionSourceLink; Source não é o enunciado da questão.                | ADR-0003 §2.2, §2.5                |
| **Taxonomy**                           | Catálogo global versionado de níveis, tópicos, competências, habilidades, edições/fases e referências oficiais; não se inventa hierarquia oficial que uma fonte da edição não define. **Definido na fonte.**                  | Topics/taxonomia.                                                                                          | Classifica QuestionVersion e liga conceitos com proveniência e vigência.                                       | ADR-0003 §2.2, §2.5                |
| **OBMEP Classification**               | Não há entidade autônoma com esse nome. A classificação documentada usa dimensões como nível, edição, fase, tema, competência, habilidade, fonte e dificuldade. **Não definido como conceito autônomo; dimensões definidas.** | Topics/taxonomia para referências; Questions para vínculos.                                                | Não usar como sinônimo de Topic ou como uma única hierarquia não documentada.                                  | ADR-0003 §2.5                      |
| **Difficulty Scale**                   | Escala identificada e versionada, ordinal ou probabilística; distingue dificuldade editorial, estimada pelo motor e observada empiricamente. **Definido na fonte.**                                                           | Topics/taxonomia cataloga a escala; QuestionVersion armazena/associa avaliação conforme modelo conceitual. | Relaciona-se à versão da questão; não há um único valor universal definido.                                    | ADR-0003 §2.2, §2.5                |

## 5. Aprendizagem

Fontes principais: ADR-0002 §2.3–2.6; ADR-0003 §2.2–2.3 e §2.6.

| Termo                                  | Definição e status de evidência                                                                                                                                                                                       | Responsável / contexto owner                                            | Relacionamentos                                                                                                                              | Fonte                                  |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| **Question Engine**                    | Capacidade que seleciona questões, monta conjuntos, aplica políticas de seleção e avalia respostas usando snapshots versionados. Não possui o conteúdo original nem o histórico de tentativas. **Definido na fonte.** | Question Engine.                                                        | Consulta Questions/Topics por contratos; avalia resposta para Attempts; pode consumir estatísticas de Analytics.                             | ADR-0002 §2.3–2.6; ADR-0003 §2.6       |
| **Attempt**                            | Execução de uma atividade avaliativa e registro de respostas/resultados; após finalização é imutável, salvo anotação auditada conforme conceito do agregado. **Definido na fonte.**                                   | Attempts.                                                               | Contém AttemptAnswers; referencia learner/User, questão/versão, atividade e `schoolId` quando escolar; consome avaliação do Question Engine. | ADR-0002 §2.3; ADR-0003 §2.2–2.3       |
| **Attempt Answer / AttemptAnswer**     | Resposta fornecida dentro de Attempt; respostas brutas pertencem a Attempts e não são copiadas pelo Question Engine. **Definido na fonte.**                                                                           | Attempts.                                                               | Relaciona Attempt a QuestionVersion/snapshot e resultado categorizado; detalhes do formato de resposta não são definidos no glossário.       | ADR-0003 §2.3, §2.6; ADR-0002 §2.3     |
| **Study Path**                         | Percurso individual de aprendizagem com objetivos, etapas, progresso, recomendações aceitas e conclusão versionada. **Definido na fonte.**                                                                            | Study Paths.                                                            | Relaciona-se a User/learner, School quando institucional, template/steps e eventos de Attempts/Mock Exams.                                   | ADR-0002 §2.3, §2.6; ADR-0003 §2.2–2.3 |
| **Study Path Step**                    | Etapa de um template ou percurso; pode referenciar conteúdo/skills e um estado/progresso associado. **Definido conceitualmente; sem lifecycle completo.**                                                             | Study Paths.                                                            | Pertence a StudyPathTemplate ou StudyPath; relações concretas dependem do modelo conceitual do ADR-0003.                                     | ADR-0003 §2.2–2.3                      |
| **Study Path Progress**                | Progresso associado à execução de StudyPath, potencialmente resumido/materializado. **Uso documentado; definição parcial.**                                                                                           | Study Paths para o progresso canônico; Analytics pode manter projeções. | Relaciona StudyPath, etapas e eventos de conclusão; não é sinônimo de Analytics StudentProgress.                                             | ADR-0002 §2.3; ADR-0003 §2.2–2.3       |
| **Learning Pattern**                   | Padrão derivado, como consistência, ritmo ou tópicos em evolução, com intervalo de evidência, confiança e versão de cálculo; descartável/recalculável. **Definido na fonte.**                                         | Question Engine.                                                        | Deriva de evidências de aprendizagem; associado a AdaptiveProfile conceitualmente.                                                           | ADR-0003 §2.2–2.3, §2.6                |
| **Adaptive Profile / AdaptiveProfile** | Estado pedagógico materializado para estudante e escola, versionado por perfil/algoritmo e ligado à última evidência processada; não replica PII. **Definido na fonte.**                                              | Question Engine.                                                        | Associado a User + `schoolId`; contém/relaciona LearningPattern, SkillMastery e ErrorPattern.                                                | ADR-0003 §2.2–2.3, §2.6                |
| **Skill Mastery / SkillMastery**       | Estimativa de domínio por aluno, escola e habilidade, com score/confidence, evidência e versão do algoritmo; não é nota oficial nem verdade imutável. **Definido na fonte.**                                          | Question Engine.                                                        | Relaciona AdaptiveProfile e Skill; deriva de evidência de aprendizagem.                                                                      | ADR-0003 §2.3, §2.6                    |
| **Error Pattern / ErrorPattern**       | Categoria de erro detectada a partir de resposta/feedback; não é diagnóstico sensível. **Definido na fonte.**                                                                                                         | Question Engine.                                                        | Deriva de evidência de resposta/feedback e associa-se a estado adaptativo; acesso/retention precisam de política.                            | ADR-0003 §2.3, §2.6                    |

## 6. Avaliação

Fontes principais: ADR-0002 §2.3 e catálogo de eventos; ADR-0003 §2.2–2.3; ADR-0004 para escopo de autorização. Termos sem definição própria permanecem marcados como tal.

| Termo                 | Definição e status de evidência                                                                                                                                                                                                                                   | Responsável / contexto owner                                                                                          | Relacionamentos                                                                                                  | Fonte                                       |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| **Mock Exam**         | Simulado cuja configuração/blueprint é versionada, podendo ser global ou escolar; a sessão do aluno é separada. **Definido na fonte.**                                                                                                                            | Mock Exams.                                                                                                           | MockExamVersion fixa ordem/critério/snapshots; MockExamSession registra execução; relaciona-se a Attempts.       | ADR-0002 §2.3; ADR-0003 §2.2–2.3            |
| **Mock Exam Version** | Versão publicada de um simulado que fixa ordem, critérios e snapshots de questões. **Definido na fonte.**                                                                                                                                                         | Mock Exams.                                                                                                           | Referenciada por MockExamItems e MockExamSession; mudanças posteriores não alteram a versão usada.               | ADR-0003 §2.3                               |
| **Mock Exam Session** | Execução de um simulado por aluno; pertence a uma escola no modelo conceitual e tem estado/tempo de conclusão. **Definido na fonte.**                                                                                                                             | Mock Exams.                                                                                                           | Referencia MockExamVersion, User e Attempts.                                                                     | ADR-0003 §2.3                               |
| **Evaluation**        | O Question Engine avalia uma resposta contra o snapshot/critério; `AnswerEvaluated` pode ser resultado síncrono ou evento conforme contrato. Não há agregado/entidade Evaluation autônoma definida. **Uso documentado; não definido como entidade independente.** | Question Engine para a avaliação; Attempts para registrar tentativa/resposta/resultado.                               | Entrada: resposta + versão/snapshot; saída: critério/resultado para Attempts.                                    | ADR-0002 §2.3, §2.6; ADR-0003 §2.6          |
| **Result**            | Resultado/saída de Attempt ou MockExam é referenciado conceitualmente, inclusive por `resultadoRef`; sem estrutura universal ou semântica única definida. **Uso documentado; definição parcial.**                                                                 | Attempts para resultado de tentativa; Mock Exams para resultado da sessão; detalhes não unificados.                   | Pode ser referenciado por `AttemptCompleted`/`MockExamCompleted`; não criar Result como entidade sem fonte.      | ADR-0002 catálogo de eventos; ADR-0003 §2.3 |
| **Score**             | Valor/medida de resultado mencionado em eventos e em SkillMastery; não há fórmula, escala ou regra de pontuação universal definida nas fontes. **Uso documentado; definição parcial.**                                                                            | Attempts/atividade de origem para resultado oficial; SkillMastery é estimativa do Question Engine e não nota oficial. | Não confundir Score oficial com SkillMastery ou Confidence; regras de pontuação permanecem fora deste glossário. | ADR-0002 §2.3; ADR-0003 §2.6                |
| **Completion**        | Fato de conclusão expresso por eventos específicos, como AttemptCompleted, MockExamCompleted, StudyPathCompleted e ChampionshipFinished. Não há entidade/estado universal `Completion`. **Definido como fatos de domínio específicos; não como conceito único.**  | Módulo produtor do objeto concluído.                                                                                  | Pode ser consumido por Rankings/Badges/Certificates/Analytics conforme contrato.                                 | ADR-0002 §2.3, catálogo de eventos          |

## 7. Competição

Fontes principais: ADR-0002 §2.3, §2.6 e eventos; ADR-0003 §2.2–2.3.

| Termo                         | Definição e status de evidência                                                                                                                                                  | Responsável / contexto owner | Relacionamentos                                                                                                                         | Fonte                                |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| **Championship**              | Competição com regras, elegibilidade, inscrição e ciclo de vida; regras/versionamento congelados ao iniciar segundo o modelo conceitual. **Definido na fonte.**                  | Championships.               | Tem ChampionshipVersion/entries; considera Attempts elegíveis; publica fatos consumidos por Rankings, Badges, Certificates e Analytics. | ADR-0002 §2.3; ADR-0003 §2.2–2.3     |
| **Championship Version**      | Versão das regras de Championship; regra/versionamento é congelado ao iniciar. **Definido conceitualmente.**                                                                     | Championships.               | Associada a Championship; participantes/resultados referem versão/regra pertinente.                                                     | ADR-0003 §2.2–2.3                    |
| **Entry / ChampionshipEntry** | Registro conceitual de participação/inscrição no campeonato (`championship_entries`). **Uso documentado; definição parcial.**                                                    | Championships.               | Relaciona Championship, participante/User e escopo escolar quando aplicável; elegibilidade detalhada não é definição deste glossário.   | ADR-0002 §2.3; ADR-0003 §2.2–2.3     |
| **Ranking**                   | Classificação/projeção produzida a partir de fatos elegíveis com escopo e desempate declarados; não é autoridade sobre Attempts nem recebe escrita deles. **Definido na fonte.** | Rankings.                    | Consome eventos de Attempts/Championships; expõe definição, snapshots e entries.                                                        | ADR-0002 §2.3–2.6; ADR-0003 §2.2–2.3 |
| **Ranking Snapshot**          | Projeção versionada de uma definição de ranking em um instante/recorte; read model, não fato autoritativo de tentativa. **Definido conceitualmente.**                            | Rankings.                    | RankingDefinition produz RankingSnapshot; este contém RankingEntries.                                                                   | ADR-0003 §2.2–2.3                    |
| **Ranking Entry**             | Linha/projeção de participante em um snapshot de ranking. Não é agregado canônico nem evidência de Attempt. **Definido na fonte como read model.**                               | Rankings.                    | Relaciona RankingSnapshot e User/participant, escopo e período.                                                                         | ADR-0003 §2.3; ADR-0002 §2.3         |
| **Badge**                     | Reconhecimento definido por regras e concedido a partir de fatos elegíveis; BadgeDefinition e BadgeAward são diferenciados. **Definido na fonte.**                               | Badges.                      | Pode consumir eventos de Attempts, Study Paths, Mock Exams, Championships e Rankings; concessão deve ser idempotente/evidenciada.       | ADR-0002 §2.3; ADR-0003 §2.2–2.3     |
| **Badge Award**               | Concessão de Badge a participante, com escopo/evidência e possível revogação registrada. **Definido conceitualmente.**                                                           | Badges.                      | Relaciona BadgeDefinition, User/participant e BadgeEvidence.                                                                            | ADR-0003 §2.2–2.3                    |
| **Certificate**               | Evidência emitida, verificável e revogável de uma conquista/conclusão; não pode derivar sua verdade de Analytics. **Definido na fonte.**                                         | Certificates.                | Baseia-se em eventos autoritativos de conclusão e CertificateEvidence; registra emissão/validade/revogação.                             | ADR-0002 §2.3–2.6; ADR-0003 §2.2–2.3 |
| **Certificate Evidence**      | Referência/evidência que sustenta a emissão de certificado; evidência é imutável no conceito do agregado. **Definido conceitualmente.**                                          | Certificates.                | Relaciona Certificate a fatos/eventos de conclusão; Analytics não é evidência autoritativa.                                             | ADR-0002 §2.3–2.6; ADR-0003 §2.3     |

## 8. Analytics

Fontes principais: ADR-0002 §2.3–2.6; ADR-0003 §2.2–2.3 e §2.7; ADR-0005 para composição frontend. Métricas e projeções são propostas nos ADRs, não comprovação operacional.

| Termo                   | Definição e status de evidência                                                                                                                                                                                                     | Responsável / contexto owner                                                                                                                               | Relacionamentos                                                                                        | Fonte                                                              |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| **Analytics**           | Contexto transversal de projeções de leitura, agregações, métricas e relatórios; não é fonte de verdade transacional nem deve bloquear fluxo crítico. **Definido na fonte.**                                                        | Analytics.                                                                                                                                                 | Consome eventos autorizados; mantém projeções/read models; fornece consultas autorizadas.              | ADR-0002 §2.3–2.6; ADR-0003 §2.2, §2.7                             |
| **Metric**              | Indicador/agregado com dimensão, janela, definição e versão/frescor quando aplicável; nem toda métrica tem dicionário/denominador definido nas fontes. **Uso documentado; definição parcial.**                                      | Analytics para métricas analíticas; domínio produtor para fato/semântica autoritativa.                                                                     | Pode alimentar dashboard/report; `question_statistics` é de Analytics e o Engine consome snapshot.     | ADR-0002 §2.3; ADR-0003 §2.6–2.7                                   |
| **Projection**          | Estrutura derivada de eventos/dados autorizados, atualizável/reconstruível e eventualmente consistente; não é fonte transacional de verdade. **Definido na fonte.**                                                                 | Módulo dono da projeção; Analytics, Rankings e outros consumers mantêm suas próprias projeções.                                                            | Tem versão/instante/cursor de origem conforme ADR-0009/ADR-0003; lê fatos de módulos produtores.       | ADR-0002 §2.3–2.6; ADR-0003 §2.7                                   |
| **Dashboard**           | Visão apresentada a perfis de aluno/professor/coordenador/administrador nos documentos de produto/analytics; componentes e modelo de autorização são tratados separadamente. **Uso documentado; definição parcial.**                | Não há owner de domínio de Dashboard definido; Analytics fornece projeções/relatórios e frontend compõe a UI.                                              | Consome métricas/projeções autorizadas; não é fonte de verdade.                                        | ADR-0009; ADR-0005 §1–2                                            |
| **Educational Insight** | Expressão de analytics educacional/insight aparece como objetivo; não há definição canônica distinta de Metric, LearningPattern ou recomendação adaptativa. **Não definido como conceito autônomo.**                                | Não definido como owner separado; Analytics e Question Engine têm papéis documentados distintos.                                                           | Não usar como entidade ou substituir LearningPattern/Recommendation sem decisão documentada.           | ADR-0002 §2.3; ADR-0009                                            |
| **Telemetry**           | Dados/instrumentação operacional (latência, erros, CPU, DB, filas) são distinguidos de analytics educacional; OpenTelemetry é padrão de instrumentação nas fontes. **Definido em nível de categoria; detalhe operacional parcial.** | Platform/Infrastructure owners instrumentam runtime; cada módulo é dono de métricas/spans de sua fronteira; Analytics mede frescor/qualidade de projeções. | Não se confunde com progresso/desempenho educacional nem autoriza exportar PII.                        | ADR-0003 §2.7; ADR-0005 §2.11; ADR-GOVERNANCE apenas para processo |
| **Read Model**          | Modelo de leitura derivado/projetado, potencialmente reconstruível; distinto de agregado/fonte de verdade. **Definido na fonte.**                                                                                                   | Contexto que possui a projeção; Analytics para suas projeções, Rankings para classificações.                                                               | Alimentado por eventos; pode ser servido a dashboards/relatórios; não escreve nos domínios produtores. | ADR-0002 §2.3–2.6; ADR-0003 §2.3, §2.7                             |
| **Event Projection**    | Projeção construída por consumer a partir de eventos. É uso documentado de projeções/consumidores; não há tipo formal separado com contrato completo. **Uso documentado; definição parcial.**                                       | Consumer/módulo owner da projeção resultante.                                                                                                              | Usa Domain/Integration Events; registra versão/frescor/cursor quando aplicável.                        | ADR-0002 §2.3–2.6; ADR-0003 §2.7–2.8                               |

## 9. Eventos e integração

Fontes principais: ADR-0002 §2.3–2.7; ADR-0003 §2.2, §2.8; ADR-0005 para correlation/context. Os contratos são conceituais e não definem APIs ou implementação.

| Termo                               | Definição e status de evidência                                                                                                                                                                                                                  | Responsável / contexto owner                                                                                  | Relacionamentos                                                                                                     | Fonte                                  |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| **Domain Event**                    | Fato passado declarado pelo módulo produtor após o fato ocorrer; o produtor é a autoridade para declarar o fato. Envelope/payload conceitual é descrito no ADR-0002. **Definido na fonte.**                                                      | Módulo owner do fato.                                                                                         | Pode alimentar consumers/projeções; não concede autorização e não transfere ownership.                              | ADR-0002 §2.3, §2.7                    |
| **Integration Event**               | ADR-0002 usa “eventos de domínio/integração”, mas não define formalmente uma taxonomia distinta, transformação ou contrato separado entre os dois termos. **Não definido como conceito separado.**                                               | Não há owner adicional definido; produtor é owner do fato conforme ADR-0002.                                  | Não presumir que todo Domain Event e Integration Event sejam sinônimos ou eventos distintos sem decisão documental. | ADR-0002 §2.1–2.3, §2.7                |
| **Outbox**                          | Registro/envelope de evento criado pelo módulo produtor na mesma transação do fato crítico e despachado após commit quando requerido; não é event store completo. **Definido na fonte.**                                                         | Infraestrutura de integração com evento atribuído ao módulo produtor; ownership físico detalhado em ADR-0003. | Relaciona persistência transacional do fato e publicação; complementar a Inbox.                                     | ADR-0002 §2.5–2.7; ADR-0003 §2.2, §2.8 |
| **Inbox**                           | Registro do resultado de consumo por consumidor/eventId, usado para deduplicação e tentativas/erros categorizados. **Definido na fonte.**                                                                                                        | Consumer/integração; módulo consumidor mantém sua idempotência.                                               | Relaciona Event, Consumer e resultado; coordena reprocessamento sem efeitos duplicados.                             | ADR-0002 §2.7; ADR-0003 §2.8           |
| **Consumer**                        | Componente que recebe eventos, aplica política própria, processa de forma idempotente e registra resultado/cursor. **Definido na fonte.**                                                                                                        | Módulo consumidor/owner da projeção ou efeito.                                                                | Recebe de Producer/event bus; usa Inbox/Checkpoint quando adotados.                                                 | ADR-0002 §2.3–2.7                      |
| **Producer**                        | Módulo autorizado a declarar/publicar um fato ocorrido de seu domínio; consumidores não adquirem essa autoridade. **Definido na fonte.**                                                                                                         | Módulo owner do fato.                                                                                         | Publica eventos para Consumers; pode registrar no Outbox.                                                           | ADR-0002 §2.3, §2.7                    |
| **Checkpoint / ConsumerCheckpoint** | Cursor/offset por consumidor e partição/chave ordenada; não implica ordenação global. **Definido na fonte.**                                                                                                                                     | Events/integração; consumer usa seu checkpoint.                                                               | Relaciona Consumer com progresso de processamento/replay.                                                           | ADR-0003 §2.2, §2.8                    |
| **Schema Version / schemaVersion**  | Versão do schema/payload do evento no envelope; ADR-0002 exige o campo, mas regras de compatibilidade ainda são lacuna. **Definido como campo; governança parcial.**                                                                             | Producer/provider do evento para declarar; provider/consumer coordenam compatibilidade.                       | Relaciona EventType e versões suportadas pelo Consumer.                                                             | ADR-0002 §2.7; ADR-0003 §2.8           |
| **Idempotency / Idempotência**      | Propriedade pela qual duplicidade/reprocessamento não produz efeitos de negócio duplicados; ADR-0002 requer consumers idempotentes e tolerância a entrega duplicada/fora de ordem. **Definido como requisito; chave/política uniforme parcial.** | Consumer para processamento; produtor/use case para comandos idempotentes conforme contrato.                  | Relaciona-se a Inbox, eventId e, para comandos, idempotencyKey.                                                     | ADR-0002 §2.3, §2.6–2.7                |

## 10. Terminologia de governança

**Status de evidência:** as definições de lifecycle/papéis abaixo estão propostas em ADR-GOVERNANCE, que ainda está Proposed. Não passam a ser política oficial só por estarem neste glossário.

| Termo                                   | Definição conforme governança proposta                                                                                                                                                                                                           | Responsável/contexto                                                   | Fonte                                                 |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- | ----------------------------------------------------- |
| **ADR (Architectural Decision Record)** | Registro versionado de contexto, decisão, consequências, riscos, alternativas, relações, aprovação e reconsideração; status não substitui evidência de aceite.                                                                                   | Owner mantém; Architecture Lead mantém processo; deciders decidem.     | ADR-GOVERNANCE §1–8; ADR-TEMPLATE                     |
| **Draft**                               | Rascunho preparatório; não é decisão aceita nem orientação normativa.                                                                                                                                                                            | Owner/autor; Architecture Lead verifica passagem a Proposed.           | ADR-GOVERNANCE §3                                     |
| **Proposed**                            | Proposta submetida a avaliação; não autoriza uso como baseline aprovada.                                                                                                                                                                         | Owner propõe; deciders avaliam.                                        | ADR-GOVERNANCE §3                                     |
| **Accepted**                            | Decisão aprovada por deciders identificados, com evidências, checklist concluída e índice atualizado.                                                                                                                                            | Deciders aprovam; Architecture Lead registra.                          | ADR-GOVERNANCE §3–5                                   |
| **Superseded**                          | ADR aceito total/parcialmente substituído por um sucessor Accepted; predecessor permanece histórico.                                                                                                                                             | Deciders dos ADRs afetados; Architecture Lead registra relações.       | ADR-GOVERNANCE §3 e §6                                |
| **Deprecated**                          | Decisão aceita retirada sem substituto integral; não deve orientar novas decisões no escopo retirado.                                                                                                                                            | Deciders do ADR; Architecture Lead registra.                           | ADR-GOVERNANCE §3 e §6                                |
| **Rejected**                            | Proposta avaliada e recusada; não é decisão vigente; razão e decisão ficam no histórico.                                                                                                                                                         | Deciders nomeados.                                                     | ADR-GOVERNANCE §3                                     |
| **Architecture Lead**                   | Responsável proposto pelo processo ADR, completude, facilitação, rastreabilidade e atualização do índice após decisão; não aprova unilateralmente.                                                                                               | Processo de arquitetura.                                               | ADR-GOVERNANCE §2 e §10                               |
| **Tech Lead**                           | Revisor de coerência/impacto técnico; pode ser decider quando nomeado no ADR.                                                                                                                                                                    | Revisão técnica e dependências.                                        | ADR-GOVERNANCE §2 e §4                                |
| **Reviewer**                            | Participante que emite parecer sobre o escopo; não é automaticamente decider/aprovador.                                                                                                                                                          | Papel/função indicada em cada ADR; Security Reviewer quando aplicável. | ADR-GOVERNANCE §2–4                                   |
| **Decider**                             | Pessoa/função formalmente nomeada no ADR com autoridade para aprovar/rejeitar a decisão; exige resposta explícita.                                                                                                                               | Decisão do ADR específico.                                             | ADR-GOVERNANCE §2–5                                   |
| **Stakeholder**                         | Parte afetada/consultada que fornece requisitos/impactos; só aprova quando nomeada como decider.                                                                                                                                                 | Área afetada.                                                          | ADR-GOVERNANCE §2                                     |
| **Sign-Off**                            | Registro explícito de resultado por decider, com nome/função, data e ressalvas/objeções; não equivale à presença ou silêncio.                                                                                                                    | Deciders; Architecture Lead registra.                                  | ADR-GOVERNANCE §4–5                                   |
| **Ratification / Ratificação**          | Confirmação formal, pelos deciders, da decisão e do texto/escopo submetidos; não é status ADR separado nem aprovação automática de ADRs filhos. **Interpretação operacional recomendada**, pois o lifecycle não define Ratification como estado. | Deciders do ADR; Architecture Lead registra.                           | ADR-GOVERNANCE §3–5; processo de ratificação ADR-0001 |

## 11. Matriz de ambiguidades

| Termos                                  | Definição correta segundo fontes                                                                                                                          | Erro comum                                                                             | Recomendação de uso                                                                                                               |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Membership vs Enrollment                | SchoolMembership concede vínculo de acesso User–School; Enrollment/ClassEnrollment é vínculo pedagógico Student–Class.                                    | Tratar matrícula em turma como membership de autorização ou o inverso.                 | Sempre qualificar SchoolMembership ou ClassEnrollment; owner documentado é Auth/Authorization e Classes, respectivamente.         |
| School vs Tenant                        | School é a instituição; Tenant é conceito de negócio para o contexto escolar. `schoolId` é identificador, “tenantId” não é campo canônico ativo.          | Tratar Tenant como entidade duplicada de School ou usar tenant como nome de campo.     | Usar School para entidade e tenant somente para conceito/escopo; usar `schoolId` nos contextos escolares.                         |
| Role vs Permission                      | Role agrupa responsabilidades/escopo; Permission é ação atômica sobre recurso.                                                                            | Usar Role como permissão atômica ou como prova suficiente de autorização.              | Distinguir Role, Permission, atribuição e verificação contextual no servidor.                                                     |
| Attempt vs Evaluation                   | Attempt é execução/registro de atividade em Attempts; Evaluation é operação/resultado da avaliação pelo Question Engine e não entidade autônoma definida. | Criar ou usar Evaluation como sinônimo do Attempt.                                     | Dizer “Attempt” para execução registrada e “avaliação da resposta” para operação; não criar Evaluation entity por este glossário. |
| Question vs QuestionVersion             | Question é identidade/conteúdo curado; QuestionVersion é versão imutável publicada usada para reproduzir seleção/resultado.                               | Alterar conteúdo histórico como se a questão não tivesse versões.                      | Referenciar versão em snapshots de Attempt/Mock Exam quando a versão for relevante.                                               |
| Question Source vs Question Source Link | Source é catálogo/proveniência documental; QuestionSourceLink associa fonte à versão da questão.                                                          | Chamar o vínculo e a fonte documental pelo mesmo conceito.                             | Usar Source para documento/prova e QuestionSourceLink para relação.                                                               |
| Topic vs Competency vs Skill            | Topic classifica/pré-requisitos; Competency é capacidade curricular/olímpica; Skill é ação observável que decompõe Competency.                            | Reduzir tudo a tags livres ou usar como sinônimos.                                     | Usar IDs/referências taxonômicas versionadas conforme ADR-0003; não criar hierarquia oficial sem fonte.                           |
| Question Publication vs QuestionVersion | Publication é registro conceitual do ato/estado de publicar; QuestionVersion é conteúdo versionado. Lifecycle detalhado não está definido.                | Supor que são a mesma entidade ou inferir fluxo editorial completo.                    | Manter os termos distintos e marcar workflow como lacuna.                                                                         |
| Score vs SkillMastery                   | Score é termo genérico de resultado sem fórmula comum definida; SkillMastery é estimativa adaptativa, não nota oficial.                                   | Tratar estimativa de domínio como nota/resultado oficial.                              | Especificar contexto e fonte ao usar score; não usar SkillMastery como pontuação oficial.                                         |
| Ranking vs Analytics                    | Rankings projeta standings competitivos; Analytics possui métricas/relatórios e não é fonte de verdade de Rankings.                                       | Tratar relatório/RankingMetrics como autoridade de ranking.                            | Identificar owner da projeção e distinguir RankingEntry/Snapshot de métrica analítica.                                            |
| Domain Event vs Integration Event       | ADR-0002 usa os termos relacionados, mas não define classes/contratos separados.                                                                          | Presumir que são idênticos ou que possuem envelopes diferentes.                        | Usar “evento” genericamente ou o tipo concreto do catálogo; diferença formal permanece pendente.                                  |
| Outbox vs Event Store                   | Outbox registra/publica eventos operacionais e não é event store completo nem fonte histórica canônica dos agregados.                                     | Chamar `domain_events` de armazenamento completo/event sourcing.                       | Usar Outbox/event archive conforme contexto; não afirmar Event Sourcing.                                                          |
| Consumer vs Producer                    | Producer declara fato do domínio que possui; Consumer reage/processa com ownership próprio.                                                               | Fazer consumidor declarar ou reescrever fato de outro módulo.                          | Identificar o Producer autoritativo e Consumers em cada contrato de evento.                                                       |
| Global Scope vs School Scope            | Global Scope é concessão explícita sem `schoolId`; School Scope vincula autorização a membership e recurso da mesma escola.                               | Interpretar global como acesso universal ou confiar em `schoolId` recebido do cliente. | Declarar scope e validar no owner/servidor; global role não implica acesso universal a dados.                                     |
| MockExam vs MockExamSession             | MockExam/versão descreve blueprint/conteúdo configurado; MockExamSession é execução individual.                                                           | Tratar sessão como definição/versionamento do simulado.                                | Usar MockExam para definição e Session para execução do aluno.                                                                    |
| Completion vs Result                    | Completion é fato de ciclo de vida específico (AttemptCompleted, MockExamCompleted etc.); Result é saída/referência sem modelo universal definido.        | Tratar conclusão e resultado como o mesmo estado/entidade.                             | Usar evento/termo específico e evitar “Completion” ou “Result” genéricos sem contexto.                                            |
| Profile vs AuthAccount                  | Profile contém dados de produto; AuthAccount vincula identidade/provider.                                                                                 | Guardar credenciais/provider dentro do perfil.                                         | Perfil pertence a Users; conta de autenticação pertence a Auth/Authorization.                                                     |
| SchoolDomain vs Tenant Domain           | `school_domains` é nome no catálogo conceitual de Schools; semântica operacional não está detalhada.                                                      | Supor política de domínio/verificação não descrita.                                    | Usar SchoolDomain apenas para referir o registro conceitual até haver definição aprovada.                                         |

## 12. Termos e nomenclaturas a evitar como canônicos

“Proibido” nesta seção significa **não usar como termo oficial para nomear conceitos/atributos no vocabulário corrente**. Não significa apagar ocorrências históricas ou citar esses termos ao explicar conflitos.

| Termo/nomenclatura a evitar                                                  | Forma canônica/uso                                                                 | Motivo e evidência                                                                                                                                    |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tenantId` como nome de campo escolar                                        | `schoolId`; tenant permanece conceito                                              | ADR-0002 define `schoolId` como identificador oficial e declara que tenant não é nome de campo. `tenantId` aparece em material diagnóstico histórico. |
| `Student Assignment` como conceito separado de matrícula de turma            | `Enrollment` / `ClassEnrollment`                                                   | As fontes definem matrícula como Enrollment e não descrevem entidade Student Assignment separada.                                                     |
| Membership para matrícula em Class                                           | `Enrollment` / `ClassEnrollment`                                                   | Membership é vínculo de acesso User–School em Auth; matrícula de turma pertence a Classes.                                                            |
| `User.role` ou `User.schoolId` como autoridade de acesso                     | RoleAssignment/SchoolMembership + escopo validado; User permanece global           | ADR-0003/0004 corrigem o modelo legado de role/escola única no User.                                                                                  |
| `User.password` / credencial dentro de Profile                               | `PasswordCredential` no contexto Auth                                              | ADR-0004 separa credenciais do perfil e proíbe senha clara/reversível.                                                                                |
| `Question.competency` ou tags livres como taxonomia oficial                  | `Topic`, `Competency`, `Skill` e links/versionamento documentados                  | ADR-0003 registra o legado como ambíguo e define referências taxonômicas versionadas; modelo físico/import ainda pendentes.                           |
| Query cache/estado cliente como fonte canônica de domínio                    | Estado do módulo/servidor; cache é snapshot descartável conforme proposta ADR-0005 | ADR-0007 está Superseded; ADR-0005 é a proposta canônica atual.                                                                                       |
| Analytics como owner de Attempts, Rankings, Questions ou fonte de resultados | Analytics possui projeções/métricas próprias; domínio de origem mantém a verdade   | ADR-0002/0003 delimitam ownership e read models.                                                                                                      |
| `domain_events` como Event Store completo ou prova de Event Sourcing         | Outbox/eventos de integração, não Event Sourcing                                   | ADR-0003 declara explicitamente que armazenamento de eventos é outbox/inbox/trilha operacional, não event sourcing.                                   |
| `deletedAt` como política de exclusão/retention                              | Termo não substitui política de retenção, expurgo ou anonimização aprovada         | ADR-0003 alerta que o campo, por si, não é garantia legal/removal.                                                                                    |
| `Evaluation` como entidade/aggregate oficial                                 | “Avaliação da resposta” como operação do Question Engine, até definição aprovada   | Fontes descrevem `AnswerEvaluated`/contrato, não entidade Evaluation autônoma.                                                                        |
| `Result`, `Score`, `Completion` sem qualificador                             | Nomear o contexto/evento específico; definições genéricas seguem parciais          | Não existe fórmula/modelo universal para esses termos nas fontes.                                                                                     |
| “OBMEPClassification” como entidade independente                             | Dimensões taxonômicas documentadas: nível, edição, fase, tópico etc.               | ADR-0003 não cria uma entidade singular com esse nome; não inventar hierarquia.                                                                       |
| `Event Store` para Outbox/Inbox                                              | Outbox, Inbox, eventos/projeções, conforme estrutura citada                        | Outbox/inbox não constitui event sourcing nem histórico canônico completo.                                                                            |
| Termos de propostas frontend superseded como norma atual                     | ADR-0005 canônico para estado/BFF; 0006–0008 e ADR-0005 state-only são históricos  | Status documentado no `INDEX.md`; não apagar referências históricas.                                                                                  |

## 13. Dicionario de relacionamentos

As setas representam relações conceituais documentadas, não FKs físicas nem cardinalidades finais. Relações marcadas “proposta” refletem ADRs ainda Proposed.

### Identidade e instituição

```text
User
  ↓ tem perfil de produto
Profile

User
  ↓ autentica por
AuthAccount / PasswordCredential

User
  ↓ obtém acesso a escola por
SchoolMembership

SchoolMembership
  ↓ recebe papel no escopo escolar por
MembershipRoleAssignment → Role → Permission

User
  ↓ recebe papel global por
GlobalRoleAssignment → Role → Permission

School
  ↓ representa o contexto institucional/tenant de
schoolId

School
  ↓ organiza
Class
  ↓ contém vínculo de estudante por
Enrollment

Class
  ↓ tem docentes associados por
Teacher Assignment / ClassTeachingAssignment
```

**Motivo:** ADR-0002–0004 separam identidade global, concessão de acesso à escola e participação/atribuição em turma. Owners conceituais: Users; Auth/Authorization; Schools; Classes.

### Conteúdo

```text
Taxonomy
  ↓ organiza
Topic → prerequisite Topic
  ↓ relaciona-se com
Competency → decompõe-se em Skill

Question
  ↓ possui versões publicadas
QuestionVersion
  ↓ classifica-se/relaciona-se com
Topic / Competency / Skill / Difficulty Scale
  ↓ referencia
Source por QuestionSourceLink
```

**Motivo:** ADR-0003 usa taxonomia versionada, referências N:N e versões de questão para preservar proveniência e reprodução. Owners conceituais: Topics e Questions.

### Aprendizagem e avaliação

```text
Question Engine
  ↓ seleciona/avalia usando
QuestionVersion snapshot
  ↓ fornece avaliação a
Attempt
  ↓ contém
AttemptAnswer

Attempt / evidências de aprendizagem
  ↓ atualizam/projetam
AdaptiveProfile
  ↓ relaciona
LearningPattern / SkillMastery / ErrorPattern

StudyPath
  ↓ contém
StudyPathStep
  ↓ possui progresso por
StudyPathProgress

MockExam
  ↓ versiona blueprint por
MockExamVersion
  ↓ abre execução individual
MockExamSession
  ↓ referencia
Attempts
```

**Motivo:** Engine seleciona/avalia, Attempts mantém respostas e tentativas, Study Paths mantém percurso e progresso, Mock Exams mantém definição/sessão. Evaluation, Result e Score genéricos não formam entidades definidas.

### Competição e reconhecimento

```text
Championship
  ↓ versiona regras em
ChampionshipVersion
  ↓ registra participantes em
Entry

Attempts elegíveis + eventos de Championship
  ↓ alimentam
RankingSnapshot
  ↓ contém
RankingEntry

Fatos elegíveis
  ↓ são avaliados por
BadgeDefinition
  ↓ resultam em
BadgeAward → BadgeEvidence

Fatos autoritativos de conclusão
  ↓ sustentam
Certificate → CertificateEvidence
```

**Motivo:** Rankings, Badges e Certificates reagem a fatos elegíveis; projeções/analytics não substituem domínio produtor. Owners conforme ADR-0002/0003.

### Analytics e eventos

```text
Producer / módulo owner
  ↓ publica fato após commit por
Outbox (quando requerido)
  ↓ entrega evento a
Consumer
  ↓ registra deduplicação/resultado em
Inbox
  ↓ avança por
ConsumerCheckpoint
  ↓ deriva
Projection / Read Model / Metric
  ↓ pode alimentar
Dashboard / Report
```

**Motivo:** evento é fato do produtor; projeção é responsabilidade de seu consumer/owner. Outbox não é Event Store completo; Dashboard não é fonte de verdade.

### Governança

```text
ADR Draft
  ↓ submetido como
Proposed
  ↓ deciders aprovam com evidência
Accepted
  ↓ pode ser retirado sem sucessor como
Deprecated
  ou substituído por ADR Accepted → predecessor Superseded

Reviewer
  ↓ emite parecer para
Deciders
  ↓ registram
Sign-Off / decisão
  ↓ confirma formalmente escopo/decisão por
Ratification
```

**Motivo:** lifecycle e papéis são definidos na proposta ADR-GOVERNANCE e só serão oficiais após ratificação dessa própria governança.

## 14. Validação de consistência

Classificação abaixo mede risco de terminologia/documentação, não defeito em runtime. Termos propostos não são elevados a decisões Accepted.

| Achado                                                                     | Severidade | Evidência e impacto terminológico                                                                                                                                                                                    |
| -------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `schoolId` ativo versus `tenantId` histórico                               | **MÉDIO**  | ADR-0002/0003 definem `schoolId`; relatórios antigos registram conflito passado. O vocabulário ativo está consolidado, mas material histórico ainda pode ser copiado como atual.                                     |
| Membership versus Enrollment/Teacher Assignment                            | **ALTO**   | Ownership e significados estão separados nos ADRs ativos, mas snapshots legados e uso informal de “membership” podem confundir acesso escolar com matrícula/atribuição de turma.                                     |
| Role versus Permission e atribuição de escopo                              | **BAIXO**  | ADR-0004 distingue os termos claramente; preservá-los evita reintrodução de role única em User.                                                                                                                      |
| Question versus QuestionVersion e snapshot                                 | **MÉDIO**  | ADR-0003 define versão publicada imutável; ainda faltam schema/testes para concretizar, e “Question” isolado pode ocultar qual versão sustenta Attempt/Exam.                                                         |
| Evaluation, Result, Score e Completion                                     | **ALTO**   | Parte dos termos aparece em payloads/linguagem, mas não há definição universal, fórmula de score ou entidade Evaluation; pode gerar modelos de domínio diferentes.                                                   |
| Domain Event versus Integration Event                                      | **MÉDIO**  | ADR-0002 usa os dois termos sem taxonomia formal distinta; compatibilidade/entrega também permanecem abertas.                                                                                                        |
| Analytics, Ranking e Read Model                                            | **MÉDIO**  | Ownership/projeção está conceitualmente definido, mas RankingMetrics e métricas podem ser confundidos com autoridade de Ranking ou dado transacional.                                                                |
| SchoolDomain, QuestionPublication, Student Assignment, Educational Insight | **MÉDIO**  | Nomes aparecem ou foram solicitados, porém parte da semântica não está especificada; tratá-los como entidades de domínio autônomas seria inferência.                                                                 |
| Governance lifecycle versus estado atualmente aprovado                     | **ALTO**   | Glossário e ADR-GOVERNANCE ainda precisam de ratificação; não se pode chamar as definições de estados de política oficial vigente.                                                                                   |
| Múltiplos nomes de agregados/projeções                                     | **MÉDIO**  | Há termos como `question_statistics`/`question_metrics`, `RankingEntry`, `RankingMetrics` e `StudentProgress` em contextos distintos; ADR-0003 esclarece alguns owners, mas dicionário de métricas permanece aberto. |

### Resultado da validação

- **Fato:** ADR-0002–0004 e ADR-0003 definem um vocabulário amplo com owners conceituais.
- **Fato:** alguns conceitos solicitados não têm semântica independente suficiente para serem entradas normativas completas.
- **Conflito:** documentos históricos/relatórios podem preservar nomenclaturas que as fontes ativas corrigiram.
- **Recomendação:** ratificar o glossário como índice terminológico e encaminhar definições ausentes ao owner/ADR pertinente antes de tratá-las como oficiais. Este documento não cria essas definições.

## 15. Decisão executiva

### O projeto possui vocabulário suficiente para iniciar modelagem de domínio?

**SIM, para modelagem exploratória, com as entradas “parciais” e “não definidas” mantidas visíveis.** ADR-0002 e ADR-0003 já apresentam bounded contexts, ownership, agregados e relações conceituais para iniciar exploração sem inventar entidades.

**Não para congelar um modelo normativo completo.** Evaluation, Result, Score, Completion, Integration Event, Dashboard e Educational Insight ainda têm limites/semântica incompletos; ADRs relevantes permanecem Proposed. Modelagem normativa exigiria decisões dos owners e aprovação própria.

## 16. MEMÓRIA PARA PROMPT 08

### Conceitos consolidados

- **Fato documentado:** User é global; Profile é dado de produto; AuthAccount/PasswordCredential são autenticação; SchoolMembership é acesso User–School; GlobalRoleAssignment e MembershipRoleAssignment separam atribuição global e escolar.
- **Fato documentado:** School representa a instituição/tenant; `schoolId` é identificador escolar canônico; ClassEnrollment é distinto de membership; ClassTeachingAssignment é vínculo de professor à turma.
- **Fato documentado:** Topic, Competency e Skill são dimensões distintas da taxonomia; Question e QuestionVersion são distintos; versões publicadas são imutáveis conceitualmente.
- **Fato documentado:** Question Engine avalia/seleciona; Attempts possui tentativas/respostas; Study Paths possui percursos/progresso; Mock Exam e MockExamSession são definição e execução distintas.
- **Fato documentado:** Rankings/Analytics são projeções de owners diferentes; Outbox/Inbox/Event Consumers não fazem do sistema Event Sourcing.
- **Fato documentado:** ADR lifecycle/papéis de governança estão descritos em ADR-GOVERNANCE, que continua Proposed.

### Ambiguidades restantes

- `Evaluation`, `Result`, `Score` e `Completion` não têm definição/modelo universal.
- Diferença formal entre Domain Event e Integration Event não foi fechada.
- `Student Assignment` não é conceito separado nas fontes; está próximo de Enrollment, sem entidade adicional.
- Semântica/lifecycle de SchoolDomain e QuestionPublication é parcial.
- Educational Insight e Dashboard não têm definição/owner de domínio suficientemente especificado.
- Dicionário de métricas, semântica de score e compatibilidade/versionamento de eventos continuam incompletos.

### Termos padronizados

- Escola/tenant escolar: entidade **School**, conceito **Tenant**, identificador **`schoolId`**.
- Vínculo de acesso escolar: **SchoolMembership**.
- Vínculo de estudante à turma: **Enrollment / ClassEnrollment**.
- Vínculo de professor à turma: **Teacher Assignment / ClassTeachingAssignment**.
- Identidade: **User**; perfil: **Profile/UserProfile**; credencial: **PasswordCredential**.
- Conteúdo versionado: **Question / QuestionVersion**; fonte catalogada: **Source**; relação: **QuestionSourceLink**.
- Projeção analítica não é fonte de verdade; Outbox não é Event Store.

### Termos proibidos

- Não usar `tenantId` como campo escolar canônico; usar `schoolId` conforme ADR-0002.
- Não usar `User.role`, `User.schoolId` ou `User.password` como modelo vigente de identidade/autorização.
- Não usar Membership como sinônimo de Enrollment.
- Não usar `Question.competency`/tags livres como taxonomia oficial.
- Não chamar `domain_events`/Outbox de Event Store completo ou afirmar Event Sourcing.
- Não tratar Evaluation, Result, Score, Student Assignment, Educational Insight ou OBMEPClassification como entidades definidas pelas fontes.
- Não usar conceitos frontend de estado superseded como fonte normativa.

### Lacunas encontradas

- O arquivo Glossary não existia nas fontes examinadas; este documento é uma consolidação proposta, ainda sem ratificação/entrada no `INDEX.md`.
- Owners e definições de termos parciais precisam de confirmação por fontes/ADRs próprios; nenhuma entidade foi criada aqui.
- ADR-GOVERNANCE e ADRs de domínio estão Proposed; o glossário não os torna Accepted.

### Próxima ação recomendada

**Uma única ação:** submeter `GLOSSARY.md` a revisão pelos owners documentais/de domínio indicados nas fontes e obter ratificação como referência terminológica única antes de adicioná-lo ao `INDEX.md`.

**Justificativa técnica:** vários termos solicitados seguem parciais ou não definidos; revisão e ratificação podem validar o vocabulário consolidado sem converter lacunas em definições ou entidades novas. A inclusão no índice só deve ocorrer após essa decisão.

---

**Nota:** Este glossário consolida evidência textual e lacunas em 2026-10-01. Não altera ADRs, ownership, tenancy ou regras de negócio, nem declara definições Proposed como oficialmente aprovadas.
