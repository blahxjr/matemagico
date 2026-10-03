# AUTH MVP DECISIONS

## Status e escopo

Este documento fixa decisões operacionais mínimas para implementar a persistência e o fluxo de autenticação do MVP. As decisões valem somente para o MVP, complementam `AUTH-FOUNDATION.md` e `AUTH-PERSISTENCE-DESIGN.md` e não alteram nem promovem o status dos ADRs existentes.

As fontes documentam identidade global `User`, ownership separado entre Users e Auth, login por email/senha, email normalizado único, senha derivada com Argon2id, estados de User ativo/suspenso/pendente, sessão server-side revogável e comunicação entre módulos por contratos públicos. As escolhas que fecham pontos em aberto — incluindo cardinalidades, identificadores próprios de Auth, limite de sessões, política numérica de rate limiting e elegibilidade — são **decisões operacionais MVP**, não fatos atribuídos aos ADRs.

## 1. Identificadores

- **User:** `userId` é o identificador principal, por ser a identidade estável já documentada. O email normalizado é identificador alternativo de busca/login, não substitui `userId`.
- **AuthAccount:** `authAccountId` é o identificador principal. É uma chave estável própria do vínculo de autenticação, sem transferir ownership de `User` para Auth.
- **PasswordCredential:** `passwordCredentialId` é o identificador principal. A credencial permanece conceitualmente separada de `User` e de `AuthAccount`.
- **Session:** `sessionId` é o identificador principal, não secreto e já documentado; não é o JWT/cookie.

Os identificadores principais são únicos em seu respectivo conceito. Para o único provider do MVP, `credentials`, o par provider + subject/account id também é único; o subject identifica o `AuthAccount`.

## 2. Cardinalidades

- **User ↔ AuthAccount: 1:1 no MVP.** Um User pode ter zero ou um AuthAccount; um User habilitado para login tem exatamente um. Cada AuthAccount pertence a exatamente um User. Não há múltiplos providers no MVP.
- **User ↔ PasswordCredential: 1:1 para User habilitado para login.** Um User sem credencial não autentica. A relação persistente é **AuthAccount ↔ PasswordCredential: 1:1**; cada credencial pertence ao único AuthAccount do User. Não se mantém histórico de hashes neste MVP: a credencial vigente é substituída no mesmo conceito quando alterada.
- **User ↔ Session: 1:N, limitada a no máximo cinco sessões simultaneamente ativas por User.** Cada Session pertence a exatamente um User. No login que produziria uma sexta sessão, a criação e a revogação da sessão ativa mais antiga fazem parte de uma única operação lógica: se a nova Session não puder ser criada, a sessão antiga permanece ativa. Empate em `createdAt` é resolvido pelo menor `sessionId` em ordem lexical.

Uma Session conta como ativa se não estiver revogada, não tiver ultrapassado a expiração absoluta de oito horas e não tiver excedido 30 minutos sem atividade autenticada. A revogação segue o mecanismo server-side documentado.

## 3. Email

- **O email é único? SIM.** A unicidade é global entre Users e aplicada sobre o email normalizado.
- **O email é obrigatório? SIM.** Todo User provisionado para autenticação no MVP precisa de email normalizado.
- **Pode existir mais de uma conta User por email? NÃO.** Um email normalizado identifica no máximo um User. No MVP, esse User possui no máximo um AuthAccount de provider `credentials`.

## 4. Credencial

Um User habilitado para login possui **exatamente uma PasswordCredential vigente** associada ao seu AuthAccount. Um User sem AuthAccount ou sem PasswordCredential não pode autenticar. A credencial guarda somente o hash Argon2id e os metadados já previstos nas fontes; alteração substitui o hash vigente e atualiza o instante de alteração, sem reter hashes anteriores neste MVP.

## 5. Sessões simultâneas

**Definição: limitadas — máximo de cinco sessões ativas por User.** Permite uso em mais de um dispositivo sem manter uma quantidade sem limite de sessões revogáveis. O sexto login bem-sucedido revoga a sessão ativa mais antiga e cria a nova como uma única operação lógica; se a criação falhar, não revoga a sessão anterior. A regra deve preservar o máximo de cinco também diante de logins concorrentes. Permanecem inalterados os limites absolutos de oito horas, inatividade de 30 minutos e revogação server-side.

## 6. Consulta por email

**É permitido localizar User por email? SIM.** Auth solicita a busca ao owner Users por seu contrato público de aplicação, usando email normalizado. O contrato retorna somente os dados mínimos para autenticação — identidade `userId` e elegibilidade/estado aplicável — e não expõe repositório, tabela ou internals de Users. Auth continua owner de AuthAccount, PasswordCredential e Session. Externamente, falha por email inexistente, conta inelegível ou senha incorreta deve ter resposta genérica, sem enumerar Users.

## 7. Rate limiting

**Existe rate limiting? SIM.** Política mínima operacional do MVP:

- No máximo **cinco falhas de autenticação para o mesmo email normalizado em uma janela móvel de 15 minutos**. A partir da quinta falha, novas tentativas para esse email são recusadas até que as falhas saiam da janela.
- No máximo **30 solicitações de login por endereço IP em uma janela móvel de 15 minutos**, independentemente do resultado. Solicitações adicionais são recusadas até que saiam da janela.
- A recusa usa a mesma resposta genérica de falha de autenticação e não altera o estado global do User nem cria uma sessão.
- Limites e contadores são específicos da proteção do fluxo de login do MVP; não estabelecem política para outros fluxos fora deste escopo.

Esta política numérica é uma **decisão operacional MVP**, não um limite já estabelecido pelos ADRs.

## 8. Elegibilidade para login

O login só é permitido quando todas as condições abaixo forem satisfeitas:

1. O email normalizado corresponde a exatamente um User.
2. O User está no estado `ACTIVE`; `PENDING_EMAIL`/pendente e suspenso não são elegíveis. Para o MVP, o estado `ACTIVE` só é concedido após a verificação de email exigida para ativação.
3. Existe exatamente um AuthAccount do provider `credentials` vinculado ao User.
4. Existe exatamente uma PasswordCredential vigente vinculada a esse AuthAccount.
5. A senha apresentada corresponde à credencial vigente.
6. A tentativa não está recusada pelos limites de rate limiting.

Ausência de User, estado diferente de `ACTIVE`, falha ao obter o estado pelo contrato público, ausência ou multiplicidade inesperada de conta/credencial, falha de senha ou limite excedido resultam em falha de autenticação e não criam Session. O resultado externo não revela qual condição falhou.

## 9. Matriz final

| Tema                                         | Decisão                                                                                                                                                    | Justificativa                                                                                                                      |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| User — identificador principal               | `userId`; único e estável. Email normalizado é alternativo para busca/login.                                                                               | O identificador estável de User é documentado; o email não substitui a identidade canônica.                                        |
| AuthAccount — identificador principal        | `authAccountId`; único. No provider `credentials`, provider + subject/account id também é único.                                                           | AuthAccount é um conceito de Auth distinto de User; a chave própria operacionaliza o vínculo sem cruzar ownership.                 |
| PasswordCredential — identificador principal | `passwordCredentialId`; único.                                                                                                                             | PasswordCredential é um conceito persistente distinto; uma chave estável própria permite identificá-lo sem usar o hash como chave. |
| Session — identificador principal            | `sessionId`; único e não secreto.                                                                                                                          | Identifica a sessão para validação/revogação sem armazenar JWT/cookie em claro.                                                    |
| User ↔ AuthAccount                           | 1:1 no MVP: User tem zero ou um; User elegível para login tem exatamente um; AuthAccount pertence a um User.                                               | Email/senha é o único provider do MVP; múltiplas identidades de provider ficam fora do escopo.                                     |
| User ↔ PasswordCredential                    | 1:1 para User elegível; associação persistente direta é AuthAccount ↔ PasswordCredential em 1:1.                                                           | Mantém AuthAccount como vínculo de autenticação e credencial como conceito separado. User sem credencial não autentica.            |
| User ↔ Session                               | 1:N, com máximo de cinco sessões ativas. A sexta criação revoga a mais antiga.                                                                             | Preserva múltiplos dispositivos com limite operacional explícito; respeita expiração e revogação já documentadas.                  |
| Email único                                  | SIM, globalmente entre Users após normalização.                                                                                                            | Fato documentado para login por email; evita identidades concorrentes.                                                             |
| Email obrigatório                            | SIM para todo User provisionado para autenticação no MVP.                                                                                                  | Email/senha é o método de login escolhido para o MVP.                                                                              |
| Mais de uma conta User por email             | NÃO.                                                                                                                                                       | Decorre da unicidade global do email normalizado.                                                                                  |
| Credenciais ativas por User                  | Exatamente uma credencial vigente para User habilitado; nenhuma para User que não pode autenticar. Alteração substitui a vigente.                          | Permite validação determinística sem introduzir histórico de credenciais ou estados adicionais.                                    |
| Localização de User por email                | SIM, via contrato público de Users e com email normalizado; retorno mínimo necessário a Auth.                                                              | Satisfaz CQ-001 sem acesso a internals e preserva os boundaries documentados.                                                      |
| Rate limiting                                | SIM: cinco falhas por email normalizado/15 min e 30 solicitações por IP/15 min; excedido o limite, recusar até as ocorrências saírem da janela.            | Concretiza a defesa contra brute force requerida pelo ADR-0004 sem alterar estado da conta nem revelar sua existência.             |
| Elegibilidade                                | User existente e `ACTIVE` após verificação de email; AuthAccount `credentials` único; uma PasswordCredential vigente; senha válida; limites não excedidos. | Torna executáveis a elegibilidade e a verificação de credencial, falhando fechadamente nos estados inválidos ou não verificáveis.  |
| Falha de autenticação                        | Resposta genérica; nenhuma Session criada.                                                                                                                 | Evita enumeração de conta e mantém RB-001.                                                                                         |
| Aplicabilidade                               | Decisões operacionais restritas ao MVP; ADR-0002, ADR-0003 e ADR-0004 permanecem sem alteração de status.                                                  | Atende à necessidade de destravar implementação sem promover nem alterar ADRs existentes.                                          |

## 10. GO / NO GO

### A persistência Auth pode ser implementada?

**SIM — GO para implementar a persistência Auth V1 de `AuthAccount`, `PasswordCredential` e `Session`, com `User` somente referenciado pelo `userId` e consultado pelo contrato público de Users.** Users permanece owner e responsável pela persistência de `User`; este GO não autoriza Auth a criar ou gravar estado de User. Os identificadores, cardinalidades, unicidade, associação da credencial, lookup por email, elegibilidade, rate limiting e limite de sessões estão agora definidos para o MVP.

O GO não autoriza ampliar o escopo para Membership, autorização escolar, outros providers, cadastro público, recuperação de senha, MFA, logout de todas as sessões ou publicação de eventos com nomes ainda divergentes. Também não altera nem promove ADR-0002, ADR-0003 ou ADR-0004; estes continuam com o status que já possuem.
