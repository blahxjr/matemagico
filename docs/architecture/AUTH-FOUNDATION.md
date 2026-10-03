# AUTH FOUNDATION

## Escopo e status

Esta especificação cobre somente autenticação, sessão e a distinção entre autenticação e autorização escolar. Não define implementação, persistência, endpoints, framework, schema ou novos conceitos.

**Decisões congeladas para esta especificação**, conforme solicitação:

1. Login por email e senha.
2. Sessão com expiração absoluta de 8 horas, inatividade máxima de 30 minutos e revogação server-side.
3. Falha de validação necessária de sessão/revogação resulta em **fail closed**.
4. Login autentica uma identidade e não concede acesso escolar.
5. A autorização escolar exige SchoolMembership válida, permissão aplicável e `schoolId` correspondente validados no servidor.

**Ressalva documental:** ADR-0002, ADR-0003 e ADR-0004 estão marcados `Proposed`. Registrar essas decisões aqui como baseline congelada para esta especificação não altera o status formal dos ADRs nem ratifica decisões fora deste escopo.

### Fontes autorizadas

- [ADR-0002 — Module Boundaries](./ADRs/ADR-0002-module-boundaries.md)
- [ADR-0003 — Database Strategy](./ADRs/ADR-0003-database-strategy.md)
- [ADR-0004 — Authentication and Authorization](./ADRs/ADR-0004-authentication-authorization.md)
- [MVP-DOMAIN-MODEL.md](./MVP-DOMAIN-MODEL.md)
- [MVP-IMPLEMENTATION-BLUEPRINT.md](./MVP-IMPLEMENTATION-BLUEPRINT.md)
- [SPRINT1-BACKLOG.md](./SPRINT1-BACKLOG.md)
- [SPRINT1-EXECUTION-PLAN.md](./SPRINT1-EXECUTION-PLAN.md)

## Conceitos

Somente os quatro conceitos solicitados são detalhados. “Session” corresponde ao conceito de sessão/AuthSession com registro server-side de revogação descrito nas fontes; a forma de entidade e sua composição não são determinadas aqui.

| Conceito               | Responsabilidade                                                       | Owner                    | Invariantes documentadas                                                                                                                                                                                                                                                                                                                                 |
| ---------------------- | ---------------------------------------------------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **User**               | Identidade canônica global; estado global da conta.                    | **Users**                | Identidade global, não vinculada a uma única escola; email normalizado e único globalmente para login por email; estado pode ser ativo, suspenso ou pendente; não contém senha/hash, papel escolar ou `schoolId` como autoridade de acesso.                                                                                                              |
| **AuthAccount**        | Associar a identidade autenticada ao User.                             | **Auth / Authorization** | Para identidade por provider, o par provider + subject/account id é único; vínculo externo depende de prova forte de titularidade. Para a V1, email/senha é o método selecionado nesta especificação. Não é User/Profile nem concede membership.                                                                                                         |
| **PasswordCredential** | Manter a credencial derivada para autenticação por senha.              | **Auth / Authorization** | Nunca guarda senha em texto puro; o ADR-0004 documenta hash Argon2id; segredo, hash e token não são publicados em evento ou log. A credencial é separada de User/Profile.                                                                                                                                                                                |
| **Session**            | Representar uma autenticação vigente e revogável para um sujeito User. | **Auth / Authorization** | Limite absoluto de 8h; inatividade máxima de 30min sem ultrapassar o limite absoluto; revogação é verificável server-side; sessão/token não contém autoridade escolar confiável; logout revoga a sessão corrente; falha ao verificar validade/revogação em operação protegida é fail-closed. Nunca guardar JWT/cookie em claro no registro de revogação. |

**Limite de ownership:** Auth é owner de AuthAccount, PasswordCredential e Session; Users é owner de User e perfil. Auth valida User pelo contrato público aplicável e não lê/escreve estado interno de Users. Não se afirma que os quatro conceitos componham um único agregado.

**Limite de autorização escolar:** SchoolMembership e grants são conceitos existentes, mas não são detalhados como entidades adicionais nesta seção. Seu owner é Auth / Authorization; School é owner separado. Nenhum desses limites transfere propriedade ao User ou à Session.

## Casos de Uso

As entradas e saídas abaixo são conceituais, não assinaturas de API. Onde as fontes não fecham uma regra, ela permanece explícita como pendência; não é substituída por uma política inventada.

### Login

| Aspecto           | Definição                                                                                                                                                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Entrada**       | Email e senha; contexto mínimo de cliente somente se exigido pelo fluxo aprovado.                                                                                                                                        |
| **Saída**         | Autenticação bem-sucedida com identidade global User e sessão válida, ou falha genérica sem revelar se a conta existe.                                                                                                   |
| **Pré-condições** | User e PasswordCredential foram provisionados; método de credencial é email/senha; a elegibilidade da conta é avaliada no servidor. Email verificado é exigido quando a política de ativação aplicável assim determinar. |
| **Pós-condições** | Em sucesso, Session é registrada como ativa e associada ao User; em falha, nenhuma sessão autenticada é criada. Login não cria SchoolMembership, não seleciona School e não atribui papel.                               |

**Limite não resolvido:** as fontes enumeram estados da conta e dizem verificar email quando a ação exigir ativação, mas não definem por completo quais estados/verificação permitem login em todos os casos. A política de elegibilidade precisa ser ratificada antes de implementar essa decisão.

### Logout

| Aspecto           | Definição                                                                                                                                                      |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Entrada**       | Referência à sessão corrente do usuário autenticado.                                                                                                           |
| **Saída**         | Confirmação conceitual de encerramento da sessão corrente.                                                                                                     |
| **Pré-condições** | A sessão corrente é identificável pelo Auth; nenhuma sessão de outro usuário é alvo deste caso de uso do Sprint.                                               |
| **Pós-condições** | Auth marca a sessão corrente como revogada e ela não pode ser reutilizada para operação protegida. O mecanismo de encerramento do cliente não é definido aqui. |

**Limite de escopo:** este caso cobre logout desta sessão, não “logout de todos”, recuperação/troca de senha ou revogação global de credenciais.

### GetSession

| Aspecto           | Definição                                                                                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Entrada**       | Identificador/referência da sessão a validar.                                                                                                                 |
| **Saída**         | Estado conceitual válido/inválido da sessão e o sujeito User associado quando válida; não retorna autoridade escolar derivada de token antigo.                |
| **Pré-condições** | A consulta é feita pelo owner Auth no contexto de validação de sessão/operação protegida.                                                                     |
| **Pós-condições** | Consulta não concede permissão escolar. Sessão expirada, inativa ou revogada é inválida. Falha na verificação necessária para operação protegida nega acesso. |

**Limite:** não há contrato documentado que transforme GetSession em uma leitura de perfil de Users ou que garanta atualização de Membership; autorização consulta o estado vigente necessário no contexto protegido.

### RevokeSession

| Aspecto           | Definição                                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------------------------- |
| **Entrada**       | Referência à sessão corrente a revogar.                                                                       |
| **Saída**         | Resultado conceitual da revogação da sessão solicitada.                                                       |
| **Pré-condições** | Auth identifica a sessão alvo; no escopo do Sprint, o alvo é a sessão corrente, não todas as sessões do User. |
| **Pós-condições** | O registro server-side fica revogado; validações posteriores rejeitam a sessão para operações protegidas.     |

**Limite:** fontes documentam `revokeSession(sessionId)` como contrato conceitual e revogação de sessão. Critérios para revogar sessão de terceiro ou executar “logout de todos” não pertencem a este caso no Sprint.

## Contratos

Interfaces conceituais internas, sem tecnologia, framework, serialização ou transporte. Os nomes são os documentados/propostos; não são endpoints.

| Interface conceitual                                       | Entrada                                                                                                      | Saída conceitual                                                 | Owner / limite                                                                                                                                                                                                                               |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **AuthenticateUser**                                       | Email e senha; contexto do cliente quando aprovado.                                                          | User autenticado e resultado de autenticação, ou falha genérica. | Auth autentica; identidade/estado de User é obtida por contrato público de Users quando necessário. Não estabelece autorização escolar.                                                                                                      |
| **GetSession**                                             | Referência/identificador da sessão.                                                                          | Estado válido/inválido e sujeito User quando válido.             | Auth valida expiração, inatividade, revogação e estado requerido. Não devolve papel/membership como claims confiáveis.                                                                                                                       |
| **RevokeSession**                                          | Referência/identificador da sessão alvo autorizado.                                                          | Resultado conceitual de revogação.                               | Auth revoga no escopo permitido; para este Sprint, a sessão corrente.                                                                                                                                                                        |
| **Validação de SchoolMembership para autorização escolar** | Sujeito User autenticado, referência de membership/escopo e permissão/recurso necessários ao caso protegido. | Decisão conceitual permitir/negar e escopo escolar validado.     | Auth / Authorization valida membership e grants vigentes; School é validada por contrato público do owner Schools quando necessário. Este ponto de integração não faz parte do login nem transforma a interface em novo caso de uso de Auth. |

**Logout** é o caso de uso que encerra a sessão corrente por meio de RevokeSession e do encerramento de sessão pertencente ao Auth. Não é introduzido contrato adicional. A interação entre Auth e Users/Schools ocorre somente por contratos públicos; não há acesso a internals nem dependência circular.

**Eventos:** nenhum evento novo é definido. O catálogo permitido inclui eventos existentes de Auth, mas há divergência entre `UserLoggedIn`/`AuthenticationFailed`/`UserLoggedOut` e aliases `LoginSucceeded`/`LoginFailed`/`Logout`. A publicação e o nome canônico não são pré-condição para o resultado síncrono de Login/Logout; se forem necessários a um consumidor, a divergência deve ser resolvida pelos owners antes dessa integração.

## Regras

### RB-001 — Usuário inválido não autentica

**Regra:** credencial inválida ou User inelegível não resulta em sessão autenticada. Resposta externa de falha não revela se o usuário existe ou se a senha está incorreta.

**Fonte:** ADR-0004, fluxo de Login; SPRINT1-BACKLOG.md, US-001.

**Limite:** estados exatos elegíveis e exigência universal de verificação de email não estão fechados. A decisão sobre elegibilidade deve ser ratificada; não se infere que todo estado pendente seja permitido ou negado em qualquer fluxo.

### RB-002 — Sessão revogada não é reutilizada

**Regra:** uma sessão revogada, expirada ou além do limite de inatividade é inválida para operação protegida. Se falhar a verificação necessária de revogação, a operação protegida é negada.

**Fonte:** ADR-0004, estratégia de sessão e revogação; SPRINT1-BACKLOG.md, US-002.

### RB-003 — Autenticação não implica autorização escolar

**Regra:** Login bem-sucedido estabelece identidade/sessão, mas não seleciona escola, cria SchoolMembership, atribui papel ou autoriza acesso escolar.

**Fonte:** ADR-0002, responsabilidades e dependências de Auth; ADR-0004, modelo de identidade e fluxo de Login; SPRINT1-EXECUTION-PLAN.md.

### RB-004 — Membership inválida bloqueia acesso escolar

**Regra:** sessão válida, isoladamente, não permite operação escolar. Acesso exige SchoolMembership ativa, permissão vigente e correspondência entre `schoolId` autorizado e recurso/contexto, validados no servidor. Ausência, inatividade ou incompatibilidade resulta em negação.

**Fonte:** ADR-0004, escopos/regra de autorização; ADR-0003, escopo institucional por `schoolId`; MVP-DOMAIN-MODEL.md, invariantes de tenancy; SPRINT1-BACKLOG.md, US-004.

**Limite de ownership:** essa regra expressa a fronteira de autorização. Ela não declara que SchoolMembership seja parte de User/Session nem define sua composição como Aggregate Root.

## Testes

Os testes são cenários comportamentais verificáveis, não implementação de fixtures ou estrutura técnica.

| ID           | Cenário                | Critério objetivo                                                                                                                                                                                                             |
| ------------ | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **TEST-001** | Login válido           | Com User elegível provisionado e credencial correta, a autenticação é bem-sucedida e uma sessão ativa associada ao User fica disponível. Nenhuma SchoolMembership ou autorização escolar é criada por esse resultado.         |
| **TEST-002** | Senha inválida         | Para User provisionado com senha incorreta, não é criada sessão autenticada; a resposta de falha não permite distinguir esse caso de usuário inexistente; nenhum segredo é exposto em logs/eventos.                           |
| **TEST-003** | Sessão expirada        | Sessão com idade superior a 8h é inválida. Também é inválida uma sessão sem atividade autenticada por mais de 30min, mesmo que ainda não tenha alcançado 8h. Ambas são negadas em operações protegidas.                       |
| **TEST-004** | Sessão revogada        | Após logout/revogação da sessão corrente, a mesma referência de sessão não autentica GetSession nem permite operação protegida.                                                                                               |
| **TEST-005** | Usuário sem Membership | Um User elegível sem SchoolMembership pode autenticar e obter sessão, mas não pode resolver autorização/contexto escolar nem acessar operação escolar; o resultado é negação. Não se converte essa negação em falha de Login. |

**Condição transversal:** erros de validação necessários de sessão/revogação falham fechados para operações protegidas. Os testes não assumem criação automática de usuário, membership ou papel.

## GO / NO GO

### O módulo Auth possui informação suficiente para implementação?

**NÃO — não para iniciar toda a implementação do módulo Auth sem decisões adicionais.**

Há base suficiente para especificar conceitualmente Login por email/senha, os limites de Session, revogação server-side e a separação autenticação/autorização. Porém:

1. ADR-0002, ADR-0003 e ADR-0004 continuam `Proposed`; esta especificação não os ratifica.
2. Critérios completos de elegibilidade do User e exigência de verificação de email para login ainda dependem de política ratificada.
3. ADR-0004 exige rate limiting, mas os critérios/limites aplicáveis não estão fechados nas fontes.
4. A boundary formal/composição de SchoolMembership diverge entre os documentos MVP; isso bloqueia fechar a autorização escolar como parte da entrega Auth.
5. A permission matrix requer decisões/permissões nomeadas para operações de Membership; o backlog não identifica uma regra já ratificada que autorize uma matriz específica.

### Decisão

**NO GO** para implementação completa de Auth + Session + Membership + autorização escolar. A decisão aqui é sobre prontidão documental, não sobre validade dos cinco princípios congelados nesta especificação.

**Escopo conceitualmente especificado:** autenticação email/senha, validação de sessão, limites temporais, revogação da sessão corrente e falha fechada; login não concede acesso escolar. A implementação desses itens ainda requer ratificação das decisões propostas e fechamento dos critérios de elegibilidade/rate limiting.

**Continua bloqueado:** autorização/gestão de Membership até confirmação de ownership, lifecycle, ator/permissões e validação de `schoolId`; qualquer decisão sobre elegibilidade de conta ou rate limiting que não esteja aprovada; publicação de eventos Auth sob nomenclatura ainda ambígua. Nenhum destes bloqueios autoriza a criação de conceitos, entidades, eventos ou capacidades adicionais.
