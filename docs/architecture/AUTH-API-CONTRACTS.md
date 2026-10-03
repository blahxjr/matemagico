# AUTH API CONTRACTS

## Escopo e convenções

Este documento define contratos funcionais externos do módulo Auth V1, sem transporte, framework, formato tecnológico ou protocolo. Abrange exclusivamente Login, Logout, GetSession, RevokeSession e Health Check Auth.

As decisões de elegibilidade, limite de cinco sessões ativas, expirações, revogação server-side, rate limiting, ownership e boundaries são as registradas em [AUTH-MVP-DECISIONS.md](./AUTH-MVP-DECISIONS.md), [AUTH-FOUNDATION.md](./AUTH-FOUNDATION.md) e [AUTH-PERSISTENCE-DESIGN.md](./AUTH-PERSISTENCE-DESIGN.md). Este contrato não as altera.

“Contexto de chamada” significa a identidade/sessão autenticada que o consumidor apresenta ao módulo; não define como ela é transportada. Nenhum contrato retorna senha, hash, segredo de sessão, token, cookie, dados internos de Users ou autoridade escolar.

## Login

### Objetivo

Autenticar um User elegível por email e senha e estabelecer uma nova Session. O sucesso de Login não cria Membership, não seleciona escola e não concede autorização escolar.

### Entrada

**Campos obrigatórios**

| Campo | Significado                                                    |
| ----- | -------------------------------------------------------------- |
| Email | Email do User, normalizado para localização da identidade.     |
| Senha | Segredo submetido para verificar a PasswordCredential vigente. |

**Campos opcionais:** nenhum.

### Saída

Em sucesso:

| Campo               | Significado                                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------------------ |
| Resultado           | Indica autenticação bem-sucedida.                                                                            |
| `userId`            | Identificador estável do User autenticado.                                                                   |
| `sessionId`         | Referência não secreta da Session criada.                                                                    |
| `createdAt`         | Instante de criação da Session.                                                                              |
| `absoluteExpiresAt` | Limite absoluto, oito horas após a criação.                                                                  |
| `idleExpiresAt`     | Limite de inatividade inicial, 30 minutos após a atividade autenticada e nunca posterior ao limite absoluto. |

A saída confirma a criação da sessão lógica; não transporta credencial tecnológica para apresentá-la em chamadas subsequentes. Em falha, não é criada Session.

### Erros possíveis

- `AUTH-001` — autenticação não permitida: credencial incorreta, identidade inexistente/inelegível ou estrutura de conta/credencial inválida. A resposta não diferencia esses motivos.
- `AUTH-002` — limite de tentativas de Login excedido.
- `AUTH-004` — dependência ou validação necessária indisponível; operação negada.
- `AUTH-005` — campo obrigatório ausente ou entrada inválida.

## Logout

### Objetivo

Encerrar a Session corrente do contexto autenticado, revogando-a server-side. Logout não encerra outras sessões do User.

### Entrada

Somente o contexto de chamada da Session corrente. Não recebe `userId` nem alvo arbitrário; a sessão a encerrar é determinada pelo contexto autenticado.

### Saída

Em sucesso:

| Campo       | Significado                                   |
| ----------- | --------------------------------------------- |
| Resultado   | Confirma que a Session corrente foi revogada. |
| `sessionId` | Referência da Session encerrada.              |
| `revokedAt` | Instante em que a revogação foi efetivada.    |

### Erros

- `AUTH-003` — contexto ausente, inválido, expirado ou já revogado.
- `AUTH-004` — não foi possível validar ou efetivar a revogação; a chamada não confirma sucesso.

## GetSession

### Objetivo

Validar uma Session pelo registro server-side e, se válida, identificar o User associado. A validade da Session não é autorização escolar.

### Entrada

| Campo       | Significado                                  |
| ----------- | -------------------------------------------- |
| `sessionId` | Referência não secreta da Session a validar. |

### Saída

Para uma Session válida:

| Campo               | Significado                                          |
| ------------------- | ---------------------------------------------------- |
| Estado              | `VALID`.                                             |
| `sessionId`         | Referência validada.                                 |
| `userId`            | User associado à Session.                            |
| `createdAt`         | Instante de criação.                                 |
| `lastSeenAt`        | Instante da última atividade autenticada registrada. |
| `absoluteExpiresAt` | Limite absoluto de validade.                         |
| `idleExpiresAt`     | Limite atual de inatividade.                         |

Para referência inexistente, revogada, expirada ou inativa, o resultado é `AUTH-003` sem revelar qual condição tornou a sessão inválida. GetSession não retorna perfil, Membership, escola, papel ou permissão.

### Erros

- `AUTH-003` — Session ausente, desconhecida, revogada, expirada ou além do limite de inatividade; motivos não são distinguidos externamente.
- `AUTH-004` — falha ao consultar/verificar o registro server-side ou o estado necessário do User; acesso negado.
- `AUTH-005` — `sessionId` ausente ou inválido.

GetSession valida o estado atual; a renovação de atividade ocorre pela operação protegida autenticada que registra atividade, respeitando os limites de sessão definidos para o MVP.

## RevokeSession

### Objetivo

Revogar server-side a Session corrente solicitada, para que não possa ser reutilizada. No MVP, não revoga sessões de terceiros nem todas as sessões do User.

### Entrada

| Campo       | Significado                                                                                               |
| ----------- | --------------------------------------------------------------------------------------------------------- |
| `sessionId` | Referência da Session corrente a revogar. Deve corresponder à Session do contexto de chamada autenticado. |

### Saída

Em sucesso:

| Campo       | Significado                                |
| ----------- | ------------------------------------------ |
| Resultado   | Confirma que a Session foi revogada.       |
| `sessionId` | Referência da Session revogada.            |
| `revokedAt` | Instante em que a revogação foi efetivada. |

### Erros

- `AUTH-003` — Session inexistente, inválida, expirada, já revogada ou diferente da Session corrente autenticada.
- `AUTH-004` — não foi possível validar ou efetivar a revogação; a chamada não confirma sucesso.
- `AUTH-005` — `sessionId` ausente ou inválido.

Logout encerra a Session corrente implicitamente; RevokeSession expressa a mesma capacidade com a referência da sessão e valida que o alvo corresponde ao contexto autenticado. Nenhum dos dois contratos concede capacidade de logout global.

## Health Check

### Objetivo

Informar se Auth está disponível para validar sessões e processar autenticação/revogação com as dependências obrigatórias.

### Saída esperada

| Campo  | Significado                                                                                                                           |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| Estado | `READY` quando Auth consegue realizar as verificações e operações necessárias; `NOT_READY` quando não consegue fazê-lo com segurança. |

O resultado não inclui dados de usuários, sessões, credenciais, causas internas detalhadas ou segredos. Falha de dependência obrigatória resulta em `NOT_READY`; a operação protegida correspondente continua fail closed.

## Catálogo de Erros

| Código     | Significado funcional                                                                                                                                                            | Aplicação                                |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `AUTH-001` | Autenticação não permitida; credencial inválida, identidade não elegível ou associação de conta/credencial inválida. Motivo não distinguido externamente.                        | Login                                    |
| `AUTH-002` | Limite de tentativas de Login excedido segundo a política MVP. Usa resposta genérica de falha e não cria Session.                                                                | Login                                    |
| `AUTH-003` | Session ausente, desconhecida, inválida, expirada, inativa ou revogada; não se revela qual condição ocorreu. Inclui alvo de revogação diferente da Session corrente autenticada. | Logout, GetSession, RevokeSession        |
| `AUTH-004` | Dependência ou validação obrigatória indisponível; operação negada e nenhum sucesso é confirmado.                                                                                | Login, Logout, GetSession, RevokeSession |
| `AUTH-005` | Entrada obrigatória ausente ou inválida para o contrato invocado.                                                                                                                | Login, GetSession, RevokeSession         |

O catálogo é fechado para os cinco contratos deste documento. Estados detalhados de autenticação não devem ser usados para enumerar Users ou Sessions.

## Contratos de Segurança

- **Autenticação:** Login exige email e senha; o User precisa estar `ACTIVE`, possuir exatamente um AuthAccount `credentials` e uma PasswordCredential vigente, a senha deve corresponder e os limites de tentativa não podem ter sido excedidos. Falhas de credencial, existência e elegibilidade são externamente indistinguíveis.
- **Sessão:** toda Session possui referência não secreta e está vinculada a um `userId`. É válida somente enquanto não revogada, dentro do prazo absoluto de oito horas e sem mais de 30 minutos de inatividade. No máximo cinco sessões podem estar ativas por User; o Login que excederia o limite revoga a mais antiga e cria a nova como operação lógica atômica.
- **Revogação:** Logout e RevokeSession só podem revogar a Session corrente autenticada. RevokeSession valida que `sessionId` corresponde ao contexto autenticado. Após revogada, a sessão é rejeitada por validações subsequentes. Não existe revogação de todas as sessões neste escopo.
- **Fail closed:** se Auth não conseguir verificar estado de User, validade/revogação de Session, limite de tentativas ou qualquer dependência necessária à decisão, nega a operação protegida e não retorna sucesso. Health Check informa `NOT_READY` quando as verificações obrigatórias não estão disponíveis.
- **Separação de autorização:** Session válida identifica o User, mas não concede acesso escolar; nenhum contrato daqui cria, seleciona ou autoriza escola/Membership.
- **Minimização:** senha, hash, segredo de sessão e dados internos de Users nunca são retornados por estes contratos.

## Testes

| ID       | Cenário         | Critério de contrato                                                                                                                                                                                                                              |
| -------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CT-001` | Login válido    | Com User `ACTIVE`, AuthAccount `credentials` único, PasswordCredential correta e limite não excedido, Login retorna sucesso e uma Session vinculada ao `userId`, com `sessionId` e limites temporais; não retorna segredo nem autoridade escolar. |
| `CT-002` | Login inválido  | Para senha incorreta, User inexistente ou User inelegível, Login não cria Session e retorna a falha genérica `AUTH-001`; a resposta não diferencia os motivos nem revela segredo.                                                                 |
| `CT-003` | Sessão expirada | GetSession para Session além de oito horas ou inativa por mais de 30 minutos retorna `AUTH-003`; não retorna sujeito nem estado que revele o motivo.                                                                                              |
| `CT-004` | Sessão revogada | Depois de Logout/RevokeSession bem-sucedido, GetSession para a mesma referência retorna `AUTH-003`, e nenhuma operação protegida pode tratar a Session como válida.                                                                               |
| `CT-005` | Logout          | Com contexto autenticado válido, Logout revoga somente a Session corrente e confirma `sessionId`/`revokedAt`; validações posteriores rejeitam essa Session, sem revogar outras sessões do User.                                                   |

## READY FOR API IMPLEMENTATION

### Os contratos possuem informação suficiente para implementação?

**SIM**, para implementar os cinco contratos funcionais deste escopo sem escolher transporte, framework ou protocolo. Entradas, saídas, erros, limites de segurança, respostas genéricas, ownership funcional e testes contratuais estão definidos e alinhados às decisões Auth V1.

Este parecer cobre somente os contratos. Não define REST, GraphQL, OpenAPI, formato tecnológico de sessão, mecanismo de apresentação do contexto de chamada ou qualquer funcionalidade além de Login, Logout, GetSession, RevokeSession e Health Check Auth.
