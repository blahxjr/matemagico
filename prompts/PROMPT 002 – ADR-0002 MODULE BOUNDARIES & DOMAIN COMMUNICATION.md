# MateMágico Champions

## Prompt 002 - ADR-0002 Module Boundaries

Você é o Principal Domain Architect do projeto MateMágico Champions.

Especialista em:

- Domain Driven Design
- Modular Monolith
- Clean Architecture
- Event Driven Architecture
- Large Scale SaaS
- Educational Platforms
- Domain Modeling

---

# CONTEXTO

O projeto MateMágico Champions já possui:

✅ Arquitetura Fundacional
✅ Modular Monolith
✅ DDD
✅ Clean Architecture
✅ Sistema de Memória Persistente
✅ Módulos iniciais definidos

Agora precisamos definir formalmente:

- Fronteiras dos módulos
- Contratos públicos
- Dependências permitidas
- Dependências proibidas
- Eventos de domínio
- Estratégia futura de microserviços

---

# OBJETIVO

Produzir o ADR-0002:

"Module Boundaries and Domain Communication"

Este documento será uma das decisões arquiteturais mais importantes do projeto.

---

# DIRETRIZES OBRIGATÓRIAS

O sistema deve permanecer:

- Modular Monolith
- Escalável
- Testável
- Preparado para IA
- Preparado para múltiplas escolas
- Preparado para 100 mil alunos

Evitar:

- Acoplamento entre módulos
- Imports cruzados
- Dependências circulares
- Shared state global

---

# MÓDULOS OBRIGATÓRIOS

Fundação

- Auth
- Users

Institucional

- Schools
- Classes

Conteúdo

- Questions
- Topics

Motor Pedagógico

- Question Engine
- Study Paths
- Attempts
- Mock Exams

Competição

- Championships
- Rankings
- Badges
- Certificates

Analytics

- Analytics

Futuro

- AI

---

# ENTREGAS OBRIGATÓRIAS

## 1. Bounded Context Map

Criar mapa completo dos bounded contexts.

Mostrar:

- Core Domain
- Supporting Domains
- Generic Domains

Explicar a razão de cada classificação.

---

## 2. Module Responsibilities

Para cada módulo definir:

### Responsabilidade

### O que ele pode fazer

### O que ele NÃO pode fazer

### Dados que controla

### Eventos que produz

### Eventos que consome

---

## 3. Dependency Matrix

Criar tabela completa contendo:

- módulo
- depende de
- não pode depender de
- criticidade

Identificar dependências perigosas.

---

## 4. Regras de Comunicação

Definir:

### Comunicação Permitida

Exemplos:

Question Engine → Questions

Study Paths → Question Engine

Analytics → Attempts

---

### Comunicação Proibida

Exemplos:

Questions → Rankings

Auth → Championships

Badges → Schools

---

Justificar cada regra.

---

## 5. Public API de Cada Módulo

Definir quais serviços podem ser expostos.

Exemplo:

Question Engine

- selectQuestions()
- buildExam()
- recommendQuestion()

Não gerar implementação.

Apenas contratos.

---

## 6. Domain Events

Criar catálogo oficial de eventos.

Exemplos:

UserCreated

UserLoggedIn

QuestionCreated

QuestionAnswered

StudyPathStarted

StudyPathCompleted

MockExamStarted

MockExamCompleted

ChampionshipCreated

ChampionshipFinished

BadgeEarned

CertificateGenerated

---

Para cada evento definir:

- produtor
- consumidores
- payload conceitual

---

## 7. Internal Event Bus

Projetar:

packages/events

Definir:

- interfaces
- responsabilidades
- fluxo

Sem código.

Somente arquitetura.

---

## 8. Estratégia para IA

Criar módulo:

AI

Definir contratos:

RecommendationProvider

TutorProvider

FeedbackProvider

DifficultyEstimator

StudyAdvisor

Explicar como o sistema poderá usar IA sem acoplar OpenAI, Claude ou qualquer outro fornecedor.

---

## 9. Estratégia de Extração para Microserviços

Identificar quais módulos poderiam ser extraídos futuramente.

Classificar:

Fase 1
Fase 2
Fase 3

Explicar:

- custo
- benefício
- prioridade

---

## 10. Atualizações Necessárias na Arquitetura Atual

Revisar a arquitetura existente.

Identificar:

- módulos faltantes
- dependências perigosas
- melhorias recomendadas
- ajustes na árvore de diretórios

Gerar lista de ações arquiteturais.

---

# REGRAS IMPORTANTES

Não gerar código.

Não gerar migrations.

Não gerar Prisma.

Não gerar APIs.

Não gerar componentes.

Produzir apenas documentação arquitetural.

---

# FORMATO DE SAÍDA

Documento Markdown profissional contendo:

- ADR completo
- Diagramas Mermaid
- Tabelas
- Matriz de dependências
- Event Storming
- Context Map
- Contratos públicos
- Plano de evolução

Objetivo final:

Garantir que o MateMágico Champions possa crescer durante anos sem virar um monólito acoplado.
