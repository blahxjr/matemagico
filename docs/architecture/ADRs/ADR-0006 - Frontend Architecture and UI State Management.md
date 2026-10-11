## ADR-0006 - Frontend Architecture and UI State Management

**Date**: 2026-09-29
**Status**: Superseded
**Deciders**: Architecture Lead, Frontend Lead, Tech Lead e Product
**Affects**: apps/web, packages/ui, todos os módulos de domínio, autenticação, analytics e futuras aplicações cliente

> Proposta historica supersedida pelo ADR-0005 (frontend, state, BFF e composição). Mantida para rastreabilidade; nao usar como decisao normativa.

---

## 1. Contexto

O MateMágico Champions será uma aplicação web construída em Next.js 15, React, TypeScript e Shadcn UI.

A arquitetura backend já foi definida pelos ADR-0002, ADR-0003 e ADR-0004.

Ainda falta definir:

- Estrutura da aplicação frontend
- Estratégia App Router
- Server Components
- Client Components
- Estado global
- Estado local
- Cache
- Formulários
- Navegação
- Design System
- Organização de telas

Sem uma decisão formal existe risco de:

- Acoplamento UI ↔ domínio
- Estado global excessivo
- Duplicação de lógica
- Requisições desnecessárias
- Componentes inconsistentes
- Baixa escalabilidade

### Restrições

- Next.js 15 obrigatório
- React obrigatório
- TypeScript obrigatório
- Shadcn UI obrigatório
- Tailwind obrigatório
- Não utilizar Redux
- Não colocar regra de negócio na UI

### Requisitos

- Alta performance
- SSR quando possível
- SEO para páginas públicas
- Isolamento de domínio
- Reuso de componentes
- Escalabilidade

---

## 2. Decisão

**DECISÃO:** Utilizar arquitetura Frontend Server-First baseada em App Router, React Server Components, Server Actions e UI desacoplada dos módulos de domínio.

### Estrutura

apps/web/src

app/
components/
features/
hooks/
lib/
providers/
styles/

packages/ui

components/
tokens/
icons/

### Princípios

#### Server First

Preferir Server Components.

Client Components apenas quando:

- Formulários
- Interações
- Drag and Drop
- Gráficos
- Tempo real

#### Estado

Estado local:

- useState
- useReducer

Estado servidor:

- TanStack Query

Estado global:

- Zustand apenas quando necessário

#### Proibido

- Stores gigantes
- Context para dados mutáveis de domínio
- Regra de negócio no frontend

---

## Design System

Baseado em:

- Shadcn UI
- Radix UI
- Tailwind

Tokens:

- spacing
- colors
- radius
- typography

---

## Formulários

Bibliotecas:

- React Hook Form
- Zod

Fluxo:

Form → Zod → Server Action → Domain

---

## Navegação

App Router

Áreas:

/auth
/dashboard
/questions
/study-paths
/mock-exams
/championships
/rankings
/schools
/admin

---

## Analytics Frontend

Capturar:

- page_view
- button_click
- form_submit

Sem capturar:

- senha
- token
- dados sensíveis

---

## Consequências

### Positivas

- Menor bundle
- Melhor SEO
- Menor uso de JavaScript
- Maior escalabilidade

### Negativas

- Curva de aprendizado RSC
- Necessidade de separar componentes

---

## Riscos

| ID  | Risco                        | Mitigação            |
| --- | ---------------------------- | -------------------- |
| R1  | Excesso de Client Components | Revisão arquitetural |
| R2  | Estado global excessivo      | Limitar Zustand      |
| R3  | Acoplamento UI-domínio       | Imports controlados  |

---

## ADRs Relacionados

- ADR-0002
- ADR-0003
- ADR-0004
- ADR-0007

---

## Revisão Futura

Antes da implementação da primeira feature completa.
