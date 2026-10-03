# ADR-GOVERNANCE - Architectural Decision Governance

**Data:** 2026-10-01  
**Status:** Proposed; requer aprovacao antes de se tornar politica oficial  
**Responsavel pelo processo:** Architecture Lead  
**Decisores desta politica:** Architecture Lead, Tech Lead, Product Owner e CTO/patrocinador do produto, com revisao Security Reviewer quando aplicavel  
**Revisores:** Tech Lead, Product Owner, Security Reviewer e stakeholders afetados  
**Escopo:** ciclo de vida, aprovacao, supersession, rastreabilidade, auditoria e manutencao documental de ADRs. Nao decide arquitetura, stack, ownership, tenancy ou desenho tecnico.

> Esta politica e uma proposta de governanca. Ate seu proprio status mudar para Accepted com aprovacao registrada, ela nao altera o funcionamento dos ADRs existentes nem pode ser apresentada como processo oficial adotado.

## 1. Principios de governanca

| Principio                         | Regra de governanca                                                                                                                                                               | Motivo                                                                             |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Decidir antes de depender         | Uma decisao que altera arquitetura deve ser registrada e ter status visivel antes de ser tratada como requisito para trabalho posterior. Um rascunho ou Proposed nao e aprovacao. | Evita que convencoes informais se tornem arquitetura por acidente.                 |
| Responsabilidade identificavel    | Todo ADR ativo tem owner, deciders e revisores identificados por nome ou funcao, alem de data e status.                                                                           | Permite saber quem mantem o documento e quem tinha autoridade para decidir.        |
| Decisao auditavel                 | Registrar contexto, escolha, alternativas, consequencias, riscos, dependencias, aprovacoes e motivo de rejeicao/supersession.                                                     | Preserva a justificativa e o historico da decisao.                                 |
| Historico preservado              | Decisoes aceitas nao sao sobrescritas silenciosamente; mudanca material gera novo ADR relacionado.                                                                                | Mantem rastreabilidade temporal sem apagar o raciocinio anterior.                  |
| Justificativa proporcional        | Alternativas, riscos e trade-offs devem refletir as fontes e evidencias disponiveis; ausencia de dados e declarada, nao preenchida com suposicoes.                                | Evita transformar metas, estimativas ou hipotese em fato.                          |
| Uma referencia corrente           | `INDEX.md` deve apontar o documento canonico, status e relacoes de cada ADR numerado.                                                                                             | Reduz referencias concorrentes e facilita descobrir qual texto esta vigente.       |
| Revisao pelos impactos            | Revisores sao selecionados conforme componentes, dominios e riscos afetados; seguranca/privacidade e revisadas quando o escopo as toca.                                           | As pessoas afetadas participam sem tornar toda mudanca uma revisao indiscriminada. |
| Arquitetura como ativo do produto | ADRs, indice, Documento Mestre, memorias e relatorios sao mantidos como documentacao versionada do projeto, com funcoes distintas.                                                | O conhecimento arquitetural precisa sobreviver a mudancas de equipe e produto.     |

## 2. Papeis e responsabilidades

As responsabilidades abaixo sao a politica proposta. Os documentos atuais identificam Architecture Lead, Tech Lead, Product/Product Manager, Security Lead e stakeholders; nem todas as funcoes possuem pessoas nomeadas no workspace. O papel Product Owner pode ser exercido pela funcao de Product Manager formalmente designada. Security Reviewer corresponde ao Security Lead ou revisor designado.

### Architecture Lead

- **Responsabilidades:** manter o processo; ajudar a delimitar escopo; assegurar que ADRs tenham owner, dependencias, impactos e relacoes; facilitar revisoes; registrar a decisao; manter o `INDEX.md` coerente depois da aprovacao.
- **Autoridade proposta:** encaminhar um Draft para revisao, devolver um documento incompleto, recomendar status e registrar o status aprovado. Pode manter correcoes editoriais sem alterar a decisao, registrando-as.
- **Limites:** nao pode aceitar, rejeitar ou superseder uma decisao unilateralmente; nao pode transformar recomendacao sua em decisao tecnica aceita.

### Tech Lead

- **Responsabilidades:** revisar coerencia tecnica, impacto entre modulos, dependencias, viabilidade, riscos operacionais e alinhamento com ADRs aceitos.
- **Autoridade proposta:** registrar parecer tecnico, objeções e condicoes; atuar como decider quando nomeado no ADR.
- **Limites:** nao aprova sozinho decisoes de produto, seguranca ou arquitetura transversal; nao altera ownership de outro contexto por parecer tecnico informal.

### Product Owner

- **Responsabilidades:** revisar problema, objetivos, restricoes de produto, prioridades, impacto em usuarios e trade-offs de produto.
- **Autoridade proposta:** registrar aceite ou objeção sobre consequencias de produto; atuar como decider quando nomeado no ADR.
- **Limites:** nao aprova sozinho arquitetura tecnica ou excecoes de seguranca; nao substitui revisao de stakeholders afetados.

### Security Reviewer

- **Responsabilidades:** revisar ADRs com impacto em identidade, autorizacao, dados pessoais/de menores, segredos, fronteiras de confianca, eventos ou fornecedores de dados; registrar findings e se estao resolvidos ou bloqueadores.
- **Autoridade proposta:** exigir que findings relevantes sejam respondidos e registrar parecer; atuar como decider quando nomeado no ADR.
- **Limites:** nao aceita sozinho um ADR completo nem decide objetivos de produto; a aprovacao final permanece com os deciders nomeados. Um finding critico nao resolvido impede a conclusao de Accepted ate ser resolvido ou formalmente decidido pelos deciders com justificativa e autoridade apropriada.

### Stakeholders e deciders

- **Responsabilidades:** fornecer requisitos/impactos de suas areas, revisar trade-offs e responder explicitamente ao pedido de decisao.
- **Autoridade proposta:** os **deciders nomeados no ADR** sao a autoridade de decisao. Para decisao fundacional ou transversal, a lista deve incluir as funcoes afetadas e o CTO/patrocinador quando indicado pelo escopo; Product, Tech e Architecture participam conforme o tema. Os demais stakeholders sao Consulted ou Informed, nao aprovadores implicitos.
- **Limites:** silencio, participacao em reuniao ou ausencia de objeção nao significa aprovacao. Uma pessoa so e decider se estiver listada como tal ou formalmente designada para a funcao no ADR.

### Matriz RACI

R = Responsible (executa), A = Accountable (responde pelo resultado da atividade), C = Consulted, I = Informed. A matriz descreve o processo proposto; a autoridade final de uma decisao continua sendo dos deciders identificados no ADR.

| Atividade                                            | Architecture Lead | Tech Lead            | Product Owner        | Security Reviewer    | Stakeholders / deciders   |
| ---------------------------------------------------- | ----------------- | -------------------- | -------------------- | -------------------- | ------------------------- |
| Criar Draft e manter completude                      | A/R               | C                    | C                    | C se aplicavel       | C conforme escopo         |
| Revisao tecnica e de dependencias                    | A                 | R                    | C                    | C se aplicavel       | I                         |
| Revisao de impacto de produto                        | C                 | C                    | A/R                  | C se aplicavel       | C                         |
| Revisao de seguranca/privacidade                     | C                 | C                    | C                    | A/R quando aplicavel | I ou C conforme nomeacao  |
| Decidir Accepted, Rejected, Deprecated ou Superseded | R para registro   | C ou decider nomeado | C ou decider nomeado | C ou decider nomeado | A entre deciders nomeados |
| Atualizar indice e relacoes apos decisao             | A/R               | C                    | C                    | C se aplicavel       | I                         |
| Revisao periodica do inventario                      | A/R               | C                    | C                    | C                    | I                         |

Uma linha com varios deciders nao implica aprovacao por maioria tacita. O ADR deve registrar a regra de decisao acordada pelos deciders antes da votacao; se nao houver regra registrada, exige-se resposta explicita de cada decider nomeado para Accepted.

## 3. Ciclo de vida dos ADRs

Os estados abaixo formam o lifecycle proposto. O `ADR-TEMPLATE.md` atual nao lista Draft ou Rejected; se esta politica for aceita, o template e o indice deverao ser alinhados em revisao documental separada. Nenhum estado novo altera retroativamente o status de documentos existentes.

| Estado         | Objetivo e significado                                                                                                                           | Quem pode alterar                                                                                                      | Requisitos minimos                                                                                                                                           | Saida esperada                                                                                             |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| **Draft**      | Preparar uma decisao para revisao. Nao e decisao aprovada e nao e orientacao de implementacao.                                                   | Owner/autor edita; Architecture Lead valida passagem a Proposed ou devolve para trabalho.                              | Titulo, owner, contexto, problema/questao, fontes e impactos inicialmente conhecidos. Lacunas marcadas como abertas.                                         | Progredir a Proposed, permanecer Draft ou ser abandonado/arquivado com motivo.                             |
| **Proposed**   | Declarar que a proposta esta completa o bastante para avaliacao e pede uma decisao. Nao autoriza uso como baseline aprovada.                     | Owner propoe; Architecture Lead atualiza status apos checagem de completude; deciders podem pedir revisao ou rejeitar. | Template preenchido ou secao marcada N/A com justificativa; deciders/revisores identificados; dependencias e riscos mapeados; revisoes requeridas iniciadas. | Accepted, Rejected ou retorno a Draft.                                                                     |
| **Accepted**   | Registrar decisao aprovada pelos deciders com evidencia. E o unico status que torna o ADR vigente como decisao, sujeito a escopo e dependencias. | Somente apos aprovacoes explicitas; Architecture Lead registra status e indice, sem decidir unilateralmente.           | Checklist de aceite completa; nenhum bloqueador aberto; decisores, revisoes, data, condicoes e escopo registrados; indice atualizado.                        | Mantem-se vigente ate revisao, Deprecated ou Superseded.                                                   |
| **Deprecated** | Registrar que uma decisao aceita foi retirada e nao deve mais orientar novas decisoes; nao ha substituto integral.                               | Deciders do ADR afetado; Architecture Lead registra e atualiza indice/impactos.                                        | Motivo, data efetiva, escopo retirado, dependentes afetados e tratamento de usos existentes.                                                                 | Permanece historico; consumidores recebem orientacao sobre descontinuidade.                                |
| **Superseded** | Registrar que um ADR aceito foi substituido total ou parcialmente por outro ADR. O documento antigo permanece historico.                         | Deciders do ADR substituido e do sucessor; Architecture Lead efetua registro sincronizado.                             | Sucessor Accepted; relacao `Superseded By`/`Supersedes`; escopo substituido, nao substituido e dependentes identificados.                                    | Documento antigo fica nao normativo; indice aponta a cadeia atual.                                         |
| **Rejected**   | Registrar que uma proposta foi avaliada e nao aceita. Nao e decisao vigente.                                                                     | Deciders nomeados; Architecture Lead registra resultado e razao.                                                       | Motivo, data, decisores, revisoes consideradas e eventual condicao para reapresentacao.                                                                      | Fica no historico; nova proposta recebe referencia ao rejeitado, sem reutilizar silenciosamente a decisao. |

### Transicoes de status

- `Draft -> Proposed`: owner conclui o documento e Architecture Lead confirma completude para revisao.
- `Proposed -> Accepted`: somente apos a decisao e evidencias de aceite definidas neste ADR.
- `Proposed -> Rejected`: decisores concluem explicitamente que a proposta nao sera adotada.
- `Proposed -> Draft`: revisores ou deciders identificam lacunas que impedem decisao; registrar o motivo.
- `Accepted -> Deprecated`: decisores aprovam retirada sem substituto integral.
- `Accepted -> Superseded`: somente junto a aceitacao do ADR substituto, sem intervalo ambiguo de autoridade.
- `Rejected`, `Deprecated` e `Superseded` nao voltam a Proposed/Accepted. Uma nova proposta recebe novo identificador e relaciona o historico.

## 4. Processo de aprovacao

### Workflow

```text
Ideia
  -> nomear owner e escopo
Draft
  -> completar contexto, alternativas, impactos, riscos e dependencias
Review
  -> revisao tecnica, produto e seguranca/privacidade conforme impacto
Proposed
  -> publicar pedido de decisao com deciders e prazo de resposta
Approval
  -> deciders registram approve, reject ou pedido de mudanca
Accepted
  -> Architecture Lead registra decisao, evidencias, data, indice e referencias
```

Uma solicitacao de mudanca leva o ADR a Draft ou permanece Proposed com alteracoes solicitadas; nao ha aceite por falta de resposta.

### Quem revisa e quem aprova

1. **Architecture Lead** verifica escopo, completude, dependencias e consistencia com ADRs Accepted.
2. **Tech Lead** revisa impacto/viabilidade tecnica e dependencias.
3. **Product Owner** revisa problema, prioridades e trade-offs de produto.
4. **Security Reviewer** revisa quando a decisao afeta seguranca, autenticacao, autorizacao, privacidade, menores, dados, eventos ou fronteiras de confianca.
5. **Deciders nomeados no ADR** aprovam ou rejeitam. Para decisao fundacional/cross-cutting, o ADR identifica as funcoes afetadas e o patrocinador executivo quando apropriado.
6. **Architecture Lead** registra o resultado e atualiza `INDEX.md`; nao substitui o voto dos deciders.

### Criterios de aceite e rejeicao

**Aceite:** decisao cabe no escopo, resolve a questao declarada, e coerente com ADRs Accepted ou inclui plano explicito de supersession; impactos e riscos sao conhecidos; revisoes obrigatorias foram registradas; deciders aprovaram explicitamente.

**Rejeicao ou retorno a Draft:** objetivo/escopo nao esta claro; falta owner ou autoridade de decisao; ha contradicao material sem plano de resolucao; evidencia essencial esta ausente ou apresentada como fato sem suporte; risco critico de seguranca/privacidade permanece sem tratamento/aprovacao competente; ou os deciders recusam a proposta. Rejeicao e decisao registrada, nao remocao do arquivo.

## 5. Criterios obrigatorios para Accepted

Checklist oficial proposto; todos os itens devem estar marcados ou justificados como N/A. O checkbox e evidencia de revisao, nao substitui o registro de aprovacao.

- [ ] Titulo, identificador, data, status, owner, deciders, revisores e escopo estao registrados.
- [ ] Contexto, problema, restricoes e requisitos sao rastreaveis a fontes.
- [ ] Decisao esta formulada de modo claro e limitado ao escopo do ADR.
- [ ] Alternativas foram consideradas ou a ausencia delas foi justificada.
- [ ] Consequencias positivas/negativas, trade-offs e riscos estao documentados.
- [ ] Dependencias, ADR pai/filhos, documentos impactados e relacoes foram mapeados.
- [ ] Compatibilidade com ADRs Accepted foi verificada; contradicoes materiais foram resolvidas ou acompanhadas de supersession aprovada.
- [ ] Revisao tecnica e de produto foi registrada; revisao de seguranca/privacidade foi concluida quando aplicavel.
- [ ] Nenhum bloqueador permanece aberto; ressalvas nao bloqueadoras e condicoes de revisao estao registradas.
- [ ] Referencias e links foram verificados; evidencias, premissas e dados ausentes estao distinguidos.
- [ ] Cada decider nomeado registrou decisao explicita, nome/funcao e data; objections e resolucoes ficaram registradas.
- [ ] Architecture Lead atualizou `INDEX.md`, dependencias, status e links na mesma mudanca documental.

## 6. Processo de supersession

### Regras

1. Um ADR pode substituir outro quando o escopo, uma parte da decisao ou as consequencias relevantes mudarem, e uma nova decisao for necessaria. A relacao e aprovada pelos deciders afetados.
2. ADR substituto passa a Accepted antes ou na mesma mudanca documental em que o predecessor passa a Superseded. Nao deixar dois ADRs conflitantes como Accepted nem um intervalo sem fonte vigente.
3. O novo ADR registra `Supersedes: ADR-XXXX`; o anterior registra `Superseded By: ADR-YYYY`, com data e escopo da substituicao.
4. Se a substituicao for parcial, declarar precisamente quais clausulas/decisoes foram substituidas e quais continuam vigentes. Nao inferir que todo o predecessor foi revogado.
5. Preservar o arquivo anterior como historico; nao apagar nem reescrever a decisao anterior. Corrigir apenas erro editorial sem alterar sentido, registrando data/autor. Mudanca material exige novo ADR.
6. Atualizar `INDEX.md`, dependencias, referencias cruzadas e documentos de apoio na mesma revisao; marcar o predecessor Superseded e retirar seu conteudo das referencias normativas.
7. `Deprecated` e reservado a retirada sem substituto integral; nao usar como sinonimo de Superseded.
8. ADRs Draft/Proposed podem ser rejeitados ou substituidos como proposta, mas nao recebem Superseded como se tivessem sido decisao Accepted; registrar Rejected/abandonado e a relacao historica apropriada.

### Protecao contra conflitos

- Antes de aceitar sucessor, listar ADRs e documentos dependentes e determinar se permanecem validos.
- Se o sucessor alterar premissas de ADRs filhos, atualizar ou reabrir os filhos antes de declarar a cadeia consistente.
- O `INDEX.md` deve apontar uma unica referencia primaria vigente por decisao/escopo.
- Um ADR Superseded permanece pesquisavel, mas seu cabecalho e o indice indicam explicitamente que nao e normativo.

## 7. Parecer de governanca sobre ADR-0001

### O que falta para Accepted

- Resolver a divergencia entre o cabecalho Accepted do ADR-0001 embutido em `ARCHITECTURE.md` e a aprovacao/sign-off pendente registrados em `INDEX.md` e na memoria.
- Confirmar quem integra os deciders. O Documento Mestre nomeia “Architecture Team”, sem pessoas; a lista de revisores potenciais em `memory/next-steps.md` nao prova aprovacao.
- Obter pareceres e aprovacoes explicitas dos deciders designados, com nome/funcao, data e eventuais ressalvas.
- Aplicar o checklist da secao 5 e confirmar as dependencias/relacoes com ADR-0002, 0003 e 0004.
- Registrar a decisao e atualizar `INDEX.md` para uma fonte canonica inequívoca.

### Quem deve aprovar

**Sob o modelo proposto:** os deciders formalmente nomeados para ADR-0001. A fonte atual identifica Architecture Team, mas nao seus integrantes. Antes da decisao, os responsaveis devem confirmar os nomes/funcoes. A lista de stakeholder review existente aponta Product Manager, Tech Lead e CTO/VP Engineering; estes devem ser designados como deciders ou revisores, conforme autoridade que os stakeholders confirmarem. Architecture Lead coordena e registra; nao aprova sozinho. Security Reviewer participa se os deciders julgarem que o escopo ou os findings de seguranca/privacidade exigem revisao, sem substituir os deciders.

### Evidencias necessarias

- Registro de revisao do ADR-0001 final.
- Deciders e revisores identificados e seus pareceres datados.
- Decisao explicita de cada decider, com aprovacao, rejeicao ou ressalva.
- Checklist de aceite preenchida ou N/A justificado.
- Status e link canonico reconciliados no `INDEX.md` com o trecho embutido no Documento Mestre.
- Evidencia de que nenhum conflito material ou bloqueador foi tratado como aprovado por silencio.

### Risco de permanecer Proposed

- Propostas derivadas podem ser confundidas com obrigacoes aprovadas ou ficar sem uma base formal confirmada.
- Implementacao pode usar premissas de arquitetura sem autoridade rastreavel.
- O status Accepted embutido pode induzir aprovacao presumida, enquanto o indice informa o contrario.
- Dependencias, excecoes e supersessions futuras podem ser avaliadas contra uma fundacao cujo aceite e ambiguidade nao foram resolvidos.

**Parecer:** ADR-0001 nao deve ser tratado como Accepted sem reconciliacao e evidencias acima. O status recomendado continua **Proposed** ate decisao formal; este ADR-GOVERNANCE nao aprova nem altera ADR-0001.

## 8. Rastreabilidade arquitetural

Cada ADR registra, no minimo:

| Campo de rastreabilidade | Conteudo esperado                                                                                   |
| ------------------------ | --------------------------------------------------------------------------------------------------- |
| Identidade e controle    | Numero, titulo, data, status, owner, deciders, revisores, data da ultima revisao                    |
| Motivacao e decisao      | Problema, contexto, restricoes, decisao e justificativa baseada nas fontes                          |
| Relacoes                 | `Depends On`, ADR pai, ADRs filhos/dependentes, decisoes relacionadas, predecessores e sucessores   |
| Impacto                  | Sistemas, modulos, documentos e papeis afetados; escopo total ou parcial                            |
| Consequencias            | Trade-offs, riscos, alternativas e gatilhos de reconsideracao                                       |
| Aprovacao                | Resultado por decider, data, ressalvas, objeções e como foram resolvidas                            |
| Historico                | Mudancas editoriais/materials, supersession, deprecacao e links para historico                      |
| Evidencias               | Referencias, discussoes registradas, verificacoes/observacoes quando houver; premissas explicitadas |

`ADR pai` descreve dependencia conceitual/decisoria, nao heranca de status. ADR filho nao se torna Accepted quando seu pai e Accepted. Uma mudanca em pai dispara revisao de impacto nos filhos; nao os altera automaticamente.

`INDEX.md` resume identidade, status, caminho canonico, dependencias, sucessor/predecessor e ultima revisao. Links entre ADRs devem ser bidirecionais para dependencias relevantes. Documento Mestre, memórias e relatorios referenciam o ADR por identificador e nao copiam uma decisao como texto normativo divergente.

## 9. Politica de auditoria arquitetural

A periodicidade abaixo e a politica proposta; nao e evidência de auditorias ja realizadas.

### Revisao trimestral

- Architecture Lead verifica inventario, status, owner, links, aprovacoes pendentes e revisoes vencidas no `INDEX.md`.
- Owners confirmam se premissas/impactos mudaram e se os gatilhos de reconsideracao ocorreram.
- Resultado: data da revisao e findings registrados; ADR nao muda de status sem aprovacao prevista neste processo.

### Revisao semestral

- Revisao transversal de dependencias e consistencia entre ADRs Accepted/Proposed, Documento Mestre, indice e memorias.
- Revisao de impactos de produto, dados, seguranca e operacao com os respectivos revisores.
- Verificacao de predecessores, sucessores, riscos abertos, decisores/owners e metricas de governanca.
- Resultado: relatorio datado de auditoria; recomendacoes nao alteram ADRs ate aprovacao.

### Revisao extraordinaria

Iniciar quando qualquer um destes fatos ocorrer: mudanca material em objetivo/restricao fundacional; mudanca legal/de privacidade relevante; incidente ou finding critico que contradiga premissa aceita; trigger de reconsideracao explicitamente definido num ADR; proposta de supersession; nova dependencia que contradiz fronteiras aprovadas; ou decisao aceita que perca owner/evidencia essencial.

O Architecture Lead registra o gatilho, ADRs afetados, participantes e conclusao. Revisao extraordinaria nao significa automaticamente que a decisao anterior foi revogada.

## 10. Governanca de documentacao

| Artefato                             | Funcao e regra                                                                                                                                                                | Responsavel proposto                                              | Quando atualizar / validar                                                                                                                     |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `INDEX.md`                           | Registro de status, link canonico, dependencias, supersession e decisoes abertas. Nao e substituto do texto do ADR nem mecanismo de aprovacao tacita.                         | Architecture Lead                                                 | Em cada transicao de status, novo ADR, supersession, mudanca de link ou revisao de inventario; conferir links e univocidade da fonte canonica. |
| Documento Mestre (`ARCHITECTURE.md`) | Contexto do produto, visao fundacional e estrutura; texto de ADR incorporado deve apontar para fonte canonica. Nao duplicar decisoes especializadas como normas concorrentes. | Architecture Lead com owners de conteudo                          | Quando visao/restricoes mudarem ou decisao canonica mudar; identificar claramente historia, proposta e decisao aceita.                         |
| ADRs                                 | Fonte primaria da decisao em seu escopo; um arquivo/caminho canonico por decisao corrente, com status visivel.                                                                | Owner do ADR; Architecture Lead mantem processo                   | Em nova decisao, aprovacao, mudanca material, reconsideracao ou supersession. Validar checklist, revisoes, relacoes e links.                   |
| Memorias (`memory/*`)                | Snapshot de estado, contexto e proximos passos; nao sao autoridade de aprovacao.                                                                                              | Owner da memoria/designado; Architecture Lead revisa consistencia | Apos marcos de aprovacao ou mudanca material; rotular historico e nao deixar status de ADR contradizer `INDEX.md` sem nota.                    |
| Relatorios de auditoria              | Findings datados, escopo, fontes, limites e recomendacoes; nao aprovam nem substituem ADRs.                                                                                   | Architecture Lead ou auditor designado                            | A cada ciclo trimestral/semestral ou gatilho extraordinario; findings resolvidos devem apontar a fonte atual e data.                           |
| `ADR-TEMPLATE.md`                    | Estrutura padrao de ADR. Alteracoes ao template sao documentacao de governanca e exigem revisao/aprovacao segundo este processo.                                              | Architecture Lead                                                 | Quando governanca Accepted mudar ou o template deixar de suportar os estados/campos aprovados; versionar e revisar links.                      |

### Validacao de consistencia

Antes de fechar uma mudanca documental, conferir identificador/titulo, status, owner, deciders, dependencias, links, referencias `Superseded By`/`Supersedes`, existencia de uma unica fonte canonica e alinhamento do `INDEX.md`. Relatorios e memórias recebem data/escopo e nao devem atualizar status por conta propria.

## 11. Metricas de governanca

As metas numericas marcadas **propostas** so passam a ser compromissos apos a aprovacao deste ADR. No primeiro ciclo deve-se registrar baseline; KPI nao e instrumento para aprovar ADR sem revisao.

| KPI                                                  | Formula                                                                                                                           | Objetivo proposto                            | Interpretacao                                                                                               |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| ADRs de implementacao aceitos antes do uso normativo | ADRs que governam trabalho iniciado em Accepted / total de ADRs aplicaveis ao trabalho iniciado x 100                             | **100%**                                     | Mede se trabalho arquiteturalmente condicionado se apoia em decisoes aceitas, nao em propostas silenciosas. |
| Accepted com aprovacao rastreavel                    | ADRs Accepted com deciders, data e registro por decisor / total de ADRs Accepted x 100                                            | **100%**                                     | Um Accepted sem evidência e um defeito de governanca.                                                       |
| ADRs ativos sem owner                                | Contagem de Draft/Proposed/Accepted sem owner identificado                                                                        | **0**                                        | Owner e responsavel por revisao e rastreabilidade.                                                          |
| ADRs ativos vencidos para revisao                    | ADRs cujo intervalo/gatilho de revisao expirou sem revisao registrada / total de ADRs ativos x 100                                | **0%**                                       | Intervalo segue politica de revisao deste ADR ou trigger indicado no proprio ADR.                           |
| Cobertura de supersession                            | ADRs Superseded com sucessor e links nos dois sentidos no indice/documentos / total de ADRs Superseded x 100                      | **100%**                                     | Mantem cadeia historica localizavel.                                                                        |
| Tempo de ciclo de aprovacao                          | Mediana de dias uteis entre Proposed pronto para decisao e Accepted/Rejected; pausar tempo enquanto aguarda informacao solicitada | **Meta inicial proposta: ate 15 dias uteis** | Observa previsibilidade; nao reduz revisao necessaria para cumprir prazo. Reavaliar apos dois ciclos.       |
| Percentual Superseded                                | ADRs Superseded / total de ADRs numerados x 100                                                                                   | **Monitorar tendencia, sem alvo de reducao** | Supersession e normal quando decisoes mudam; percentual alto/baixo isolado nao mede qualidade.              |
| Contradicoes criticas abertas                        | Contagem de contradicoes Criticas entre decisoes ativas sem owner/plano de resolucao                                              | **0 em ADRs Accepted**                       | Propostas podem registrar questoes abertas; uma decisao Accepted nao pode ocultar contradicao bloqueadora.  |

## 12. Riscos de governanca

| Risco                                                                                      | Severidade  | Impacto                                                                                        | Mitigacao de governanca                                                                                       |
| ------------------------------------------------------------------------------------------ | ----------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Status Accepted sem registro de aprovacao (evidenciado pela divergencia atual de ADR-0001) | **CRÍTICO** | Implementacao e ADRs dependentes podem ser tratados como aprovados sem autoridade verificavel. | Aplicar checklist; exigir decisores/date/evidencia; reconciliar status e indice antes de declarar Accepted.   |
| Deciders ou autoridade indefinidos                                                         | **ALTO**    | Proposta fica bloqueada ou aprovada por participante sem mandato claro.                        | Nomear deciders por ADR e separar revisores de aprovadores.                                                   |
| Propostas usadas como decisao normativa                                                    | **ALTO**    | Decisoes tecnicas nao aceitas viram requisitos implicitos.                                     | Exibir status em cabecalho/indice; proibir aprovacao por silencio; auditar trabalho que depende de ADR.       |
| Supersession incompleta ou somente unidirecional                                           | **ALTO**    | Duas referencias podem parecer vigentes ou dependentes ficarem presas a predecessor.           | Sucessor Accepted, predecessor Superseded, referencias bidirecionais e atualizacao atomica do indice.         |
| Documento Mestre, indice, ADR e memoria divergirem                                         | **MÉDIO**   | Onboarding e revisoes reutilizam fotografia antiga como autoridade atual.                      | Definir funcao de cada artefato; atualizar snapshots apos decisoes e auditar consistencia.                    |
| Falta de revisao de seguranca/privacidade quando aplicavel                                 | **CRÍTICO** | Decisoes sobre dados de menores, identidade ou acesso podem prosseguir sem parecer competente. | Tornar revisao aplicavel obrigatoria; findings criticos abertos impedem Accepted ate decisao formal adequada. |
| KPI de velocidade pressionar aceite prematuro                                              | **MÉDIO**   | Prazo pode ser otimizado em detrimento de analise e risco.                                     | Usar mediana com tempo pausado por informacao pendente; nunca condicionar aceite a prazo.                     |

## 13. Decisao final sobre capacidade do modelo

As respostas avaliam a **governanca proposta enquanto este ADR permanece Proposed**. `SIM` significa que o processo cobre o tipo de decisao depois de formalmente aceito e aplicado; nao significa que a decisao citada ja esteja aprovada.

| Questao                    | Resposta             | Justificativa                                                                                                                                                                                                                   |
| -------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Aprovar ADR-0001 agora? | **NAO**              | O modelo define os passos, mas o proprio modelo ainda precisa ser aceito; ADR-0001 tambem tem Accepted embutido versus sign-off pendente, deciders sem nomes e ausencia de registro de aceite.                                  |
| 2. Governar ADR-0002?      | **SIM, condicional** | O lifecycle e a matriz de papeis cobrem decisao transversal; aplicar somente depois de ADR-GOVERNANCE Accepted e deciders do ADR-0002 confirmados. ADR-0002 permanece Proposed ate decisao propria.                             |
| 3. Governar ADR-0003?      | **SIM, condicional** | Revisoes por Tech/Data/Backend, Produto e seguranca/privacidade conforme impacto cabem no processo; este modelo nao aprova modelo de dados nem schema. ADR-0003 permanece Proposed.                                             |
| 4. Governar ADR-0004?      | **SIM, condicional** | O Security Reviewer tem revisao explicita, e deciders mantem autoridade de aceite; gate juridico/privacidade e controles descritos no ADR continuam dependentes de evidencia e aprovacao proprias. ADR-0004 permanece Proposed. |
| 5. Governar ADRs futuros?  | **SIM, condicional** | Draft, Proposed, Accepted, Deprecated, Superseded e Rejected, aprovacao, RACI, rastreabilidade e auditoria estao cobertos; o processo so se torna oficial depois de aceito e refletido no indice/template.                      |

**Conclusao:** a proposta e suficiente como modelo procedimental para governar estes tipos de ADRs apos sua adocao; **nao e suficiente para declarar nenhuma decisao tecnica aceita hoje**. A aprovacao desta politica e necessaria antes de aplica-la como autoridade oficial.

## 14. MEMÓRIA PARA PROMPT 05

### Governanca definida

- Este documento propoe ciclo de vida Draft, Proposed, Accepted, Deprecated, Superseded e Rejected.
- Deciders nomeados no ADR possuem autoridade de decisao; Architecture Lead coordena e registra, mas nao aprova unilateralmente.
- Tech Lead, Product Owner e Security Reviewer revisam conforme impacto; stakeholders nao nomeados como deciders sao Consulted/Informed, nao aprovadores por presenca.
- `INDEX.md` e o registro de status/caminhos; ADR e a fonte primaria do conteudo de sua decisao; memórias e relatorios sao apoio/historico.
- Regras de revisao trimestral, semestral e extraordinaria e KPIs estao propostas, nao vigentes ate aceitacao desta politica.

### Criterios de aprovacao

- Owner, escopo, deciders/revisores e dependencias identificados.
- Contexto, decisao, alternativas, consequencias, riscos e documentos impactados registrados.
- Revisoes tecnicas/de produto e seguranca/privacidade quando aplicaveis concluidas.
- Sem bloqueador aberto ou contradicao material sem resolucao aprovada.
- Aprovacoes explicitas de todos os deciders nomeados, com nome/funcao e data.
- `INDEX.md` atualizado com status e fonte canonica na mesma mudanca documental.

### Criterios de supersession

- Sucessor Accepted; predecessor Superseded na mesma mudanca de governanca.
- `Supersedes` e `Superseded By` bidirecionais, escopo total/parcial e dependentes identificados.
- Preservar predecessor como historico; atualizar indice e referencias; nao sobrescrever mudanca material silenciosamente.
- Deprecated significa retirada sem substituto integral; Rejected e proposta recusada, nao decisao vigente.

### Pendencias do ADR-0001

- Resolver Accepted no texto embutido versus sign-off pendente no indice/memoria.
- Designar individualmente os deciders por tras de “Architecture Team”; identificar revisores e status das revisoes.
- Registrar decisoes explicitas e checklist; nenhum aceite deve ser inferido do cabecalho ou silencio.
- Decidir se a fonte canonica permanece embutida ou passa ao arquivo autonomo, e atualizar `INDEX.md` apos a decisao.
- ADR-GOVERNANCE precisa ser Accepted antes de ser a politica oficial usada para esse processo.

### Próxima ação recomendada

**Uma unica acao:** submeter ADR-GOVERNANCE a revisao e aprovacao dos deciders propostos, registrar o resultado e atualizar seu status no `INDEX.md` se aceito.

**Justificativa tecnica:** sem aprovar primeiro a autoridade, os estados, criterios e sign-offs propostos continuam nao vinculantes; aplicar o processo a ADR-0001 ou aos ADRs 0002–0004 antes disso repetiria a mesma ambiguidade que a politica pretende eliminar.

---

**Nota:** Esta politica altera apenas governanca documental. Sua criacao nao altera status, decisao ou conteudo de qualquer ADR existente e nao introduz decisao tecnica, codigo, schema ou API.
