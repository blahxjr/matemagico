# Plano de execução da Security Foundation — MateMágico Champions

**Fontes oficiais de estado:** [FOUNDATION-AUDIT.md](FOUNDATION-AUDIT.md), [STRUCTURE-REPORT.md](STRUCTURE-REPORT.md), [DATABASE-EXECUTION-PLAN.md](DATABASE-EXECUTION-PLAN.md) e [EVENT-FOUNDATION-PLAN.md](EVENT-FOUNDATION-PLAN.md).  
**Referência de controles de autenticação:** [ADR-0004](ADRs/ADR-0004-authentication-authorization.md).  
**Escopo:** plano documental para concluir os controles de segurança e quality gates da Onda 1, dentro da baseline existente. Não reexecuta auditorias, não altera ADRs e não inclui código, configuração ou pipeline.

> Os ADRs da baseline permanecem `Proposed` conforme os documentos oficiais. Os controles abaixo são critérios de execução da baseline selecionada, não evidência de que já estejam implementados nem certificação de segurança.

## 1. Estado Atual

Fatos registrados nos documentos oficiais:

- O repositório usa npm workspaces/Turborepo, com apps `api` e `web` e packages, entre eles `database`, `events`, `auth` e `membership`.
- A aplicação de banco usa Prisma/PostgreSQL. O `.env` local de `packages/database` existe, mas seus valores não foram inspecionados. `.env.example` existe.
- `.env.example` foi observado com valores mascarados nas URLs; isso não comprova quais segredos existem, se são válidos, se são usados ou se estão protegidos no ambiente.
- O `docker-compose.yml` contém valores de desenvolvimento para PostgreSQL e volume persistente; a auditoria os classificou como defaults locais, não credenciais de produção.
- `TEST_DATABASE_URL` não estava presente no ambiente da auditoria; 48 testes condicionais a PostgreSQL foram pulados. O CI não provisiona PostgreSQL, não define essa variável e não executa migrations.
- Não existe `test:db`; os gates atuais não demonstram testes de persistência executados em CI.
- Auth.js não está integrado. O composition root usa defaults fail-closed para lookup de usuário, verificação de senha, autorização e diretório de escola; esses defaults impedem operação real das jornadas.
- Auth e Membership têm regras/domínio, serviços e adapters Prisma, mas integração operacional e testes com PostgreSQL no CI não estão demonstrados.
- A Foundation de eventos ainda não tem envelope versionado/validado; publicações provisórias de Membership são descartadas e não há consumers comprovados.
- Os testes de Membership/API compartilham URL e podem apagar dados das tabelas do módulo; os documentos exigem banco de teste isolado e descartável.
- A nota de segurança de prontidão da auditoria foi **45/100**, qualitativa e sem valor de certificação. A própria auditoria declara não ser pentest nem prova de prontidão de produção.

## 2. Inventário de Segredos

Este inventário distingue: (a) nomes de variáveis/valores observados nos documentos; (b) segredos exigidos por decisão; e (c) informação que não foi identificada. Não inclui valores, não divulga conteúdo de `.env` e não presume credenciais inexistentes.

| Segredo/variável                                            | Evidência nos documentos                                                                                                                                                                   | Classificação/uso esperado                                                                             | Regra de proteção                                                                                                                                                                                          |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                              | Nome requerido pelo datasource Prisma e plano DB. `.env` local em `packages/database` existe, mas não foi lido. `.env.example` foi observado com URL mascarada.                            | Segredo de conexão; acesso de aplicação/migration ao PostgreSQL conforme ambiente.                     | Valor exclusivo por ambiente; usuário com menor privilégio necessário; nunca versionar valor real, registrar em logs ou compartilhar entre ambientes.                                                      |
| `TEST_DATABASE_URL`                                         | Ausente na execução de auditoria; requerido pelas suítes Auth/Membership/API. `DATABASE_URL` é usado pelo Prisma CLI.                                                                      | Segredo/URL de teste, necessário ao runner Vitest; deve apontar para DB efêmero do job.                | Credencial descartável e escopo restrito ao job; não reutilizar em desenvolvimento persistente, staging ou produção; não emitir em output/artifacts.                                                       |
| `AUTH_SECRET`                                               | ADR-0004 exige Auth.js secret/key forte, rotacionável e fora do repositório; os documentos de estado não confirmam que a variável esteja configurada, nem o nome exato usado pelo runtime. | Segredo normativo futuro para assinatura/proteção da sessão Auth.js.                                   | Confirmar o nome/configuração ao integrar Auth.js; gerar valor forte por ambiente, armazenar em mecanismo de secrets apropriado e rotacionar sem reutilização entre ambientes. Não presumir que já exista. |
| SMTP / credenciais de email                                 | Não identificados nos documentos oficiais como variáveis, fornecedor ou configuração existentes. O ADR-0004 descreve verificação de email/reset como fluxos e tokens, não confirma SMTP.   | **Não inventariados/não confirmados.** Não criar nomes de variáveis nem declarar fornecedor.           | Se email transacional entrar em escopo, registrar primeiro o fornecedor e os segredos necessários; segregar por ambiente, limitar privilégios e evitar conteúdo de token em logs.                          |
| Credenciais locais no Compose                               | `docker-compose.yml` contém user/password default para PostgreSQL local, registrado pela auditoria como desenvolvimento.                                                                   | Valores locais/defaults de desenvolvimento; não são segredo de produção, mas não devem ser promovidos. | Restringir a uso local descartável; qualquer ambiente compartilhado/prod deve ter identidade/credencial própria, não reutilizar defaults.                                                                  |
| Senha, hash, token, cookie, MFA secret                      | ADR-0004 os classifica como dados/segredos de autenticação que não podem ser expostos em logs, traces, audit diff, eventos, Analytics ou prompts de IA.                                    | Material sensível runtime, não variável de deployment necessariamente.                                 | Nunca logar, exportar ou serializar em eventos; credenciais persistidas devem seguir os controles Argon2id/tokens digest descritos pelo ADR.                                                               |
| Outros secrets de CI, signing keys ou API keys de terceiros | Não identificados nos documentos oficiais.                                                                                                                                                 | Desconhecidos; não afirmar presença ou ausência operacional.                                           | Fazer inventário antes de habilitar qualquer integração; não introduzir segredo em repositório ou logs.                                                                                                    |

**Princípio de inventário:** placeholders mascarados não provam que o secret correspondente esteja configurado. `.env` local não foi inspecionado; não se deve inferir seu conteúdo nem copiá-lo para documentação, issues ou CI.

## 3. Gestão de Configuração

### Ambiente local

- Manter configurações de exemplo com placeholders/documentação, nunca valores reutilizáveis de produção.
- Guardar secrets locais em arquivos ignorados pelo controle de versão ou em secret manager local; confirmar essa proteção no trabalho de implementação, sem assumir pelo fato de existir `.env`.
- Usar banco descartável e credencial de teste para `TEST_DATABASE_URL`; executar somente contra PostgreSQL isolado, pois as suítes podem apagar dados.
- Não compartilhar `.env` ou valor de secret por chat, commit, output de teste ou issue. Redigir URLs em logs.
- Os defaults no Compose permanecem explicitamente locais e não devem ser tratados como credenciais válidas fora de ambiente de desenvolvimento descartável.

### CI

- Não disponibilizar segredos de produção aos jobs de pull request/testes.
- PostgreSQL de testes deve ser efêmero por job; `DATABASE_URL` e `TEST_DATABASE_URL` devem usar credencial de teste com privilégio somente sobre a instância/database descartável.
- Injetar cada variável somente nos passos que a necessitam, ocultar valores de output e impedir que traces, artifacts e mensagens de falha incluam URLs completas.
- `AUTH_SECRET` só deve existir nos jobs que efetivamente integrem/testem Auth.js; usar secret exclusivo e não reutilizável. Se não for necessário a um gate, não injetá-lo.
- Dependency review, `npm audit` e secret scanning devem ser gates explícitos, com resultado retido no contexto do PR/job e política de bloqueio definida antes da implementação.
- Rotacionar/revogar imediatamente credenciais de CI que forem expostas; não imprimir nem arquivar o valor comprometido.

### Produção

- Usar armazenamento de secrets apropriado ao ambiente de produção; secrets separados de desenvolvimento, CI e outros ambientes.
- Restringir privilégios de database e de integrações ao mínimo necessário; definir responsáveis, rotação e procedimento de revogação.
- `AUTH_SECRET` deve ser forte, específico do ambiente e rotacionável conforme o ciclo suportado pela estratégia de sessão/Auth.js.
- Não reutilizar credenciais default do Compose, `TEST_DATABASE_URL` ou credenciais do job de CI em produção.
- SMTP e credenciais de terceiros só serão configurados se/when uma integração for priorizada; os documentos atuais não identificam provider nem nomes de variáveis.
- Segredos e PII não entram em logs/eventos/traces; erros externos devem ser genéricos e detalhes internos redigidos, com correlation ID conforme ADR-0004.
- A liberação de papéis globais/privilegiados em produção depende de MFA conforme ADR-0004; essa exigência não se considera atendida por configuração futura não comprovada.

## 4. Riscos Confirmados

Classificação baseada nos riscos e lacunas já registradas; não é uma nova avaliação de vulnerabilidades.

### P0

**Nenhum risco P0** foi classificado no FOUNDATION-AUDIT.md. Isso não comprova ausência de vulnerabilidades nem prontidão para produção.

### P1

| Risco                                                                           | Evidência registrada                                                                                                                      | Tratamento no plano                                                                                                                  |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Falso verde de persistência e invariantes de acesso                             | 48 testes PostgreSQL são pulados; CI não inicia DB, injeta `TEST_DATABASE_URL` nem aplica migrations.                                     | Database Execution Plan: DB efêmero, migrations deploy, `test:db` sem skips e saída verificável.                                     |
| Jornadas Auth/Membership não operam pela composição padrão                      | Auth.js ausente; lookup/password/authorization/school usam defaults fail-closed.                                                          | Bloqueia alegações de login/Membership operacional; executar integração Auth conforme ADR-0004 antes de declarar essa parte pronta.  |
| Autorização/ownership pode regredir sem detecção suficiente                     | Fitness checks não exercitam adequadamente boundaries Auth/Membership existentes.                                                         | Testes negativos de boundaries e checks no CI; não confiar apenas no resultado atual de dependency-cruiser.                          |
| Contratos de eventos podem perder contexto/sensibilidade ou falhar sem detecção | Envelope sem versão/validação, IDs de correlação opcionais e publishers que descartam eventos.                                            | Validar envelope, minimização e tenant scope; não encaminhar secrets/PII; publisher descartável não serve como evidência de entrega. |
| Segredos de runtime não têm inventário operacional comprovado                   | DATABASE_URL local não inspecionada; TEST_DATABASE_URL ausente; AUTH_SECRET requerido pelo ADR mas não confirmado; SMTP não identificado. | Inventário explícito, segregação, não exposição e falha segura quando configuração necessária estiver ausente.                       |

### P2

| Risco                                                                            | Evidência registrada                                                                                                                         | Limite                                                                                                                                      |
| -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Segurança de sessão/Auth.js ainda não demonstrada ponta a ponta                  | ADR define estratégia, mas auditoria confirma que Auth.js não está integrado.                                                                | Implementar e validar junto ao escopo D4 de produto, não presumir a partir de regras de domínio.                                            |
| MFA para papéis privilegiados ainda é capacidade futura/condição de produção     | ADR-0004 define MFA planejado e obrigatório para papéis globais/privilegiados antes de produção; estado auditado não comprova implementação. | Não liberar esses papéis em produção sem MFA; implementação de fatores/recuperação não deve ser declarada concluída pela Onda 1 estrutural. |
| Logs estruturados, métricas, tracing e auditoria completa não estão demonstrados | TECH-DEBT registra observabilidade/auditoria pendentes; evento Foundation ainda não entrega outbox/consumer.                                 | Operação e retenção são trabalho posterior; aplicar desde já a regra de não registrar secrets/PII.                                          |
| Analytics/event consumers não existem                                            | Auditoria e Event Foundation registram ausência de consumers/projeções.                                                                      | Não encaminhar dados a Analytics externo até existir consumer autorizado e governança/consentimento/retention aprovados.                    |
| SMTP/integrações externas desconhecidos                                          | Nenhum provider ou secret correspondente foi confirmado.                                                                                     | Não assumir que email verification/reset está operacional; inventariar antes de implementar a integração.                                   |

## 5. Hardening de Auth

Somente controles definidos no ADR-0004 são incluídos; não se introduz protocolo alternativo.

### Sessão

- Integrar Auth.js Credentials para email/senha, com estratégia JWT e registro server-side de sessões/revogação conforme decisão V1.
- Limitar sessão a 8 horas absolutas e 30 minutos de inatividade; renovar a janela ociosa sem exceder a validade absoluta.
- JWT/cookie fica protegido pelo Auth.js; o registro contém apenas identificador de sessão não secreto e metadados mínimos, nunca JWT/cookie em claro.
- Claims de sessão não são autoridade para role, permission, schoolId ou membership; autorização é recalculada no servidor para cada caso de uso.
- Cookie deve usar HTTPS e `Secure`, `HttpOnly`, `SameSite=Lax`, `Path=/`, host-only e prefixo `__Host-` quando compatível. Não expor token em JavaScript, URL, localStorage ou logs.
- Criar/rotacionar identificador de sessão em login e nos eventos de elevação/reauth, reset/troca de senha e mudança de fator, conforme o ADR.
- Expiração, estado do usuário e revogação devem ser verificados em acesso protegido. Indisponibilidade do banco ao verificar revogação resulta em fail-closed.

### Revogação

- Logout limpa cookie Auth.js e revoga o registro da sessão atual.
- “Sair de todos”, reset de senha, suspensão, suspeita de takeover e revogação de MFA invalidam todas as sessões do usuário.
- Mudança/revogação de papel deve valer imediatamente nas decisões de autorização; não confiar em claims antigas nem em cache permissivo stale para permissões privilegiadas.
- Eventos/audit trail registram o fato da revogação sem incluir o token ou cookie.

### Credenciais

- Auth.js Credentials é o provider V1; não criar protocolo de sessão/token próprio.
- Senhas usam Argon2id com salt único, parâmetros calibrados no hardware de produção e rehash gradual quando parâmetros mudarem. Hash não é reversível e nunca aparece em logs/eventos.
- ADR-0004 define mínimo de 15 caracteres para login somente por senha, máximo aceito de pelo menos 128, passphrases/Unicode/password managers, bloqueio de senhas comuns/comprometidas e sem regras arbitrárias de composição ou rotação periódica.
- Rate limiting combina conta normalizada, IP/rede e sinais de risco; limites separam login, registro, verificação, convite e reset. Atraso temporário progressivo evita lockout permanente como vetor de negação de serviço.
- Erros externos genéricos não revelam existência de email, membership, escola ou role. Resposta inclui correlation ID; detalhes técnicos ficam redigidos na observabilidade.
- Recuperação usa canal verificado e token de uso único/curta duração com digest armazenado; não usa perguntas de segurança; reset revoga sessões.

### MFA futuro

- Planejar fatores, recuperação e step-up seguindo ADR-0004; MFA não é afirmado como implementado no estado atual.
- Antes de liberar papéis globais/privilegiados em produção, exigir MFA para esses papéis.
- Step-up é requerido para concessão de role, exportação sensível, mudança de fatores e break-glass.
- Recuperação/break-glass exige auditoria; segredo MFA nunca é enviado a logs, eventos ou Analytics.
- Até o controle estar disponível e validado, o gate de release deve impedir liberar papéis privilegiados em produção sem a proteção.

## 6. Security Gates

Os documentos de estado não confirmam que os três gates abaixo estejam implementados no CI. Devem tornar-se passos obrigatórios e verificáveis; este plano não define pipeline nem ferramenta/configuração específica.

| Gate              | Escopo mínimo                                                                                                                                                                                    | Critério de bloqueio                                                                                                                                                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dependency review | Revisar dependências novas/atualizadas do `package-lock.json` em PR, origem, advisories/licença conforme política do repositório e necessidade da mudança.                                       | Bloquear dependência com vulnerabilidade/risco inaceitável sem exceção documentada, owner e prazo; não aceitar adição transitiva não revisada.                                                                                                             |
| `npm audit`       | Executar contra o lockfile efetivo do PR/CI; classificar severidade, package/path e existência de correção. Distinguir runtime e dev/test dependencies sem omitir a transitive tree.             | Bloquear vulnerabilidades acima do threshold que stakeholders definirem; exceção temporária requer justificação, mitigação, owner e expiração. Threshold deve ser registrado antes de ativar o gate; não declarar “pass” apenas porque a ferramenta rodou. |
| Secret scanning   | Varredura do commit/diff e do repositório conforme capacidade aprovada; reconhecer padrões de URLs/credenciais, `AUTH_SECRET`, tokens/chaves e secrets de providers, sem registrar seu conteúdo. | Qualquer secret plausível em código, docs, fixtures, logs ou artifacts bloqueia merge e exige revogação/rotação; mascarar o valor no alerta e remover do histórico por processo aprovado se houve commit.                                                  |

### Gates complementares de CI

- `format:check`, lint, build e suites unitárias.
- `db:validate`, migrations em PostgreSQL descartável e `test:db` conforme DATABASE-EXECUTION-PLAN.md, sem skips por URL ausente.
- `test:architecture` com fixtures negativas cobrindo apps/packages/modules reais, incluindo limites de Auth/Membership.
- Contract tests Events validam campos obrigatórios e payloads minimizados; publisher provisório que descarta não pode satisfazer critério de entrega.
- Nenhum job de pull request recebe secrets de produção. Falha de gate é explícita; não usar fallback que converta erro de segurança em sucesso.
- Documentar tratamento de falso positivo/exceção sem desabilitar o scanner ou expor o secret detectado.

## 7. Logs de Segurança

### Formato mínimo do registro auditável

Conforme ADR-0004, a trilha de segurança deve ser append-only e registrar, quando aplicável:

- **Quem:** `actorUserId` ou identidade de sistema; distinguir operação automatizada.
- **Quando:** timestamp UTC confiável.
- **Onde:** `schoolId`/`membershipId` quando escolar, scope, recurso e identificador; origem de rede/dispositivo somente minimizada e conforme retenção aprovada.
- **O quê:** ação normalizada, resultado (`success`, `denied` ou `failure`), motivo/código e referência ao objeto; registrar campos alterados apenas se necessários e não sensíveis.
- **Correlação/governança:** correlation/request ID; impersonation/break-glass, approver, justificativa, versão de regra e contexto quando aplicável.
- O acesso ao audit log também é auditado; visibilidade é tenant-scoped e retenção fica alinhada a ADR-0003 e revisão jurídica.

### Eventos mínimos auditáveis

| Categoria            | Eventos/fatos mínimos a rastrear quando o fluxo existir                                                                                                  | Condições                                                                                                            |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Autenticação         | `LoginSucceeded`, `LoginFailed` (agregados/rate-limited), `Logout`; resultado e categoria da falha.                                                      | Sem email bruto, senha, hash, token ou detalhe que facilite enumeração.                                              |
| Sessão               | `SessionRevoked`, logout-all e revogação por reset/suspensão/suspeita de takeover.                                                                       | Identificar referência de sessão/usuário sem incluir JWT/cookie; registrar motivo categorizado.                      |
| Credenciais          | `PasswordChanged`, `PasswordResetRequested`, `PasswordResetCompleted`, `EmailVerified`.                                                                  | Sem senha, hash, token de reset/verificação ou endereço bruto no payload analítico.                                  |
| Acesso institucional | `MembershipCreated`, `MembershipRemoved`, `RoleGranted`, `RoleRevoked`; ator/target referenciados, scope, `schoolId`, validade e approver quando houver. | Ação autorizada/negada, motivo categorizado; evento de domínio e audit log detalhado permanecem conceitos distintos. |
| Conta                | `UserCreated`, `UserActivated`, `UserSuspended`, `UserReactivated`, quando os owners e fluxos correspondentes existirem.                                 | Não presumir módulos/produtores Users implementados hoje; payload minimizado.                                        |
| Acesso privilegiado  | MFA enrollment/recovery, step-up, break-glass/impersonation e uso administrativo privilegiado.                                                           | MFA/break-glass só quando capacidade estiver implementada; registrar justificativa/approver sem fator secreto.       |

Não converter cada consulta de School Context em evento: resolução/validação são leituras no estado atual. Não confundir `audit_logs` append-only com eventos de domínio ou telemetria. Analytics recebe somente projeções mínimas autorizadas; dados detalhados permanecem em audit log first-party com acesso restrito.

### Dados proibidos nos logs, eventos e traces

- senha, hash Argon2id, token/cookie/JWT, segredo Auth.js ou segredo MFA;
- URL de reset/convite/verificação e connection string completa;
- email bruto ou PII de estudante sem finalidade/autorização;
- payload privado da resposta ou valores sensíveis de audit diff;
- claims de sessão apresentados como evidência de autorização.

## 8. Critérios de Aceite

### Secret/configuration management

- [ ] O inventário separa variáveis confirmadas, variáveis exigidas pelo ADR e itens não identificados; não contém valores reais.
- [ ] `DATABASE_URL` e `TEST_DATABASE_URL` são exclusivos do ambiente de teste no CI, apontam ao DB efêmero e são redigidos em logs/artifacts.
- [ ] O segredo Auth.js requerido pela baseline é configurado por ambiente apenas quando Auth.js for integrado; nenhum valor é commitado, reutilizado entre ambientes ou exibido.
- [ ] Não são inventadas variáveis SMTP/provider: a configuração só é criada após decisão de integração e inventário explícito.
- [ ] Defaults do Compose são documentados como locais e não são reutilizados por CI compartilhado ou produção.
- [ ] `.env` local não é lido/copiado para evidência; placeholders de exemplo não são tratados como secrets válidos.

### CI security gates

- [ ] Dependency review, `npm audit` e secret scanning executam em PR/CI e têm threshold, critérios de exceção, owner e expiração definidos.
- [ ] Secret scan oculta valor detectado; vazamento exige bloqueio e rotação/revogação, não somente apagar a linha.
- [ ] CI de PR não recebe secrets de produção; exceção de secret usado para Auth test é sintética e exclusiva do ambiente de teste.
- [ ] PostgreSQL/migrations/`test:db` passam conforme DATABASE-EXECUTION-PLAN.md; falha ou configuração ausente bloqueia.
- [ ] Architecture fitness e contract tests de eventos passam para os boundaries e contratos reais; fixtures negativas confirmam rejeição de violações.
- [ ] Gates não têm fallback que transforme ferramenta indisponível, resultado vazio ou erro em sucesso.

### Auth e registros

- [ ] A integração Auth.js segue Credentials + JWT e registro server-side revogável definido pelo ADR-0004; nenhuma autenticação/protocolo paralelo é introduzido.
- [ ] Sessões respeitam 8h absolutas/30m idle, revogação server-side, renovação e fail-closed se o banco de revogação está indisponível.
- [ ] Cookie/session atende os atributos definidos em ADR-0004 e não há token em URL, localStorage, JavaScript ou logs.
- [ ] Password credential usa Argon2id/salt único e regras de senha definidas; hashes nunca aparecem em eventos ou audit diffs.
- [ ] Login/reset/logout/revogação e decisões de autorização são verificáveis com testes integrados, incluindo cenários negativos e tenant mismatch conforme o escopo Auth implementado.
- [ ] Eventos de auditoria registram identidade/ator, instante, scope/recurso, ação, resultado, motivo e correlation ID conforme aplicável, sem secrets.
- [ ] Papéis globais/privilegiados não são liberados em produção antes de MFA conforme ADR-0004.
- [ ] Pendências legais/consentimento/retention para menores não são declaradas resolvidas por este plano.

## 9. Definition of Done — Security Foundation

- [ ] Inventário de segredos aprovado, sem valores; `DATABASE_URL`, `TEST_DATABASE_URL`, `AUTH_SECRET` requerido e estado desconhecido de SMTP/terceiros estão claramente distinguidos.
- [ ] Ambientes local, CI e produção têm regras de segregação, menor privilégio, rotação, redação e uso aprovadas.
- [ ] Credenciais default do Compose são limitadas a desenvolvimento local descartável; nenhuma é reutilizada fora dele.
- [ ] Dependency review, `npm audit` e secret scanning são gates bloqueantes com política de severidade/exceção mantida e resultados rastreáveis.
- [ ] Nenhum secret é enviado a logs, traces, audit diff, eventos, Analytics ou artifacts; teste/review de payload garante redaction.
- [ ] Gates de database e events definidos nos planos oficiais executam no CI e falham sem infraestrutura/contrato válido; resultados verdes não escondem skips.
- [ ] Limites de arquitetura entre apps/packages/modules existentes são exercitados por testes negativos, incluindo Auth/Membership.
- [ ] Auth.js e adapters operacionais são implementados/testados antes de declarar jornada Auth/Membership pronta; defaults fail-closed não são usados como wiring operacional de sucesso.
- [ ] Sessão/revogação/credenciais seguem controles ADR-0004 e são cobertos por testes positivos/negativos.
- [ ] Audit trail cobre os eventos mínimos dos fluxos efetivamente existentes; fatos de Users/MFA/produto futuro não são falsamente reportados como implementados.
- [ ] MFA é exigido para papel privilegiado/global antes de liberação em produção, ou a liberação desses papéis é bloqueada.
- [ ] Exceções de segurança têm owner, mitigação, justificativa e data de expiração; não existe bypass silencioso de gate.
- [ ] Nenhum ADR, código, configuração ou pipeline foi alterado por esta entrega documental.
- [ ] O relatório final distingue **Security Foundation Done** de pentest, revisão jurídica, hardening de produção e implementação de capacidades futuras.

## 10. Resumo Executivo

1. **Quais riscos existem hoje?** CI não executa os 48 testes PostgreSQL pulados; Auth.js/adapters reais não estão integrados e a composição falha fechada; boundaries e eventos ainda não têm gates completos. A prontidão de segurança está avaliada qualitativamente em 45/100, sem equivaler a auditoria de vulnerabilidades.
2. **Quais segredos precisam ser protegidos?** `DATABASE_URL` e `TEST_DATABASE_URL`; `AUTH_SECRET` é requerido pelo ADR-0004, mas sua configuração não foi confirmada. Credenciais PostgreSQL do Compose são defaults locais. SMTP, API keys e outros secrets não foram identificados; senhas, hashes, tokens, cookies e MFA secrets são dados sensíveis proibidos em logs/eventos.
3. **Quais gates devem existir no CI?** Dependency review, `npm audit`, secret scanning, migrations PostgreSQL isoladas + `test:db`, architecture fitness e contract tests de eventos, além dos quality gates existentes.
4. **O que falta para Security Foundation Done?** Inventariar/segregar secrets; tornar os gates obrigatórios e fail-closed; executar testes DB e migrations sem skips; validar fronteiras e contratos; integrar/hardening Auth conforme ADR-0004; produzir audit trail minimizado; bloquear papéis privilegiados em produção até MFA.

### Resultado da revisão limitada aos documentos

A revisão delegada, limitada aos documentos oficiais e ao ADR-0004, **não encontrou vulnerabilidades exploráveis confirmadas**. Isso não substitui revisão de código, pentest ou certificação; a auditoria de Foundation explicitamente não teve esse escopo.

| #   | Severity | File | Lines | Vulnerability                                                                 | Confidence |
| --- | -------- | ---- | ----- | ----------------------------------------------------------------------------- | ---------- |
| —   | —        | —    | —     | Nenhuma vulnerabilidade explorável confirmada na revisão documental limitada. | —          |
