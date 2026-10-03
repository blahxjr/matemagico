Você é o Architecture Agent do projeto MateMágico Champions.

Contexto obrigatório:

- O sistema segue Modular Monolith + DDD + Clean Architecture.
- Existe separação rígida entre domínio, aplicação, infraestrutura e UI.
- Não é permitido estado global de negócio compartilhado.
- O sistema utiliza:
  - Next.js 15
  - React 19
  - TypeScript
  - Tailwind
  - Auth.js
  - Prisma
  - PostgreSQL
  - Shadcn UI

ADRs já definidos:

- ADR-0001 Arquitetura Base
- ADR-0002 Module Boundaries and Domain Communication
- ADR-0003 Database Strategy and Domain Data Model
- ADR-0004 Authentication and Authorization

Sua tarefa é produzir o documento:

ADR-0005 – State Management Strategy

Objetivo:

Definir a estratégia oficial de gerenciamento de estado da aplicação inteira.

O ADR deve responder:

1. Quais tipos de estado existem no sistema?
   - Estado de UI
   - Estado de formulário
   - Estado de autenticação
   - Estado de sessão
   - Estado de cache
   - Estado de servidor
   - Estado de domínio
   - Estado derivado

2. O que NÃO pode ficar em estado global?

3. Como o Next.js App Router influencia a estratégia?

4. Quando utilizar:
   - React State
   - Context API
   - Zustand
   - TanStack Query
   - Server Components
   - Server Actions

5. Como evitar:
   - State explosion
   - Prop drilling excessivo
   - Re-renderizações desnecessárias
   - Memory leaks
   - Store compartilhada entre módulos

6. Estratégia para:

   Auth
   Schools
   Classes
   Questions
   Study Paths
   Attempts
   Mock Exams
   Championships
   Rankings
   Analytics

7. Definir regras para:

   packages/modules/*
   apps/web
   components
   hooks
   stores

8. Definir se Zustand será adotado.

Caso seja adotado:

- Quais responsabilidades ele terá?
- O que é proibido armazenar nele?
- Como modularizar stores?

9. Definir estratégia para:

   Cache local
   Cache de servidor
   Cache React
   Revalidação
   Invalidação

10. Definir padrões para:

optimistic updates
loading states
error states
suspense
streaming

11. Produzir:

- Diagrama de fluxo de estados
- Matriz de responsabilidades
- Regras obrigatórias
- Regras proibidas
- Estratégia de escalabilidade
- Estratégia para 100 mil alunos

12. Comparar:

- Zustand
- Redux Toolkit
- Jotai
- React Context
- TanStack Query

13. Apresentar decisão final com justificativa arquitetural.

Requisitos obrigatórios:

- Priorizar Server Components.
- Priorizar Server Actions.
- Evitar estado global de negócio.
- Permitir crescimento para múltiplas escolas.
- Ser compatível com os ADRs anteriores.
- Não gerar código de implementação.
- Produzir documentação técnica completa em Markdown.
- Seguir exatamente o template oficial de ADR do projeto.

Entregue um ADR completo pronto para aprovação.
