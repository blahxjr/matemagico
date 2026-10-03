# AUTH IMPLEMENTATION START

## Escopo

Este plano imediato converte os itens AUTH do [MVP-IMPLEMENTATION-BACKLOG.md](./MVP-IMPLEMENTATION-BACKLOG.md) em ordem de desenvolvimento e fatias verificáveis, usando também [AUTH-FOUNDATION.md](./AUTH-FOUNDATION.md), [AUTH-MVP-DECISIONS.md](./AUTH-MVP-DECISIONS.md), [AUTH-PERSISTENCE-DESIGN.md](./AUTH-PERSISTENCE-DESIGN.md), [AUTH-API-CONTRACTS.md](./AUTH-API-CONTRACTS.md), [AUTH-APPLICATION-SERVICES.md](./AUTH-APPLICATION-SERVICES.md), [AUTH-CODE-IMPLEMENTATION-PLAN.md](./AUTH-CODE-IMPLEMENTATION-PLAN.md) e [AUTH-CODE-TASKS.md](./AUTH-CODE-TASKS.md).

As decisões de Auth V1 e o escopo estão congelados. Este documento não define código, migrations, Prisma, SQL, API ou frontend. Membership e autorização escolar permanecem fora da implementação Auth descrita aqui; Login não concede School Context.

## Ordem

### Ordem exata de execução e dependências

| Ordem | Item                                                                 | Dependências           | Execução                                                                                       |
| ----: | -------------------------------------------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------- |
|     1 | `AUTH-001` — Codificar contratos funcionais internos                 | Nenhuma                | Sequencial; estabelece significados internos dos cinco contratos Auth.                         |
|     2 | `AUTH-002` — Implementar conceitos e invariantes Auth                | `AUTH-001`             | Sequencial após contratos.                                                                     |
|     3 | `AUTH-003` — Integrar consulta pública de User                       | `AUTH-001`             | Pode avançar após AUTH-001 em paralelo com AUTH-002; usa somente fronteira pública de Users.   |
|     4 | `AUTH-004` — Implementar leitura de AuthAccount e PasswordCredential | `AUTH-001`, `AUTH-002` | Após domínio; leitura de conta/credencial.                                                     |
|     5 | `AUTH-005` — Implementar repositório e operações de Session          | `AUTH-001`, `AUTH-002` | Após domínio; pode ser implementado em paralelo com AUTH-004.                                  |
|     6 | `AUTH-006` — Implementar GetSession                                  | `AUTH-003`, `AUTH-005` | Após User boundary e Session repository.                                                       |
|     7 | `AUTH-007` — Implementar AuthenticateUser                            | `AUTH-002`–`AUTH-005`  | Login pode avançar em paralelo com AUTH-006 quando todas as dependências estiverem concluídas. |
|     8 | `AUTH-008` — Implementar RevokeSession                               | `AUTH-005`, `AUTH-006` | Sequencial após validação de Session.                                                          |
|     9 | `AUTH-009` — Implementar LogoutUser                                  | `AUTH-008`             | Sequencial; compõe a revogação corrente.                                                       |
|    10 | `AUTH-010` — Implementar HealthCheckAuth                             | `AUTH-003`–`AUTH-005`  | Paralelizável com serviços após as dependências de persistência/fronteira.                     |
|    11 | `AUTH-011` — Verificar Auth V1 integrado                             | `AUTH-006`–`AUTH-010`  | Gate final do escopo Auth V1.                                                                  |

### Paralelização possível

- Após `AUTH-001`, `AUTH-002` e `AUTH-003` podem avançar em paralelo.
- Após `AUTH-002`, `AUTH-004` e `AUTH-005` podem avançar em paralelo.
- Após `AUTH-003` e `AUTH-005`, `AUTH-006` pode começar.
- Após `AUTH-002`–`AUTH-005`, `AUTH-007` pode avançar em paralelo à cadeia `AUTH-006` → `AUTH-008` → `AUTH-009`.
- `AUTH-010` pode avançar em paralelo aos serviços quando `AUTH-003`–`AUTH-005` estiverem disponíveis.
- `AUTH-011` só começa após todos os serviços e verificações individuais relevantes.

## Slices

Cada slice deve resultar em um incremento executável e verificável, sem depender de trabalho futuro para demonstrar o comportamento que declara concluído.

### SLICE-001 — Persistência mínima

- **Escopo:** `AUTH-001`–`AUTH-005`: contratos funcionais internos; regras de domínio; consulta pública de User; leitura de AuthAccount/PasswordCredential; capacidades server-side de Session necessárias a criação, leitura, limite e revogação.
- **Dependências:** contrato público de Users e capacidade de persistência Auth disponíveis para integração.
- **Resultado executável:** componentes Auth conseguem resolver identidade/credencial e criar/ler uma Session lógica por meio das responsabilidades definidas, sem expor segredos nem acessar/escrever internals de Users.
- **Critério de aceite:** relações e elegibilidade do MVP são verificáveis; Session obedece validade, revogação e limite de cinco sessões simultâneas; criação da nova Session e revogação da mais antiga respeitam a regra de atomicidade lógica e preservam a antiga se a criação falhar.

### SLICE-002 — Autenticação

- **Escopo:** `AUTH-007` (`AuthenticateUser`) sobre a base de `SLICE-001`.
- **Dependências:** `SLICE-001`; User `ACTIVE`, credencial válida e capacidades Auth/Users acessíveis.
- **Resultado executável:** Login válido produz resultado de autenticação e Session; Login inválido produz resposta genérica e não cria Session.
- **Critério de aceite:** rate limits por email normalizado e IP seguem as decisões Auth; User inelegível, conta/credencial inválida ou senha incorreta não autentica; Login não cria Membership, seleciona escola ou concede autorização.

### SLICE-003 — Sessões

- **Escopo:** `AUTH-006` (`GetSession`) usando o registro server-side criado na base.
- **Dependências:** `SLICE-001`; Session criada e consulta pública do estado de User disponíveis.
- **Resultado executável:** uma referência `sessionId` pode ser validada e retorna os atributos funcionais permitidos quando válida.
- **Critério de aceite:** Session revogada, inexistente, além de oito horas, inativa por mais de 30 minutos ou associada a User que não passa na validação é rejeitada sem revelar causa específica; GetSession não atualiza atividade nem concede autorização escolar.

### SLICE-004 — Revogação

- **Escopo:** `AUTH-008` (`RevokeSession`) e `AUTH-009` (`LogoutUser`).
- **Dependências:** `SLICE-003`; contexto autenticado da Session corrente.
- **Resultado executável:** Logout valida a Session corrente, revoga-a server-side e confirma somente após efetivação.
- **Critério de aceite:** não revoga alvo divergente, Session inválida ou sessões adicionais do User; verificação posterior rejeita a Session revogada; falha ao validar ou persistir não retorna sucesso.

### SLICE-005 — Testes e integração Auth

- **Escopo:** `AUTH-010` (`HealthCheckAuth`), `AUTH-011` e a execução final de AT-001–AT-005, incluindo casos Health Check pronto/não pronto.
- **Dependências:** `SLICE-001`–`SLICE-004`; dependências Auth necessárias disponíveis para execução.
- **Resultado executável:** Health Check reporta prontidão das dependências e o fluxo Login → GetSession → Logout pode ser demonstrado junto dos cenários AT.
- **Critério de aceite:** `READY` somente quando as dependências obrigatórias estão disponíveis; caso contrário `NOT_READY`; AT-001–AT-005 passam e falhas obrigatórias resultam em fail closed.

## Testes

| Teste                            | Slice(s)                                   | Itens AUTH                                       | Critério verificável                                                                                                                                                        |
| -------------------------------- | ------------------------------------------ | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AT-001` — Login válido          | SLICE-001, SLICE-002, SLICE-005            | AUTH-002–AUTH-005, AUTH-007, AUTH-011            | User `ACTIVE`, AuthAccount `credentials` única, credencial válida e limites não excedidos resultam em autenticação e Session dentro dos limites; não há autoridade escolar. |
| `AT-002` — Login inválido        | SLICE-001, SLICE-002, SLICE-005            | AUTH-001, AUTH-003, AUTH-004, AUTH-007, AUTH-011 | Senha incorreta, User inexistente/inelegível e rate limit excedido não criam Session; falha externa não distingue os motivos.                                               |
| `AT-003` — User suspenso         | SLICE-001, SLICE-002, SLICE-005            | AUTH-002, AUTH-003, AUTH-007, AUTH-011           | User suspenso não autentica nem recebe Session; resposta é genérica.                                                                                                        |
| `AT-004` — Expiração/inatividade | SLICE-001, SLICE-003, SLICE-005            | AUTH-002, AUTH-005, AUTH-006, AUTH-011           | Session além de oito horas ou sem atividade por mais de 30 minutos é inválida e não retorna sujeito como válido.                                                            |
| `AT-005` — Logout/revogação      | SLICE-001, SLICE-003, SLICE-004, SLICE-005 | AUTH-005, AUTH-006, AUTH-008, AUTH-009, AUTH-011 | Logout revoga somente a Session corrente; `GetSession` posterior rejeita a referência; falha de verificação/persistência não confirma sucesso.                              |

Testes unitários de domínio, repositórios e contratos acompanham os itens AUTH correspondentes. A execução integrada de AT-001–AT-005 ocorre em SLICE-005; ela não substitui os testes focados das slices anteriores.

## Checkpoints

### CP-AUTH-001 — Login funcionando

- `AuthenticateUser` executa com credencial válida e retorna identidade e referência da Session.
- Login inválido mantém resposta genérica e não cria Session.
- Política de tentativas e elegibilidade do User estão aplicadas.
- Login não gera autorização escolar.
- Evidência: `AT-001`, `AT-002` e `AT-003` passam para os cenários de Login.

### CP-AUTH-002 — Sessão funcionando

- Session é criada e consultada server-side, associada ao User e dentro dos prazos.
- `GetSession` aceita Session válida e rejeita expirada, inativa, revogada ou não verificável.
- Limite máximo de cinco Sessions ativas e regra de substituição transacional lógica estão aplicados.
- Evidência: `AT-001` e `AT-004` passam; fluxo `Login → GetSession` é executável.

### CP-AUTH-003 — Revogação funcionando

- `RevokeSession` limita o alvo à Session corrente e só confirma após persistência efetiva.
- `LogoutUser` revoga somente a Session corrente.
- `GetSession` rejeita a referência depois da revogação.
- Evidência: `AT-005` passa, incluindo falha ao verificar/efetivar revogação.

### CP-AUTH-004 — Testes aprovados

- `AT-001`–`AT-005` passam de forma repetível.
- `HealthCheckAuth` cobre dependências prontas (`READY`) e indisponíveis (`NOT_READY`).
- Respostas, efeitos server-side, limites temporais e fail closed correspondem aos contratos.
- Nenhuma autoridade escolar, requisito ou fluxo fora do Auth V1 foi incluído.
- Evidência: `AUTH-011` concluído.

## First Integration Target

Primeiro fluxo integrado a tornar executável:

```text
Login
  ↓
GetSession
  ↓
Logout
```

### Comportamento de aceite

1. `AuthenticateUser` recebe email/senha válidos de User `ACTIVE`, valida AuthAccount e PasswordCredential e cria Session.
2. O `sessionId` resultante é fornecido a `GetSession`; a referência server-side é validada e o User associado é retornado somente se a Session estiver vigente.
3. `LogoutUser` opera sobre o contexto da Session corrente e delega a `RevokeSession`.
4. Revogação efetiva produz confirmação com `sessionId` e `revokedAt`.
5. Uma chamada subsequente a `GetSession` para a Session revogada é rejeitada.
6. Nenhum passo seleciona School ou concede Membership, Role ou Permission.

Dependências: `SLICE-001`–`SLICE-004`. Health Check e execução da suíte completa são concluídos em `SLICE-005`.

## Definition of Done

- [ ] `AUTH-001`–`AUTH-010` implementados e verificados por seus critérios de aceite.
- [ ] `AUTH-011` concluído como gate integrado.
- [ ] SLICE-001–SLICE-005 concluídas com resultado executável conforme seus critérios.
- [ ] First Integration Target Login → GetSession → Logout funciona de ponta a ponta.
- [ ] `AT-001`–`AT-005` passam; falhas necessárias de dependência não produzem sucesso permissivo.
- [ ] HealthCheckAuth retorna `READY` e `NOT_READY` conforme disponibilidade das dependências obrigatórias.
- [ ] Limites de Session (8h absoluta, 30min de inatividade, máximo de cinco ativas), revogação server-side e tratamento da sexta Session foram verificados.
- [ ] Login mantém resposta genérica para falhas e não cria Session em caso de insucesso.
- [ ] Logout encerra somente a Session corrente e sucesso só é confirmado após revogação efetiva.
- [ ] Nenhuma resposta ou log/resultado funcional expõe senha, hash, segredo, JWT/cookie em claro, internals de Users ou autoridade escolar.
- [ ] Ownership e chamadas de Users permanecem na fronteira pública; nenhum fluxo de Membership/autorização escolar foi adicionado ao Auth V1.

## READY TO CODE

### Existe alguma dependência restante para iniciar o código Auth?

**NÃO.** As decisões, contratos funcionais, serviços, repositórios conceituais, critérios e sequência Auth V1 estão aprovados e não exigem decisão arquitetural adicional para iniciar a implementação.

A execução depende de a fronteira pública de Users e as capacidades de persistência Auth estarem disponíveis ou serem implementadas nas slices correspondentes. Isso é trabalho previsto de integração/entrega no backlog, não uma dependência arquitetural aberta.
