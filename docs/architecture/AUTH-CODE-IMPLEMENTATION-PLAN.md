# AUTH CODE IMPLEMENTATION PLAN

## Escopo

Este plano converte [AUTH-FOUNDATION.md](./AUTH-FOUNDATION.md), [AUTH-PERSISTENCE-DESIGN.md](./AUTH-PERSISTENCE-DESIGN.md), [AUTH-MVP-DECISIONS.md](./AUTH-MVP-DECISIONS.md), [AUTH-API-CONTRACTS.md](./AUTH-API-CONTRACTS.md) e [AUTH-APPLICATION-SERVICES.md](./AUTH-APPLICATION-SERVICES.md) em uma sequência de trabalho de código para Auth V1.

O escopo contém somente `AuthenticateUser`, `LogoutUser`, `GetSession`, `RevokeSession` e `HealthCheckAuth`, e os conceitos `User`, `AuthAccount`, `PasswordCredential` e `Session`. `User` continua sob ownership de Users; Auth só o consulta por contrato público. Membership, autorização escolar, outros providers, cadastro, recuperação de senha, MFA, logout global e transporte/API tecnológica estão fora do plano.

Este plano não altera nem reabre as decisões do MVP. O modelo conceitual persistente é o definido no desenho de persistência, complementado pelas decisões posteriores de Auth V1 quando houver diferença.

## Estrutura de módulo

| Camada           | Responsabilidade no Auth V1                                                                                                            | Conteúdo esperado                                                                                                                                                                                                                                       |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Domínio**      | Expressar os conceitos e invariantes já definidos, sem dependência de aplicação ou persistência.                                       | Regras semânticas de AuthAccount, PasswordCredential e Session; validade temporal, revogação e elegibilidade conforme as decisões MVP. `User` é representado apenas pelos dados mínimos recebidos do owner Users, não recriado nem persistido por Auth. |
| **Aplicação**    | Coordenar casos de uso e aplicar os resultados das regras de domínio.                                                                  | `AuthenticateUser`, `LogoutUser`, `GetSession`, `RevokeSession` e `HealthCheckAuth`; falhas genéricas de autenticação, validação de contexto e fail closed.                                                                                             |
| **Persistência** | Implementar as responsabilidades dos repositórios do Auth e manter suas invariantes.                                                   | `AuthAccountRepository`, `PasswordCredentialRepository` e `SessionRepository`; leitura de User somente por `UserRepository`/contrato público de Users. Persistência server-side de sessão, timestamps e revogação.                                      |
| **Contratos**    | Definir as entradas, saídas e erros funcionais estáveis entre consumidores e aplicação, mais a fronteira pública necessária com Users. | Contratos funcionais dos cinco serviços, estruturas semânticas de resultado e falha, e consulta mínima pública a Users por email normalizado/`userId` e estado. Não definir protocolo, serialização ou transporte.                                      |

Os contratos funcionais já estão descritos em `AUTH-API-CONTRACTS.md`; sua codificação como tipos internos não autoriza introduzir uma API tecnológica neste escopo.

## Ordem de implementação

1. **Fixar as formas internas dos contratos funcionais e da consulta pública de Users.** Mapear as entradas, saídas e falhas documentadas em tipos/abstrações internos, sem transporte. A camada de aplicação e a fronteira com Users dependem desses significados.
2. **Implementar regras e conceitos de domínio Auth.** Representar os conceitos aprovados e validar elegibilidade, associação única da conta/credencial e validade/revogação da Session. Não criar entidades ou estados além dos definidos nos documentos.
3. **Implementar os repositórios e seus adaptadores de persistência.** Implementar AuthAccount, PasswordCredential e Session conforme o desenho e as decisões MVP; integrar User exclusivamente pela interface pública de Users. A operação de login deve manter o limite de cinco sessões ativas e preservar a Session antiga caso não seja possível criar a nova.
4. **Implementar `GetSession`.** É a leitura-base que valida a Session e o estado atual de User e será reutilizada na revogação/logout.
5. **Implementar `RevokeSession` e `LogoutUser`.** Primeiro estabelecer a capacidade de revogar uma Session autenticada; depois compor o fluxo de Logout sobre ela.
6. **Implementar `AuthenticateUser`.** Coordenar limites de tentativas, busca de User, validação de AuthAccount/PasswordCredential e criação lógica da Session.
7. **Implementar `HealthCheckAuth`.** Verificar as dependências obrigatórias dos serviços implementados e retornar `READY` ou `NOT_READY`.
8. **Executar e completar testes de domínio, aplicação, persistência e contrato.** Executar os cenários AT-001–AT-005 durante o desenvolvimento e novamente após integração; validar também o resultado de Health Check e respostas funcionais documentadas.

Essa ordem constrói primeiro os contratos e regras que sustentam as operações, depois suas dependências de leitura/escrita e por fim os fluxos que as orquestram. Testes acompanham cada unidade; o último passo é a verificação integrada, não o primeiro momento de teste.

## Backlog técnico

### CI-001 — Codificar contratos funcionais internos

- **Escopo:** representar entradas, saídas e falhas funcionais para os cinco serviços de Auth, incluindo `AUTH-001`–`AUTH-005`.
- **Conclusão:** os contratos distinguem sucesso de falha sem expor motivo de autenticação, segredo, dados de Users ou autoridade escolar; não definem transporte.
- **Dependências:** nenhuma.

### CI-002 — Implementar conceitos e invariantes de domínio Auth

- **Escopo:** representar AuthAccount, PasswordCredential e Session e expressar elegibilidade/validade conforme as decisões MVP; tratar User apenas como identidade/estado de referência.
- **Conclusão:** as regras permitem reconhecer conta/credencial ausente ou multiplicada, User inelegível, sessão expirada/inativa/revogada e rejeitam qualquer sucesso que viole as decisões.
- **Dependências:** CI-001.

### CI-003 — Implementar a fronteira de leitura pública de User

- **Escopo:** implementar `UserRepository` como consumidor do contrato público de Users para localizar por email normalizado e obter identidade/estado mínimos; suportar validação por `userId`.
- **Conclusão:** Auth não lê nem grava internals de Users; ausência/ineligibilidade e indisponibilidade da verificação produzem os resultados funcionais definidos.
- **Dependências:** CI-001.

### CI-004 — Implementar leitura de AuthAccount e PasswordCredential

- **Escopo:** implementar `AuthAccountRepository` e `PasswordCredentialRepository` para localizar o único provider `credentials` e sua única credencial vigente.
- **Conclusão:** unicidades 1:1 do MVP são respeitadas; condições ausentes ou multiplicidade inesperada não resultam em autenticação.
- **Dependências:** CI-001, CI-002.

### CI-005 — Implementar persistência e operações de Session

- **Escopo:** implementar `SessionRepository` para busca/validação, listagem necessária ao limite simultâneo, criação, atualização de atividade e revogação server-side.
- **Conclusão:** validade observa oito horas absolutas, 30 minutos de inatividade e revogação; não persiste segredo JWT/cookie; criação concorrente mantém no máximo cinco sessões ativas e, se a nova sessão falhar, mantém a antiga.
- **Dependências:** CI-001, CI-002.

### CI-006 — Implementar `GetSession`

- **Escopo:** validar referência server-side, datas/revogação e estado atual do User pela fronteira pública.
- **Conclusão:** retorna somente os dados permitidos para Session válida; referências inválidas/expiradas/revogadas são rejeitadas sem exposição da causa específica; falha de dependência falha fechada.
- **Dependências:** CI-003, CI-005.

### CI-007 — Implementar `RevokeSession`

- **Escopo:** validar contexto e correspondência do `sessionId` solicitado com a Session corrente e então persistir revogação.
- **Conclusão:** somente a Session corrente pode ser revogada; erro de validação/persistência não retorna sucesso; validações posteriores rejeitam a referência revogada.
- **Dependências:** CI-006, CI-005.

### CI-008 — Implementar `LogoutUser`

- **Escopo:** compor validação e revogação da Session corrente usando `RevokeSession`.
- **Conclusão:** confirma `sessionId` e `revokedAt` somente após revogação efetiva; não revoga outras sessões.
- **Dependências:** CI-007.

### CI-009 — Implementar `AuthenticateUser`

- **Escopo:** coordenar a política de tentativas, lookup de User, verificação de elegibilidade/conta/credencial e criação de Session, inclusive limite simultâneo.
- **Conclusão:** aplica cinco falhas por email normalizado/15 minutos e 30 solicitações por IP/15 minutos; falhas usam resposta genérica e não criam Session; sucesso cria Session de acordo com a decisão de máximo cinco ativas.
- **Dependências:** CI-003, CI-004, CI-005, CI-002.

### CI-010 — Implementar `HealthCheckAuth`

- **Escopo:** verificar disponibilidade das dependências obrigatórias de Auth e do contrato público de Users.
- **Conclusão:** retorna somente `READY` ou `NOT_READY`; qualquer dependência obrigatória indisponível implica `NOT_READY`, sem expor dados sensíveis ou detalhes internos.
- **Dependências:** CI-003, CI-004, CI-005.

### CI-011 — Completar verificação integrada Auth V1

- **Escopo:** executar AT-001–AT-005 e verificar contratos funcionais e fail closed para falhas de dependências.
- **Conclusão:** todos os testes passam de forma repetível e os critérios de conclusão por serviço abaixo estão verificados.
- **Dependências:** CI-006, CI-007, CI-008, CI-009, CI-010.

## Mapeamento dos testes

| Teste de aplicação | Teste real de implementação                                                                                                                                       | Cobertura e critério verificável                                                                                                                                                              |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AT-001`           | Teste de aplicação de `AuthenticateUser` com repositórios controlados e verificação de persistência de Session.                                                   | User `ACTIVE`, AuthAccount `credentials` único, credencial correta e limite não excedido produzem sucesso com `userId`, `sessionId` e expirações documentadas; não criam autorização escolar. |
| `AT-002`           | Testes de aplicação de `AuthenticateUser` para senha incorreta, User inexistente/inelegível e rate limit excedido; verificação de ausência de escrita de Session. | Falhas de autenticação não criam Session e são externamente genéricas. Limites seguem a janela e os quantitativos do MVP.                                                                     |
| `AT-003`           | Teste de aplicação de `AuthenticateUser` com estado de User suspenso retornado pelo contrato de Users.                                                            | Login negado, nenhuma Session criada e nenhuma distinção externa que permita enumeração.                                                                                                      |
| `AT-004`           | Testes de integração de `GetSession` com Session que ultrapassa a expiração absoluta e Session que excede inatividade.                                            | Cada caso retorna sessão inválida, não retorna o sujeito como válido e nega uso protegido.                                                                                                    |
| `AT-005`           | Teste integrado `LogoutUser` → `RevokeSession` → `GetSession`, com verificação adicional de falha ao persistir/verificar revogação.                               | Logout revoga somente a Session corrente, confirma apenas após persistência e toda validação subsequente rejeita a referência; falha da dependência não produz sucesso.                       |

Os testes devem validar resultados externos e efeitos persistidos observáveis, não detalhes de tecnologia ou transporte.

## Critérios de conclusão por serviço

### `AuthenticateUser`

- Aplica normalização e política de rate limiting do MVP.
- Exige User `ACTIVE`, AuthAccount `credentials` único e PasswordCredential vigente única e correta.
- Usa lookup público de Users; falha ao confirmar estado necessário falha fechada.
- Cria uma Session dentro dos limites de oito horas/30 minutos e do máximo de cinco sessões ativas.
- Ao exceder o limite simultâneo, revoga a sessão mais antiga como operação lógica com criação; falha de criação preserva a antiga.
- Falhas não criam Session nem distinguem publicamente usuário inexistente, inelegibilidade ou senha incorreta.
- AT-001, AT-002 e AT-003 passam.

### `LogoutUser`

- Opera somente sobre o contexto da Session corrente.
- Só confirma sucesso após revogação server-side efetiva.
- Não encerra outras sessões nem suporta logout global.
- AT-005 passa para o comportamento Logout.

### `GetSession`

- Verifica referência, estado atual de User via contrato público, revogação, limite absoluto e inatividade.
- Retorna os campos de Session permitidos somente quando válida e não concede autorização escolar.
- Falha de verificação necessária nega o uso protegido.
- AT-004 e a asserção posterior de AT-005 passam.

### `RevokeSession`

- Verifica que o alvo corresponde à Session corrente autenticada.
- Registra a revogação server-side e só confirma depois de efetivada.
- Rejeita Session inválida/expirada/revogada ou alvo divergente; não oferece logout de todas as sessões.
- AT-005 passa para a revogação e validação posterior.

### `HealthCheckAuth`

- Verifica as dependências obrigatórias usadas pelos serviços Auth e pela consulta pública de Users.
- Retorna `READY` quando verificações necessárias estão disponíveis e `NOT_READY` caso contrário.
- Não inclui dados de Users, Sessions, credenciais ou causas internas detalhadas.
- Um teste verifica o estado pronto e outro a indisponibilidade de uma dependência obrigatória.

## Execution Checklist

- [ ] CI-001 — Contratos internos funcionais codificados sem transporte.
- [ ] CI-002 — Conceitos e invariantes de domínio Auth implementados.
- [ ] CI-003 — Consulta mínima de User integrada apenas pela fronteira pública.
- [ ] CI-004 — AuthAccount e PasswordCredential acessíveis com unicidades do MVP.
- [ ] CI-005 — Session persistida, validada, atualizada e revogada server-side.
- [ ] CI-005 — Máximo de cinco sessões ativas preservado sob criações concorrentes; sessão antiga preservada se a nova criação falhar.
- [ ] CI-006 — `GetSession` implementado com validade temporal, revogação e estado atual de User.
- [ ] CI-007 — `RevokeSession` limita alvo à Session corrente e confirma após efetivação.
- [ ] CI-008 — `LogoutUser` encerra somente a Session corrente.
- [ ] CI-009 — `AuthenticateUser` aplica elegibilidade, verificação de credencial, rate limiting e criação de Session.
- [ ] CI-010 — `HealthCheckAuth` retorna somente `READY`/`NOT_READY` conforme dependências obrigatórias.
- [ ] AT-001 — Login válido e Session criada.
- [ ] AT-002 — Falha genérica, sem Session, para autenticação inválida e limite excedido.
- [ ] AT-003 — User suspenso não autentica nem recebe Session.
- [ ] AT-004 — Expiração absoluta e inatividade rejeitadas.
- [ ] AT-005 — Logout/revogação corrente e rejeição posterior validados.
- [ ] Falhas de consulta/validação/persistência necessárias falham fechadas.
- [ ] Contratos não retornam senha, hash, segredo, dados internos de Users ou autoridade escolar.
- [ ] Escopo não inclui Membership, autorização escolar, cadastro, provider adicional, recuperação de senha, MFA ou logout global.

## READY TO START CODING

### Existe alguma dependência arquitetural restante?

**NÃO.** As decisões operacionais necessárias ao escopo Auth V1 estão registradas; ownership, boundaries, serviços, entradas/saídas, regras, persistência conceitual e critérios de teste estão definidos pelas fontes deste plano. Não é necessária uma nova decisão arquitetural para iniciar a implementação dentro do escopo delimitado.

Isso não significa que integrações e recursos de execução já estejam disponíveis: a implementação precisa consumir o contrato público de Users e as capacidades de persistência necessárias, conforme o ownership estabelecido. Essas são dependências de integração/entrega, não decisões arquiteturais em aberto. A prontidão não autoriza ampliar o escopo nem altera o estado formal dos ADRs.
