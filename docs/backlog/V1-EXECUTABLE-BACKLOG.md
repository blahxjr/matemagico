# Backlog executavel da V1

**Estado:** backlog proposto para planejamento/importacao; nao implica compromisso de capacidade
**Baseline:** ADR-0001, ADR-0002, ADR-0003, ADR-0004, ADR-0005, ADR-0009 e ADR-0010
**Formato de importacao:** `V1-EXECUTABLE-BACKLOG.csv` e fonte estruturada dos work items

## 1. Objetivo e limites

Este backlog transforma a baseline arquitetural em epics, features, user stories e tasks tecnicas rastreaveis, com dependencias, criterios de aceite e ordem proposta. O CSV e uma lista plana hierarquizada por `ID` / `Parent ID`; `Depends On` registra dependencias reais, nao apenas a ordem visual. `ADR Traceability` identifica a fonte normativa.

Para este backlog, o conjunto de ADRs indicado pelo solicitante e tratado como baseline oficial de planejamento. Os status registrados nos arquivos ADR nao sao alterados nem promovidos por este documento; isso nao cria um gate global de re-aprovacao antes de iniciar trabalho. Decisoes de produto, privacidade, licenca ou operacao que os ADRs deixam explicitamente em aberto continuam gates para as features correspondentes. A sequencia de sprints e uma proposta sem estimativas, datas ou compromisso de capacidade.

### O que esta dentro

- Ratificacao e fechamento das decisoes/privacidade/eventos que bloqueiam a V1.
- Arquitetura modular, contratos, integridade da persistencia, isolamento escolar e operacao de eventos.
- Evolucao para alem do MVP publicado de identidade e acesso.
- Conteudo/taxonomia, pratica/aprendizagem, simulados, competicoes, analytics, interface e readiness de producao conforme escopo registrado nos ADRs.

### O que nao deve ser inferido

- Nao inclui funcionalidades de IA, login social, SSO ou microservices.
- Nao transforma metas de 100 mil alunos, p95 ou Core Web Vitals em capacidade/SLO comprovado; exige medicao.
- Nao define regras pedagogicas, pontuacao, elegibilidade, calendario de competicao, licencas de conteudo, retencao ou consentimento que nao estejam fechados nos ADRs. As decisoes faltantes sao trabalho bloqueante antes da implementacao correspondente.
- Analytics permanece projecao reconstruivel, assincrona e nao autoritativa; jamais bloqueia ou define sucesso de transacao de dominio.
- ADR-0006, ADR-0007 e ADR-0008 sao `Superseded` e nao sao fontes normativas deste backlog; suas areas foram consolidadas nas responsabilidades vigentes de ADR-0005 e ADR-0010.

## 2. Hierarquia de work items

| ID         | Work item                                      | Objetivo / criterios de aceite resumidos                                                                                                  | ADRs                                     |
| ---------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| EPIC-V1-01 | Governanca e fundacao arquitetural             | Baseline oficial operacionalizada, gates de produto/legal resolvidos e fronteiras modulares verificadas antes de construir sobre elas.    | 0001, 0002, 0003, 0004, 0005, 0009, 0010 |
| EPIC-V1-02 | Persistencia segura multi-escola               | Schema conceitual aprovado, migrations revisadas, ownership e isolamento por `schoolId` testados; OLTP separado logicamente de projecoes. | 0002, 0003, 0004                         |
| EPIC-V1-03 | Identidade e autorizacao prontas para producao | Fechar dividas do MVP publicado, garantir controles privilegiados e auditoria sem reimplementar o escopo ja entregue.                     | 0002, 0003, 0004                         |
| EPIC-V1-04 | Conteudo matematico e pratica                  | Taxonomia e versoes de questoes com proveniencia; submissoes reproduziveis e base para aprendizagem adaptativa.                           | 0002, 0003                               |
| EPIC-V1-05 | Jornadas de aprendizagem e avaliacao           | Percursos e simulados concluidos por fluxos do owner, preservando evidencias e regras aprovadas.                                          | 0002, 0003, 0005                         |
| EPIC-V1-06 | Campeonatos e reconhecimento                   | Ciclo de competicao e resultados rastreaveis; regras de produto devem ser aprovadas antes da implementacao.                               | 0002, 0003                               |
| EPIC-V1-07 | Analytics educacional e telemetria             | Projecoes assincronas, isoladas, versionadas e reconstruiveis; dashboards por permissao e telemetria minimizada.                          | 0002, 0003, 0004, 0005, 0009             |
| EPIC-V1-08 | Experiencia web e design system                | Interface feature-based, componentes acessiveis e responsivos; leitura RSC e mutacoes delegadas ao BFF/use cases.                         | 0005, 0010                               |
| EPIC-V1-09 | Qualidade e readiness de producao              | Fluxos criticos, seguranca, restore, observabilidade e capacidade validados por evidencias, sem alegar garantias nao medidas.             | 0001-0005, 0009, 0010                    |

Os itens, nomes, criterios completos, tarefas, status, sprints e dependencias estao no CSV para importacao.

## 3. Ordem de implementacao e roadmap proposto

Planejamento indicativo de dez iteracoes, assumindo sprints de duas semanas somente para facilitar sequenciamento. A duracao real depende da equipe, capacidade, refinamento e resultados dos gates.

| Iteracao | Foco / itens principais                                                                                                                                 | Saida verificavel                                                                                                                                                             |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sprint 0 | Registrar owners da baseline definida; requisitos legais/privacidade; definicao das regras de produto em aberto para conteudo, simulados e competicoes. | Owners e escopo registrados; decisoes legais/de produto necessarias as features seguintes aprovadas; somente os itens dependentes ficam bloqueados enquanto houver pendencia. |
| Sprint 1 | Fundacao modular, verificacao automatica de fronteiras, CI com PostgreSQL e contratos/eventos.                                                          | Testes arquiteturais impedem imports internos/ciclos; CI executa migrations e testes de integracao em PostgreSQL.                                                             |
| Sprint 2 | Modelo fisico por ownership, tenancy, migrations, seeds e rotina de backup/restore.                                                                     | Migrations reproduziveis e compatibilidade expand/contract; testes negativos comprovam isolamento entre escolas.                                                              |
| Sprint 3 | Dividas do MVP de identidade/autorizacao, rate-limit/segredos/auditoria e MFA/step-up para papeis privilegiados.                                        | Dependencias de Users/Schools/authorizer reais e operacao privilegiada falham de forma segura e sao auditaveis.                                                               |
| Sprint 4 | Design system essencial; taxonomia OBMEP versionada e catalogo/proveniencia de questoes.                                                                | Primitives acessiveis e modelos de taxonomia/questao aprovados, publicados por contratos do owner.                                                                            |
| Sprint 5 | Tentativas e pratica; eventos/outbox e primeira versao dos consumers/projecoes de StudentProgress e TopicMetrics.                                       | Submissao autorizada e idempotente; evento pos-commit; projecoes reconstruiveis e escola-escopadas.                                                                           |
| Sprint 6 | Study Paths e Mock Exams; fluxos de leitura RSC e mutacao por Server Actions como adapters.                                                             | Jornada vertical com invariantes no owner, DTO minimo e estado remoto sempre autoritativo no servidor.                                                                        |
| Sprint 7 | Regras e ciclo de Championships, Rankings e reconhecimento, somente apos definicao aprovada do produto.                                                 | Fluxo documentado e testado; ranking/conquistas derivam de eventos e nao se tornam owner de resultados de origem.                                                             |
| Sprint 8 | SchoolMetrics/RankingMetrics e dashboards de aluno/professor/coordenador; controles de acesso e privacidade.                                            | Projecoes eventualmente consistentes com `asOf`, supressao de celulas pequenas quando aplicavel e autorizacao por escopo.                                                     |
| Sprint 9 | PlatformMetrics/telemetria, testes E2E, acessibilidade, carga, seguranca, DR/restore e readiness.                                                       | Evidencia para SLOs/capacidade aprovados; gates legais, de seguranca, backup/restore e release passam.                                                                        |

### Dependencias de caminho critico

1. **Ratificacao e privacidade** antes de login/telemetria/dados reais, eventos externos ou dados de menores.
2. **Ownership, contratos e convencoes arquiteturais** antes de persistencia de dominio ou consumers.
3. **Modelo tenant-aware e migration + teste de isolamento** antes de gravar dados reais em fluxos multi-escola.
4. **Auth/Authorization e contrato do owner** antes de liberar operacoes protegidas ou dashboards.
5. **Regra oficial/proveniencia/licenca** antes de publicar conteudo matematico.
6. **Tentativas + eventos + outbox/inbox + idempotencia** antes de Analytics, rankings derivados ou certificados.
7. **Definicao de regras de produto** antes de Study Paths, Mock Exams e Championships quando os criterios ainda forem ambiguos.
8. **Projecoes autorizadas** antes dos dashboards correspondentes.
9. **Evidence de carga, seguranca e recuperacao** antes de declarar producao/capacidade.

## 4. Estado inicial, conclusao e itens bloqueados

- O milestone [MVP READY](../releases/MVP-READY.md) registra como publicados Auth, Session, Membership, School Context, Prisma adapters e testes associados. Esses itens foram excluidos do CSV para evitar importacao duplicada.
- As dividas do milestone (PostgreSQL no CI, ActorAuthorizer e User/SchoolDirectory reais, outbox, observabilidade e auditoria) aparecem como trabalho restante no CSV.
- `docs/architecture/MVP-IMPLEMENTATION-BACKLOG.md` e `SPRINT1-BACKLOG.md` continuam sendo rastreabilidade do trabalho ja entregue; nao reabrir seus itens concluidos.
- Nenhuma Story de produto pode ser considerada completa apenas por existir schema ou mock de interface: precisa cumprir criterios, testes por fronteira e validacao multi-escola aplicavel.
- O backlog nao atribui Story Points. Estimar apos ratificacao e refinamento com a equipe responsavel.

## 5. Importacao

O CSV usa UTF-8, uma linha por Epic/Feature/User Story/Task, IDs estaveis do plano (`Work Item ID`) e estas colunas:

| Coluna                                              | Uso                                                                                                                  |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Work Item Type                                      | Epic, Feature, User Story ou Task.                                                                                   |
| Work Item ID / Parent ID                            | Chave local estavel para reconstruir hierarquia; mapear para Issue ID / Parent ID / Epic Link conforme a plataforma. |
| Depends On                                          | IDs predecessores separados por `;`; importar como links `Predecessor`/`blocks` quando houver suporte.               |
| Title / Description / Acceptance Criteria           | Conteudo do item; Tasks tecnicas tambem recebem criterio de conclusao verificavel.                                   |
| Priority / State / Sprint / Tags / ADR Traceability | Planejamento e filtros; estimativas foram intencionalmente omitidas.                                                 |

**Azure DevOps:** mapear `Work Item Type`, `Title`, `Description`, `Acceptance Criteria`, `Priority`, `Tags`, `Iteration Path`, `ID` e `Parent`. Ajustar os nomes/valores dos campos ao processo (Agile/Scrum/CMMI) da organizacao e importar hierarquia/dependencias em etapas quando a versao do importador nao aceitar referencias no mesmo lote.

**Jira:** mapear `Work Item Type` para Issue Type; `Title` para Summary; `Description` e `Acceptance Criteria` para Description/criterio customizado; IDs pai para Epic Link/Parent conforme a versao Cloud/Data Center. Dependencias podem exigir importacao posterior de issue links.

**GitHub Projects:** criar issues a partir das linhas de Feature/Story/Task ou importar como rascunhos conforme a ferramenta habilitada; GitHub Projects nao possui um esquema universal de Epic/Feature/Parent via CSV. Manter `Work Item ID` nos titulos/labels e criar hierarquia/dependencias como sub-issues/issue links depois da criacao. Epic pode ser representado como issue de tracking.

Importar primeiro em projeto de teste, validar encoding, aspas, hierarquia e links; depois importar o lote oficial. IDs sao identificadores do backlog-fonte, nao IDs ja atribuidos pela plataforma.

## 6. Definicao de pronto transversal

- Criterios da Story demonstrados por testes automatizados adequados (unitario, integracao, contrato, E2E e/ou carga).
- Ownership mantido: nenhum acesso direto a tabelas/repositories internos de outro modulo; dependencias sincronas seguem contratos publicos sem ciclos.
- Operacoes protegidas autenticam/autorizam no servidor, fail closed, verificam recurso e contexto `schoolId`; nao confiar em valores do browser.
- Eventos publicados somente para fatos apos commit, com envelope/versionamento aprovado, minimizacao e consumidores idempotentes.
- Logs/traces/telemetria nao contem segredos ou PII desnecessaria; dados analiticos respeitam politica legal aprovada.
- UI respeita ADR-0005/0010, acessibilidade/responsividade acordadas e nao move regra de dominio para client/actions.
- Migrations verificadas em PostgreSQL real, backup/restore praticado quando aplicavel e plano forward/compensatorio registrado.
- Documentacao de uso/operacao e rastreabilidade ADR atualizadas; nenhuma meta de escala ou performance tratada como fato sem medicao.
