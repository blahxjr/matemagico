# AUTH PERSISTENCE DESIGN

## 1. Escopo

Este documento descreve a persistência conceitual mínima das quatro entidades permitidas:

- **User** — identidade global, owner Users.
- **AuthAccount** — vínculo de autenticação, owner Auth / Authorization.
- **PasswordCredential** — credencial de senha, owner Auth / Authorization.
- **Session** — sessão revogável, owner Auth / Authorization.

Ficam fora do modelo: School, Membership, Class, Question, Attempt e Ranking. A menção a SchoolMembership neste documento serve apenas para explicitar que autenticação não concede autorização escolar; não especifica nem persiste essa entidade.

**Limite importante:** as fontes documentam ownership e alguns atributos, mas não fixam todas as cardinalidades, chaves persistentes nem a forma do vínculo entre AuthAccount e PasswordCredential. Para não introduzir decisões novas, essas lacunas são marcadas como **Não especificado**. Portanto, este documento é um modelo persistente conceitual, mas ainda **não permite implementar todos os detalhes sem decisão adicional**.

### Convenções de evidência

- **Explícito:** atributo/regra citado diretamente nas fontes permitidas.
- **Inferido:** necessário para expressar relação já documentada; não define implementação física.
- **Não especificado:** as fontes não sustentam uma escolha única; não assumir valor/cardinalidade.

### Fontes permitidas

- [AUTH-FOUNDATION.md](./AUTH-FOUNDATION.md)
- [ADR-0002 — Module Boundaries](./ADRs/ADR-0002-module-boundaries.md)
- [ADR-0003 — Database Strategy](./ADRs/ADR-0003-database-strategy.md)
- [ADR-0004 — Authentication and Authorization](./ADRs/ADR-0004-authentication-authorization.md)
- [MVP-DOMAIN-MODEL.md](./MVP-DOMAIN-MODEL.md)
- [SPRINT1-BACKLOG.md](./SPRINT1-BACKLOG.md)
- [SPRINT1-EXECUTION-PLAN.md](./SPRINT1-EXECUTION-PLAN.md)

---

## 2. Entidades persistentes

### User

**Responsabilidade:** identidade canônica global e estado global da conta. Não é fonte de senha, papel escolar ou `schoolId`.

**Owner:** Users. Auth valida User pelo contrato público aplicável e não lê/escreve dados internos do owner.

**Origem documental:** ADR-0004 §2.1; ADR-0002 §2.3; ADR-0003 §2.2; AUTH-FOUNDATION.md; MVP-DOMAIN-MODEL.md.

**Estado do ciclo de vida — evidência:** `PENDING_EMAIL` é citado para o fluxo de registro; conta ativa após verificação aplicável; estados ativo, suspenso e pendente são citados no modelo de identidade. `UserDeactivated`, `UserReactivated` e `UserSuspended` são fatos de ciclo de vida documentados. A nomenclatura completa/canonicalização dos estados persistidos não está consolidada; estados além dos explicitamente nomeados não devem ser acrescentados.

### AuthAccount

**Responsabilidade:** vincular uma identidade de provider ao User canônico.

**Owner:** Auth / Authorization.

**Origem documental:** ADR-0004 §2.1; ADR-0003 §2.2; AUTH-FOUNDATION.md.

**Estado do ciclo de vida — evidência:** as fontes documentam a existência do vínculo e condicionam vínculos externos à prova forte de titularidade. Estados persistidos como ativo, desvinculado ou bloqueado **não estão especificados**.

### PasswordCredential

**Responsabilidade:** manter a credencial derivada que suporta login V1 por email e senha.

**Owner:** Auth / Authorization.

**Origem documental:** ADR-0004 §2.1 e §2.6; ADR-0003 §2.2; AUTH-FOUNDATION.md.

**Estado do ciclo de vida — evidência:** alteração da senha é representada pelo instante de mudança da credencial e pelo evento documentado `PasswordChanged`; fluxo de reset/troca está fora do escopo do Sprint 1. Estados persistidos de bloqueio/expiração/desativação da credencial **não estão especificados** para este modelo.

### Session

**Responsabilidade:** registrar uma sessão associada ao User que possa ser validada, expirar e ser revogada server-side.

**Owner:** Auth / Authorization.

**Origem documental:** ADR-0004 §2.5–2.6; ADR-0003 §2.2; AUTH-FOUNDATION.md.

**Estado do ciclo de vida — evidência:** criada/ativa, expirada por limite absoluto ou inatividade, e revogada. `revokedAt` registra revogação. Expirada/inativa implica sessão inválida; um campo de status persistido separado não é exigido pelas fontes.

---

## 3. Atributos

“Obrigatório” indica requisito semântico para o conceito quando ele existe, não nulabilidade ou definição de coluna.

### User

| Campo             | Obrigatório                    | Descrição                                                                                                                                                             |
| ----------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `userId`          | Sim                            | Identificador estável da identidade canônica global.                                                                                                                  |
| Email normalizado | Sim para login por email       | Endereço normalizado usado para autenticação por email; deve ser único globalmente. As fontes não exigem armazenar também uma cópia não normalizada neste escopo.     |
| Estado da conta   | Sim para avaliar elegibilidade | Estado global do User; os estados nomeados nas fontes incluem ativo, suspenso e pendente (`PENDING_EMAIL` no registro). Conjunto fechado de valores não especificado. |

**Fora do escopo User:** hash de senha, `role` escolar, `schoolId` como autoridade, Profile e atributos demográficos.

### AuthAccount

| Campo                                    | Obrigatório                      | Descrição                                                                                                                |
| ---------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Identidade User associada (`userId`)     | Sim conceitualmente              | User ao qual a identidade de provider está vinculada. Nome persistido/campo e forma da referência não são especificados. |
| Provider                                 | Sim para identidade por provider | Identifica o provider da conta vinculada. A V1 usa email/senha; providers futuros não ampliam este escopo.               |
| Subject/account id do provider           | Sim para identidade por provider | Identificador da identidade no provider; deve ser único em combinação com Provider.                                      |
| Prova de titularidade do vínculo externo | Condicional                      | Vínculo externo só ocorre após prova forte de titularidade; como representar essa evidência não está especificado.       |

### PasswordCredential

| Campo                        | Obrigatório                         | Descrição                                                                                                                                                               |
| ---------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hash da senha                | Sim para autenticação por senha     | Hash Argon2id conforme ADR-0004; nunca senha reversível ou em texto puro.                                                                                               |
| Metadados de algoritmo/custo | Sim conforme credencial documentada | Identificam algoritmo e parâmetros de custo usados na derivação. Valores concretos não são escolhidos neste documento.                                                  |
| Instante de alteração        | Sim conforme modelo documentado     | Instante associado à alteração da credencial.                                                                                                                           |
| Identidade associada         | Sim conceitualmente                 | Referência à identidade autenticada a que a credencial pertence. Se aponta diretamente a User ou a AuthAccount e qual identificador a representa não está especificado. |

### Session

| Campo                                   | Obrigatório                            | Descrição                                                                                                                                   |
| --------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `sessionId` / identificador não secreto | Sim                                    | Identificador da sessão usado para validação e revogação; não é o JWT/cookie secreto.                                                       |
| `userId`                                | Sim                                    | User associado à sessão.                                                                                                                    |
| `createdAt`                             | Sim                                    | Instante de criação da sessão.                                                                                                              |
| `lastSeenAt`                            | Sim                                    | Último acesso autenticado observado; usado para avaliar inatividade.                                                                        |
| `absoluteExpiresAt`                     | Sim                                    | Instante de expiração absoluta; limite V1 documentado de 8 horas desde a criação.                                                           |
| `idleExpiresAt`                         | Sim                                    | Instante limite de inatividade; janela V1 documentada de 30 minutos, renovada por atividade autenticada e nunca além da expiração absoluta. |
| `revokedAt`                             | Condicional                            | Instante de revogação; ausente enquanto não revogada, conforme semântica conceitual.                                                        |
| `revocationReason`                      | Condicional                            | Motivo categorizado da revogação. Domínio fechado de motivos não especificado.                                                              |
| Metadados minimizados de dispositivo    | Opcional conforme necessidade/política | Informação minimizada do dispositivo; campos específicos e política de retenção não definidos pelas fontes permitidas.                      |

**Proibição documentada:** o registro de sessão não armazena JWT/cookie em claro.

---

## 4. Identificadores e unicidade

| Entidade               | Identificador principal                                      | Identificadores alternativos                                                                                                                                                                                                          | Unicidade necessária                                                                                                                                               |
| ---------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **User**               | `userId` — identificador estável explicitamente documentado. | Email normalizado para login; não substitui semanticamente `userId`.                                                                                                                                                                  | Email normalizado único globalmente para login por email.                                                                                                          |
| **AuthAccount**        | **Não especificado** como identificador persistente próprio. | Provider + subject/account id identifica de forma única uma identidade de provider conforme a regra documentada. `identityId` aparece como referência em payload conceitual, mas sua adoção como chave persistente não está decidida. | Par Provider + subject/account id único.                                                                                                                           |
| **PasswordCredential** | **Não especificado**.                                        | Nenhum identificador alternativo formalmente definido.                                                                                                                                                                                | Unicidade/cardinalidade da credencial associada a User/AuthAccount não especificada.                                                                               |
| **Session**            | `sessionId` / identificador não secreto da sessão.           | Nenhum alternativo necessário documentado.                                                                                                                                                                                            | Deve identificar inequivocamente a sessão para validação e revogação; regra física de unicidade não especificada, embora a identidade funcional da sessão o exija. |

**Implicação para implementação:** não substituir identificadores ausentes por novos IDs, composições de chaves ou regras de unicidade sem uma decisão explícita. As fontes não definem identificador principal persistente de AuthAccount nem PasswordCredential.

---

## 5. Relacionamentos e cardinalidade

```text
User
  ↓
AuthAccount (associado a User; quantidade por User não especificada)
  ⋯
PasswordCredential (identidade associada; referência direta/cardinalidade não especificadas)

User
  ↓
Session
```

As reticências indicam que a associação conceitual entre credencial e identidade existe, mas as fontes não determinam se a referência persistente parte de AuthAccount ou diretamente de User.

| Relação                              | Cardinalidade documentada                                                                          | Interpretação / limite                                                                                                                                                                                                         |
| ------------------------------------ | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **User → AuthAccount**               | Um AuthAccount está associado a um User; quantidade de AuthAccounts por User **não especificada**. | AuthAccount vincula um User a uma identidade de provider. A possibilidade de múltiplos providers é mencionada como extensão futura, mas cardinalidade V1 não é formalizada.                                                    |
| **AuthAccount → PasswordCredential** | **Não especificada.**                                                                              | PasswordCredential é associada à identidade/autenticação. As fontes não determinam se o vínculo é direto a AuthAccount ou a User, nem se a credencial é única por identidade. Não selecionar uma cardinalidade por inferência. |
| **User → Session**                   | Uma Session pertence a um User; um User pode possuir múltiplas sessões.                            | A evidência para múltiplas sessões inclui revogação de todas e `sessionCountRevoked`; o limite máximo simultâneo não está especificado.                                                                                        |

**Limite de agregado:** estas relações não afirmam que User, AuthAccount, PasswordCredential ou Session componham um único agregado. A composição de AuthSession como filho de raiz permanece não definida no modelo de domínio.

---

## 6. Regras de integridade

### RI-001 — Usuário sem credencial não autentica

Para login V1 por senha, deve existir PasswordCredential associada à identidade autenticada e a verificação da credencial deve ter sucesso. Sem credencial correspondente, não há autenticação por email/senha nem criação de sessão.

**Suporte:** ADR-0004 §2.1 e §2.6; AUTH-FOUNDATION.md, RB-001 e Login.

**Limite:** a relação persistente exata entre PasswordCredential e AuthAccount/User não está fechada; a regra semântica não decide essa representação.

### RI-002 — Sessão revogada não pode ser reutilizada

Uma Session revogada, expirada ou inativa é inválida para operações protegidas. A falha da validação server-side necessária resulta em negação (fail closed).

**Suporte:** ADR-0004 §2.5; AUTH-FOUNDATION.md, RB-002.

### RI-003 — Email normalizado único

Email normalizado usado para login é único globalmente entre Users.

**Suporte:** ADR-0004 §2.1; AUTH-FOUNDATION.md, conceito User.

### RI-004 — Credencial não pertence ao User como senha em claro

PasswordCredential mantém segredo derivado; User não contém senha/hash, e segredo/hash não são escritos em logs ou eventos.

**Suporte:** ADR-0004 §2.1 e §2.6; ADR-0002 §2.7; AUTH-FOUNDATION.md.

### RI-005 — User global não recebe autoridade escolar por sessão

AuthAccount e Session identificam o sujeito, mas não atribuem escola ou papel. Login não cria Membership e autorização escolar não é obtida a partir de claims antigas.

**Suporte:** ADR-0004 §2.1, §2.4 e §2.6; ADR-0002 §2.2; AUTH-FOUNDATION.md, RB-003.

---

## 7. Consultas necessárias

| ID         | Consulta mínima                                       | Objetivo                                                                                                                                                                                                                                             |
| ---------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **CQ-001** | Buscar User por email normalizado.                    | Localizar a identidade global para autenticação por email sem revelar externamente se ela existe. Email normalizado é único.                                                                                                                         |
| **CQ-002** | Buscar uma Session ativa pela referência/`sessionId`. | Localizar o registro server-side para estabelecer se a sessão pode ser avaliada. “Ativa” significa não revogada nem expirada/inativa segundo os limites definidos; não exige campo de status adicional.                                              |
| **CQ-003** | Validar Session.                                      | Verificar identificação, `revokedAt`, expiração absoluta, inatividade (`lastSeenAt`/`idleExpiresAt`) e estado atual do User pelo owner/contrato aplicável. Se a verificação obrigatória falhar para operação protegida, negar acesso.                |
| **CQ-004** | Listar sessões de um User.                            | Recuperar sessões associadas para a capacidade documentada de enumeração/gestão e revogação global de sessões. No Sprint 1, “logout de todos” está explicitamente fora do escopo; portanto a consulta não autoriza expor UI ou habilitar esse fluxo. |

**Nota de ownership:** CQ-001 pertence ao owner Users ou é disponibilizada a Auth por seu contrato público; Auth não consulta internals/repositórios de Users. CQ-003 usa Auth para Session e obtém estado de User pelo contrato público de Users.

---

## 8. Escritas necessárias

| ID          | Operação mínima           | Objetivo e limite                                                                                                                                                                                                                                                       |
| ----------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **CMD-001** | Criar User.               | Registrar identidade global com email normalizado único e estado de ciclo de vida permitido. User pertence a Users. O fluxo de cadastro amplo/autoprovisionamento está fora do Sprint 1; esta operação não deve ser acrescentada ao Sprint apenas por constar na lista. |
| **CMD-002** | Criar PasswordCredential. | Registrar credencial derivada para identidade provisionada, com os metadados e instante de alteração documentados. Não grava senha em claro. A associação exata a User ou AuthAccount não está especificada e bloqueia a definição persistente final.                   |
| **CMD-003** | Criar Session.            | Registrar uma sessão após autenticação bem-sucedida, associada a `userId`, com timestamps e limites V1; não guardar JWT/cookie em claro.                                                                                                                                |
| **CMD-004** | Revogar Session.          | Marcar a sessão corrente como revogada (`revokedAt` e motivo categorizado quando aplicável); validações subsequentes rejeitam seu uso. O escopo documentado aqui não inclui “logout de todos”.                                                                          |
| **CMD-005** | Atualizar último acesso.  | Atualizar `lastSeenAt` e a janela `idleExpiresAt` após atividade autenticada; a nova janela não pode ultrapassar `absoluteExpiresAt`. Fonte: ADR-0004 §2.5.                                                                                                             |

**Operação de provisionamento:** CMD-001 e CMD-002 estão documentadas como conceitos/fluxo de primeiro acesso, mas cadastro amplo foi excluído do Sprint 1. Usuário e credencial podem ser provisionados por um processo autorizado fora do login; nenhuma operação deve ser inferida como efeito automático de autenticação.

---

## Prontidão para implementação

### A persistência está completamente determinada?

**NÃO.** As fontes fornecem requisitos suficientes para semântica de User, hash de senha, email único e ciclo de vida da Session, mas não permitem definir sem novas decisões:

1. identificador principal persistente de AuthAccount;
2. identificador principal persistente de PasswordCredential;
3. se PasswordCredential se relaciona diretamente com AuthAccount ou com User, e sua cardinalidade;
4. cardinalidade V1 de AuthAccount por User;
5. conjunto fechado de estados de User elegíveis a login e estados de AuthAccount/PasswordCredential;
6. forma de atender CQ-001 por Auth sem violar o boundary Users, incluindo contrato público e consistência necessária.

Esses pontos não podem ser preenchidos por suposição neste desenho. Apesar de a solicitação pedir um modelo que permita implementar sem novas decisões arquiteturais, as fontes autorizadas não sustentam essa conclusão.

### Limite de GO

- **GO conceitual restrito:** consultas/escritas de Session podem seguir os atributos explicitamente documentados, se as decisões de Auth V1 já foram ratificadas.
- **NO GO para persistência completa de AuthAccount/PasswordCredential e fluxo integral de login:** aguarda resolução dos seis itens acima pelos owners competentes.
- Esta avaliação não ratifica ADR-0002, ADR-0003 ou ADR-0004 e não autoriza implementar schema, SQL ou migrations neste documento.
