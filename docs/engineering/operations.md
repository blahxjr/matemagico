# Operacao e hardening

## Runtime

- `GET /health` e liveness e nao depende do banco.
- `GET /ready` verifica a composicao, PostgreSQL, estado de migrations e as tabelas de auditoria e rate limit.
- `GET /metrics` expoe contadores e histogramas Prometheus; mantenha o endpoint restrito a rede de monitoramento no ingress de producao.
- A API aceita `X-Request-Id` e `X-Correlation-Id` validados e devolve ambos na resposta. Sem IDs validos, gera um request ID.
- Logs sao JSON e incluem nivel, timestamp, requestId, correlationId, ator quando autenticado, escola, operacao e duracao.

## Auditoria e permissoes

Eventos de auditoria cobrem login/logout, ativacao de Membership, concessao de Role, ciclo de vida de simulados, conclusao de Attempt, exportacao e desativacao de dados pessoais. Metadados nao devem conter credenciais, tokens ou payloads completos.

O cache de autorizacao e em memoria, por ator/escola/operacao, com TTL de 15 segundos e invalidacao local em ativacao/concessao de Roles. Antes de executar mais de uma replica da API, substituir ou complementar este cache com invalidacao distribuida.

## Rate limit

O limiter Prisma compartilha contadores entre processos em janelas fixas de 15 minutos. Os identificadores de e-mail/IP sao persistidos somente como SHA-256. Login e registro falham fechados se a persistencia indisponivel.

## Privacidade

- `GET /me/export` exige Session e retorna perfil, Memberships e Attempts do proprio ator; cada exportacao e auditada.
- `POST /me/deactivate` desativa logicamente o ator, revoga suas Sessions ativas e preserva o historico academico.
- A exportacao e destinada ao proprio usuario autenticado; nao retorna credenciais nem tokens.

## Staging em Docker

Configure `POSTGRES_PASSWORD` e, opcionalmente, `POSTGRES_DB`, `POSTGRES_USER`, `API_PORT`, `WEB_PORT` e `CORS_ALLOWED_ORIGINS`. Use uma senha URL-safe para compor `DATABASE_URL`.

```sh
docker compose -f docker-compose.staging.yml up --build
```

O servico `migrate` executa `prisma migrate deploy`; a API so inicia apos a migration e so fica healthy quando `/ready` passa. A Web inicia apos a API. O banco usa volume nomeado `staging-postgres`; nao compartilhe esse volume com suites destrutivas de testes.

Para provisionar os papeis, banco de questoes MOCK e uma escola de smoke test no Compose, execute o servico de seed com `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD` configurados:

```sh
docker compose -f docker-compose.staging.yml --profile seed run --rm seed
```

Para rodar o smoke test contra a API de staging ja iniciada:

```sh
SMOKE_BASE_URL=http://127.0.0.1:3333 \
SMOKE_EMAIL=admin@matemagico.local \
SMOKE_PASSWORD='<senha-de-staging>' \
npm run smoke-test
```

O teste cria e publica um simulado e finaliza uma tentativa no contexto do usuario configurado. Execute-o somente em uma escola/conta descartavel de staging. `SMOKE_SCHOOL_ID`, `SMOKE_TOPIC_ID` e `SMOKE_LEVEL` podem restringir a fixture.

## CI e release

O workflow bloqueia merge em lint, build, testes unitarios, DB, E2E, arquitetura, formatacao, sincronizacao OpenAPI e smoke API. Use os resultados do workflow e do smoke em staging como evidencias; nao crie a tag `v0.2.0-mvp` antes de todos passarem. O workflow de CI prova o caminho da aplicacao, mas nao substitui a validacao em um ambiente de staging real.
