## ADR-0008 - Frontend Architecture, UI State and BFF Strategy

**Date**: 2026-09-29
**Status**: Superseded
**Deciders**: Architecture Lead, Frontend Lead, Tech Lead e Product
**Affects**: apps/web, todos os módulos de domínio, autenticação, analytics e experiência do usuário

> Proposta historica de frontend/BFF supersedida pelo ADR-0005 - Frontend Architecture, State Management and BFF Strategy. Mantida para rastreabilidade; nao usar como decisao normativa.

> **Nota de execução:** este documento é somente histórico. Para implementação, contratos, estado, cache, Server Actions, BFF e ownership, seguir exclusivamente ADR-0001, ADR-0002, ADR-0003, ADR-0004 e ADR-0005. Nenhuma regra abaixo pode substituir ou reabrir essas decisões.

---

# 1. Contexto

O MateMágico Champions será desenvolvido utilizando:

- Next.js 15
- React
- TypeScript
- Tailwind
- Shadcn UI
- Auth.js

Os ADRs anteriores definiram:

- Modular Monolith
- DDD + Clean Architecture
- Ownership por módulo
- PostgreSQL + Prisma
- Auth.js para autenticação
- Event Bus interno

Entretanto, ainda não existe uma decisão formal sobre:

- Estrutura do frontend
- Gestão de estado
- Server Components
- Client Components
- Server Actions
- BFF (Backend for Frontend)
- Integração entre UI e domínio
- Estratégia de cache
- Organização das features

Sem essa definição, existe risco de:

- lógica de negócio migrar para a interface
- acoplamento entre páginas e banco
- uso excessivo de estado global
- Server Actions acessando múltiplos módulos diretamente
- inconsistência arquitetural

---

## Restrições

- O frontend deve permanecer desacoplado dos módulos internos.
- A UI não pode acessar Prisma diretamente.
- A UI não pode orquestrar regras de negócio.
- O sistema deve funcionar com SSR, SSG e streaming.
- Deve suportar crescimento para dezenas de milhares de usuários concorrentes.

---

## Requisitos

- Separar claramente UI de domínio.
- Definir estratégia de estado.
- Definir quando usar Server Components.
- Definir quando usar Client Components.
- Definir política de cache.
- Definir padrão de integração com módulos.
- Definir BFF.

---

# 2. Decisão

## DECLARAÇÃO DA PROPOSTA HISTÓRICA

Esta proposta histórica descrevia:

- Next.js App Router
- React Server Components por padrão
- Client Components apenas quando necessário
- Server Actions como camada BFF
- Zustand para estado local de interface
- TanStack Query para sincronização remota
- Shadcn UI como design system base
- Tailwind para estilização
- Sem acesso direto da UI ao domínio ou banco

A UI consumiria exclusivamente contratos públicos de aplicação dos módulos. A regra vigente e seus limites estão definidos no ADR-0005 canônico.

---

# 2.1 Arquitetura Geral

```text
Browser
   │
   ▼
React Components
   │
   ▼
Server Actions / Route Handlers
   │
   ▼
Application Contracts
   │
   ▼
Domain Modules
   │
   ▼
Repositories
   │
   ▼
Database
A UI não conhece:
Prisma
PostgreSQL
Repositórios
Entidades internas
2.2 Estrutura do Frontend
Plain Text
apps/web/src
 
app/
components/
features/
hooks/
lib/
providers/
stores/
styles/
Mostrar mais linhas
app/
Responsável por:
rotas
layouts
loading
error boundaries
Não contém regras de negócio.
features/
Organização por domínio funcional.
Exemplo:
Plain Text
features/
 
auth/
questions/
study-paths/
attempts/
championships/
rankings/
analytics/
Mostrar mais linhas
Cada feature possui:
Plain Text
components/
hooks/
actions/
schemas/
types/
Mostrar mais linhas
components/
Componentes reutilizáveis.
Exemplo:
Plain Text
Button
Modal
Card
Table
 
Mostrar mais linhas
stores/
Estado local.
Exemplo:
Plain Text
ui-store
theme-store
modal-store
Mostrar mais linhas
Não armazenar domínio.
2.3 Server Components
Server Components serão o padrão.
Utilizar para:
dashboards
rankings
listagens
relatórios
páginas institucionais
Vantagens:
menor bundle
melhor SEO
streaming
acesso seguro ao servidor
Obrigatório
Sempre começar por Server Component.
Migrar para Client Component apenas quando necessário.
2.4 Client Components
Permitidos apenas quando houver:
formulários complexos
drag and drop
animações
edição rica
interações em tempo real
Exemplos:
Editor de Questões
Simulado em execução
Cronômetro
Quadro de Ranking ao vivo
2.5 Estado de UI
Permitido
Estado visual:
modal aberto
aba ativa
tema
sidebar
filtros temporários
Ferramenta:
Plain Text
Zustand
Mostrar mais linhas
Proibido
Estado de negócio:
Attempt
Ranking
Championship
Question
Esses dados pertencem aos módulos.
2.6 Estado Remoto
Será utilizado:
Plain Text
TanStack Query
 
Mostrar mais linhas
para:
cache
invalidação
sincronização
Benefícios
cache automático
retries
refetch
optimistic updates
2.7 Backend for Frontend
Server Actions serão o BFF oficial.
Exemplo:
Plain Text
UI
↓
Server Action
↓
Study Paths Module
Mostrar mais linhas
A Action:
valida entrada
autentica usuário
resolve schoolId
chama contrato do módulo
A Action não implementa regras de negócio.
2.8 Política de Cache
Conteúdo Estático
Exemplos:
landing pages
documentação
Estratégia:
Plain Text
SSG + Revalidate
Mostrar mais linhas
Conteúdo Dinâmico
Exemplos:
rankings
dashboards
analytics
Estratégia:
Plain Text
SSR
Mostrar mais linhas
Conteúdo Crítico
Exemplos:
tentativa em andamento
submissão de resposta
Estratégia:
Plain Text
no-store
Mostrar mais linhas
2.9 Formulários
Bibliotecas aprovadas:
Plain Text
React Hook Form
Zod
Mostrar mais linhas
Fluxo:
Plain Text
Form
↓
Zod
↓
Server Action
↓
Application Contract
Mostrar mais linhas
2.10 Design System
Base:
Plain Text
Shadcn UI
``
Mostrar mais linhas
Complementos:
Plain Text
Radix UI
Lucide Icons
Mostrar mais linhas
Objetivos
acessibilidade
consistência
produtividade
2.11 Analytics de Frontend
Eventos de UI são permitidos apenas para:
navegação
engajamento
performance
Não enviar:
respostas de alunos
credenciais
PII desnecessária
Por que esta escolha
Opção	Vantagens	Custos	DecisãoRSC + Server Actions	Performance, simplicidade e segurança	Curva de aprendizado	✅ Selecionada
SPA completa	Flexibilidade	Bundle elevado	❌ Rejeitada
Redux global	Centralização	Complexidade excessiva	❌ Rejeitada
Estado de domínio no frontend	Facilidade inicial	Acoplamento	❌ Rejeitada
3. Consequências
Positivas
Menor bundle JavaScript.
Melhor SEO.
Menor acoplamento.
Segurança reforçada.
Escalabilidade arquitetural.
Negativas
Curva de aprendizado de RSC.
Necessidade de disciplina entre Server e Client Components.
Maior atenção ao cache.
Trade-offs Aceitos
Trade-off	Aceito porque	MonitorarMais lógica no servidor	Melhor segurança	Latência
Menos estado global	Menos acoplamento	Duplicação de fetch
Uso de RSC	Melhor performance	Complexidade
4. Riscos
ID	Risco	Severidade	Probabilidade	MitigaçãoR1	Lógica de negócio na UI	Alta	Média	Revisão arquitetural
R2	Uso excessivo de Client Components	Média	Alta	Métricas de bundle
R3	Estado global crescer indevidamente	Média	Média	Limites de uso do Zustand
R4	Cache inconsistente	Alta	Média	Estratégia formal de invalidação
R5	Server Actions virarem serviços de negócio	Alta	Média	Separação rigorosa
5. Alternativas Consideradas
SPA Tradicional
Descrição: React totalmente client-side.
Vantagens
Simplicidade inicial
Desvantagens
SEO ruim
Bundle elevado
Motivo da rejeição
Não atende aos objetivos de performance.
Redux Global
Descrição: Estado global para toda aplicação.
Vantagens
Centralização
Desvantagens
Complexidade
Acoplamento
Motivo da rejeição
Desnecessário para o porte inicial.
6. Implementação
Sequência
Configurar App Router.
Configurar Shadcn UI.
Configurar TanStack Query.
Configurar Zustand.
Criar arquitetura de features.
Criar Server Actions padrão.
Implementar autenticação.
Implementar layout base.
Componentes Afetados
apps/web
Auth
Study Paths
Attempts
Questions
Championships
Rankings
Analytics
7. ADRs Relacionados
ADR-0001 Arquitetura Base
ADR-0002 Module Boundaries
ADR-0003 Database Strategy
ADR-0004 Authentication and Authorization
8. Referências
Next.js 15 Documentation
React Server Components
TanStack Query
Zustand
Shadcn UI
Clean Architecture
9. Aprovação
Architecture Lead
Frontend Lead
Tech Lead
Product Manager
CTO
Status atual: Superseded. Não usar este documento como autorização para implementação.
10. Reconsideração Futura
Revisar este ADR quando:
houver necessidade de aplicações mobile dedicadas;
WebSockets se tornarem obrigatórios;
o frontend for dividido em múltiplos produtos;
houver necessidade comprovada de micro-frontends.
Data de revisão: antes do início da implementação da Etapa 5 (Treino Adaptativo).

Este texto foi preservado como histórico. Qualquer aparente consistência ou conflito com ADR-0001–0005 deve ser resolvido pela hierarquia de status e pelo ADR-0005 canônico, nunca por este documento.
```
