# AUTH APPLICATION SERVICES

## Escopo

Este documento mapeia os serviços de aplicação Auth V1 usando somente [AUTH-FOUNDATION.md](./AUTH-FOUNDATION.md), [AUTH-PERSISTENCE-DESIGN.md](./AUTH-PERSISTENCE-DESIGN.md), [AUTH-MVP-DECISIONS.md](./AUTH-MVP-DECISIONS.md) e [AUTH-API-CONTRACTS.md](./AUTH-API-CONTRACTS.md). Não define código, tecnologia, API, banco, schema ou requisitos além dessas fontes.

Os serviços deste escopo são:

- `AuthenticateUser`
- `LogoutUser`
- `GetSession`
- `RevokeSession`
- `HealthCheckAuth`

## Serviços

### AuthenticateUser

**Objetivo:** autenticar um User elegível por email e senha, aplicando os limites de tentativas do MVP e criando uma Session. Não concede autorização escolar.

**Entradas:** email, senha e contexto de chamada necessário à aplicação da política de tentativas.

**Saídas:** em sucesso, resultado de autenticação, `userId`, `sessionId`, `createdAt`, `absoluteExpiresAt` e `idleExpiresAt`; em falha, resultado genérico sem distinção pública de existência do User ou validade da senha.

**Dependências:**

- `UserRepository` — localizar User pelo email normalizado através do contrato público do owner Users e obter seu estado/elegibilidade.
- `AuthAccountRepository` — localizar o único AuthAccount `credentials` do User.
- `PasswordCredentialRepository` — obter a credencial vigente para a verificação da senha pelo fluxo de autenticação.
- `SessionRepository` — aplicar o limite de sessões ativas, criar a Session e, se necessário, revogar a sessão ativa mais antiga na mesma operação lógica.
- Serviço de aplicação `GetSession` não é pré-requisito do Login; a criação de sessão decorre da autenticação bem-sucedida.

### LogoutUser

**Objetivo:** encerrar somente a Session corrente do contexto autenticado.

**Entradas:** contexto de chamada que identifica a Session corrente.

**Saídas:** confirmação de revogação, `sessionId` e `revokedAt`; falha funcional se contexto não for válido ou a revogação não puder ser efetivada.

**Dependências:**

- `RevokeSession` — validar e revogar a Session corrente.

### GetSession

**Objetivo:** validar o estado server-side de uma Session e, se válida, retornar os dados funcionais permitidos e o User associado. Não atualiza atividade nem concede autorização escolar.

**Entradas:** `sessionId`.

**Saídas:** estado `VALID`, `sessionId`, `userId`, `createdAt`, `lastSeenAt`, `absoluteExpiresAt` e `idleExpiresAt`; sessão inválida resulta em falha genérica de sessão inválida.

**Dependências:**

- `SessionRepository` — localizar e validar a Session, incluindo revogação, expiração absoluta e inatividade.
- `UserRepository` — verificar o estado atual do User pelo contrato público de Users; não consultar internals do módulo Users.

### RevokeSession

**Objetivo:** revogar server-side somente a Session corrente indicada e autorizada pelo contexto de chamada.

**Entradas:** `sessionId` da Session solicitada e contexto autenticado que identifica a Session corrente.

**Saídas:** confirmação, `sessionId` e `revokedAt`; alvo inválido ou divergente do contexto não é revogado.

**Dependências:**

- `GetSession` — validar a Session e confirmar que ela corresponde ao contexto autenticado.
- `SessionRepository` — persistir a revogação server-side.

### HealthCheckAuth

**Objetivo:** informar se Auth está disponível para processar autenticação, validar sessões e efetivar revogações com as dependências obrigatórias.

**Entradas:** nenhuma entrada de identidade, credencial ou Session.

**Saídas:** `READY` ou `NOT_READY`, sem dados de Users, Sessions, credenciais ou causas internas detalhadas.

**Dependências:**

- Verificação de disponibilidade das capacidades de persistência usadas por `AuthAccountRepository`, `PasswordCredentialRepository` e `SessionRepository`.
- Verificação de disponibilidade do contrato público de Users usado por `UserRepository`.

Uma dependência necessária indisponível produz `NOT_READY`; operações protegidas relacionadas falham fechadas.

## Fluxos

### Login — `AuthenticateUser`

1. Recebe email, senha e o contexto necessário para avaliar os limites de tentativas.
2. Normaliza o email para a localização do User e avalia os limites do MVP: no máximo cinco falhas para o email normalizado em janela móvel de 15 minutos e 30 solicitações por IP em janela móvel de 15 minutos.
3. Se o limite for excedido, encerra com falha genérica; não cria Session nem altera o estado global do User.
4. Solicita ao owner Users, por contrato público, o User correspondente e os dados mínimos de identidade/estado. Falha de consulta necessária resulta em negação.
5. Exige User único e estado `ACTIVE`; ausência ou ineligibilidade resulta na mesma falha genérica externa de credencial inválida.
6. Localiza o AuthAccount `credentials` único e sua PasswordCredential vigente. Ausência ou multiplicidade inesperada resulta em falha genérica e não cria Session.
7. Verifica a senha contra a PasswordCredential vigente. Senha incorreta resulta em falha genérica, sem revelar se o User existe.
8. Determina as Sessions ativas do User. Se já houver cinco, seleciona a ativa mais antiga; em empate de `createdAt`, usa o menor `sessionId` em ordem lexical.
9. Cria a nova Session e, quando necessário, revoga a selecionada como uma única operação lógica. Se a criação falhar, a Session antiga permanece ativa.
10. Retorna os dados funcionais da Session recém-criada. Não seleciona escola nem concede autorização escolar.

### Logout — `LogoutUser`

1. Recebe o contexto da Session corrente; não aceita alvo arbitrário nem pedido de logout global.
2. Obtém desse contexto a referência da Session corrente e solicita sua revogação por `RevokeSession`.
3. `RevokeSession` valida o estado server-side e confirma que o alvo corresponde à Session corrente autenticada.
4. Se a Session for inexistente, inválida, expirada, revogada ou divergente do contexto, retorna falha sem confirmar Logout.
5. Retorna confirmação com `sessionId` e `revokedAt`. Nenhuma outra Session do User é alterada.

### GetSession

1. Recebe `sessionId`.
2. Localiza a Session por `SessionRepository`.
3. Verifica que a Session existe, não foi revogada, não excedeu oito horas desde a criação e não excedeu 30 minutos sem atividade autenticada.
4. Consulta o estado atual do User através do contrato público do owner Users; falha na verificação necessária resulta em negação.
5. Se qualquer validação falhar, retorna sessão inválida sem expor o motivo específico.
6. Se todas forem satisfeitas, retorna `VALID`, o `userId` e os atributos de Session permitidos.
7. Não atualiza `lastSeenAt` nem `idleExpiresAt`; a atualização da atividade ocorre no fluxo protegido que a registra.

### RevokeSession

1. Recebe `sessionId` solicitado e o contexto autenticado da Session corrente.
2. Usa `GetSession` para validar a Session e obtém a referência validada.
3. Confirma que o alvo corresponde à Session corrente autenticada; não permite revogar Session de outra pessoa.
4. Registra a revogação server-side usando `SessionRepository`.
5. Retorna confirmação com `sessionId` e `revokedAt`. Falha ao validar ou persistir revogação não retorna sucesso.

## Repositórios

Os repositórios abaixo descrevem responsabilidades, não interfaces tecnológicas. `UserRepository` representa acesso exclusivamente pela superfície pública de Users; não é autorização para Auth ler ou escrever internals de Users.

### UserRepository

- Solicitar ao owner Users a localização de User por email normalizado, retornando apenas `userId` e estado/elegibilidade necessários à autenticação e validação de sessão.
- Não criar, alterar ou persistir User em nome de Auth.
- Propagar falha de consulta necessária para decisão, permitindo que o serviço negue a operação.

### AuthAccountRepository

- Localizar o AuthAccount associado ao User e ao provider `credentials`.
- Preservar a unicidade e cardinalidade definidas para o MVP; sinalizar associação ausente ou multiplicidade inesperada como falha de autenticação.

### PasswordCredentialRepository

- Localizar a única PasswordCredential vigente do AuthAccount.
- Disponibilizar os dados necessários à verificação da senha sem expor senha em claro, hash em saída funcional, logs ou contratos externos.

### SessionRepository

- Localizar Session por `sessionId` e obter Sessions do User necessárias à contagem/seleção do limite simultâneo.
- Validar atributos persistidos usados para expiração absoluta, inatividade e revogação server-side.
- Criar Session com timestamps e limites definidos para o MVP.
- Atualizar atividade quando solicitada por um fluxo autenticado que a registra.
- Revogar Session e informar o instante da revogação.
- Preservar o limite máximo de cinco Sessions ativas inclusive em criações concorrentes e realizar seleção/revogação da mais antiga junto à criação lógica da nova Session.

## Validações

| Situação            | Serviço(s)                                  | Resultado funcional                                                                                                                               |
| ------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Credencial inválida | `AuthenticateUser`                          | Falha genérica; nenhuma Session é criada; a resposta não distingue senha incorreta de User inexistente ou inelegível.                             |
| Usuário suspenso    | `AuthenticateUser`, `GetSession`            | Login negado porque somente User `ACTIVE` é elegível. Falha ao confirmar estado atual do User durante validação de sessão também nega a operação. |
| Sessão expirada     | `GetSession`, `LogoutUser`, `RevokeSession` | Session além de oito horas ou inativa por mais de 30 minutos é inválida; operação protegida nega acesso sem expor distinção desnecessária.        |
| Sessão revogada     | `GetSession`, `LogoutUser`, `RevokeSession` | Session revogada não é reutilizável; validações posteriores a rejeitam. Falha ao verificar revogação resulta em negação.                          |

Todas as dependências necessárias a decisões de autenticação, validade ou revogação devem falhar fechadas: não se confirma sucesso quando não for possível verificar o estado requerido.

## Testes

| ID       | Cenário                   | Critério verificável                                                                                                                                                                                                                        |
| -------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AT-001` | Autenticação válida       | Com User `ACTIVE`, AuthAccount `credentials` único, PasswordCredential correta e limite de tentativas não excedido, `AuthenticateUser` retorna `userId` e Session ativa dentro dos limites temporais. Nenhuma autorização escolar é criada. |
| `AT-002` | Credencial inválida       | Com senha incorreta, `AuthenticateUser` não cria Session e retorna falha genérica sem diferenciar User inexistente, inelegível ou senha incorreta.                                                                                          |
| `AT-003` | User suspenso             | Para User suspenso, `AuthenticateUser` nega autenticação, não cria Session e retorna falha genérica.                                                                                                                                        |
| `AT-004` | Session expirada          | Para Session além de oito horas ou inativa por mais de 30 minutos, `GetSession` retorna inválida e não retorna o sujeito como Session válida.                                                                                               |
| `AT-005` | Logout e Session revogada | `LogoutUser` revoga apenas a Session corrente e confirma a revogação; `GetSession` posterior para o mesmo `sessionId` rejeita a Session. Falha de verificação/persistência de revogação não retorna sucesso.                                |

## READY FOR CODING

### Existe informação suficiente para implementar os serviços?

**SIM**, para os cinco serviços de aplicação Auth V1 e os quatro repositórios indicados, respeitando as responsabilidades e limites registrados. Os fluxos de login, sessão, logout, revogação e health check possuem entradas, saídas, dependências, validações e critérios de teste alinhados aos contratos e decisões MVP.

Este parecer não amplia o escopo: não inclui Membership ou autorização escolar, outros providers, cadastro, recuperação de senha, MFA, logout global nem decisões de transporte, framework ou persistência física.
