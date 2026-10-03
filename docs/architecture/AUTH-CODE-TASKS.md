# AUTH CODE TASKS

## Escopo

Backlog executável derivado de [AUTH-CODE-IMPLEMENTATION-PLAN.md](./AUTH-CODE-IMPLEMENTATION-PLAN.md), [AUTH-APPLICATION-SERVICES.md](./AUTH-APPLICATION-SERVICES.md), [AUTH-API-CONTRACTS.md](./AUTH-API-CONTRACTS.md) e [AUTH-MVP-DECISIONS.md](./AUTH-MVP-DECISIONS.md). Mantém as decisões Auth V1 congeladas; não define código, framework, banco, protocolo ou novos requisitos.

Os artefatos impactados abaixo são unidades lógicas de implementação (contratos internos, domínio, portas/repositórios, serviços e testes), não nomes de arquivos ou escolhas tecnológicas.

## Sequência

| Ordem | Item                                                             | Dependências                           | Execução                                                                                                    |
| ----: | ---------------------------------------------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
|     1 | CI-001 — Codificar contratos funcionais internos                 | —                                      | Sequencial; base comum.                                                                                     |
|     2 | CI-002 — Implementar conceitos e invariantes de domínio Auth     | CI-001                                 | Sequencial após contratos.                                                                                  |
|     3 | CI-003 — Implementar fronteira pública de leitura de User        | CI-001                                 | Pode começar após CI-001, em paralelo com CI-002; não grava User.                                           |
|     4 | CI-004 — Implementar leitura de AuthAccount e PasswordCredential | CI-001, CI-002                         | Paralelizável com CI-003 e CI-005 após suas dependências.                                                   |
|     5 | CI-005 — Implementar persistência e operações de Session         | CI-001, CI-002                         | Paralelizável com CI-003 e CI-004 após suas dependências.                                                   |
|     6 | CI-006 — Implementar GetSession                                  | CI-003, CI-005                         | Sequencial após a fronteira de User e Session.                                                              |
|     7 | CI-007 — Implementar RevokeSession                               | CI-006, CI-005                         | Sequencial após validação de Session.                                                                       |
|     8 | CI-008 — Implementar LogoutUser                                  | CI-007                                 | Sequencial após revogação.                                                                                  |
|     9 | CI-009 — Implementar AuthenticateUser                            | CI-002, CI-003, CI-004, CI-005         | Paralelizável com CI-006/CI-007/CI-008 após CI-002/003/004/005; caminho de login depende de CI-003/004/005. |
|    10 | CI-010 — Implementar HealthCheckAuth                             | CI-003, CI-004, CI-005                 | Paralelizável com CI-006 a CI-009 após disponibilidade das dependências.                                    |
|    11 | CI-011 — Completar verificação integrada Auth V1                 | CI-006, CI-007, CI-008, CI-009, CI-010 | Gate sequencial de conclusão do escopo completo.                                                            |

### Regras de paralelização

- CI-003 pode avançar após CI-001, em paralelo com CI-002. CI-004 e CI-005 podem avançar em paralelo entre si após CI-001 e CI-002.
- Depois de CI-003 e CI-005, CI-006 pode iniciar. CI-009 pode executar em paralelo a CI-006/CI-007/CI-008 depois de concluídos CI-002 a CI-005.
- CI-010 pode executar em paralelo aos serviços após CI-003 a CI-005.
- CI-007 depende de CI-006; CI-008 depende de CI-007.
- CI-011 aguarda os cinco serviços e seus testes necessários, inclusive HealthCheckAuth.

## Decomposição dos itens CI

### CI-001 — Codificar contratos funcionais internos

- **Objetivo:** representar as entradas, saídas e erros funcionais dos cinco serviços, mantendo o catálogo `AUTH-001`–`AUTH-005` e as respostas genéricas previstas.
- **Dependências:** nenhuma.
- **Artefatos impactados:** contratos internos de `AuthenticateUser`, `LogoutUser`, `GetSession`, `RevokeSession` e `HealthCheckAuth`; representação comum de resultado e falha.
- **Critério de conclusão:** contratos descrevem somente campos funcionais permitidos; não incluem senha/hash/segredo em saídas, dados internos de Users, autoridade escolar, transporte ou protocolo.

### CI-002 — Implementar conceitos e invariantes de domínio Auth

- **Objetivo:** representar os conceitos Auth autorizados e as regras de elegibilidade e validade da Session do MVP.
- **Dependências:** CI-001.
- **Artefatos impactados:** conceitos de domínio `AuthAccount`, `PasswordCredential` e `Session`; regras de User elegível como referência recebida do owner Users; validações de validade temporal e revogação.
- **Critério de conclusão:** as regras reconhecem associação única de AuthAccount/PasswordCredential, elegibilidade baseada em User `ACTIVE`, Session expirada/inativa/revogada e não autorizam sucesso que viole as decisões MVP; User não é recriado como conceito persistente de Auth.

### CI-003 — Implementar a fronteira pública de leitura de User

- **Objetivo:** permitir que Auth localize User por email normalizado e confirme estado por `userId` através da superfície pública do owner Users.
- **Dependências:** CI-001.
- **Artefatos impactados:** `UserRepository`/porta de consulta de User; adaptação do contrato público de Users; testes da fronteira e de falha de dependência.
- **Critério de conclusão:** Auth obtém somente identidade/estado mínimos necessários; não acessa internals nem grava User; falha de consulta obrigatória é explícita para os serviços falharem fechados.

### CI-004 — Implementar leitura de AuthAccount e PasswordCredential

- **Objetivo:** obter a única AuthAccount `credentials` e a única PasswordCredential vigente associadas, para a verificação de Login.
- **Dependências:** CI-001, CI-002.
- **Artefatos impactados:** `AuthAccountRepository`, `PasswordCredentialRepository`, adaptadores de leitura e testes de associações.
- **Critério de conclusão:** associações do MVP 1:1 são verificadas; dados de credencial não são expostos em resultados funcionais; ausência ou multiplicidade inesperada não resulta em Login bem-sucedido.

### CI-005 — Implementar persistência e operações de Session

- **Objetivo:** implementar acesso server-side para validação, criação, atualização de atividade e revogação de Session, bem como aplicação do limite simultâneo.
- **Dependências:** CI-001, CI-002.
- **Artefatos impactados:** `SessionRepository`, adaptador de persistência de Session e testes de validade, concorrência e falhas.
- **Critério de conclusão:** aplica expiração absoluta de oito horas, inatividade de 30 minutos e revogação; não guarda JWT/cookie em claro; mantém no máximo cinco Sessions ativas por User. A sexta criação revoga a sessão mais antiga e cria a nova como operação lógica; se a criação falhar, a antiga permanece.

### CI-006 — Implementar GetSession

- **Objetivo:** validar uma Session server-side e retornar apenas os atributos funcionais previstos quando válida.
- **Dependências:** CI-003, CI-005.
- **Artefatos impactados:** serviço `GetSession`, integração com `UserRepository` e `SessionRepository`, testes de sessão válida, expirada, inativa, revogada e dependência indisponível.
- **Critério de conclusão:** verifica a referência, revogação, prazos e estado atual do User; falha fechadamente quando não consegue verificar condição necessária; não retorna o User como válido para sessões inválidas nem concede autorização escolar.

### CI-007 — Implementar RevokeSession

- **Objetivo:** revogar uma Session validada somente quando for a Session corrente do contexto autenticado.
- **Dependências:** CI-006, CI-005.
- **Artefatos impactados:** serviço `RevokeSession`, operação de revogação no `SessionRepository` e testes de alvo correspondente/divergente e falha de persistência.
- **Critério de conclusão:** Session inexistente, inválida, expirada, já revogada ou diferente da Session corrente não é reportada como revogada com sucesso; após sucesso, validações subsequentes rejeitam a referência.

### CI-008 — Implementar LogoutUser

- **Objetivo:** compor a revogação da Session corrente para cumprir o contrato de Logout.
- **Dependências:** CI-007.
- **Artefatos impactados:** serviço `LogoutUser`, composição com `RevokeSession` e testes de Logout.
- **Critério de conclusão:** confirma `sessionId` e `revokedAt` somente após revogação efetiva; encerra somente a Session corrente e não implementa logout global.

### CI-009 — Implementar AuthenticateUser

- **Objetivo:** coordenar verificação de tentativa, localização/eligibilidade do User, AuthAccount, PasswordCredential e criação da Session.
- **Dependências:** CI-002, CI-003, CI-004, CI-005.
- **Artefatos impactados:** serviço `AuthenticateUser`; integração com repositórios/contrato público de Users; aplicação dos limites de tentativas; testes de sucesso, falha, suspensão, limite simultâneo e ausência de escrita em falha.
- **Critério de conclusão:** aplica cinco falhas por email normalizado/15 minutos e 30 solicitações por IP/15 minutos; exige User `ACTIVE`, AuthAccount `credentials` único e PasswordCredential válida; falhas externas são genéricas e não criam Session; o sucesso respeita o limite de cinco sessões ativas.

### CI-010 — Implementar HealthCheckAuth

- **Objetivo:** informar se Auth pode executar suas verificações e operações necessárias.
- **Dependências:** CI-003, CI-004, CI-005.
- **Artefatos impactados:** serviço `HealthCheckAuth` e testes de dependências disponíveis/indisponíveis.
- **Critério de conclusão:** retorna somente `READY` ou `NOT_READY`; dependência obrigatória indisponível resulta em `NOT_READY`, sem divulgar detalhe interno ou informação sensível.

### CI-011 — Completar verificação integrada Auth V1

- **Objetivo:** executar testes de aplicação e integração para demonstrar os comportamentos e limites definidos para o Auth V1.
- **Dependências:** CI-006, CI-007, CI-008, CI-009, CI-010.
- **Artefatos impactados:** suítes de testes dos serviços, repositórios, contratos funcionais e dependências integradas; checklist de conclusão.
- **Critério de conclusão:** AT-001–AT-005 passam; testes de Health Check cobrem pronto/não pronto; falhas obrigatórias falham fechadas; respostas e efeitos observados respeitam os contratos e nenhuma funcionalidade fora de escopo foi introduzida.

## Dependências

| Item   | Depende de                             | Justificativa                                                                                         |
| ------ | -------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| CI-001 | —                                      | Estabelece as formas funcionais usadas por domínio, aplicação e repositórios.                         |
| CI-002 | CI-001                                 | Invariantes e validações usam os significados e resultados dos contratos internos.                    |
| CI-003 | CI-001                                 | A fronteira de Users expõe a informação mínima definida para autenticação/validação.                  |
| CI-004 | CI-001, CI-002                         | Leitura de conta e credencial deve observar cardinalidades e falhas de domínio do MVP.                |
| CI-005 | CI-001, CI-002                         | Persistência e operações de Session devem cumprir invariantes temporais, de revogação e concorrência. |
| CI-006 | CI-003, CI-005                         | GetSession precisa consultar User pelo boundary e validar Session server-side.                        |
| CI-007 | CI-006, CI-005                         | Revogação precisa de Session validada e de escrita server-side.                                       |
| CI-008 | CI-007                                 | Logout é composição da revogação autorizada da Session corrente.                                      |
| CI-009 | CI-002, CI-003, CI-004, CI-005         | Login depende das regras, User, AuthAccount, credencial e criação/limite de Session.                  |
| CI-010 | CI-003, CI-004, CI-005                 | Health Check avalia disponibilidade das dependências necessárias ao Auth.                             |
| CI-011 | CI-006, CI-007, CI-008, CI-009, CI-010 | Verificação integrada requer serviços implementados e Health Check.                                   |

### Paralelizáveis

- Após CI-001 e CI-002: CI-004 e CI-005 podem ser implementados paralelamente.
- CI-003 pode avançar após CI-001 em paralelo com CI-002; CI-004 e CI-005 iniciam após CI-002 e podem avançar em paralelo entre si.
- Após CI-003/CI-004/CI-005/CI-002: CI-009 pode avançar em paralelo à cadeia CI-006 → CI-007 → CI-008.
- CI-010 pode avançar em paralelo a CI-006–CI-009 quando CI-003–CI-005 estiverem disponíveis.

### Sequenciais

- CI-001 precede todos os demais.
- CI-002 precede CI-004 e CI-005.
- CI-003 e CI-005 precedem CI-006.
- CI-006 precede CI-007; CI-007 precede CI-008.
- CI-002–CI-005 precedem CI-009.
- CI-003–CI-005 precedem CI-010.
- CI-011 é o gate integrado final e aguarda CI-006–CI-010.

## Testes

| Teste    | Item(s) CI                                     | Verificação concreta                                                                                                                             |
| -------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `AT-001` | CI-002, CI-003, CI-004, CI-005, CI-009, CI-011 | Login válido com User `ACTIVE`, conta e credencial únicas; cria Session vinculada e dentro dos limites temporais, sem autoridade escolar.        |
| `AT-002` | CI-001, CI-003, CI-004, CI-009, CI-011         | Senha incorreta, User inexistente/inelegível e rate limit excedido não criam Session; motivos de autenticação não são distinguidos externamente. |
| `AT-003` | CI-002, CI-003, CI-009, CI-011                 | User suspenso não autentica, não recebe Session e recebe resposta genérica.                                                                      |
| `AT-004` | CI-002, CI-005, CI-006, CI-011                 | Sessões além de oito horas ou inativas por mais de 30 minutos são inválidas e não retornam sujeito como válido.                                  |
| `AT-005` | CI-005, CI-006, CI-007, CI-008, CI-011         | Logout revoga somente a Session corrente; validação posterior falha; erro de verificação/persistência não confirma sucesso.                      |

CI-011 também valida os resultados de HealthCheckAuth `READY`/`NOT_READY` e o comportamento fail closed, sem ampliar ou substituir os cinco testes AT.

## Critérios

### Critério por item

Cada CI está concluído somente quando seu critério de conclusão indicado na decomposição foi implementado e verificado por teste correspondente, e quando não viola entradas/saídas, ownership ou limites estabelecidos pelas fontes. A conclusão de um serviço não implica a conclusão do item integrado CI-011.

### Critério de conclusão do Auth V1 neste backlog

- CI-001–CI-010 concluídos.
- Todos os cenários AT-001–AT-005 passam.
- HealthCheckAuth confirma `READY` quando as dependências necessárias estão disponíveis e `NOT_READY` quando uma dependência obrigatória falha.
- Fail closed, respostas genéricas de Login, revogação server-side e limites da Session estão verificados.
- Nenhum dado proibido ou funcionalidade fora do escopo Auth V1 foi introduzido.

## MVP PATH

### Menor caminho Login → Sessão → Logout

1. **CI-001:** preparar os contratos internos necessários para autenticação, resultado de Login e Session.
2. **CI-002:** implementar os invariantes de credencial, elegibilidade e Session.
3. **CI-003:** consultar User e seu estado pelo boundary público de Users.
4. **CI-004:** obter AuthAccount e PasswordCredential vigentes.
5. **CI-005:** criar e validar Session server-side, incluindo expiração, revogação e limite de sessões.
6. **CI-009:** implementar `AuthenticateUser`; comprovar com AT-001 e AT-002 (AT-003 cobre inelegibilidade por suspensão).
7. **CI-006:** implementar `GetSession`, necessário para a validação que antecede revogação.
8. **CI-007:** implementar `RevokeSession` para a Session corrente.
9. **CI-008:** implementar `LogoutUser` sobre `RevokeSession`; comprovar fluxo com AT-005 e validar estado final da Session.

**Dependências:** a sequência mínima exige User acessível pelo contrato público, leitura das associações de credencial e persistência de Session. Logout depende da cadeia `GetSession` → `RevokeSession`; autenticação não depende de `GetSession`.

**Fora do menor caminho, mas necessário à conclusão do backlog completo:** CI-010 (HealthCheckAuth) e CI-011 como integração final de todo o escopo. CI-011 roda após Health Check mesmo que a jornada básica Login → Sessão → Logout já funcione.

## READY FOR DEVELOPMENT

**SIM.** Os itens, dependências, artefatos lógicos, critérios, testes e caminho mínimo estão definidos pelas fontes aprovadas. Não é necessária nova decisão de arquitetura/domínio/contrato para iniciar o desenvolvimento dentro do escopo Auth V1.

O trabalho permanece condicionado à disponibilidade operacional do contrato público de Users e das capacidades de persistência descritas. Isso é integração de implementação; não reabre nem modifica as decisões congeladas.
