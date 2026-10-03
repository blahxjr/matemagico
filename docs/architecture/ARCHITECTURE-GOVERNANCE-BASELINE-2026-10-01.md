# Consolidação de Governança Arquitetural

**Data de referência:** 2026-10-01  
**Natureza:** consolidação documental; não é ADR, não aprova decisões e não cria arquitetura.  
**Fontes examinadas:** [auditoria arquitetural](ARCHITECTURE-AUDIT-2026-10-01.md), [índice de ADRs](ADRs/INDEX.md), Documento Mestre, ADR-0002 a ADR-0010, ADR Diagnostic Report e memória de projeto.

## Escopo e linguagem

- **Baseline de referência:** conjunto de documentos canônicos apontados pelo `INDEX.md`, incluindo propostas. Ajuda a localizar a intenção atual, mas não equivale a aprovação.
- **Baseline aprovada/oficial:** conjunto de decisões com status Accepted e aprovação registrável, sem status contraditório.
- **Fato:** declarado expressamente na fonte ou observado no workspace.
- **Conflito:** fontes atuais divergem em conteúdo ou autoridade.
- **Lacuna:** informação, aprovação ou governança ainda não presente. Ausência de evidência não prova que algo inexista fora do workspace.
- **Recomendação:** encaminhamento para governança futura; não é decisão adotada.

O `INDEX.md` declara que “Proposed does not mean approved”. Seu cabeçalho “Normative Baseline” deve, portanto, ser lido como índice dos documentos canônicos de referência, não como aprovação automática de cada decisão ali listada.

## 1. Inventário consolidado

| Documento                                                                                                                                             | Status atual                                                                                               | Fonte da verdade                                                                                             | Pode ser usado para implementação?                                                                   | Observações                                                                                                                                                                              |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [ARCHITECTURE.md](../../ARCHITECTURE.md), Documento Mestre                                                                                            | Foundation Architecture v1.0; contém ADR-0001 com status declarado Accepted, mas sign-off pendente/ambíguo | Fonte de contexto do produto, stack pretendida e texto do ADR-0001; `INDEX.md` registra o conflito de status | **Não como baseline aprovada.** Pode ser consultado como contexto; propostas precisam de confirmação | Há trechos marcados como históricos/não normativos. O Documento Mestre não é, por inteiro, uma decisão Accepted                                                                          |
| [INDEX.md](ADRs/INDEX.md)                                                                                                                             | Índice vigente de referência; não usa status ADR Accepted                                                  | Fonte primária para identificar o documento canônico, status declarado e dependências                        | **Não autoriza implementação por si.** Seus itens Proposed continuam propostas                       | Existe `INDEX.md`; não existe arquivo chamado `ADR-INDEX.md`. A lista “Normative Baseline” traz explicitamente documentos Proposed                                                       |
| [ADR-0002-module-boundaries.md](ADRs/ADR-0002-module-boundaries.md)                                                                                   | **Proposed**                                                                                               | Documento canônico de referência para módulos, ownership, contratos e eventos                                | **Não como norma aprovada.** É base adequada para modelagem exploratória em Draft, sem congelamento  | Define 16 bounded contexts, `schoolId`, ownership e proibição de ciclos; stakeholders/deciders ainda a confirmar                                                                         |
| [ADR-0003-database-strategy.md](ADRs/ADR-0003-database-strategy.md)                                                                                   | **Proposed**                                                                                               | Documento canônico de referência para persistência e modelo conceitual                                       | **Não** para decisão final de dados/schema; o ADR declara que não aprova schema físico               | PostgreSQL/Prisma, tenancy lógica e ownership estão propostos; não é schema Prisma                                                                                                       |
| [ADR-0004-authentication-authorization.md](ADRs/ADR-0004-authentication-authorization.md)                                                             | **Proposed**                                                                                               | Documento canônico de referência para identidade e autorização                                               | **Não** como política aprovada ou autorização de uso com dados reais                                 | Exige aprovação formal; revisão legal/privacidade e controles de produção continuam gates                                                                                                |
| [ADR-0005-frontend-architecture-state-management-bff.md](ADRs/ADR-0005-frontend-architecture-state-management-bff.md)                                 | **Proposed**; proposta canônica para estado/BFF conforme índice                                            | Documento canônico de referência para frontend, estado, cache e BFF                                          | **Não** como baseline aprovada                                                                       | Define RSC-first, Actions como adapters, Zustand restrito a UI efêmera e TanStack Query opt-in                                                                                           |
| [ADR-0005-state-management-strategy.md](ADRs/ADR-0005-state-management-strategy.md)                                                                   | **Superseded**                                                                                             | Apenas histórico                                                                                             | **Não**                                                                                              | Substituído pelo ADR-0005 canônico; não é uma segunda decisão vigente                                                                                                                    |
| [ADR-0006 - Frontend Architecture and UI State Management.md](ADRs/ADR-0006%20-%20Frontend%20Architecture%20and%20UI%20State%20Management.md)         | **Superseded**                                                                                             | Apenas histórico                                                                                             | **Não**                                                                                              | Substituído por ADR-0005 e pelo escopo de composição visual do ADR-0010                                                                                                                  |
| [ADR-0007 - Frontend State Management Strategy.md](ADRs/ADR-0007%20-%20Frontend%20State%20Management%20Strategy.md)                                   | **Superseded**                                                                                             | Apenas histórico                                                                                             | **Não**                                                                                              | Substituído por ADR-0005; a formulação antiga de Query Cache não é normativa                                                                                                             |
| [ADR-0008 - Frontend Architecture, UI State and BFF Strategy.md](ADRs/ADR-0008%20-%20Frontend%20Architecture,%20UI%20State%20and%20BFF%20Strategy.md) | **Superseded**                                                                                             | Apenas histórico                                                                                             | **Não**                                                                                              | Substituído por ADR-0005; instrução histórica do próprio arquivo também aponta para ADR-0001–0005                                                                                        |
| ADR-0009 — Analytics, Telemetry and Educational Insights Strategy (arquivo sem `.md`)                                                                 | **Proposed**                                                                                               | Documento canônico de referência para Analytics e telemetria                                                 | **Não** como política aprovada de analytics/telemetria                                               | Declara Analytics como projeções; conteúdo está parcialmente achatado e faltam aprovação e governança operacional completa                                                               |
| [ADR-0010 - Frontend Architecture and UI Composition Strategy.md](ADRs/ADR-0010%20-%20Frontend%20Architecture%20and%20UI%20Composition%20Strategy.md) | **Proposed**, escopo de composição/design system segundo `INDEX.md`                                        | Documento canônico de referência para composição visual                                                      | **Não** como decisão aprovada                                                                        | O corpo atual remete estado, Zustand, cache e BFF ao ADR-0005 e afirma sessão/autorização server-owned. O conflito frontend apontado na auditoria anterior está resolvido no texto atual |
| [ADR-DIAGNOSTIC-REPORT.md](ADRs/ADR-DIAGNOSTIC-REPORT.md)                                                                                             | Relatório de auditoria; não possui status de ADR                                                           | Fonte auxiliar para achados datados de 2026-09-29, não fonte normativa                                       | **Não**                                                                                              | Tem achados úteis, mas inclui afirmações desatualizadas ou contraditórias com o próprio status de Superseded e com o workspace                                                           |
| [ARCHITECTURE-AUDIT-2026-10-01.md](ARCHITECTURE-AUDIT-2026-10-01.md)                                                                                  | Relatório de auditoria; não possui status de ADR                                                           | Fonte auxiliar de análise, não autoridade de aprovação                                                       | **Não**                                                                                              | A auditoria foi parcialmente superada por alterações recentes em fontes; usar esta consolidação para o estado revisto                                                                    |

### Significado dos status

- **Draft:** rascunho em elaboração, sem decisão submetida/aprovada. Nenhum ADR listado usa explicitamente esse status no cabeçalho atual.
- **Proposed:** proposta registrada, ainda não aprovada. Não é baseline normativa para implementação.
- **Accepted:** decisão registrada como aceita. No ADR-0001 o cabeçalho diz Accepted, mas `INDEX.md` e memória mantêm stakeholder approval pendente; por isso o status não é inequívoco.
- **Superseded:** proposta substituída por outra; permanece para histórico e não deve ser usada como referência primária.
- **Deprecated:** decisão explicitamente descontinuada. Nenhum dos documentos examinados está marcado Deprecated.

Documentos sem status de ADR, como índices e relatórios, não devem receber artificialmente um dos cinco status de decisão.

## 2. Baseline de referência e baseline aprovada

**Resultado consolidado:** há um conjunto canônico de referência descrito no índice, mas **não há baseline arquitetural completa cuja aprovação esteja comprovada**. ADR-0001 é a única decisão declarada Accepted, porém sua aprovação permanece contestada; ADR-0002–0005, 0009 e 0010 são Proposed.

### Arquitetura Base

- **Fonte primária:** `ARCHITECTURE.md`, seção 6, ADR-0001 embutido.
- **Status:** Accepted declarado no cabeçalho; stakeholder sign-off pendente/ambíguo conforme `INDEX.md` e `memory/project-state.md`.
- **Fonte secundária:** `INDEX.md`, que aponta para a seção e registra a ressalva.
- **Documentos de apoio:** README e memórias; não substituem aprovação nem ADR.
- **Conclusão:** direção registrada: Modular Monolith, DDD e Clean Architecture. Autoridade formal ainda não consolidada.

### Módulos de Domínio

- **Fonte primária:** ADR-0002, **Proposed**.
- **Fonte secundária:** seção 3 do Documento Mestre, que aponta ownership e dependências ao ADR-0002.
- **Documentos de apoio:** ADR-0003 (ownership conceitual dos dados), memórias e diagrama do Documento Mestre.
- **Conclusão:** os bounded contexts têm uma proposta canônica detalhada; ela não é decisão Accepted.

### Banco de Dados

- **Fonte primária:** ADR-0003, **Proposed**.
- **Fonte secundária:** ADR-0002 para ownership e fronteiras; Documento Mestre para stack/contexto.
- **Documentos de apoio:** ADR-0004 para entidades de identidade; ADR-0009 para projeções analíticas.
- **Conclusão:** PostgreSQL, Prisma, banco/schema compartilhado e `schoolId` são direção proposta. O schema físico não está decidido/aprovado pelo ADR.

### Autenticação

- **Fonte primária:** ADR-0004, **Proposed**.
- **Fonte secundária:** ADR-0002/0003 para ownership, tenancy e persistência.
- **Documentos de apoio:** ADR-0005 para uso de sessão no frontend; Documento Mestre como contexto de stack.
- **Conclusão:** User global, membership escolar e autorização server-side são proposta detalhada, ainda não decisão formal.

### Frontend

- **Fonte primária:** ADR-0005 canônico para estado, cache e BFF; **Proposed**.
- **Fonte secundária:** ADR-0010 para composição visual/design system; **Proposed**, com escopo limitado pelo índice.
- **Documentos de apoio:** ADR-0002 para fronteiras e ADR-0004 para sessão/autorização.
- **Conclusão:** não há conflito ativo entre o texto atual de ADR-0005/0010 sobre estado/autenticação. A aprovação de ambos permanece pendente.

### Eventos

- **Fonte primária:** ADR-0002 para produtores, consumidores e comunicação; **Proposed**.
- **Fonte secundária:** ADR-0003 para outbox/inbox e armazenamento; ADR-0009 para consumo analítico.
- **Documentos de apoio:** `ADR-TEMPLATE.md` para contratos e baseline de observabilidade.
- **Conclusão:** o vocabulário de eventos é conceitual; a governança operacional completa não está fechada/aprovada. Os eventos coincidentes verificados (`UserRegistered`, `UserActivated`, `ChampionshipCreated`, `QuestionAnswered`) aparecem em ambos ADR-0002 e ADR-0009; não há base para repetir a alegação anterior de que esses nomes necessariamente divergem.

### Analytics

- **Fonte primária:** ADR-0009, **Proposed**.
- **Fonte secundária:** ADR-0002 para ownership e eventos; ADR-0003 para projeções e ownership de `question_statistics`/`question_metrics`.
- **Documentos de apoio:** ADR-0005 para visualização/frontend e `ADR-TEMPLATE.md` para observabilidade e testes.
- **Conclusão:** Analytics é descrito como projeção, não fonte de verdade. Retenção, aprovação de privacidade, dicionário de métricas e operação de consumidores seguem abertos.

### Fontes por função

| Função                                 | Fonte primária                    | Fonte secundária                        | Apoio, sem autoridade de decisão        |
| -------------------------------------- | --------------------------------- | --------------------------------------- | --------------------------------------- |
| Status e caminho canônico dos ADRs     | `INDEX.md`                        | Cabeçalho do ADR correspondente         | Diagnostic Report, auditoria e memórias |
| Conteúdo de cada decisão               | ADR canônico indicado pelo índice | Documento Mestre para ADR-0001/contexto | README e memórias                       |
| Visão, produto e restrições históricas | Documento Mestre                  | ADRs que explicitam requisitos          | Prompts originais e README              |
| Estado material do workspace           | Arquivos e estrutura atuais       | `memory/project-state.md`               | Relatórios datados                      |

Esta tabela é uma regra de leitura desta consolidação, derivada do índice e das fontes disponíveis; **não substitui uma política de precedência formalmente aprovada**.

## 3. Matriz de dependências

### Dependências entre ADRs

| Documento                      | Dependências indicadas                              | O que habilita/constrange                                   | Observação de status                                     |
| ------------------------------ | --------------------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------- |
| ADR-0001                       | Visão do produto e restrições de stack              | Base arquitetural para as decisões seguintes                | Embutido; Accepted declarado, aprovação em conflito      |
| ADR-0002                       | ADR-0001                                            | Bounded contexts, ownership, contratos e eventos            | Proposed                                                 |
| ADR-0003                       | ADR-0001, ADR-0002                                  | Estratégia de dados, tenancy lógica e data map              | Proposed                                                 |
| ADR-0004                       | ADR-0002, ADR-0003                                  | Identidade, sessão, autorização e roles                     | Proposed                                                 |
| ADR-0005                       | ADR-0002, ADR-0003, ADR-0004                        | Frontend, estado, cache e BFF                               | Proposed; canonical segundo o índice                     |
| ADR-0009                       | ADR-0002, ADR-0003, ADR-0004                        | Projeções, analytics pedagógico e telemetria                | Proposed                                                 |
| ADR-0010                       | ADR-0005 e requisitos de UI do produto              | Composição visual e UI compartilhada                        | Proposed; composição/design system apenas segundo índice |
| ADR-0005 antigo, ADR-0006–0008 | Decisões anteriores de base como contexto histórico | Nenhuma autoridade atual; substituídos por ADRs posteriores | Superseded                                               |

### Dependências do Documento Mestre

| Documento Mestre / seção                 | Relação                                                 | Limite                                                                     |
| ---------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------- |
| Visão do produto e restrições de stack   | Contexto antecedente a ADR-0001 e às decisões derivadas | É contexto declarativo, não prova de aprovação de cada ADR                 |
| Seção 6 — ADR-0001                       | Contém o texto primário da decisão de arquitetura base  | Status interno Accepted conflita com aprovação pendente no índice/memória  |
| Seção 3 — módulos                        | Aponta o leitor ao ADR-0002 para fronteiras normativas  | Trechos antigos da seção estão rotulados como históricos/não normativos    |
| Seções de arquitetura, estrutura e stack | Apoiam a interpretação do produto/ambiente alvo         | Exemplos e estruturas planejadas não comprovam que estejam implementados   |
| Referências a ADR-0002–0010              | Encaminham a decisões especializadas                    | O status efetivo deve ser consultado no índice, não inferido da referência |

### Dependências do INDEX

| Elemento do INDEX             | Relação                                                  | Limite                                                 |
| ----------------------------- | -------------------------------------------------------- | ------------------------------------------------------ |
| Normative Baseline            | Lista arquivos canônicos e relações `Depends on`         | A própria nota diz que Proposed não significa aprovado |
| ADR-0001                      | Aponta para `ARCHITECTURE.md`, seção 6                   | Não resolve a divergência Accepted/sign-off pendente   |
| ADR-0002–0005, 0009, 0010     | Aponta para conteúdo canônico por decisão                | Conteúdo permanece Proposed                            |
| Superseded Proposals          | Registra substituição de ADR-0005 antigo e ADR-0006–0008 | São histórico, não dependência ativa                   |
| Governance and Open Decisions | Registra status, pontos abertos e template               | Não especifica lifecycle/quorum completo               |

### Fluxo textual

```text
Visão do produto e restrições de stack
                 |
                 v
ADR-0001 (fundação; Accepted declarado, approval pendente)
                 |
                 v
ADR-0002 (fronteiras e ownership) -----> ADR-0003 (dados/tenancy)
                 |                                  |
                 +--------------------+-------------+
                                      v
                              ADR-0004 (auth)
                                      |
                         +------------+------------+
                         v                         v
                 ADR-0005 (frontend)        ADR-0009 (analytics)
                         |
                         v
                 ADR-0010 (composição UI)

INDEX.md registra links, status e dependências; não aprova os itens Proposed.
```

O fluxo representa dependências declaradas, não ordem de execução. **Não há ciclo explícito na matriz de dependência ativa do índice.** ADR-0002 também exige grafo síncrono acíclico. Ciclos `Schools ↔ Classes` e `Championships ↔ Rankings` aparecem em material legado/diagnóstico como riscos a remover; não são a direção atual de ADR-0002. O `INDEX.md` não define, contudo, uma política geral de precedência para conflitos entre textos.

### Hierarquia de decisão observável

1. **Status/listagem:** consultar `INDEX.md` para status e documento canônico indicado.
2. **Conteúdo:** consultar o ADR canônico para o tema; se Proposed, registrar como proposta, não como regra aprovada.
3. **Fundação e produto:** consultar `ARCHITECTURE.md`; ADR-0001 exige reconciliação de sign-off.
4. **Apoio:** memórias, README, Diagnostic Report e auditorias preservam contexto, mas não alteram status nem aprovam decisões.

Esta hierarquia é uma interpretação conservadora das referências explícitas, não uma política de governança já aprovada.

## 4. Documentos Superseded

| Documento                                                                                                                                             | Status     | Substituído por                                                                  | Motivo                                        | Risco de uso como referência primária                                                              |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| [ADR-0005-state-management-strategy.md](ADRs/ADR-0005-state-management-strategy.md)                                                                   | Superseded | [ADR-0005 canônico](ADRs/ADR-0005-frontend-architecture-state-management-bff.md) | Proposta anterior focada só em estado         | Pode tratar TanStack Query como armazenamento primário de domínio ou duplicar decisão de BFF       |
| [ADR-0006 - Frontend Architecture and UI State Management.md](ADRs/ADR-0006%20-%20Frontend%20Architecture%20and%20UI%20State%20Management.md)         | Superseded | ADR-0005 canônico e ADR-0010 no escopo de composição                             | Misturava arquitetura, estado e design system | Reabre estratégia antiga de server state/estado frontend                                           |
| [ADR-0007 - Frontend State Management Strategy.md](ADRs/ADR-0007%20-%20Frontend%20State%20Management%20Strategy.md)                                   | Superseded | ADR-0005 canônico                                                                | Formulação antiga de cache remoto e stores    | Pode promover cache cliente a fonte operacional de estado do domínio                               |
| [ADR-0008 - Frontend Architecture, UI State and BFF Strategy.md](ADRs/ADR-0008%20-%20Frontend%20Architecture,%20UI%20State%20and%20BFF%20Strategy.md) | Superseded | ADR-0005 canônico                                                                | Proposta histórica de frontend/BFF            | Pode reabrir integração BFF e permitir leitura inconsistente do limite entre adapter e caso de uso |

`Superseded` não significa que os arquivos devam ser apagados. O risco é usá-los como norma, não consultá-los para entender a história.

## 5. Contradições e inconsistências atuais

Severidade descreve impacto de governança e prontidão, não defeito comprovado em produção.

### Governança

| Origem                                                                                                                                                                                     | Impacto                                                              | Criticidade | Recomendação                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------- |
| ADR-0001 marcado Accepted em `ARCHITECTURE.md`; `INDEX.md` e memória dizem que aprovação/sign-off está pendente                                                                            | Não é possível afirmar uma baseline aprovada para o projeto inteiro  | **ALTO**    | Registrar formalmente se foi aprovado; reconciliar status/deciders no índice e no documento-mestre                   |
| `INDEX.md` usa “Normative Baseline” para referências, mas avisa que Proposed não é aprovado; propostas dominam a lista                                                                     | Leitores podem confundir canonicalidade documental com adoção formal | **MÉDIO**   | Manter a distinção entre baseline de referência e baseline aprovada explícita em documentos de onboarding            |
| `ADR-DIAGNOSTIC-REPORT.md` e a auditoria anterior contêm alegações agora superadas: inexistência de qualquer app/schema/teste; conflito ativo frontend/tenant/eventos em pontos resolvidos | Prioridades e severidade podem ficar baseadas em snapshots antigos   | **MÉDIO**   | Tratar esses relatórios como históricos datados; revisão futura deve apontar alterações sem reescrever status de ADR |

### Tenancy

| Origem                                                                                                                        | Impacto                                                                                                        | Criticidade                                                    | Recomendação                                                                                            |
| ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| ADRs ativos 0002/0003/0004/0005 e índice convergem para `schoolId`; diagnósticos antigos ainda citam `tenantId` como conflito | A nomenclatura atual está resolvida documentalmente; ainda falta prova de isolamento em dados, eventos e cache | **MÉDIO** (lacuna de evidência, não contradição textual atual) | Não reabrir naming; conservar `schoolId` como fato documental e registrar limites de validação pendente |

### Ownership

| Origem                                                                                                         | Impacto                                                                                                                                     | Criticidade                                                       | Recomendação                                                                                                                  |
| -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| ADR-0002/0003/0004 atribuem `SchoolMembership` a Auth/Authorization e enrollment/teaching assignment a Classes | A distinção está alinhada nos textos ativos; não há conflito textual atual. Falta comprovar integridade/ownership em validações executáveis | **MÉDIO** (lacuna de evidência, não divergência documental atual) | Preservar a separação como proposta canônica; marcar validação executável como pendente, sem afirmar que houve conflito ativo |

### Segurança

| Origem                                                                                                                                                       | Impacto                                                                                                                                | Criticidade                                   | Recomendação                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| ADR-0004 é Proposed; suas seções condicionam produção a MFA privilegiada, revisão de privacidade/legal e controles de sessão; memória diz aprovação pendente | A especificação não pode ser tratada como autorização para operar com dados reais; não há evidência de Auth/RBAC completo no workspace | **CRÍTICO** para uso com dados reais/produção | Registrar aprovação e manter os gates de privacidade/segurança em aberto até evidência apropriada; não presumir conformidade |

### Frontend

| Origem                                                                                                                       | Impacto                                                                                               | Criticidade                                  | Recomendação                                                                                                                |
| ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| ADR-0005 e ADR-0010 atuais estão alinhados no ownership de estado; índice restringe 0010 à composição; ambos seguem Proposed | Sem contradição atual de decisão, mas não existe autorização formal para tratar a proposta como norma | **MÉDIO** (status, não conflito de conteúdo) | Não reapresentar 0006–0008 nem conteúdo antigo do 0010 como conflito vigente; obter status formal para os documentos ativos |
| ADR-0005/0010 usam `packages/ui`; documentos/memórias antigos mencionam `shared-ui`                                          | Localização/nome do pacote de UI não é uniforme em snapshots de planejamento                          | **BAIXO**                                    | Registrar a localização canônica no ciclo normal de revisão documental, sem renomear ou implementar neste exercício         |

### Analytics

| Origem                                                                                                                                    | Impacto                                                                                                                                                          | Criticidade | Recomendação                                                                                         |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------- |
| ADR-0002/0003/0009 atribuem projeções a Analytics e distinguem-no da autoridade de Rankings; ADR-0009 chama uma projeção `RankingMetrics` | A semântica pode ser mal interpretada como ownership de ranking; não há contradição demonstrada, pois Analytics declara não ser proprietário do domínio Rankings | **MÉDIO**   | Preservar a distinção entre métrica/projeção e entidade/decisão de ranking ao revisar a documentação |
| ADR-0009 é Proposed, texto parcialmente achatado e não fecha dicionário, retenção/privacidade e operação de projeções                     | Métricas podem não ter definição, finalidade ou frescor inequívocos                                                                                              | **ALTO**    | Não tratar indicadores/telemetria como aprovados; manter esses elementos como lacunas do ADR-0009    |

### Itens que não são contradições atuais

- `tenantId` versus `schoolId`: resolvido nos documentos normativos ativos; `schoolId` é canônico.
- Ownership de membership escolar versus enrollment de turma: alinhado em ADR-0002/0003/0004.
- Estratégia de estado/auth entre ADR-0005 e ADR-0010: o texto atual de 0010 delega explicitamente ao 0005 e mantém sessão/autorização no servidor.
- Os eventos comuns verificados entre ADR-0002 e ADR-0009 incluem o mesmo produtor/nome para `UserRegistered`, `UserActivated`, `ChampionshipCreated` e `QuestionAnswered`; os achados antigos de divergência nesses nomes estão superados. Isso não significa que todo o catálogo ou a operação de eventos esteja fechado.

## 6. Lacunas reais ainda abertas

Esta lista exclui itens já resolvidos documentalmente, especialmente naming `schoolId`, ownership de memberships/enrollments e supersession de ADR-0005 antigo/0006–0008. Prioridade indica urgência de governança, não autorização para implementação.

| Lacuna aberta                                                                                                                                                                     | Impacto                                                                                                              | Documento(s) afetado(s)                                             | Prioridade                  |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | --------------------------- |
| Status de ADR-0001 e sign-off de stakeholders não reconciliados                                                                                                                   | Autoridade da decisão fundacional e dependentes fica ambígua                                                         | `ARCHITECTURE.md` seção 6, `INDEX.md`, `memory/project-state.md`    | **P0**                      |
| ADR-0002/0003/0004/0005/0009/0010 continuam Proposed; não há checklists preenchidas como aprovadas no índice                                                                      | A intenção está descrita, mas não há baseline aprovada para implementação normativa                                  | `INDEX.md` e os ADRs citados                                        | **P0**                      |
| Privacidade e governança de dados de menores (finalidade/base, consentimento quando aplicável, retenção, direitos, operadores e incidentes) não têm aprovação completa registrada | Bloqueia uso de dados reais e confiança em telemetria/analytics                                                      | ADR-0003, ADR-0004, ADR-0009 e decisões de suporte                  | **P0**                      |
| Critérios e lifecycle de ADR não definem autoridade/quorum, evidência de aceite, owner de revisão e procedimento completo de supersession                                         | Status futuro pode voltar a ficar ambíguo                                                                            | `INDEX.md`, `ADR-TEMPLATE.md`, memórias de decisão                  | **P1**                      |
| Contrato operacional de eventos não fecha registry completo, compatibilidade de schema, retry/DLQ/replay, retenção e SLO                                                          | Não há base documental aprovada para consumidores/eventos críticos e sua interação com privacidade                   | ADR-0002, ADR-0003, ADR-0009                                        | **P1**                      |
| ADR-0009 não oferece dicionário e semântica aprovados para métricas, frescor, retenção e telemetria externa                                                                       | Indicadores podem ter significado e tratamento de dados inconsistentes                                               | ADR-0009, ADR-0003, ADR-0004                                        | **P1**                      |
| Evidência de isolamento `schoolId`, constraints e validações negativas ainda não existe para os modelos de domínio                                                                | Segurança de tenancy é proposta, não comprovada                                                                      | ADR-0002, ADR-0003, ADR-0004                                        | **P1** antes de dados reais |
| Glossário não foi localizado                                                                                                                                                      | Vocabulário de negócio/técnico pode divergir; ausência do arquivo é real, mas não impede leitura individual dos ADRs | Documento Mestre (estrutura planejada), ADR-0002 a ADR-0009         | **P2**                      |
| ADR-0001 não existe como arquivo isolado; o texto embutido existe e é apontado pelo índice                                                                                        | Revisão, versionamento e sign-off são menos rastreáveis; não é ausência da decisão textual                           | `ARCHITECTURE.md`, `INDEX.md`                                       | **P2**                      |
| README/memórias e relatórios preservam snapshots antigos de setup, roadmap e achados                                                                                              | Onboarding e auditoria podem confundir plano com estado atual                                                        | `README.md`, `memory/*`, ADR Diagnostic Report e auditoria anterior | **P2**                      |
| Arquivo de ADR-0009 não tem extensão `.md` e conteúdo tem formatação irregular                                                                                                    | Descoberta e ferramentas Markdown são menos confiáveis; conteúdo continua legível como texto                         | ADR-0009, `INDEX.md`                                                | **P3**                      |

**Não é lacuna:** ausência de arquivo chamado `ADR-INDEX.md`; `INDEX.md` já cumpre a função de índice. Criar um segundo índice sem decisão explícita duplicaria a função atual.

## 7. Decisão de governança

### A arquitetura possui uma baseline clara e utilizável?

**NÃO**, se “baseline” significa conjunto aprovado para implementação normativa.

**Justificativa:** há baseline de referência localizável no `INDEX.md`, mas ADR-0001 tem status/sign-off contraditório e todas as decisões especializadas ativas estão Proposed. O índice, a auditoria e os ADRs diferenciam canonicalidade de aprovação. Logo, é possível entender a direção proposta, mas não declarar que a arquitetura inteira foi formalmente adotada.

### É possível iniciar a modelagem dos módulos de domínio?

**SIM, somente como rascunho de descoberta/modelagem, explicitamente Draft e não vinculante. NÃO como modelo aprovado, decisão normativa ou insumo para schema/implementação.**

**Justificativa:** ADR-0002 já documenta os bounded contexts e ownership conceitual com detalhe suficiente para uma atividade exploratória; ADR-0003 diz que seu modelo é conceitual e não aprova schema físico. Como os dois estão Proposed, qualquer resultado deve permanecer sujeito à aprovação e às lacunas P0, sem apresentar hipótese como decisão oficial.

## 8. Backlog de governança

|  Ordem | Ação                                                                                                            | Motivo                                                                                              | Impacto                                                                          |
| -----: | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 1 — P0 | Registrar a decisão dos responsáveis sobre ADR-0001 e status de aprovação da fundação no índice                 | É a ambiguidade na raiz da cadeia de dependências                                                   | Dá autoridade verificável à fundação e esclarece o status de suas derivadas      |
| 2 — P0 | Registrar aprovação ou manutenção como Proposed para cada ADR ativo, incluindo 0002–0005, 0009 e 0010           | A existência de documento canônico não equivale a aceite                                            | Evita que propostas sejam usadas como obrigações arquiteturais implícitas        |
| 3 — P0 | Fechar e registrar os gates de privacidade/segurança para dados de menores antes de qualquer uso de dados reais | ADR-0003/0004/0009 condicionam produção, analytics e dados a esses controles                        | Reduz risco de coleta/uso sem política aprovada e esclarece bloqueio de produção |
| 4 — P1 | Completar lifecycle, autoridade de aprovação e regra geral de supersession no processo documental               | Os status atuais têm solução pontual, não procedimento reutilizável                                 | Mantém trilha de decisão reproduzível e reduz nova ambiguidade                   |
| 5 — P1 | Consolidar o registro conceitual de contratos/eventos e a separação Analytics/Rankings/telemetria               | Os nomes coincidentes atuais estão alinhados, mas operação, retenção e métricas permanecem parciais | Dá uma referência governada para futuras revisões sem inventar contratos agora   |
| 6 — P1 | Registrar critérios de evidência de tenancy e segurança como gates de aceitação                                 | `schoolId` é canônico, mas não há prova de isolamento no domínio                                    | Distingue decisão documental de propriedade validada                             |
| 7 — P2 | Decidir se ADR-0001 permanece embutido ou ganha arquivo autônomo e produzir glossário                           | São lacunas de rastreabilidade e linguagem, não conflito de conteúdo central                        | Melhora navegação, entendimento e revisão interfuncional                         |
| 8 — P2 | Marcar README, memórias, Diagnostic Report e auditoria anterior como snapshots e alinhá-los ao estado corrente  | Há conteúdo de roadmap/status e achados que envelheceram                                            | Reduz conclusões antigas sendo confundidas com a baseline atual                  |
| 9 — P3 | Normalizar o arquivo e a apresentação Markdown do ADR-0009 dentro de revisão documental aprovada                | Nome/formatagem dificultam automação e leitura                                                      | Melhora descoberta sem alterar conteúdo de decisão                               |

## 9. BASELINE OFICIAL DO PROJETO

**Estado:** esta seção registra a baseline documental de referência em 2026-10-01. Não afirma que as propostas estejam aprovadas. O `INDEX.md` continua a fonte atual de caminhos/status; esta síntese não o substitui.

### Visão do produto

- **Fato documentado:** MateMágico Champions é descrito como plataforma SaaS educacional de treino para OBMEP Mirim e Níveis 1–3.
- **Fato documentado:** as jornadas planejadas incluem banco de questões, treino adaptativo, simulados, campeonatos, gamificação, rankings, certificados, gestão escolar e analytics pedagógico.
- **Status:** visão registrada; prioridades de MVP e sucesso pedagógico não demonstrados como decisões aceitas.

### Objetivos

- **Fato documentado:** simplicidade inicial, manutenibilidade, modularidade, documentação e crescimento evolutivo.
- **Fato documentado:** 10k/50k/100k aparecem como fases/metas de escala, não como capacidade verificada.
- **Fato incerto:** resultados de aprendizagem, metas de produto e workload/concurrency ainda sem critério acordado demonstrado.

### Arquitetura escolhida / proposta

- **Direção documental:** Modular Monolith, DDD e Clean Architecture; inicialmente uma aplicação/unidade de deploy.
- **Status formal:** ADR-0001 está embutido e declarado Accepted, mas stakeholder sign-off está pendente/ambíguo. Portanto a direção é referência, não baseline aprovada sem ressalva.
- **Regra proposta:** cada módulo é dono dos dados; chamadas síncronas por contratos públicos; eventos para projeções/efeitos; grafo síncrono sem ciclos.

### Stack

- **Direção documentada:** Next.js 15 App Router, React 19, TypeScript, Tailwind, Shadcn/Radix, PostgreSQL, Prisma e Auth.js.
- **Planejado, não topologia confirmada:** Supabase Storage; Vercel e Railway/Neon aparecem como possibilidades de deploy.
- **Estado observado do workspace:** npm workspaces/Turborepo, Next.js/React, Prisma com datasource PostgreSQL e schema sem modelos de domínio, Vitest e Playwright. O workspace prova fundação técnica, não funcionalidade de domínio.

### Bounded Contexts e módulos

- **Proposta canônica:** ADR-0002 lista 16 contextos: Auth/Authorization, Users, Schools, Classes, Topics, Questions, Question Engine, Study Paths, Attempts, Mock Exams, Championships, Rankings, Badges, Certificates e Analytics.
- **Capacidade futura:** AI opcional, substituível e não autoritativa para resultado acadêmico.
- **Ownership documentado:** Auth possui identidade de acesso, credenciais, sessões e membership escolar; Users possui perfil; Schools possui instituição; Classes possui turmas, enrollment e atribuições docentes. Acesso escolar e participação em turma são relações distintas.
- **Status:** ADR-0002 Proposed; a lista é proposta, não comprovação de módulos implementados.

### Banco de dados

- **Proposta canônica:** ADR-0003 define PostgreSQL transacional e Prisma, ownership lógico por bounded context, banco/schema compartilhado e isolamento escolar por `schoolId`.
- Dados analíticos são projeções; outbox/inbox não significa event sourcing; migrations de produção são descritas como forward-only.
- **Limite:** ADR-0003 não aprova schema físico. O `schema.prisma` observado não contém modelos de domínio.

### Segurança

- **Proposta canônica:** ADR-0004 define Auth.js Credentials para a V1, User global, papéis/memberships por escopo e autorização server-side deny-by-default.
- JWT/client não são autoridade de role, permission ou `schoolId`; MFA privilegiada e controles de segurança são requisitos/gates.
- **Status:** ADR-0004 Proposed; não há comprovação de Auth/RBAC completo nem de avaliação legal/ameaças aprovada. Não afirmar conformidade ou prontidão para dados reais.

### Frontend

- **Proposta canônica:** ADR-0005 define feature-based Next App Router, RSC como padrão, Server Actions como adapters, estado de negócio server-owned, Zustand opt-in para UI efêmera e TanStack Query opt-in.
- ADR-0010 trata composição visual/design system e, em seu texto atual, delega estado/auth ao 0005. Ambos Proposed.
- ADR-0006–0008 e ADR-0005 state-only são Superseded.

### Eventos

- **Proposta canônica:** ADR-0002 define comunicação síncrona por contratos, eventos para efeitos pós-commit, idempotência e envelope com `schoolId` quando escolar. ADR-0003 descreve outbox/inbox.
- ADR-0002 e ADR-0009 coincidem nos nomes/eventos sobrepostos examinados; isso não substitui um registry operacional completo.
- **Status:** proposta; compatibilidade, replay, retries/DLQ, retenção e SLOs não estão completamente fechados.

### Analytics

- **Proposta canônica:** ADR-0009 descreve Analytics como projeções eventualmente consistentes e reconstruíveis; não é fonte de verdade para domínios.
- ADR-0003 atribui `question_statistics`/métricas a Analytics, e o Engine consome snapshot; Rankings mantém sua própria projeção/autoridade de domínio.
- Telemetria operacional é distinguida de analytics educacional no texto atual; base legal/consentimento, retenção e exportação continuam pendentes.
- **Status:** Proposed; métricas e operação não devem ser tratadas como aprovadas.

### Roadmap

- **Fato observado/documentado:** fundação técnica inicial existe e a memória registra implementação de domínio ainda não iniciada; aprovação de arquitetura segue pendente.
- **Sequência declarada, não compromisso aprovado:** revisão/sign-off; modelagem conceitual; etapas de domínio; analytics e capacidades adaptativas; AI é futura.
- **Não assumir:** os marcos quantitativos ou topologias de crescimento provam suporte técnico.

## 10. MEMÓRIA PARA PROMPT 03

### Fatos Confirmados

- **Fato:** `docs/architecture/ADRs/INDEX.md` existe e é o índice atual; não há arquivo chamado `ADR-INDEX.md`.
- **Fato:** o índice aponta `ARCHITECTURE.md`, seção 6, como documento do ADR-0001 e informa aprovação de stakeholders pendente/por reconciliar.
- **Fato:** ADR-0002, 0003, 0004, 0005, 0009 e 0010 estão Proposed; 0005 é a proposta canônica de frontend/estado/BFF; 0010 tem escopo de composição/design system.
- **Fato:** ADR-0005 state-only e ADR-0006/0007/0008 estão Superseded e não são referências primárias.
- **Fato:** as fontes ativas convergem em `schoolId`; `SchoolMembership` é distinta de enrollment/teaching assignment.
- **Fato:** o texto atual de ADR-0010 remete estado/auth ao ADR-0005; a alegação da auditoria anterior de conflito ativo frontend não se confirma no texto atual.
- **Fato:** eventos coincidentes verificados entre ADR-0002 e ADR-0009 usam nomes/produtores alinhados; ainda falta governança operacional ampla de eventos.
- **Fato:** ADR-0003 atribui `question_statistics` e métricas a Analytics; o Engine consome snapshot. Analytics declara não ser proprietário de Rankings.
- **Fato:** workspace possui fundação web e schema Prisma sem modelos; isso não demonstra módulos de domínio, auth completa, isolamento escolar ou capacidade de produção.

### Fatos Contestados

- **Conflito:** ADR-0001 é Accepted no cabeçalho, mas sign-off de stakeholders permanece pendente no índice/memória.
- **Conflito de interpretação:** “Normative Baseline” no índice pode soar como aprovação; o próprio índice ressalva que Proposed não significa approved. Deve-se distinguir registro canônico de decisão aceita.
- **Fato desatualizado:** ADR Diagnostic Report e auditoria anterior afirmam ausências/conflitos que não correspondem ao workspace/textos atuais em todas as partes; não usar essas alegações sem revalidação.
- **Incerteza:** não há evidência no workspace de aceite formal externo que resolva o status de ADR-0001 ou dos ADRs Proposed.

### Decisões Oficiais

- **Nenhuma baseline completa aprovada pode ser confirmada com as fontes disponíveis.**
- **Decisão apenas declarada:** ADR-0001 declara Modular Monolith + DDD + Clean Architecture como Accepted, mas aprovação permanece ambígua.
- **Referências propostas:** ADR-0002/0003/0004/0005/0009/0010 são canônicas por tema no índice, mas continuam Proposed.
- **Proposta de tenancy:** `schoolId` é a nomenclatura canônica nos documentos ativos; não reabrir conflito de nome com base em relatórios antigos.

### Documentos Superseded

- `ADR-0005-state-management-strategy.md` → substituído pelo ADR-0005 frontend/state/BFF canônico.
- ADR-0006 → substituído pelo ADR-0005 e ADR-0010 para composição visual.
- ADR-0007 → substituído pelo ADR-0005.
- ADR-0008 → substituído pelo ADR-0005.
- Estes documentos permanecem como histórico; não devem orientar decisão/implementação atual.

### Lacunas Abertas

- Sign-off e status inequívoco de ADR-0001.
- Aprovação formal ou manutenção explícita como Proposed de cada ADR ativo.
- Gates de segurança/privacidade para dados de menores.
- Lifecycle, critérios de aprovação e regra geral de supersession.
- Governança operacional de eventos e política de Analytics/telemetria, retenção e métricas.
- Evidência de isolamento `schoolId` antes de dados reais.
- Glossário e decisão de rastreabilidade sobre ADR-0001 autônomo versus seção embutida.
- Alinhamento de README/memórias/relatórios com o estado atual.

### Próxima Ação Recomendada

**Uma única ação:** obter e registrar a decisão formal dos responsáveis sobre a fundação arquitetural, resolvendo se ADR-0001 foi aprovado e atualizando seu status/sign-off no `INDEX.md`.

**Justificativa:** ADR-0001 é a raiz declarada das dependências. Sem resolver sua autoridade, não é possível distinguir proposta de baseline aprovada nem classificar com segurança as decisões derivadas. Essa ação não altera arquitetura por si só; registra a decisão dos responsáveis.

---

**Nota de uso:** este documento consolida o estado encontrado em 2026-10-01. Não substitui o `INDEX.md`, não muda status de ADR e não concede autorização para schema, APIs, implementação ou uso de dados reais.
