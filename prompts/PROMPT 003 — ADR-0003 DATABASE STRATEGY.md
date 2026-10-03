# MateMágico Champions

## Prompt 003 - ADR-0003 Database Strategy

Você é o Principal Data Architect do projeto MateMágico Champions.

Especialista em:

- PostgreSQL
- Prisma ORM
- Domain Driven Design
- Event Driven Architecture
- Data Modeling
- SaaS Multi-Tenant
- Learning Platforms
- Analytics Architecture

---

# CONTEXTO

O projeto MateMágico Champions já possui:

✅ Documento Mestre

✅ ADR-0001 Base Architecture

✅ ADR-0002 Module Boundaries

✅ Modular Monolith

✅ DDD

✅ Clean Architecture

✅ Event Strategy inicial

✅ Memory System

Agora precisamos definir a estratégia oficial de dados.

---

# OBJETIVO

Produzir o ADR-0003:

"Database Strategy and Domain Data Model"

Este documento será a fonte oficial para:

- PostgreSQL
- Prisma
- Migrations
- Analytics
- Event Storage
- Multi-escola
- Taxonomia OBMEP

---

# PREMISSAS OBRIGATÓRIAS

Banco principal:

PostgreSQL

ORM:

Prisma

Arquitetura:

Modular Monolith

Estratégia Multi-escola:

Multi-escola lógico

NÃO utilizar:

- Banco por escola
- Schema por escola
- Multi-tenant físico

Usar:

schoolId

como isolamento principal.

---

# DIRETRIZES DE NEGÓCIO

O sistema deve suportar:

- Alunos
- Professores
- Coordenadores
- Administradores escolares
- Administradores globais

Também deve suportar:

- Banco de questões
- Trilhas adaptativas
- Simulados
- Campeonatos
- Ranking
- Badges
- Certificados
- Analytics

Conforme definido no Documento Mestre.

---

# ENTREGAS OBRIGATÓRIAS

## 1. Visão Geral da Estratégia de Dados

Explicar:

- por que PostgreSQL
- por que Prisma
- estratégia de crescimento
- estratégia de migração

---

## 2. Bounded Context Data Map

Mapear quais entidades pertencem a cada módulo.

Exemplo:

Auth

- sessions
- auth_accounts

Users

- users
- profiles

Schools

- schools
- memberships

Questions

- questions
- question_options

Question Engine

- recommendation_rules
- adaptive_profiles

...

---

## 3. Aggregate Roots DDD

Definir oficialmente:

### Aggregate Roots

Exemplo:

- User
- School
- Question
- StudyPath
- MockExam
- Championship

Para cada aggregate:

- responsabilidade
- invariantes
- entidades internas

---

## 4. Modelo Conceitual Completo

Produzir ERD conceitual.

Incluir:

Users
Roles
Schools
Classes
Enrollments
Questions
Topics
Competencies
StudyPaths
Attempts
MockExams
Championships
Rankings
Badges
Certificates

Utilizar Mermaid ER Diagram.

---

## 5. Taxonomia Oficial OBMEP

Projetar estrutura para:

Nível
Tema
Subtema
Competência
Habilidade
Ano
Fase
Fonte
Dificuldade

Explicar relacionamentos.

---

## 6. Estratégia do Question Engine

Projetar tabelas conceituais para:

recommendation_rules

adaptive_profiles

learning_patterns

question_statistics

skill_mastery

error_patterns

Explicar cada uma.

---

## 7. Estratégia de Analytics

Projetar entidades para:

student_progress

daily_metrics

question_metrics

topic_metrics

learning_metrics

school_metrics

Explique:

- dados operacionais
- dados analíticos

---

## 8. Estratégia de Eventos

Projetar:

domain_events

audit_logs

notifications

event_subscriptions

Definir:

- retenção
- auditoria
- rastreabilidade

---

## 9. Estratégia Prisma

Definir:

### Convenções

- nomes de modelos
- relacionamentos
- índices
- enums

### Soft Delete

Definir política oficial.

### Migrations

Definir estratégia.

### Seeds

Definir estratégia.

---

## 10. Estratégia de Escalabilidade

Explicar evolução:

Fase 1
0 → 10 mil alunos

Fase 2
10 mil → 50 mil alunos

Fase 3
50 mil → 100 mil alunos

Incluir:

- índices
- cache
- particionamento
- read replicas
- analytics separado

---

## 11. Catálogo Inicial de Tabelas

Listar todas as tabelas previstas.

Classificar:

### Core

### Support

### Analytics

### Events

### Security

---

## 12. Atualizações na Arquitetura Atual

Analisar ADR-0001 e ADR-0002.

Apontar:

- entidades faltantes
- tabelas faltantes
- riscos de modelagem
- melhorias recomendadas

---

# REGRAS IMPORTANTES

NÃO gerar código Prisma.

NÃO gerar migrations.

NÃO gerar SQL.

NÃO gerar API.

NÃO gerar implementação.

Produzir apenas arquitetura de dados.

---

# FORMATO DE SAÍDA

Documento Markdown profissional contendo:

- ADR completo
- Diagramas Mermaid
- ERD Conceitual
- Aggregate Map
- Data Ownership Map
- Taxonomia OBMEP
- Estratégia de Eventos
- Estratégia Analytics
- Estratégia Prisma
- Plano de Escalabilidade

Objetivo final:

Criar a fundação de dados definitiva do MateMágico Champions antes da implementação do schema Prisma.
