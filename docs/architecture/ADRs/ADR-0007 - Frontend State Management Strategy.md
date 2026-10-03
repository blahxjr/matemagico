## ADR-0007 - Frontend State Management Strategy

**Date**: 2026-09-29  
**Status**: Superseded
**Deciders**: Architecture Lead, Frontend Lead, Tech Lead e Product (a confirmar)  
**Affects**: apps/web, todos os módulos frontend, Auth, Study Paths, Attempts, Championships, Analytics e UX geral

> Proposta historica de state management supersedida pelo ADR-0005 - Frontend Architecture, State Management and BFF Strategy. Mantida para rastreabilidade; suas orientacoes de TanStack Query como armazenamento de estado de dominio nao sao normativas.

---

# 1. Contexto

O MateMágico Champions será desenvolvido utilizando Next.js 15, React, TypeScript, Tailwind e arquitetura Modular Monolith baseada em DDD e Clean Architecture.

Os ADRs anteriores já definiram:

- Limites entre módulos (ADR-0002)
- Estratégia de banco e ownership de dados (ADR-0003)
- Autenticação e autorização (ADR-0004)

Entretanto ainda não existe uma estratégia formal para gerenciamento de estado da interface.

Sem uma decisão explícita, é comum que aplicações React evoluam para:

- Contexts globais excessivos
- Stores centralizadas contendo regras de negócio
- Duplicação de dados entre frontend e backend
- Cache inconsistente
- Dependências cruzadas entre módulos
- Dificuldade de escalabilidade

O sistema deverá suportar:

- Dashboard do aluno
- Trilhas adaptativas
- Simulados
- Campeonatos
- Rankings
- Analytics
- Administração escolar
- Curadoria editorial

com dezenas de telas e múltiplos módulos.

---

## Restrições

- Next.js 15 é obrigatório.
- React Server Components devem ser priorizados.
- O frontend não é fonte de verdade do negócio.
- Estado de domínio pertence aos módulos backend.
- Deve funcionar em arquitetura Modular Monolith.
- Deve permitir futura extração de módulos.
- Deve minimizar re-renderizações.
- Não utilizar Redux como padrão do projeto.

---

## Requisitos

- Separar claramente estado de UI e estado de negócio.
- Evitar duplicação de dados.
- Permitir cache eficiente.
- Suportar atualizações otimistas quando apropriado.
- Integrar naturalmente com Server Actions.
- Permitir escalabilidade até 100 mil alunos.
- Facilitar testes e manutenção.

---

# 2. Decisão

## DECLARAÇÃO DA DECISÃO

O sistema adotará uma arquitetura baseada em:

1. React Server Components como padrão.
2. TanStack Query para estado remoto.
3. Zustand para estado local de interface.
4. URL como fonte de verdade para filtros e navegação.
5. Forms isolados usando React Hook Form.
6. Proibição de regras de negócio dentro de stores frontend.

---

## 2.1 Classificação dos estados

### Tipo 1: Estado de Domínio

Exemplos:

- Usuário
- Tentativas
- Rankings
- Trilhas
- Campeonatos
- Simulados

Origem:

- Backend

Fonte de verdade:

- Servidor

Armazenamento:

- TanStack Query Cache

---

### Tipo 2: Estado de Interface

Exemplos:

- Sidebar aberta
- Tema
- Modal
- Wizard
- Aba ativa

Origem:

- Frontend

Fonte de verdade:

- Cliente

Armazenamento:

- Zustand

---

### Tipo 3: Estado de Navegação

Exemplos:

- Página
- Ordenação
- Filtro
- Busca
- Paginação

Origem:

- URL

Fonte de verdade:

- Search Params

Armazenamento:

- Router

---

### Tipo 4: Estado de Formulário

Exemplos:

- Cadastro
- Login
- Questão
- Campeonato

Origem:

- Usuário

Armazenamento:

- React Hook Form

Persistência:

- Temporária

---

## 2.2 Arquitetura escolhida

```text
Server
│
├── Server Components
│
├── Server Actions
│
└── APIs/Facades
        │
        ▼
TanStack Query
        │
        ▼
React Components
        │
        ├── Zustand
        ├── RHF
        └── URL State
        2.3 Uso obrigatório de Server Components
Por padrão:
páginas
layouts
dashboards
listagens
devem ser Server Components.
Client Components serão usados apenas quando houver:
interação
animação
drag and drop
formulário
gráficos interativos
2.4 Estratégia TanStack Query
Responsável por:
cache remoto
invalidação
sincronização
optimistic updates
Permitido:
TypeScript
useQuery()
useInfiniteQuery()
useMutation()
Mostrar mais linhas
Proibido:
armazenar cache em Zustand
duplicar dados de Query Cache
2.5 Estratégia Zustand
Permitido apenas para:
UI State
Session UX
Preferências locais
Exemplos:
TypeScript
sidebarStore
themeStore
modalStore
wizardStore
Mostrar mais linhas
Proibido:
TypeScript
usersStore
attemptsStore
questionsStore
rankingsStore
Mostrar mais linhas
Esses dados pertencem ao backend.
2.6 Estado de autenticação
A autenticação definida no ADR-0004 permanece no servidor.
Frontend recebe apenas:
TypeScript
session
permissions
activeSchool
Mostrar mais linhas
Nunca:
JWT
hash
credenciais
roles persistidas localmente
Autorização continua sendo responsabilidade do servidor.
2.7 Atualizações otimistas
Permitidas para:
likes
favoritos
preferências
ações reversíveis
Não permitidas para:
rankings
notas
certificados
conquistas
resultados oficiais
Por que esta escolha
Opção	Vantagens	Custos	DecisãoRSC + TanStack + Zustand	Escalável, moderno, alinhado ao Next.js	Curva de aprendizado	✅ Selecionada
Redux Toolkit	Ecossistema maduro	Complexidade excessiva	❌ Rejeitada
Apenas Context API	Simples inicialmente	Escala mal	❌ Rejeitada
Zustand para tudo	Fácil implementação	Mistura domínio e UI	❌ Rejeitada
3. Consequências
Positivas
Menor volume de JavaScript.
Melhor SEO.
Melhor performance.
Menos re-renderizações.
Menor duplicação de dados.
Arquitetura alinhada ao Next.js 15.
Facilita futura extração de módulos.
Negativas
Exige disciplina arquitetural.
Requer entendimento de RSC.
Aumenta número de camadas.
TanStack Query exige governança de cache.
Trade-offs aceitos
Trade-off	Aceito porque	MonitorarMais conceitos arquiteturais	Escalabilidade futura	Curva de aprendizado
Cache distribuído	Melhor UX	Invalidação
Separação rigorosa	Evita acoplamento	Complexidade inicial
4. Riscos
ID	Risco	Severidade	Probabilidade	MitigaçãoR1	Uso de Zustand para domínio	Alta	Média	Regras arquiteturais
R2	Cache inconsistente	Alta	Média	Query Keys padronizadas
R3	Excesso de Client Components	Média	Alta	Revisão arquitetural
R4	Dados sensíveis no browser	Crítica	Baixa	Revisão de segurança
R5	Duplicação de estado	Alta	Média	Linters e code review
Sinais de revisão
Crescimento excessivo de stores.
Duplicação de cache.
Mais de 30% das páginas usando Client Components.
Re-renderizações frequentes.
Queda de performance em dashboards.
5. Alternativas consideradas
Redux Toolkit
Vantagens
Ecossistema maduro.
DevTools avançadas.
Desvantagens
Boilerplate.
Complexidade desnecessária.
Motivo da rejeição
O problema atual não justifica Redux.
Context API
Vantagens
Nativo do React.
Desvantagens
Re-renderizações.
Escalabilidade limitada.
Motivo da rejeição
Não atende ao crescimento previsto.
Zustand para tudo
Vantagens
Simplicidade.
Desvantagens
Mistura UI e domínio.
Motivo da rejeição
Contraria ADR-0002.
6. Implementação
Sequência
Configurar TanStack Query.
Configurar Query Provider.
Criar convenção de Query Keys.
Criar stores de UI.
Criar padrão de formulários.
Criar documentação de uso.
Componentes afetados
apps/web
layouts
dashboards
formulários
analytics
campeonatos
rankings
simulados
Migração
Não existe implementação anterior.
Aplicar a estratégia desde o início do projeto.
Estimativa
Fora do escopo deste ADR.
7. ADRs Relacionados
ADR-0001 Arquitetura Base
ADR-0002 Module Boundaries and Domain Communication
ADR-0003 Database Strategy and Domain Data Model
ADR-0004 Authentication and Authorization Strategy
8. Referências
Next.js 15 Architecture
React Server Components
TanStack Query Documentation
Zustand Documentation
React Hook Form Documentation
9. Aprovação
Architecture Lead
Frontend Lead
Tech Lead
Product Manager
CTO
Status permanece Proposed até aprovação formal.
10. Reconsideração futura
Revisar este ADR quando:
Next.js alterar o modelo de RSC.
Houver necessidade comprovada de Redux.
O frontend atingir limitações de cache.
O número de módulos crescer significativamente.
Data de revisão: antes da implementação da primeira versão pública.
```
