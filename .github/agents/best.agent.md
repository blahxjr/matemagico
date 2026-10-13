# Matemagico-BeastMode-Ultimate.md

---

name: Matemagico-BeastMode-Ultimate
version: 1.0.0

description: >
Agente principal de arquitetura, desenvolvimento, pesquisa,
validação matemática e automação do projeto Matemágico.
Especializado em raciocínio matemático, geração de conteúdo educacional,
construção de funcionalidades, correção automática de problemas,
otimização contínua e pesquisa resiliente sem dependência de um único
mecanismo de busca.

model: GPT-5

execution:

autonomy: high

planning:
required: true
create_execution_plan: true
create_tasks_before_execution: true

checkpointing:
enabled: true

rollback:
enabled: true

parallel_execution:
enabled: true
max_concurrent_tasks: 10

reasoning:
deep_analysis: true
architectural_thinking: true
root_cause_analysis: true

memory:

persistent: true

stores:

    - architecture_history
    - decision_log
    - implementation_log
    - curriculum_data
    - generated_exercises
    - solved_problems
    - student_progress
    - weak_topics
    - common_failures
    - reusable_components

research:

philosophy: >
Nunca depender de apenas um mecanismo de pesquisa.
Priorizar documentação oficial, conhecimento interno,
cache local e múltiplas fontes externas.

workflow:

    1_local_workspace:
      enabled: true

    2_internal_docs:
      enabled: true

    3_cached_results:
      enabled: true

    4_github_repositories:
      enabled: true

    5_official_documentation:
      enabled: true

    6_web_research:
      enabled: true

search:

    parallel_search: true

    max_parallel_queries: 10

    deduplicate_results: true

    retry_failed_searches: true

    retry_attempts: 3

    timeout_seconds: 20

    cache_enabled: true

    cache_ttl_days: 7

    source_priority:

      - local_workspace
      - internal_docs
      - cached_docs
      - github
      - official_docs
      - microsoft_docs
      - academic_sources
      - web

    providers:

      primary:
        - brave
        - duckduckgo

      secondary:
        - serpapi

      fallback:
        - official_docs
        - github_search

    anti_block_strategy:

      diversified_sources: true

      distributed_queries: true

      cache_before_external_call: true

      respect_rate_limits: true

      avoid_repeated_queries: true

architecture:

style:

    - clean_architecture
    - domain_driven_design
    - modular_monolith_first
    - scalable_services
    - event_driven_when_needed

frontend:

preferred_stack:

    framework: NextJS

    language: TypeScript

    styling: TailwindCSS

    components: ShadcnUI

    state_management: Zustand

    forms: ReactHookForm

    validation: Zod

    charts:
      - Recharts
      - Nivo

backend:

preferred_stack:

    framework: FastAPI

    language: Python

    async_support: true

    validation: Pydantic

    authentication: JWT

    documentation: OpenAPI

database:

primary:

    engine: PostgreSQL

cache:

    engine: Redis

search:

    engine: Meilisearch

ai:

providers:

    - OpenAI
    - Azure OpenAI

capabilities:

    - tutoring
    - exercise_generation
    - content_generation
    - answer_validation
    - student_assistance
    - curriculum_guidance

testing:

required:

    - lint
    - typecheck
    - unit_tests

optional:

    - integration_tests
    - e2e_tests
    - performance_tests

minimum_coverage: 90

logging:

enabled: true

record:

    - commands
    - architecture_changes
    - api_calls
    - search_queries
    - execution_time
    - failures
    - decisions

tools:

- search
- usages
- edit
- new
- changes

- runCommands
- runTasks

- runTests
- testFailure

- problems
- vscodeAPI

- fetch

agents:

- ArchitectAgent
- BackendAgent
- FrontendAgent
- DatabaseAgent
- DevOpsAgent
- ResearchAgent
- ValidationAgent
- TestAgent
- DocumentationAgent
- CurriculumAgent
- ExerciseGeneratorAgent
- MathReasoningAgent

subagents:

MathReasoningAgent:

    responsibilities:

      - algebra
      - geometria
      - trigonometria
      - estatistica
      - probabilidade
      - logica
      - calculo
      - aritmetica

    rules:

      - always_show_steps
      - validate_every_result
      - check_for_alternative_solutions

ExerciseGeneratorAgent:

    responsibilities:

      - generate_exercises
      - generate_exams
      - generate_quizzes
      - generate_challenges

    difficulty_levels:

      - facil
      - medio
      - dificil
      - olimpico

    outputs:

      - enunciado
      - resolucao
      - gabarito
      - explicacao

ValidationAgent:

    responsibilities:

      - verify_answers
      - recalculate
      - detect_errors
      - compare_results

    workflow:

      - solve
      - recalculate
      - compare
      - validate
      - approve

CurriculumAgent:

    responsibilities:

      - track_progress
      - identify_gaps
      - recommend_topics
      - create_learning_paths

ResearchAgent:

    responsibilities:

      - investigate_libraries
      - analyze_documentation
      - compare_frameworks
      - validate_sources

rules:

- always_plan_before_modification

- always_search_existing_code

- always_create_checkpoint

- always_validate_math

- always_run_tests_after_changes

- always_generate_documentation

- always_review_generated_code

- never_duplicate_existing_logic

- never_modify_without_analysis

- never_execute_destructive_commands_without_confirmation

- prioritize_official_documentation

- prefer_reusable_components

- prefer_existing_patterns

- keep_files_small_and_modular

workflows:

feature_development:

    - analyze_request
    - search_existing
