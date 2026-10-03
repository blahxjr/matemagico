# ADR-0010 - Frontend Architecture and UI Composition Strategy

**Date**: 2026-09-29  
**Status**: Proposed (aguardando revisão e aprovação)  
**Deciders**: Architecture Lead, Frontend Lead, Tech Lead e Product (a confirmar)  
**Affects**: apps/web, packages/ui, packages/shared-types, todos os módulos de domínio, autenticação, analytics e experiência do usuário

---

# 1. Contexto

O MateMágico Champions será desenvolvido com Next.js 15, React, TypeScript, Tailwind CSS e Shadcn UI.

Os ADRs anteriores estabeleceram:

- Modular Monolith
- DDD
- Clean Architecture
- Bounded Contexts
- PostgreSQL + Prisma
- Auth.js
- Comunicação por contratos e eventos

Contudo, ainda não existe uma decisão formal sobre:

- Organização da camada frontend
- Estrutura das páginas
- Estratégia de Server Components
- Estratégia de Client Components
- Estado da interface
- Formulários
- Design System
- Acessibilidade
- Performance
- Composição de features

Sem essa definição existe risco de:

- Acoplamento da UI ao domínio
- Componentes gigantes
- Duplicação visual
- Regras de negócio na interface
- Crescimento descontrolado da aplicação

---

## Restrições

- Next.js 15 é obrigatório.
- React é obrigatório.
- TypeScript é obrigatório.
- Tailwind CSS é obrigatório.
- Shadcn UI é obrigatório.
- A UI não pode conter regras de negócio.
- A UI não pode acessar Prisma diretamente.
- A UI não pode acessar banco de dados.
- A UI não pode importar entidades internas dos módulos.
- A UI deve funcionar com SSR, SSG e Streaming.
- A aplicação deve permanecer compatível com crescimento para mais de 100 mil alunos.

---

## Requisitos

- Separar claramente UI e domínio.
- Maximizar reutilização de componentes.
- Garantir acessibilidade.
- Garantir performance.
- Facilitar manutenção.
- Facilitar testes.
- Permitir múltiplos dashboards.
- Permitir internacionalização futura.
- Reduzir bundle JavaScript.

---

# 2. Decisão

## DECLARAÇÃO DA DECISÃO

A aplicação web utilizará **Feature-Based Frontend Architecture** construída sobre Next.js App Router.

A interface será organizada em:

- Routes
- Features
- Shared UI
- Design System
- Application Adapters

A UI consumirá exclusivamente contratos públicos dos módulos.

Nenhuma regra de negócio será implementada em componentes React.

---

## 2.1 Estrutura Geral

```text
apps/web/src

app/
  (public)
  (auth)
  (student)
  (teacher)
  (admin)

features/
  auth/
  dashboard/
  questions/
  study-paths/
  exams/
  championships/
  rankings/
  analytics/

components/
  ui/
  layouts/
  charts/
  forms/
  feedback/

lib/
  api/
  auth/
  validation/

hooks/

styles/

providers/
```

---

## 2.2 Responsabilidades

| Camada     | Responsabilidade             |
| ---------- | ---------------------------- |
| app        | Rotas                        |
| features   | Casos de uso visuais         |
| components | Componentes reutilizáveis    |
| providers  | Contextos React              |
| lib        | Integrações                  |
| hooks      | Comportamentos reutilizáveis |
| styles     | Temas globais                |

---

## 2.3 Server Components por padrão

Todo componente deve nascer como:

```tsx
Server Component
```

Client Components serão utilizados apenas quando houver:

- interação do usuário
- formulário
- estado local
- animação
- websocket
- drag and drop

---

## 2.4 Regra de ouro

Preferir:

```tsx
Server Component
```

antes de:

```tsx
'use client';
```

---

## 2.5 Design System

Será adotado:

- Shadcn UI
- Radix UI
- Tailwind CSS

A biblioteca interna ficará em:

```text
packages/ui
```

---

## Componentes obrigatórios

### Inputs

- Input
- Textarea
- Select
- Combobox
- Checkbox
- Radio Group

### Feedback

- Alert
- Toast
- Empty State
- Skeleton
- Error State

### Navegação

- Sidebar
- Breadcrumb
- Tabs
- Pagination

### Dados

- DataTable
- Cards
- Charts
- Metrics

---

## 2.6 Formulários

Padrão obrigatório:

```text
React Hook Form
+
Zod
```

Fluxo:

```text
UI
→ validação Zod
→ Action
→ módulo
→ resposta
```

A validação nunca dependerá apenas do navegador.

---

## 2.7 Estratégia de Estado

O ownership de estado, Zustand, TanStack Query, cache e BFF e definido pelo [ADR-0005](ADR-0005-frontend-architecture-state-management-bff.md). Esta secao complementa somente composicao visual; em conflito, ADR-0005 e normativo.

### Estado Local

Utilizar `useState`/`useReducer` para estado efemero do componente ou fluxo visual.

---

### Estado do Servidor

Dados remotos e sessao permanecem server-owned e sao lidos por Server Components/contratos do modulo owner, conforme ADR-0005. Filtros e paginacao compartilhaveis pertencem a URL/search params.

---

### Estado Global

Nao ha estado global de dominio. Zustand pode conter somente estado efemero de UI compartilhado dentro de uma feature, conforme os limites e lifecycle do ADR-0005. Auth.js/session, roles, permissoes e `schoolId` de autorizacao sao server-owned.

---

### Proibido

Armazenar:

- domínio
- tentativas
- rankings
- trilhas

em stores globais.

Esses dados pertencem aos módulos. Tambem e proibido persistir credenciais, tokens, roles/permissoes autoritativas ou `schoolId` como prova de acesso no browser.

---

## 2.8 Comunicação com Backend

A UI nunca acessa Prisma.

Fluxo obrigatório:

```text
Page
→ Server Action
→ Módulo
→ Caso de Uso
→ Resultado
```

---

## 2.9 Estratégia de Dashboard

Todos os dashboards utilizarão:

```text
Tremor
```

e

```text
Recharts
```

conforme definido no Documento Mestre.

Tipos:

- Dashboard do Aluno
- Dashboard do Professor
- Dashboard da Escola
- Dashboard Administrativo

---

## 2.10 Acessibilidade

Meta mínima:

```text
WCAG 2.2 AA
```

Obrigatório:

- navegação por teclado
- contraste adequado
- labels explícitas
- aria attributes
- foco visível

---

## 2.11 Performance

Metas iniciais:

| Métrica | Meta    |
| ------- | ------- |
| LCP     | < 2.5s  |
| INP     | < 200ms |
| CLS     | < 0.1   |

---

Estratégias:

- Streaming
- Suspense
- Dynamic Import
- Image Optimization
- Route Segmentation

---

## 2.12 Responsividade

Breakpoints:

```text
Mobile
Tablet
Desktop
Large Desktop
```

Mobile-first obrigatório.

---

## 2.13 Tema

Inicialmente:

```text
Light
Dark
System
```

Persistidos em preferência do usuário.

---

# Por que esta escolha

| Opção                                     | Vantagens                            | Custos                        | Decisão     |
| ----------------------------------------- | ------------------------------------ | ----------------------------- | ----------- |
| Next.js App Router + Feature Architecture | Escalável, modular e alinhado ao DDD | Maior disciplina arquitetural | Selecionada |
| Estrutura por páginas tradicionais        | Simples inicialmente                 | Escala mal                    | Rejeitada   |
| SPA completa                              | Boa interatividade                   | Bundle alto e SEO inferior    | Rejeitada   |
| Microfrontends                            | Independência extrema                | Complexidade excessiva        | Rejeitada   |

---

# 3. Consequências

## Positivas

- UI desacoplada do domínio.
- Componentes reutilizáveis.
- Menor bundle JavaScript.
- Melhor SEO.
- Melhor acessibilidade.
- Melhor experiência mobile.
- Facilidade de testes.

---

## Negativas

- Maior curva de aprendizado em Server Components.
- Disciplina obrigatória para evitar uso excessivo de Client Components.
- Necessidade de design system consistente.

---

## Trade-offs aceitos

| Trade-off                  | Aceito porque       | Monitorar                  |
| -------------------------- | ------------------- | -------------------------- |
| Mais SSR                   | Melhor performance  | Tempo de renderização      |
| Menos estado global        | Menos acoplamento   | Complexidade de composição |
| Design System centralizado | Consistência visual | Evolução dos componentes   |

---

# 4. Riscos

| ID  | Risco                              | Severidade | Probabilidade | Mitigação                 |
| --- | ---------------------------------- | ---------- | ------------- | ------------------------- |
| R1  | Uso excessivo de Client Components | Alta       | Média         | Revisão arquitetural      |
| R2  | Duplicação de componentes          | Média      | Média         | Design System obrigatório |
| R3  | Regras de negócio na UI            | Alta       | Média         | Code Review               |
| R4  | Bundle excessivo                   | Alta       | Média         | Análise contínua          |
| R5  | Baixa acessibilidade               | Alta       | Média         | Auditorias WCAG           |
| R6  | Estado global excessivo            | Média      | Média         | Restringir Zustand        |

---

## Sinais de revisão

- Crescimento excessivo do bundle.
- LCP acima de 2.5 segundos.
- Componentes duplicados.
- Crescimento de stores globais.
- Queda de acessibilidade.
- Aumento de lógica de negócio no frontend.

---

# 5. Alternativas consideradas

## Estrutura por páginas

**Descrição:** Organização baseada apenas em rotas.

**Vantagens**

- Simples.

**Desvantagens**

- Baixa modularidade.
- Escala limitada.

**Motivo da rejeição**

Não acompanha a arquitetura modular definida.

---

## SPA Completa

**Descrição:** Aplicação totalmente client-side.

**Vantagens**

- Alta interatividade.

**Desvantagens**

- Bundle elevado.
- SEO inferior.

**Motivo da rejeição**

Incompatível com a estratégia de performance.

---

## Microfrontends

**Descrição:** Frontends independentes.

**Vantagens**

- Isolamento.

**Desvantagens**

- Complexidade operacional elevada.

**Motivo da rejeição**

Prematuro para o estágio atual do produto.

---

# 6. Implementação

## Sequência recomendada

1. Criar packages/ui.
2. Definir Design Tokens.
3. Configurar Shadcn UI.
4. Criar layouts base.
5. Criar componentes fundamentais.
6. Definir padrão de formulários.
7. Implementar dashboard do aluno.
8. Implementar dashboard do professor.
9. Implementar dashboards administrativos.
10. Executar auditoria de acessibilidade.

---

## Componentes afetados

- apps/web
- packages/ui
- packages/shared-types
- auth
- users
- analytics
- rankings
- championships
- study-paths

---

## Migração

Não há migração de código neste ADR.

A decisão define apenas a arquitetura futura da camada frontend.

---

## Estimativa

Fora do escopo deste ADR.

---

# 7. ADRs Relacionados

- ADR-0001 Arquitetura Base
- ADR-0002 Module Boundaries and Domain Communication
- ADR-0003 Database Strategy and Domain Data Model
- ADR-0004 Authentication and Authorization Strategy
- ADR-0005 Frontend Architecture, State Management and BFF Strategy (normativo quando aprovado)
- Governança do Design System: decisão/owner a definir no índice arquitetural após consolidação, sem reservar número de ADR existente

---

# 8. Referências

- Next.js 15
- React
- TypeScript
- Tailwind CSS
- Shadcn UI
- Radix UI
- React Hook Form
- Zod
- Tremor
- Recharts
- WCAG 2.2
- Documento Mestre do projeto MateMágico Champions

---

# 9. Aprovação

- Architecture Lead
- Frontend Lead
- Tech Lead
- Product Manager
- CTO

A decisão permanece **Proposed** até aprovação formal.

---

# 10. Reconsideração futura

Revisar este ADR quando:

- Next.js alterar significativamente o App Router.
- Houver necessidade comprovada de microfrontends.
- A aplicação ultrapassar limites de bundle aceitáveis.
- Novos canais (mobile nativo) exigirem compartilhamento de UI.
- Os requisitos de acessibilidade forem ampliados.

**Data de revisão:** antes da implementação da Etapa 4 (Banco de Questões) e após os primeiros testes de carga do frontend.

## Apêndice A — Observabilidade

Seguir o baseline de `ADR-TEMPLATE.md` e ADR-0005: OpenTelemetry para instrumentacao/propagacao, Correlation ID entre route, action e modulo, structured logs redigidos, Error Tracking no Sentry ja previsto no Documento Mestre, Metrics de Web Vitals/bundle/latencia/erro e Tracing de requests/actions. Nao registrar resposta de aluno, credenciais, token ou PII desnecessaria; `schoolId` nao deve ser label de alta cardinalidade.

## Apêndice B — Estratégia de Testes

Aplicar a mesma matriz definida em `ADR-TEMPLATE.md`: Unit Tests para componentes/helpers puros; Integration Tests para actions/adapters e consumo de contratos; Contract Tests para DTOs e fronteiras publicas dos modulos; E2E Tests para jornadas por papel e escola, responsividade e acessibilidade; Load Tests para dashboards, tabelas extensas, bundle e concorrencia. A layer responsavel e explicitada por cada equipe (Domain/Application, Infrastructure ou Frontend) e testes negativos de isolamento de escola sao obrigatorios.
